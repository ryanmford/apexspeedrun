import React, { useMemo, useState, useEffect } from "react";
import {
  Swords,
  RefreshCw,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  cn,
  formatLocation,
  getCombinedFlags,
  normalizeName,
  isPlaceholderPlayer,
  THEME,
} from "../../lib/asr-utils";
import { normalizeForSearch } from "../../lib/utils";
import { ASRSearchInput } from "../common/ASRSearchInput";
import { ASREmptyState } from "../common/ASREmptyState";
import { FallbackAvatar } from "../common/FallbackAvatar";
import { SectionTitle } from "./InspectorComponents";
import { useAppStore } from "../../store/useAppStore";
import { PlayerProfile, ASRDataContext } from "../../types";

interface ASRRivalryDrawerProps {
  playerA: PlayerProfile & Record<string, unknown>;
  dataContext: ASRDataContext;
  onEntityClick: (type: string, data: Record<string, unknown>) => void;
  theme: "light" | "dark";
}

interface RawRunItem {
  label?: string;
  course?: string;
  num?: number;
  time?: number;
  points?: number;
  pts?: number;
  rank?: number;
  date?: string | null;
  videoUrl?: string;
}

interface AthleteSummaryStats {
  pKey: string;
  name: string;
  meta: PlayerProfile & Record<string, unknown>;
  rank: number | string;
  rating: number;
  pts: number;
  wins: number;
  courses: number;
  runs: number;
  wrPct: number;
}

const formatRank = (r: number | string | undefined) =>
  !r || r === "UR" ? "UR" : String(r);

