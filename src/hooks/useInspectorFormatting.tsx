import { useMemo, type ReactNode } from "react";
import { normalizeName } from "../lib/asr-utils";
import { Zap, Medal, Waypoints } from "lucide-react";
import {
  PlayerProfile,
  SetterProfile,
  TeamProfile,
  CourseData,
  PlayerPerformance,
  CourseRunEntry,
  GenderedPlayerMap,
  GenderedCourseBoards,
  TeamsAggregated,
  ASRDataContext,
} from "../types";

const EMPTY_MET: Record<string, PlayerProfile> = {};
const EMPTY_CMET: Record<string, CourseData> = {};
const EMPTY_PRAW: Record<string, Record<string, PlayerPerformance[]>> = {};
const EMPTY_SETTER_MET: Record<string, SetterProfile> = {};
const EMPTY_HISTORY: Record<string, CourseRunEntry[]> = {};
const EMPTY_COURSES: CourseData[] = [];
const EMPTY_PLAYERS: PlayerProfile[] = [];
const EMPTY_SETTERS: SetterProfile[] = [];
const EMPTY_PLAYER_LB: GenderedPlayerMap = { M: {}, F: {} };
const EMPTY_COURSE_LB: GenderedCourseBoards = { M: {}, F: {} };

const toSetterList = (val?: string | string[]): string[] => {
  if (!val) return [];
  const raw = Array.isArray(val) ? val : val.split(",");
  return raw.map((s) => normalizeName(s)).filter(Boolean);
};

