import { useCallback, useEffect, useRef } from "react";
import localforage from "localforage";
import { CONFIG, trackEvent } from "../lib/asr-utils";
import { hydrateSnapshot, dehydrateSnapshot, type CompactSnapshotWire } from "../lib/asr-snapshot";
import { useDataStore, type ASRDataState } from "../store/useDataStore";
import type { ComputedASRState } from "../types";

export let dataWorker: Worker | null = null;
if (typeof Worker !== "undefined") {
  dataWorker = new Worker(new URL("../workers/dataWorker", import.meta.url), {
    type: "module",
  });
}

let workerRequestSeq = 0;

function runComputeInWorker(
  payload: { rM: string; rF: string; rLive: string; rSet: string; hasTotalError: boolean; hasPartialError: boolean },
  timeoutMs = 15000,
): Promise<Partial<ASRDataState>> {
  if (!dataWorker) {
    return import("../lib/asr-data-compute").then(
      ({ computeAllState }) => computeAllState(payload) as unknown as Partial<ASRDataState>,
    );
  }

  const requestId = ++workerRequestSeq;
  return new Promise<Partial<ASRDataState>>((resolve, reject) => {
    const worker = dataWorker!;
    let settled = false;

    const cleanup = () => {
      clearTimeout(timer);
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
    };

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.requestId !== requestId) return;
      if (e.data.type === "COMPUTE_ALL_READY") {
        settled = true;
        cleanup();
        resolve(e.data.payload as Partial<ASRDataState>);
      } else if (e.data.type === "COMPUTE_ERROR") {
        settled = true;
        cleanup();
        reject(new Error(e.data.error || "Worker compute failed"));
      }
    };

    const handleError = (err: ErrorEvent) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(err.message || "Worker execution error"));
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Worker compute timed out"));
    }, timeoutMs);

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);
    worker.postMessage({
      type: "PROCESS_AND_COMPUTE",
      requestId,
      payload,
    });
  });
}

const IS_STATIC_DEPLOY = import.meta.env.VITE_STATIC_DEPLOY === "true";
let snapshotEndpointUnavailable = IS_STATIC_DEPLOY;

