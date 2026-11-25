import crypto from "crypto";
import zlib from "zlib";
import {
  normalizeName,
  CONFIG,
  getCombinedFlags,
  formatOgLocation,
} from "./lib/asr-utils.ts";
import { computeAllState } from "./lib/asr-data-compute.ts";
import { dehydrateSnapshot } from "./lib/asr-snapshot.ts";
import type { ComputedASRState, CourseData, PlayerProfile } from "./types.ts";

export interface MetaData {
  title: string;
  description: string;
  ogType?: "player" | "course";
  ogStats?: { value: string; label: string }[];
  ogMapCoords?: [number, number] | null;
}

export interface SnapshotBundle {
  state: ComputedASRState;
  json: string;
  gzipBuffer: Buffer;
  etag: string;
  lastUpdated: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedData: ComputedASRState | null = null;
let cachedBundle: SnapshotBundle | null = null;
let lastFetchTime = 0;
let inflightFetch: Promise<ComputedASRState> | null = null;

function buildSnapshotBundle(state: ComputedASRState): SnapshotBundle {
  const json = JSON.stringify(dehydrateSnapshot(state));
  const gzipBuffer = zlib.gzipSync(Buffer.from(json, "utf8"), { level: 6 });
  const hash = crypto.createHash("sha1").update(json).digest("hex").slice(0, 16);
  return {
    state,
    json,
    gzipBuffer,
    etag: `"asr-${hash}"`,
    lastUpdated: Date.now(),
  };
}

async function fetchSheets(): Promise<ComputedASRState> {
  const getProxyUrl = (gid: string) =>
    `https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;

  const fetchWithRetry = async (url: string) => {
    for (let i = 0; i < 3; i++) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(15000),
        });
        if (res.ok) return await res.text();
      } catch {
        // retry
      }
    }
    return "";
  };

  const [mensCsv, womensCsv, liveCsv, setsCsv] = await Promise.all([
    fetchWithRetry(getProxyUrl(CONFIG.SHEET_GIDS.MENS)),
    fetchWithRetry(getProxyUrl(CONFIG.SHEET_GIDS.WOMENS)),
    fetchWithRetry(getProxyUrl(CONFIG.SHEET_GIDS.LIVE)),
    fetchWithRetry(getProxyUrl(CONFIG.SHEET_GIDS.SETS)),
  ]);

  const hasTotalError = !mensCsv && !womensCsv && !liveCsv;
  const hasPartialError = !hasTotalError && (!mensCsv || !womensCsv || !liveCsv || !setsCsv);

  if (hasTotalError && cachedData) {
    // Keep last known good snapshot on total upstream outage
    lastFetchTime = Date.now() - CACHE_TTL_MS + 60_000;
    return cachedData;
  }

  const parsedState = computeAllState({
    rM: mensCsv,
    rF: womensCsv,
    rLive: liveCsv,
    rSet: setsCsv,
    hasTotalError,
    hasPartialError,
  }) as unknown as ComputedASRState;

  cachedData = parsedState;
  cachedBundle = buildSnapshotBundle(parsedState);
  lastFetchTime = Date.now();
  return cachedData;
}

function triggerRefresh(): Promise<ComputedASRState> {
  if (!inflightFetch) {
    inflightFetch = fetchSheets().finally(() => {
      inflightFetch = null;
    });
  }
  return inflightFetch;
}

async function ensureCachedData(): Promise<ComputedASRState | null> {
  const isStale = Date.now() - lastFetchTime > CACHE_TTL_MS;
  if (!cachedData) {
    try {
      return await triggerRefresh();
    } catch (e) {
      console.error("Meta fetch failed", e);
      return null;
    }
  }
  if (isStale) {
    // Stale-while-revalidate: serve immediately and refresh in background
    triggerRefresh().catch((e) => console.error("Background sheet refresh failed", e));
  }
  return cachedData;
}

export async function getSnapshotBundle(): Promise<SnapshotBundle | null> {
  const data = await ensureCachedData();
  if (!data) return null;
  if (!cachedBundle || cachedBundle.state !== data) {
    cachedBundle = buildSnapshotBundle(data);
  }
  return cachedBundle;
}

export function resolvePageMeta(
  state: ComputedASRState | null,
  urlPath: string,
  searchParams: URLSearchParams,
): MetaData {
  const baseTitle = "APEX SPEED RUN";
  const baseDesc = "FINDING THE FASTEST HUMANS IRL 🌎 🌍 🌏";

  if (!state) return { title: baseTitle, description: baseDesc };

  let title = baseTitle;
  let description = baseDesc;
  let ogType: "player" | "course" | undefined;
  let ogStats: { value: string; label: string }[] | undefined;
  let ogMapCoords: [number, number] | null = null;

  try {
    const parts = urlPath.replace(/^\//, "").split("/");
    const rawEvent = searchParams.get("eventType");
    const eventType = rawEvent === "2026" ? "2026" : rawEvent === "open" ? "open" : "all-time";

    if (parts[0] === "players" && parts[1]) {
      const slug = normalizeName(decodeURIComponent(parts[1]));
      const isAllTime = eventType === "all-time";

      const rankData = isAllTime
        ? state.data || []
        : eventType === "2026"
          ? state.season26Data || []
          : state.openData || [];
      const player = rankData.find((p: PlayerProfile) => normalizeName(p.name || "") === slug);

      if (player) {
        const flags = getCombinedFlags(player).trim();
        const titlePrefix = flags ? `${flags} ` : "";
        title = `${titlePrefix}${player.name.toUpperCase()}`;
        const leaderboards = isAllTime
          ? state.playerLB_AT
          : eventType === "2026"
            ? state.playerLB_2026
            : state.playerLB_OP;
        const gender = player.gender || "M";
        const pKey = player.pKey || normalizeName(player.name || "");
        const lbRank = leaderboards?.[gender]?.[pKey]?.rank;
        const rank = lbRank || "UR";
        const rating = player.rating ? player.rating.toFixed(2) : "0.00";
        const gym =
          player.homeGym && player.homeGym !== CONFIG.FALLBACKS.UNAFFILIATED
            ? player.homeGym
            : player.countryName && player.countryName !== CONFIG.FALLBACKS.UNKNOWN_LOCATION
              ? player.countryName
              : "Unknown Location";

        const coursesCount = player.courses || 0;
        const runsCount = player.runs || 0;
        const winsCount = player.wins || 0;
        const firesCount = isAllTime
          ? player.allTimeFireCount || 0
          : eventType === "2026"
            ? player.season26FireCount || 0
            : player.openFireCount || 0;

        let newDesc = `COURSES: ${coursesCount} | RUNS: ${runsCount}`;
        if (winsCount > 0) newDesc += ` | WR: ${winsCount}`;
        if (firesCount > 0) newDesc += ` | 🔥 ${firesCount}`;

        if (isAllTime) {
          description = newDesc.toUpperCase();
        } else if (eventType === "2026") {
          description = `2026 SEASON STATS: ${rating} RATING | 2026 RANK: ${rank || "UR"} | GYM: ${gym}`.toUpperCase();
        } else {
          description = `OPEN SEASON STATS: ${rating} RATING | OPEN RANK: ${rank || "UR"} | GYM: ${gym}`.toUpperCase();
        }

        const setterData = (state.settersWithImpact || []).find(
          (s) => normalizeName(s.name) === slug,
        );
        const setsCount = setterData?.sets || 0;
        const impactCount = setterData?.impact || 0;

        ogType = "player";
        ogStats = [
          { value: rating, label: "LQ" },
          { value: rank === "UR" ? "UR" : `${rank}`, label: "RANK" },
        ];

        if (setsCount > 0) {
          ogStats.push({ value: setsCount.toString(), label: "SETS" });
        }
        if (impactCount > 0) {
          ogStats.push({ value: impactCount.toString(), label: "IMPACT" });
        }

        const completedCourses: string[] = [];
        const allCourses = Object.keys(state.cMet || {});
        for (const c of allCourses) {
          if (
            state.lbAT?.M?.[c]?.[pKey] ||
            state.lbAT?.F?.[c]?.[pKey] ||
            state.lbSeason26?.M?.[c]?.[pKey] ||
            state.lbSeason26?.F?.[c]?.[pKey]
          ) {
            completedCourses.push(c);
          }
        }
        const coursesWithCoords = completedCourses.filter(
          (c) => state.cMet?.[c]?.parsedCoords,
        );
        const pool = coursesWithCoords.length > 0 ? coursesWithCoords : completedCourses;
        const selectedCourse = pool.length > 0 ? pool[0] : null;
        ogMapCoords =
          selectedCourse && state.cMet?.[selectedCourse]
            ? state.cMet[selectedCourse].parsedCoords || null
            : null;
      }
    } else if (parts[0] === "courses" && parts[1]) {
      const slug = normalizeName(decodeURIComponent(parts[1]));
      const masterCourse = (state.masterCourseList || []).find(
        (c) => normalizeName(c.name || "") === slug,
      );
      const courseStr =
        masterCourse?.name?.toUpperCase() ||
        Object.keys(state.cMet || {}).find((c) => normalizeName(c) === slug);
      if (courseStr) {
        const cMetInfo = state.cMet?.[courseStr];
        const courseInfo: CourseData = {
          ...(cMetInfo || {}),
          ...(masterCourse || {}),
          name: masterCourse?.name || cMetInfo?.name || courseStr,
        };
        const flags = getCombinedFlags(courseInfo).trim();
        const titlePrefix = flags ? `${flags} ` : "";
        title = `${titlePrefix}${courseStr.toUpperCase()} SPEED RUN`;

        const isAllTime = eventType === "all-time";
        const leaderboards = isAllTime
          ? state.lbAT
          : eventType === "2026"
            ? state.lbSeason26
            : state.lbOpen;

        let mBest = Infinity;
        let fBest = Infinity;

        if (leaderboards) {
          const mData = leaderboards.M?.[courseStr] || {};
          const fData = leaderboards.F?.[courseStr] || {};

          const mTimes = Object.values(mData);
          const fTimes = Object.values(fData);

          if (mTimes.length) mBest = Math.min(...mTimes);
          if (fTimes.length) fBest = Math.min(...fTimes);
        }

        const locStr = formatOgLocation(courseInfo);
        description = `📍 ${locStr}`;
        ogType = "course";
        const recordPrefix = isAllTime ? "WR" : eventType === "2026" ? "2026" : "OPEN";
        ogStats = [
          { value: mBest !== Infinity ? mBest.toFixed(2) : "--", label: `${recordPrefix} (M)` },
          { value: fBest !== Infinity ? fBest.toFixed(2) : "--", label: `${recordPrefix} (W)` },
        ];
        ogMapCoords = courseInfo.parsedCoords || null;
      }
    }
  } catch (e) {
    console.error("Meta evaluation error", e);
  }

  return { title, description, ogType, ogStats, ogMapCoords };
}

export async function getPageMeta(urlPath: string, searchParams: URLSearchParams): Promise<MetaData> {
  const data = await ensureCachedData();
  return resolvePageMeta(data, urlPath, searchParams);
}