export const usePlayerDetailsData = (
  player: PlayerProfile,
  activeMode: "open" | "all-time" | "2026",
  dataContext: ASRDataContext,
) => {
  const lbAT = dataContext.lbAT || EMPTY_PLAYER_LB;
  const lbOP = dataContext.lbOP || EMPTY_PLAYER_LB;
  const atMet = dataContext.atMet || EMPTY_MET;
  const cMet = dataContext.cMet || EMPTY_CMET;
  const pRaw = dataContext.pRaw || EMPTY_PRAW;
  const setterMet = dataContext.setterMet || EMPTY_SETTER_MET;
  const lbAT_Courses = dataContext.lbAT_Courses || EMPTY_COURSE_LB;
  const courseRunsHistory = dataContext.courseRunsHistory || EMPTY_HISTORY;
  const masterCourseList = dataContext.masterCourseList || EMPTY_COURSES;

  const pKey = player.pKey || normalizeName(player.name);
  const meta = atMet[pKey] || player;

  const stats = useMemo(() => {
    const lbSeason26 = dataContext.lbSeason26;
    const lb = (activeMode === "all-time" ? lbAT : activeMode === "2026" ? lbSeason26 : lbOP) || EMPTY_PLAYER_LB;
    const allStats: Record<string, PlayerProfile> = { ...(lb.M || {}), ...(lb.F || {}) };
    const pData: Partial<PlayerProfile> = allStats[pKey] || {};

    const allTimeStats: Record<string, PlayerProfile> = { ...(lbAT?.M || {}), ...(lbAT?.F || {}) };
    const atData: Partial<PlayerProfile> = allTimeStats[pKey] || {};

    return {
      rank: pData.rank || "UR",
      rating: pData.rating || 0,
      pts: pData.pts || 0,
      courses: pData.courses || 0,
      runs: pData.runs || 0,
      wins: pData.wins || 0,
      fires:
        activeMode === "all-time"
          ? (pData.allTimeFireCount ??
            meta.allTimeFireCount ??
            pData.fires ??
            meta.fires ??
            0)
          : activeMode === "2026"
          ? (pData.season26FireCount ??
            meta.season26FireCount ??
            pData.fires ??
            meta.fires ??
            0)
          : (pData.openFireCount ??
            meta.openFireCount ??
            pData.fires ??
            meta.fires ??
            0),
      allTimeFires:
        meta.allTimeFireCount ??
        atData.allTimeFireCount ??
        atData.fires ??
        meta.fires ??
        pData.allTimeFireCount ??
        0,
    };
  }, [lbAT, lbOP, dataContext.lbSeason26, activeMode, pKey, meta]);

  const runs = useMemo(() => {
    const sourceData = pRaw || EMPTY_PRAW;
    const raw = sourceData[activeMode]?.[pKey] || [];
    return raw
      .map((r: PlayerPerformance) => ({
        ...r,
        courseMeta: cMet[(r.label || "").toUpperCase()],
      }))
      .sort((a, b) => {
        const aPts = Number(a["pts"] ?? a.points ?? 0);
        const bPts = Number(b["pts"] ?? b.points ?? 0);
        if (bPts !== aPts) {
          return bPts - aPts;
        }
        const aTime = Number(a.num ?? a["time"] ?? Infinity);
        const bTime = Number(b.num ?? b["time"] ?? Infinity);
        return aTime - bTime;
      });
  }, [pRaw, pKey, activeMode, cMet]);

  const allRuns = useMemo(() => {
    const sourceData = pRaw || {};
    return sourceData["all-time"]?.[pKey] || [];
  }, [pRaw, pKey]);

  const allTimeAvgTime = useMemo(() => {
    if (!allRuns.length) return "--:--";
    const total = allRuns.reduce(
      (sum: number, r: { num?: number }) => sum + (r.num || 0),
      0,
    );
    return (total / allRuns.length).toFixed(2);
  }, [allRuns]);

  const avgTime = useMemo(() => {
    if (!runs.length) return "--:--";
    const total = runs.reduce((sum: number, r: { num?: number }) => sum + (r.num || 0), 0);
    return (total / runs.length).toFixed(2);
  }, [runs]);

  const setterInfo = setterMet?.[pKey];

  const coursesSet = useMemo(() => {
    return Object.entries(cMet)
      .filter(([_k, c]: [string, CourseData]) => {
        const leads = toSetterList(c.leadSetters);
        const assists = toSetterList(c.assistantsetters);
        return leads.includes(pKey) || assists.includes(pKey);
      })
      .map(([name, c]: [string, CourseData]) => {
        const isLead = toSetterList(c.leadSetters).includes(pKey);
        const normName = String(name).toUpperCase();
        const mc = masterCourseList.find(
          (course) => String(course.name).toUpperCase() === normName,
        );
        const courseRuns =
          mc?.totalAllTimeRuns ||
          (courseRunsHistory[normName] || []).length ||
          Object.keys(lbAT_Courses.M?.[name] || {}).length +
            Object.keys(lbAT_Courses.F?.[name] || {}).length;
        return {
          ...c,
          name,
          role: isLead ? "LEAD" : "ASSIST",
          runs: courseRuns,
          impact: courseRuns,
        };
      })
      .sort((a, b) => b.runs - a.runs);
  }, [cMet, pKey, lbAT_Courses, courseRunsHistory, masterCourseList]);

  const rankListSets = useMemo(() => {
    return coursesSet.map((s) => ({
      ...s,
      athleteSlug: s.name,
      pKey: s.name,
    }));
  }, [coursesSet]);

  const mappedSetsChartData = useMemo(() => {
    return coursesSet.map((s) => ({ ...s, date: s.dateSet }));
  }, [coursesSet]);

  const calculatedAvgLength = useMemo(() => {
    const lengths = coursesSet
      .filter(
        (c: { length?: string | number }) => !isNaN(parseFloat(String(c.length))) && parseFloat(String(c.length)) > 0,
      )
      .map((c: { length?: string | number }) => parseFloat(String(c.length)));
    if (!lengths.length) return 0;
    return (
      lengths.reduce((sum: number, l: number) => sum + l, 0) / lengths.length
    );
  }, [coursesSet]);

  const vitals = useMemo(() => {
    return {
      height: meta.height || meta.vitals?.height || "-",
      weight: meta.weight || meta.vitals?.weight || "-",
      wingspan: meta.wingspan || meta.vitals?.wingspan || "-",
      apeIndex:
        meta.apeIndex ||
        (meta.vitals?.wingspan && meta.vitals?.height
          ? (
              parseFloat(meta.vitals.wingspan) - parseFloat(meta.vitals.height)
            ).toFixed(2)
          : "-"),
      shoe: meta.shoe || "-",
      shoeSize: meta.shoeSize || "-",
    };
  }, [meta]);

  const rankListRuns = useMemo(() => {
    return runs.map((r) => ({
      ...r,
      pKey: String(r.pKey || r.label || ""),
      _sortDate: new Date(r.date || 0).getTime(),
      _sortName: String(r.pKey || r.label || "").toUpperCase(),
      _sortTime: Number(r.num ?? r.time ?? Infinity),
      _sortPts: Number(r.pts ?? r.points ?? 0),
    }));
  }, [runs]);

  const vaultItems = useMemo(() => {
    const totalRuns = allRuns.length;
    const allTimeStats: Record<string, PlayerProfile> = { ...(lbAT?.M || {}), ...(lbAT?.F || {}) };
    const vaultAtData: Partial<PlayerProfile> = allTimeStats[pKey] || {};

    const golds = allRuns.filter((r: { rank?: number }) => r.rank === 1).length;
    const silvers = allRuns.filter((r: { rank?: number }) => r.rank === 2).length;
    const bronzes = allRuns.filter((r: { rank?: number }) => r.rank === 3).length;
    const fires =
      meta.allTimeFireCount ??
      vaultAtData.allTimeFireCount ??
      vaultAtData.fires ??
      meta.fires ??
      0;
    const impact = setterInfo?.impact || 0;
    const rating = vaultAtData.rating || 0;

    const podium = { gold: golds, silver: silvers, bronze: bronzes };

    const tokens = [
      {
        id: "t4",
        title: "FIRE",
        count: fires,
        icon: "🔥",
        date: "Fire Streaks",
      },
      {
        id: "t5",
        title: "COIN",
        count: (meta.contributionScore || 0).toFixed(2),
        icon: "🪙",
        date: "Contribution",
      },
    ];

    const trophies = [
      {
        id: "tr1",
        title: "MASTER OF SPEED",
        metric: golds,
        metricLabel: "1ST PLACE FINISHES",
        tier: golds >= 10 ? 1 : golds >= 5 ? 2 : 3,
        date: "Season Record",
      },
      {
        id: "tr2",
        title: "FLAME KEEPER",
        metric: fires,
        metricLabel: "TOTAL FIRE STREAKS",
        tier: fires >= 50 ? 1 : fires >= 20 ? 2 : 3,
        date: "Momentum Stat",
      },
    ];

    const cards: Array<{
      id: string;
      title: string;
      metric: string | number;
      metricLabel: string;
      tier: number;
      maxTier: number;
      progress: number;
      nextGoal: number;
      rarity: string;
      locked: boolean;
      icon: ReactNode;
      date: string;
      telemetry: Array<{ label: string; value: string | number }>;
    }> = [
      {
        id: "c1",
        title: "Speed Demon",
        metric: rating.toFixed(2),
        metricLabel: "PEAK PERFORMANCE RATE",
        tier: rating >= 90 ? 3 : rating >= 80 ? 2 : 1,
        maxTier: 3,
        progress: Math.min(100, rating),
        nextGoal: rating >= 90 ? 100 : rating >= 80 ? 90 : 80,
        rarity: rating >= 95 ? "mythic" : rating >= 85 ? "epic" : "rare",
        locked: false,
        icon: <Zap size={24} />,
        date: "Current Standing",
        telemetry: [
          { label: "TOP RANK", value: vaultAtData.rank || "UR" },
          { label: "AVG TIME", value: allTimeAvgTime },
        ],
      },
      {
        id: "c2",
        title: "The finisher",
        metric: golds,
        metricLabel: "TOTAL WORLD RECORDS",
        tier: golds >= 20 ? 3 : golds >= 10 ? 2 : golds >= 1 ? 1 : 0,
        maxTier: 3,
        progress: golds,
        nextGoal: golds >= 20 ? 20 : golds >= 10 ? 20 : golds >= 1 ? 10 : 1,
        rarity: golds >= 20 ? "mythic" : golds >= 10 ? "epic" : "rare",
        locked: golds < 1,
        icon: <Medal size={24} />,
        date: "Season Record",
        telemetry: [
          {
            label: "WIN RATE",
            value:
              totalRuns > 0
                ? ((golds / totalRuns) * 100).toFixed(2) + "%"
                : "0.00%",
          },
        ],
      },
    ];

    if (impact > 0) {
      cards.push({
        id: "c3",
        title: "Architect",
        metric: impact,
        metricLabel: "SETTER IMPACT",
        tier: impact >= 1000 ? 3 : impact >= 500 ? 2 : 1,
        maxTier: 3,
        progress: impact,
        nextGoal: impact >= 1000 ? 1000 : impact >= 500 ? 1000 : 500,
        rarity: impact >= 1000 ? "mythic" : impact >= 500 ? "epic" : "rare",
        locked: false,
        icon: <Waypoints size={24} />,
        date: "Global Design",
        telemetry: [
          { label: "LEAD SETS", value: setterInfo?.leads || 0 },
          { label: "ASSISTS", value: setterInfo?.assists || 0 },
        ],
      });
    }

    return { podium, tokens, trophies, cards };
  }, [meta, allRuns, setterInfo, pKey, lbAT, allTimeAvgTime]);

  return {
    meta,
    pKey,
    stats,
    runs,
    allRuns,
    avgTime,
    allTimeAvgTime,
    setterInfo,
    coursesSet,
    rankListSets,
    mappedSetsChartData,
    calculatedAvgLength,
    vitals,
    rankListRuns,
    vaultItems,
  };
};