export const useFetchASRData = () => {
  const setData = useDataStore((s) => s.setData);
  const setFetchStatus = useDataStore((s) => s.setFetchStatus);
  const refreshTrigger = useDataStore((s) => s.refreshTrigger);
  const initialDataConsumed = useRef(false);
  const lastSyncAtRef = useRef<number>(0);
  const inFlightRef = useRef<boolean>(false);

  const fetchData = useCallback(
    async (isInitialFetch: boolean = true) => {
      if (inFlightRef.current && !isInitialFetch) return;
      inFlightRef.current = true;
      setFetchStatus({ isSyncing: true, hasError: false });

      const RAW_CSV_KEY = `${CONFIG.SNAPSHOT_KEY}_raw_csvs`;
      const ETAG_KEY = `${CONFIG.SNAPSHOT_KEY}_etag`;
      let restored = false;

      if (isInitialFetch) {
        // Stage 1: Legacy inline SSR Data (if present)
        if (!initialDataConsumed.current) {
          const ssrData =
            typeof window !== "undefined" && "window" in globalThis
              ? (window as unknown as { __INITIAL_DATA__?: Partial<ASRDataState> }).__INITIAL_DATA__
              : undefined;
          if (ssrData) {
            setData({ ...ssrData, isLoading: false });
            initialDataConsumed.current = true;
            restored = true;
          }
        }

        // Stage 2: localforage precomputed snapshot (supports both compact & full formats)
        if (!restored) {
          try {
            const cachedSnap = await localforage.getItem<CompactSnapshotWire | ComputedASRState>(CONFIG.SNAPSHOT_KEY);
            if (cachedSnap && Array.isArray(cachedSnap.masterCourseList)) {
              const hydrated = hydrateSnapshot(cachedSnap);
              setData({ ...hydrated, isLoading: false });
              restored = true;
            }
          } catch (e) {
            console.warn("Failed to retrieve snapshot from localforage:", e);
          }
        }

        // Stage 3: Cached raw CSVs hydrated via worker
        if (!restored) {
          try {
            const rawCached = await localforage.getItem<Record<string, string>>(RAW_CSV_KEY);
            if (rawCached && rawCached.rM && rawCached.rF && rawCached.rLive) {
              const resultingData = await runComputeInWorker(
                {
                  rM: rawCached.rM,
                  rF: rawCached.rF,
                  rLive: rawCached.rLive,
                  rSet: rawCached.rSet || "",
                  hasTotalError: false,
                  hasPartialError: false,
                },
                5000,
              );
              setData({ ...resultingData, isLoading: false });
              restored = true;
            }
          } catch (e) {
            console.warn("Failed to hydrate cached raw sheets from localforage:", e);
          }
        }

        if (!restored) {
          setFetchStatus({ isLoading: true });
        } else {
          setFetchStatus({ isLoading: false, isSyncing: true });
        }
      }

      try {
        // Fast path: fetch precomputed compressed snapshot with ETag validation
        // Skipped on static deploys (e.g. GitHub Pages) where /api/snapshot does not exist
        let snapshotHandled = false;
        if (!snapshotEndpointUnavailable) {
          try {
            const savedEtag = restored || !isInitialFetch
              ? await localforage.getItem<string>(ETAG_KEY)
              : null;
            const headers: Record<string, string> = {};
            if (savedEtag) {
              headers["If-None-Match"] = savedEtag;
            }
            const snapRes = await fetch(
              `/api/snapshot?v=${encodeURIComponent(CONFIG.SNAPSHOT_KEY)}`,
              { headers, cache: "no-cache" },
            );
            const contentType = snapRes.headers.get("content-type") || "";
            if (snapRes.status === 304) {
              lastSyncAtRef.current = Date.now();
              setFetchStatus({ isLoading: false, isSyncing: false, hasError: false });
              snapshotHandled = true;
            } else if (snapRes.ok && contentType.includes("application/json")) {
              const snapPayload = (await snapRes.json()) as CompactSnapshotWire | ComputedASRState;
              if (snapPayload && Array.isArray(snapPayload.masterCourseList)) {
                const nextEtag = snapRes.headers.get("etag");
                const hydrated = hydrateSnapshot(snapPayload);
                setData({ ...hydrated, isLoading: false });
                setFetchStatus({ isSyncing: false, hasError: false });
                lastSyncAtRef.current = Date.now();
                snapshotHandled = true;
                try {
                  await localforage.setItem(CONFIG.SNAPSHOT_KEY, snapPayload);
                  if (nextEtag) await localforage.setItem(ETAG_KEY, nextEtag);
                } catch (storageError) {
                  console.warn("Could not write snapshot cache to localforage.", storageError);
                }
              }
            } else if (snapRes.status === 404 || !contentType.includes("application/json")) {
              snapshotEndpointUnavailable = true;
            }
          } catch {
            // Static deploy or offline: gracefully fall back to direct Google Sheets CSVs
          }
        }

        if (snapshotHandled) {
          return;
        }

        // Fallback path: direct 4-CSV fetch + Web Worker compute (GitHub Pages / static builds)
        const { fetchGoogleSheetCSV } = await import("../lib/asr-data");
        const safeFetch = async (gid: string, retries: number = 2) => {
          for (let i = 0; i <= retries; i++) {
            try {
              return await fetchGoogleSheetCSV(CONFIG.SPREADSHEET_ID, gid);
            } catch (e) {
              if (i === retries) {
                console.error(`Final fetch failure for sheet ${gid}:`, e);
                return null;
              }
              await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
            }
          }
          return null;
        };

        const [rM, rF, rLive, rSet] = await Promise.all([
          safeFetch(CONFIG.SHEET_GIDS.MENS),
          safeFetch(CONFIG.SHEET_GIDS.WOMENS),
          safeFetch(CONFIG.SHEET_GIDS.LIVE),
          safeFetch(CONFIG.SHEET_GIDS.SETS),
        ]);

        const hasTotalError = rM === null && rF === null && rLive === null;
        const hasPartialError =
          !hasTotalError &&
          (rM === null || rF === null || rLive === null || rSet === null);

        if (hasTotalError && !isInitialFetch) {
          setFetchStatus({ isSyncing: false, hasError: true });
          return;
        }

        if (!hasTotalError) {
          try {
            const oldCsvs = await localforage.getItem<Record<string, string | null>>(RAW_CSV_KEY);
            if (oldCsvs && !isInitialFetch) {
              if (
                oldCsvs.rM === rM &&
                oldCsvs.rF === rF &&
                oldCsvs.rLive === rLive &&
                oldCsvs.rSet === rSet
              ) {
                lastSyncAtRef.current = Date.now();
                setFetchStatus({ isSyncing: false });
                return;
              }
            }
            await localforage.setItem(RAW_CSV_KEY, { rM, rF, rLive, rSet });
          } catch (e) {
            console.warn("Could not cache raw CSVs to localforage.", e);
          }
        }

        let resultingData: Partial<ASRDataState>;
        try {
          resultingData = await runComputeInWorker({
            rM: rM || "",
            rF: rF || "",
            rLive: rLive || "",
            rSet: rSet || "",
            hasTotalError,
            hasPartialError,
          });
        } catch (workerErr) {
          console.warn("Worker failed, falling back to main-thread compute:", workerErr);
          const { computeAllState } = await import("../lib/asr-data-compute");
          resultingData = computeAllState({
            rM: rM || "",
            rF: rF || "",
            rLive: rLive || "",
            rSet: rSet || "",
            hasTotalError,
            hasPartialError,
          }) as unknown as Partial<ASRDataState>;
        }

        setData({ ...resultingData, isLoading: false });
        setFetchStatus({ isSyncing: false });
        lastSyncAtRef.current = Date.now();

        try {
          const compact = dehydrateSnapshot(resultingData as unknown as ComputedASRState);
          await localforage.setItem(CONFIG.SNAPSHOT_KEY, compact);
        } catch (storageError) {
          console.warn("Could not write cache to localforage.", storageError);
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : "Unknown Error";
        trackEvent("exception", {
          description: "sheet_fetch_failed",
          error: errorMessage,
          fatal: true,
        });
        setFetchStatus({ isLoading: false, isSyncing: false, hasError: true });
      } finally {
        inFlightRef.current = false;
      }
    },
    [setData, setFetchStatus],
  );

  useEffect(() => {
    fetchData(true);
    const intervalMs = CONFIG.REFRESH_INTERVAL || 300000;

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      fetchData(false);
    }, intervalMs);

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastSyncAtRef.current >= intervalMs
      ) {
        fetchData(false);
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      clearInterval(interval);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [fetchData]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchData(false);
    }
  }, [refreshTrigger, fetchData]);
};