export const ASRRivalryDrawer = React.memo(
  ({
    playerA,
    dataContext,
    onEntityClick,
    theme,
  }: ASRRivalryDrawerProps) => {
    const isRivalryOpen = useAppStore((s) => s.isRivalryOpen);
    const setIsRivalryOpen = useAppStore((s) => s.setIsRivalryOpen);
    const rivalryOpponentKey = useAppStore((s) => s.rivalryOpponentKey);
    const setRivalryOpponentKey = useAppStore((s) => s.setRivalryOpponentKey);

    const [searchQuery, setSearchQuery] = useState("");
    const [isPickingRival, setIsPickingRival] = useState(false);

    const atMet = useMemo(
      () => (dataContext.atMet || {}) as Record<string, PlayerProfile & Record<string, unknown>>,
      [dataContext.atMet],
    );
    const cMet = useMemo(
      () => (dataContext.cMet || {}) as Record<string, Record<string, unknown>>,
      [dataContext.cMet],
    );
    const pRaw = useMemo(
      () => (dataContext.pRaw || {}) as Record<string, Record<string, RawRunItem[]>>,
      [dataContext.pRaw],
    );

    const pKeyA = playerA.pKey || normalizeName(playerA.name);
    const metaA = atMet[pKeyA] || playerA;
    const genderA = (metaA.gender as "M" | "F") || "M";

    // Prevent stale cross-gender opponent when switching between Men's and Women's profiles
    const effectiveRivalKey = useMemo(() => {
      if (!rivalryOpponentKey || rivalryOpponentKey === pKeyA) return null;
      const oppMeta = atMet[rivalryOpponentKey];
      if (!oppMeta) return null;
      if ((oppMeta.gender || "M") !== genderA) return null;
      return rivalryOpponentKey;
    }, [rivalryOpponentKey, pKeyA, atMet, genderA]);

    // Reset local picker/search state when card collapses or primary athlete changes
    useEffect(() => {
      if (!isRivalryOpen) {
        setSearchQuery("");
        setIsPickingRival(false);
      }
    }, [isRivalryOpen, pKeyA]);

    const activeLB = useMemo(() => {
      const lb = dataContext.lbAT;
      return {
        ...((lb?.M || {}) as Record<string, Record<string, unknown>>),
        ...((lb?.F || {}) as Record<string, Record<string, unknown>>),
      };
    }, [dataContext.lbAT]);

    const getAthleteStats = React.useCallback(
      (pKey: string, fallbackMeta?: PlayerProfile & Record<string, unknown>): AthleteSummaryStats => {
        const meta =
          atMet[pKey] ||
          fallbackMeta ||
          ({
            pKey,
            name: pKey,
            gender: "M",
            rating: 0,
            runs: 0,
          } as PlayerProfile & Record<string, unknown>);
        const lbEntry = activeLB[pKey] || {};
        const rawRuns = pRaw["all-time"]?.[pKey] || [];

        const rank = (lbEntry.rank as number | string) || "UR";
        const rating = Number(lbEntry.rating ?? meta.rating ?? 0);
        const pts = Number(
          lbEntry.pts ??
            rawRuns.reduce((sum, r) => sum + Number(r.points ?? r.pts ?? 0), 0),
        );
        const courses = Number(lbEntry.courses ?? rawRuns.length ?? 0);
        const runs = Number(lbEntry.runs ?? rawRuns.length ?? 0);
        const wins = Number(
          lbEntry.wins ?? rawRuns.filter((r) => r.rank === 1).length ?? 0,
        );
        const denom = courses || runs;
        const wrPct = denom > 0 ? (wins / denom) * 100 : 0;

        return {
          pKey,
          name: String(meta.name || pKey),
          meta,
          rank,
          rating,
          pts,
          wins,
          courses,
          runs,
          wrPct,
        };
      },
      [atMet, activeLB, pRaw],
    );

    const statsA = useMemo(
      () => getAthleteStats(pKeyA, metaA),
      [getAthleteStats, pKeyA, metaA],
    );

    const statsB = useMemo(
      () => (effectiveRivalKey ? getAthleteStats(effectiveRivalKey) : null),
      [effectiveRivalKey, getAthleteStats],
    );

    // Build candidate pool with shared course counts for smart rival suggestions
    const candidateAthletes = useMemo(() => {
      const allTimeRunsAMap = new Set(
        (pRaw["all-time"]?.[pKeyA] || []).map((r) =>
          String(r.label || r.course || "").toUpperCase(),
        ),
      );

      const list: Array<{
        pKey: string;
        name: string;
        meta: PlayerProfile & Record<string, unknown>;
        rating: number;
        rank: number | string;
        sharedCount: number;
        sameGender: boolean;
        searchStr: string;
      }> = [];

      Object.entries(atMet).forEach(([k, m]) => {
        if (k === pKeyA) return;
        if (!m || !m.name || isPlaceholderPlayer(m.name)) return;

        const atRuns = pRaw["all-time"]?.[k] || [];
        if (atRuns.length === 0) return;

        let shared = 0;
        atRuns.forEach((r) => {
          const cName = String(r.label || r.course || "").toUpperCase();
          if (cName && allTimeRunsAMap.has(cName)) shared++;
        });

        const lbData = activeLB[k] || {};
        const rating = Number(lbData.rating ?? m.rating ?? 0);
        const rank = (lbData.rank as number | string) || "UR";

        list.push({
          pKey: k,
          name: m.name,
          meta: m,
          rating,
          rank,
          sharedCount: shared,
          sameGender: (m.gender || "M") === genderA,
          searchStr:
            (m.searchKey as string) ||
            normalizeForSearch(
              `${m.name} ${m.location || ""} ${m.countryName || ""} ${m.homeGym || ""}`,
            ),
        });
      });

      // Sort: same gender with shared courses first, then by sharedCount desc, then by smallest LQ difference
      list.sort((a, b) => {
        if (a.sameGender !== b.sameGender) return a.sameGender ? -1 : 1;
        if (b.sharedCount !== a.sharedCount)
          return b.sharedCount - a.sharedCount;
        const diffA = Math.abs(a.rating - statsA.rating);
        const diffB = Math.abs(b.rating - statsA.rating);
        return diffA - diffB;
      });

      return list;
    }, [atMet, pRaw, pKeyA, genderA, activeLB, statsA.rating]);

    const filteredCandidates = useMemo(() => {
      const q = normalizeForSearch(searchQuery);
      if (!q) return candidateAthletes.filter((c) => c.sameGender).slice(0, 25);
      return candidateAthletes
        .filter((c) => c.searchStr.includes(q))
        .slice(0, 40);
    }, [candidateAthletes, searchQuery]);

    // Shared courses calculation
    const sharedCoursesData = useMemo(() => {
      if (!effectiveRivalKey) {
        return {
          items: [],
          winsA: 0,
          winsB: 0,
          ties: 0,
          winPctA: 0,
          winPctB: 0,
          avgMargin: 0,
        };
      }

      const runsA = pRaw["all-time"]?.[pKeyA] || [];
      const runsB = pRaw["all-time"]?.[effectiveRivalKey] || [];

      const mapA = new Map<string, RawRunItem>();
      runsA.forEach((r) => {
        const cKey = String(r.label || r.course || "").toUpperCase();
        if (cKey) mapA.set(cKey, r);
      });

      const shared: Array<{
        courseKey: string;
        courseName: string;
        flag: string;
        city: string;
        timeA: number;
        timeB: number;
        ptsA: number;
        ptsB: number;
        rankA: number;
        rankB: number;
        diff: number; // timeA - timeB (negative means A was faster)
        absDiff: number;
        winner: "A" | "B" | "TIE";
      }> = [];

      let winsA = 0;
      let winsB = 0;
      let ties = 0;
      let totalAbsDiff = 0;

      runsB.forEach((rB) => {
        const cKey = String(rB.label || rB.course || "").toUpperCase();
        const rA = mapA.get(cKey);
        if (!rA) return;

        const timeA = Number(rA.num ?? rA.time ?? 0);
        const timeB = Number(rB.num ?? rB.time ?? 0);
        if (timeA <= 0 || timeB <= 0) return;

        const ptsA = Number(rA.points ?? rA.pts ?? 0);
        const ptsB = Number(rB.points ?? rB.pts ?? 0);
        const rankA = Number(rA.rank ?? 0);
        const rankB = Number(rB.rank ?? 0);

        const diff = timeA - timeB;
        const absDiff = Math.abs(diff);
        totalAbsDiff += absDiff;

        let winner: "A" | "B" | "TIE" = "TIE";
        if (diff < -0.0001) {
          winner = "A";
          winsA++;
        } else if (diff > 0.0001) {
          winner = "B";
          winsB++;
        } else {
          ties++;
        }

        const cInfo = cMet[cKey] || {};
        shared.push({
          courseKey: cKey,
          courseName: String(rA.label || rB.label || cKey),
          flag: String(cInfo.flag || "🏳️"),
          city: String(cInfo.city || cInfo.country || ""),
          timeA,
          timeB,
          ptsA,
          ptsB,
          rankA,
          rankB,
          diff,
          absDiff,
          winner,
        });
      });

      // Sort shared courses by tightest race (smallest absDiff) first
      shared.sort((a, b) => a.absDiff - b.absDiff);

      const total = shared.length;
      return {
        items: shared,
        winsA,
        winsB,
        ties,
        winPctA: total > 0 ? (winsA / total) * 100 : 0,
        winPctB: total > 0 ? (winsB / total) * 100 : 0,
        avgMargin: total > 0 ? totalAbsDiff / total : 0,
      };
    }, [effectiveRivalKey, pRaw, pKeyA, cMet]);

    const showPicker = !effectiveRivalKey || isPickingRival;

    const compareBetter = (
      valA: number | string,
      valB: number | string,
      lowerIsBetter = false,
    ): "A" | "B" | "TIE" => {
      if (lowerIsBetter) {
        const numA = typeof valA === "number" ? valA : Infinity;
        const numB = typeof valB === "number" ? valB : Infinity;
        if (numA === numB) return "TIE";
        return numA < numB ? "A" : "B";
      }
      const nA = Number(valA) || 0;
      const nB = Number(valB) || 0;
      if (Math.abs(nA - nB) < 0.001) return "TIE";
      return nA > nB ? "A" : "B";
    };

    return (
      <div
        className={cn(
          "w-full transition-all duration-300 rounded-[1.5rem] border overflow-hidden",
          THEME.BENTO_CARD(theme),
          isRivalryOpen &&
            (theme === "dark"
              ? "border-violet-500/30"
              : "border-violet-500/30"),
        )}
      >
        {/* Collapsible Bento Header */}
        <button
          type="button"
          onClick={() => {
            const next = !isRivalryOpen;
            setIsRivalryOpen(next);
            if (!next) {
              setIsPickingRival(false);
            }
          }}
          className="w-full px-4 py-3 flex items-center justify-between outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border transition-colors",
                theme === "dark"
                  ? "bg-violet-500/15 text-violet-400 border-violet-500/30"
                  : "bg-violet-500/10 text-violet-600 border-violet-500/20",
              )}
            >
              <Swords size={18} />
            </div>
            <div className="flex flex-col text-left justify-center min-w-0">
              <span
                className={cn(
                  "font-black tracking-tight text-[15px] leading-[1] uppercase truncate",
                  "theme-text-base",
                )}
              >
                HEAD-TO-HEAD RIVALRY
              </span>
              <span
                className={cn(
                  "text-[11px] uppercase tracking-wider font-semibold opacity-60 leading-[1] mt-1 truncate",
                  "theme-text-faint",
                )}
              >
                {statsB ? `VS. ${statsB.name}` : "Compare stats & shared courses"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {statsB && (
              <div
                className={cn(
                  "px-2.5 py-1 rounded-lg border text-[11px] font-black tabular-nums tracking-tight flex items-center gap-1.5",
                  theme === "dark"
                    ? "bg-violet-500/10 border-violet-500/25 text-white"
                    : "bg-violet-50 border-violet-200 text-zinc-900",
                )}
              >
                <span
                  className={cn(
                    sharedCoursesData.winsA > sharedCoursesData.winsB
                      ? "text-blue-500"
                      : "",
                  )}
                >
                  {sharedCoursesData.winsA}
                </span>
                <span className="opacity-30">-</span>
                <span
                  className={cn(
                    sharedCoursesData.winsB > sharedCoursesData.winsA
                      ? "text-red-500"
                      : "",
                  )}
                >
                  {sharedCoursesData.winsB}
                </span>
              </div>
            )}
            <div className="flex items-center justify-center">
              {isRivalryOpen ? (
                <ChevronUp size={20} className="opacity-50" />
              ) : (
                <ChevronDown size={20} className="opacity-50" />
              )}
            </div>
          </div>
        </button>

        {/* Expanded Rivalry Body */}
        {isRivalryOpen && (
          <div
            className={cn(
              "px-4 pb-5 pt-4 animate-in slide-in-from-top-4 fade-in duration-300 flex flex-col gap-5 border-t",
              theme === "dark" ? "border-white/5" : "border-black/5",
            )}
          >
            {showPicker ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <SectionTitle noPadding>
                    SELECT OPPONENT FOR {statsA.name}
                  </SectionTitle>
                  {effectiveRivalKey && (
                    <button
                      type="button"
                      onClick={() => setIsPickingRival(false)}
                      className="text-[10px] font-black uppercase tracking-widest text-violet-500 hover:underline"
                    >
                      CANCEL
                    </button>
                  )}
                </div>

                <ASRSearchInput
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  theme={theme}
                  placeholder="Search athlete by name, city, or gym..."
                />

                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 pl-1">
                    {searchQuery.trim()
                      ? "MATCHING ATHLETES"
                      : "SUGGESTED RIVALS"}
                  </span>

                  {filteredCandidates.length > 0 ? (
                    <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto overscroll-contain pr-0.5">
                      {filteredCandidates.map((cand) => (
                        <button
                          type="button"
                          key={cand.pKey}
                          onClick={() => {
                            setRivalryOpponentKey(cand.pKey);
                            setSearchQuery("");
                            setIsPickingRival(false);
                          }}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-2xl border text-left transition-colors active:scale-[0.99] shrink-0",
                            theme === "dark"
                              ? "bg-zinc-900/60 border-white/10 hover:bg-zinc-900 hover:border-violet-500/30"
                              : "bg-white border-black/10 hover:bg-zinc-50 hover:border-violet-500/30 shadow-sm",
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-zinc-900 border border-white/10 flex items-center justify-center">
                              <FallbackAvatar
                                name={cand.name}
                                sizeCls="text-sm"
                              />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs shrink-0">
                                  {getCombinedFlags(cand.meta)}
                                </span>
                                <span
                                  className={cn(
                                    "text-sm font-black uppercase tracking-tight truncate",
                                    theme === "dark"
                                      ? "text-white"
                                      : "text-zinc-900",
                                  )}
                                >
                                  {cand.name}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 truncate">
                                {formatLocation(cand.meta)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {cand.sharedCount > 0 && (
                              <span
                                className={cn(
                                  "px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border",
                                  theme === "dark"
                                    ? "bg-violet-500/15 border-violet-500/30 text-violet-400"
                                    : "bg-violet-50 border-violet-200 text-violet-600",
                                )}
                              >
                                {cand.sharedCount} SHARED
                              </span>
                            )}
                            <div className="flex flex-col items-end">
                              <span
                                className={cn(
                                  "text-xs font-black tabular-nums",
                                  theme === "dark"
                                    ? "text-white"
                                    : "text-zinc-900",
                                )}
                              >
                                {cand.rating.toFixed(2)} LQ
                              </span>
                              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                {formatRank(cand.rank)}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <ASREmptyState
                      theme={theme}
                      title="NO ATHLETES FOUND"
                      message="NO PLAYERS MATCH YOUR SEARCH."
                    />
                  )}
                </div>
              </div>
            ) : (
              statsB && (
                <>
                  {/* Action Row for Switching Rival */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 pl-1">
                      ACTIVE MATCHUP
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setIsPickingRival(true);
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-colors active:scale-95",
                        theme === "dark"
                          ? "border-violet-500/30 bg-violet-950/30 text-violet-300 hover:bg-violet-900/40"
                          : "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100",
                      )}
                    >
                      <RefreshCw size={11} />
                      <span>CHANGE RIVAL</span>
                    </button>
                  </div>

                  {/* Top Versus Banner */}
                  <div
                    className={cn(
                      "rounded-[1.5rem] border p-4 sm:p-5 flex flex-col gap-4",
                      theme === "dark"
                        ? "bg-zinc-950 border-white/10"
                        : "bg-white border-black/10 shadow-sm",
                    )}
                  >
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
                      {/* Athlete A */}
                      <div className="flex flex-col items-center text-center min-w-0">
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-zinc-900 border-2 border-blue-500/60 flex items-center justify-center mb-2">
                          <FallbackAvatar name={statsA.name} sizeCls="text-xl" />
                        </div>
                        <div className="flex items-center justify-center gap-1 w-full">
                          <span className="text-xs shrink-0">
                            {getCombinedFlags(statsA.meta)}
                          </span>
                          <span
                            className={cn(
                              "text-xs sm:text-sm font-black uppercase tracking-tight truncate",
                              theme === "dark" ? "text-white" : "text-zinc-900",
                            )}
                          >
                            {statsA.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 truncate max-w-full tabular-nums">
                          {formatRank(statsA.rank)}, {statsA.rating.toFixed(2)}
                        </span>
                      </div>

                      {/* Center H2H Record */}
                      <div className="flex flex-col items-center justify-center px-2">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">
                          COURSE H2H
                        </span>
                        <div
                          className={cn(
                            "px-3 py-1.5 rounded-xl border flex items-center gap-2 font-black text-lg sm:text-xl tabular-nums tracking-tight",
                            theme === "dark"
                              ? "bg-zinc-900 border-white/10 text-white"
                              : "bg-zinc-100 border-black/10 text-zinc-900",
                          )}
                        >
                          <span
                            className={cn(
                              sharedCoursesData.winsA > sharedCoursesData.winsB
                                ? "text-blue-500"
                                : "",
                            )}
                          >
                            {sharedCoursesData.winsA}
                          </span>
                          <span className="opacity-30 text-sm">-</span>
                          <span
                            className={cn(
                              sharedCoursesData.winsB > sharedCoursesData.winsA
                                ? "text-red-500"
                                : "",
                            )}
                          >
                            {sharedCoursesData.winsB}
                          </span>
                        </div>
                        {sharedCoursesData.ties > 0 && (
                          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mt-1">
                            {sharedCoursesData.ties}{" "}
                            {sharedCoursesData.ties === 1 ? "TIE" : "TIES"}
                          </span>
                        )}
                      </div>

                      {/* Athlete B */}
                      <button
                        type="button"
                        onClick={() => {
                          setRivalryOpponentKey(pKeyA);
                          setIsRivalryOpen(false);
                          setIsPickingRival(false);
                          onEntityClick("player", {
                            ...statsB.meta,
                            name: statsB.name,
                            pKey: statsB.pKey,
                          });
                        }}
                        className="flex flex-col items-center text-center min-w-0 group focus:outline-none"
                      >
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-zinc-900 border-2 border-red-500/60 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                          <FallbackAvatar name={statsB.name} sizeCls="text-xl" />
                        </div>
                        <div className="flex items-center justify-center gap-1 w-full">
                          <span className="text-xs shrink-0">
                            {getCombinedFlags(statsB.meta)}
                          </span>
                          <span
                            className={cn(
                              "text-xs sm:text-sm font-black uppercase tracking-tight truncate group-hover:underline",
                              theme === "dark" ? "text-white" : "text-zinc-900",
                            )}
                          >
                            {statsB.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 truncate max-w-full tabular-nums">
                          {formatRank(statsB.rank)}, {statsB.rating.toFixed(2)}
                        </span>
                      </button>
                    </div>

                    {/* Visual Win Share Bar */}
                    {sharedCoursesData.items.length > 0 && (
                      <div className="flex flex-col gap-1.5 pt-2 border-t border-black/5 dark:border-white/5">
                        <div className="grid grid-cols-3 items-center text-[10px] font-black uppercase tracking-widest tabular-nums whitespace-nowrap">
                          <span className="text-blue-500 text-left">
                            {sharedCoursesData.winPctA.toFixed(2)}%
                          </span>
                          <span className="text-zinc-500 text-center">
                            {sharedCoursesData.items.length}{" "}
                            {sharedCoursesData.items.length === 1
                              ? "COURSE"
                              : "COURSES"}
                          </span>
                          <span className="text-red-500 text-right">
                            {sharedCoursesData.winPctB.toFixed(2)}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden flex bg-zinc-200 dark:bg-zinc-800">
                          <div
                            style={{ width: `${sharedCoursesData.winPctA}%` }}
                            className="bg-blue-500 h-full transition-all duration-300"
                          />
                          <div
                            style={{
                              width: `${Math.max(
                                0,
                                100 -
                                  sharedCoursesData.winPctA -
                                  sharedCoursesData.winPctB,
                              )}%`,
                            }}
                            className="bg-zinc-500/40 h-full"
                          />
                          <div
                            style={{ width: `${sharedCoursesData.winPctB}%` }}
                            className="bg-red-500 h-full transition-all duration-300"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* All-Time Stats: Side-by-Side Breakdown */}
                  <div className="flex flex-col gap-3">
                    <SectionTitle noPadding>ALL-TIME STATS</SectionTitle>
                    <div
                      className={cn(
                        "rounded-[1.5rem] border divide-y overflow-hidden",
                        theme === "dark"
                          ? "bg-zinc-950 border-white/10 divide-white/5"
                          : "bg-white border-black/10 divide-black/5 shadow-sm",
                      )}
                    >
                      {[
                        {
                          label: "GLOBAL RANK",
                          valA: formatRank(statsA.rank),
                          valB: formatRank(statsB.rank),
                          winner: compareBetter(statsA.rank, statsB.rank, true),
                        },
                        {
                          label: "LQ",
                          valA: statsA.rating.toFixed(2),
                          valB: statsB.rating.toFixed(2),
                          winner: compareBetter(statsA.rating, statsB.rating),
                        },
                        {
                          label: "POINTS",
                          valA: statsA.pts.toFixed(2),
                          valB: statsB.pts.toFixed(2),
                          winner: compareBetter(statsA.pts, statsB.pts),
                        },
                        {
                          label: "WORLD RECORDS",
                          valA: String(statsA.wins),
                          valB: String(statsB.wins),
                          winner: compareBetter(statsA.wins, statsB.wins),
                        },
                        {
                          label: "WR %",
                          valA: statsA.wrPct.toFixed(2),
                          valB: statsB.wrPct.toFixed(2),
                          winner: compareBetter(statsA.wrPct, statsB.wrPct),
                        },
                        {
                          label: "COURSES",
                          valA: String(statsA.courses),
                          valB: String(statsB.courses),
                          winner: compareBetter(statsA.courses, statsB.courses),
                        },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3 text-xs tabular-nums"
                        >
                          <div className="flex items-center justify-start">
                            <span
                              className={cn(
                                "font-black text-sm sm:text-base",
                                row.winner === "A"
                                  ? "text-blue-500"
                                  : theme === "dark"
                                    ? "text-zinc-400"
                                    : "text-zinc-600",
                              )}
                            >
                              {row.valA}
                            </span>
                          </div>

                          <div className="flex flex-col items-center justify-center px-2 text-center">
                            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                              {row.label}
                            </span>
                          </div>

                          <div className="flex items-center justify-end">
                            <span
                              className={cn(
                                "font-black text-sm sm:text-base",
                                row.winner === "B"
                                  ? "text-red-500"
                                  : theme === "dark"
                                    ? "text-zinc-400"
                                    : "text-zinc-600",
                              )}
                            >
                              {row.valB}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Shared Courses Breakdown */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <SectionTitle noPadding>
                        SHARED COURSES ({sharedCoursesData.items.length})
                      </SectionTitle>
                    </div>

                    {sharedCoursesData.items.length > 0 ? (
                      <div className="flex flex-col gap-2.5">
                        {sharedCoursesData.items.map((item) => (
                          <button
                            type="button"
                            key={item.courseKey}
                            onClick={() => {
                              setIsRivalryOpen(false);
                              setIsPickingRival(false);
                              onEntityClick("course", { name: item.courseName });
                            }}
                            className={cn(
                              "w-full rounded-2xl border p-3.5 flex flex-col gap-2.5 text-left transition-colors active:scale-[0.99]",
                              theme === "dark"
                                ? "bg-zinc-950 border-white/10 hover:border-white/20"
                                : "bg-white border-black/10 hover:border-black/20 shadow-sm",
                            )}
                          >
                            {/* Course Header Row */}
                            <div className="flex items-center justify-between w-full border-b pb-2 border-black/5 dark:border-white/5">
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <span className="text-xs shrink-0">
                                  {item.flag}
                                </span>
                                <span
                                  className={cn(
                                    "text-xs font-black uppercase tracking-wider truncate",
                                    theme === "dark"
                                      ? "text-white"
                                      : "text-zinc-900",
                                  )}
                                >
                                  {item.courseName}
                                </span>
                                {item.city && (
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 truncate hidden sm:inline">
                                    • {item.city}
                                  </span>
                                )}
                              </div>
                              <ArrowRight
                                size={13}
                                className="text-zinc-500 shrink-0"
                              />
                            </div>

                            {/* Times & Hundredths Differential */}
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 tabular-nums">
                              {/* Player A Course Result */}
                              <div className="flex flex-col items-start">
                                <span
                                  className={cn(
                                    "text-base sm:text-lg font-black tracking-tight",
                                    item.winner === "A"
                                      ? "text-blue-500"
                                      : theme === "dark"
                                        ? "text-zinc-400"
                                        : "text-zinc-600",
                                  )}
                                >
                                  {item.timeA.toFixed(2)}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                  {formatRank(item.rankA)}, {item.ptsA.toFixed(2)}
                                </span>
                              </div>

                              {/* Differential Badge */}
                              <div
                                className={cn(
                                  "px-2.5 py-1 rounded-lg border text-[11px] font-black uppercase tracking-wider flex items-center justify-center",
                                  item.winner === "A"
                                    ? "bg-blue-500/10 border-blue-500/30 text-blue-500"
                                    : item.winner === "B"
                                      ? "bg-red-500/10 border-red-500/30 text-red-500"
                                      : "bg-zinc-500/10 border-zinc-500/30 text-zinc-400",
                                )}
                              >
                                <span>{item.absDiff.toFixed(2)}</span>
                              </div>

                              {/* Player B Course Result */}
                              <div className="flex flex-col items-end">
                                <span
                                  className={cn(
                                    "text-base sm:text-lg font-black tracking-tight",
                                    item.winner === "B"
                                      ? "text-red-500"
                                      : theme === "dark"
                                        ? "text-zinc-400"
                                        : "text-zinc-600",
                                  )}
                                >
                                  {item.timeB.toFixed(2)}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                  {formatRank(item.rankB)}, {item.ptsB.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <ASREmptyState
                        theme={theme}
                        title="NO SHARED COURSES"
                        message="THESE ATHLETES HAVE NOT RUN THE SAME COURSE YET."
                      />
                    )}
                  </div>
                </>
              )
            )}
          </div>
        )}
      </div>
    );
  },
);