export const useTeamDetailsData = (
  team: TeamProfile,
  mode: "open" | "all-time" | "2026",
  dataContext: ASRDataContext,
) => {
  const atMet = dataContext?.atMet || EMPTY_MET;
  const openData = dataContext?.openData || EMPTY_PLAYERS;
  const settersWithImpact = dataContext?.settersWithImpact || EMPTY_SETTERS;
  const pRaw = dataContext?.pRaw || EMPTY_PRAW;
  const lbAT = dataContext?.lbAT || EMPTY_PLAYER_LB;
  const teamsAggregated = dataContext?.teamsAggregated;

  const teamCategory: keyof TeamsAggregated =
    team?.category === "teams" ? "teams" : "gyms";
  const contextStr = mode === "all-time" ? "allTime" : mode === "2026" ? "season26" : "open";
  const teamsAggregatedMap =
    teamsAggregated?.[teamCategory] || teamsAggregated?.gyms;
  const teamsAgg = teamsAggregatedMap?.[contextStr] || [];

  const tMeta = Array.isArray(teamsAgg)
    ? teamsAgg.find(
        (t) =>
          (t.name || "").toUpperCase() === (team?.name || "").toUpperCase(),
      ) || team
    : team;

  const players = useMemo(() => {
    if (tMeta?.players) {
      return [...tMeta.players].sort(
        (a, b) => (b.contribution || 0) - (a.contribution || 0),
      );
    }
    const season26Data = dataContext.season26Data;
    const source = mode === "all-time" ? Object.values(atMet) : mode === "2026" ? (season26Data || []) : openData;
    return source
      .filter((p: PlayerProfile) => {
        const normalizedTarget = (team?.name || "").toUpperCase();
        if (!normalizedTarget) return false;
        const gymMatch =
          Boolean(p.homeGym && p.homeGym.toUpperCase() === normalizedTarget);
        const teamsMatch =
          Boolean(
            p.teams &&
              p.teams.some(
                (t: { name?: string } | string) =>
                  (typeof t === "string" ? t : (t?.name || "")).toUpperCase() === normalizedTarget,
              ),
          );
        return gymMatch || teamsMatch;
      })
      .map((p: PlayerProfile) => ({ ...p, contribution: p.pts || 0 }))
      .sort((a, b) => (b.contribution || 0) - (a.contribution || 0));
  }, [atMet, openData, dataContext.season26Data, mode, team.name, tMeta]);

  const setters = useMemo(() => {
    return settersWithImpact
      .filter((s: SetterProfile) => {
        const normalizedTarget = (team?.name || "").toUpperCase();
        if (!normalizedTarget) return false;
        const gymMatch =
          Boolean(s.homeGym && s.homeGym.toUpperCase() === normalizedTarget);
        const teamsMatch =
          Boolean(
            s.teams &&
              s.teams.some(
                (t: { name?: string } | string) =>
                  (typeof t === "string" ? t : (t?.name || "")).toUpperCase() === normalizedTarget,
              ),
          );
        return gymMatch || teamsMatch;
      })
      .sort((a: SetterProfile, b: SetterProfile) => (b.impact || 0) - (a.impact || 0));
  }, [settersWithImpact, team.name]);

  const playerStats = useMemo(
    () => ({
      points: players.reduce((sum: number, p: PlayerProfile & { contribution?: number }) => sum + (p.contribution || 0), 0),
      runs: players.reduce(
        (sum: number, p: PlayerProfile & { totalAllTimeRuns?: number }) => sum + (p.runs || p.totalAllTimeRuns || 0),
        0,
      ),
    }),
    [players],
  );

  const setterStats = useMemo(
    () => ({
      impact: setters.reduce((sum: number, s: SetterProfile) => sum + (s.impact || 0), 0),
      sets: setters.reduce((sum: number, s: SetterProfile) => sum + (s.sets || 0), 0),
    }),
    [setters],
  );

  const playerTuples = useMemo(() => {
    return players.map((p: PlayerProfile & { contribution?: number }) => [
      p.pKey || normalizeName(p.name),
      p.contribution,
    ]);
  }, [players]);

  const setterTuples = useMemo(() => {
    return setters.map((s: SetterProfile) => [s.pKey || normalizeName(s.name), s.impact]);
  }, [setters]);

  const vaultItems = useMemo(() => {
    let golds = 0,
      silvers = 0,
      bronzes = 0,
      fires = 0,
      coins = 0;
    const uniqueMembers = new Map();

    players.forEach((p: PlayerProfile) => {
      const pKey = p.pKey || normalizeName(p.name);
      uniqueMembers.set(pKey, {
        ...uniqueMembers.get(pKey),
        ...p,
        isPlayer: true,
      });
    });

    setters.forEach((s: SetterProfile) => {
      const pKey = s.pKey || normalizeName(s.name);
      uniqueMembers.set(pKey, {
        ...uniqueMembers.get(pKey),
        ...s,
        isSetter: true,
      });
    });

    uniqueMembers.forEach((member, pKey) => {
      const sourceData = pRaw || EMPTY_PRAW;
      const allRuns = sourceData["all-time"]?.[pKey] || [];

      golds += allRuns.filter((r) => r.rank === 1).length;
      silvers += allRuns.filter((r) => r.rank === 2).length;
      bronzes += allRuns.filter((r) => r.rank === 3).length;

      const allTimeStats: Record<string, PlayerProfile> = { ...(lbAT?.M || {}), ...(lbAT?.F || {}) };
      const vaultAtData: Partial<PlayerProfile> = allTimeStats[pKey] || {};
      const meta: Partial<PlayerProfile> = atMet?.[pKey] || member;

      const pFires =
        meta.allTimeFireCount ??
        vaultAtData.allTimeFireCount ??
        vaultAtData.fires ??
        meta.fires ??
        member.fires ??
        0;

      fires += Number(pFires) || 0;
      coins += Number(meta.contributionScore || 0);
    });

    return {
      podium: { gold: golds, silver: silvers, bronze: bronzes },
      tokens: [
        {
          id: "t4",
          title: "FIRE",
          count: fires,
          icon: "🔥",
          date: "Fire Streaks",
        },
        {
          id: "t5",
          title: "COIN",
          count: coins.toFixed(2),
          icon: "🪙",
          date: "Total Earned",
        },
      ],
    };
  }, [players, setters, pRaw, lbAT, atMet]);

  return {
    tMeta,
    players,
    setters,
    playerStats,
    setterStats,
    playerTuples,
    setterTuples,
    vaultItems,
  };
};
