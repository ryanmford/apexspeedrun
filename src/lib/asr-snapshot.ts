import type {
  ComputedASRState,
  CourseData,
  GenderedCourseBoards,
  GenderedPlayerMap,
  PlayerProfile,
  RecentFeedItem,
  SetterProfile,
  TeamProfile,
  TeamsAggregated,
} from "../types";
import {
  isPlaceholderPlayer,
  isQualifiedAthlete,
  normalizeName,
} from "./asr-utils";

const toTimestamp = (d?: Date | string): number => {
  if (!d) return Infinity;
  const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
  return isNaN(t) ? Infinity : t;
};

export const sortAthletesWithTiebreakers = (a: PlayerProfile, b: PlayerProfile): number => {
  if (Math.abs((b.rating || 0) - (a.rating || 0)) > 0.000001) {
    return (b.rating || 0) - (a.rating || 0);
  }
  if ((b.runs || 0) !== (a.runs || 0)) {
    return (b.runs || 0) - (a.runs || 0);
  }
  return toTimestamp(a.latestRunDate) - toTimestamp(b.latestRunDate);
};

export function buildPlayerLeaderboardMap(
  sourceData: PlayerProfile[],
  atMet: Record<string, PlayerProfile>,
  mode: boolean | string,
): GenderedPlayerMap {
  const qualifiedM = (sourceData || [])
    .filter((p) => p.gender === "M" && isQualifiedAthlete(p, mode, "M"))
    .sort(sortAthletesWithTiebreakers);
  const qualifiedF = (sourceData || [])
    .filter((p) => p.gender === "F" && isQualifiedAthlete(p, mode, "F"))
    .sort(sortAthletesWithTiebreakers);

  const buildRankMap = (qualified: PlayerProfile[]) => {
    const rm = new Map<string, number>();
    let currRank = 1;
    let prevRating = -1;
    let prevRuns = -1;
    let prevDate = -1;

    qualified.forEach((q, i) => {
      const r = q.rating || 0;
      const runs = q.runs || 0;
      const dt = toTimestamp(q.latestRunDate);
      if (i > 0) {
        const sameRating = Math.abs(r - prevRating) <= 0.000001;
        const sameRuns = runs === prevRuns;
        const sameDate = dt === prevDate;
        if (!sameRating || !sameRuns || !sameDate) {
          currRank = i + 1;
        }
      }
      rm.set(q.pKey, currRank);
      prevRating = r;
      prevRuns = runs;
      prevDate = dt;
    });
    return rm;
  };

  const rankMapM = buildRankMap(qualifiedM);
  const rankMapF = buildRankMap(qualifiedF);

  const mapM: Record<string, PlayerProfile> = {};
  const mapF: Record<string, PlayerProfile> = {};
  (sourceData || []).forEach((p) => {
    const rank: number | "UR" =
      p.gender === "M" ? rankMapM.get(p.pKey) || "UR" : rankMapF.get(p.pKey) || "UR";

    const metadata = atMet?.[p.pKey];
    const stats: PlayerProfile = {
      ...p,
      rank,
      allTimeFireCount: metadata?.allTimeFireCount ?? p.allTimeFireCount,
      openFireCount: metadata?.openFireCount ?? p.openFireCount,
    };
    if (p.gender === "M") mapM[p.pKey] = stats;
    else mapF[p.pKey] = stats;
  });

  return { M: mapM, F: mapF };
}

export function buildPlayerList(
  data: PlayerProfile[],
  season26Data: PlayerProfile[],
  openData: PlayerProfile[],
  mode: boolean | string,
  gen: "M" | "F",
): PlayerProfile[] {
  const isAllTime = mode === true || mode === "all-time";
  const athletePool = isAllTime ? data : mode === "2026" ? season26Data : openData;
  const allTimeRankedKeys = new Set((data || []).map((p) => p.pKey));
  const filtered = (athletePool || []).filter(
    (p) =>
      p &&
      p.gender === gen &&
      !isPlaceholderPlayer(p.name) &&
      ((p.runs || 0) > 0 || (isAllTime && ((p.sets || 0) > 0 || (p.contributionScore || 0) > 0))),
  );

  filtered.sort(sortAthletesWithTiebreakers);

  const qual: PlayerProfile[] = [];
  const unranked: PlayerProfile[] = [];
  filtered.forEach((p) => {
    if (isQualifiedAthlete(p, mode, gen)) {
      qual.push(p);
    } else if (
      mode === "2026" ||
      mode === true ||
      mode === "all-time" ||
      allTimeRankedKeys.has(p.pKey)
    ) {
      unranked.push(p);
    }
  });

  let currRank = 1;
  let prevRating = -1;
  let prevRuns = -1;
  let prevDate = -1;
  const fQual: PlayerProfile[] = qual.map((p, i) => {
    const r = p.rating || 0;
    const runs = p.runs || 0;
    const dt = toTimestamp(p.latestRunDate);
    if (i > 0) {
      const sameRating = Math.abs(r - prevRating) <= 0.000001;
      const sameRuns = runs === prevRuns;
      const sameDate = dt === prevDate;
      if (!sameRating || !sameRuns || !sameDate) {
        currRank = i + 1;
      }
    }
    prevRating = r;
    prevRuns = runs;
    prevDate = dt;
    return {
      ...p,
      currentRank: currRank,
      isQualified: true,
      shouldFade: false,
    };
  });
  const fUnranked: PlayerProfile[] = unranked.map((p) => ({
    ...p,
    currentRank: "UR",
    isQualified: false,
    shouldFade: true,
  }));

  const dividerLabel =
    mode === "open" || mode === false
      ? "RUN 3+ COURSES TO GET RANKED"
      : mode === "2026"
        ? gen === "F"
          ? "RUN 3+ COURSES TO GET RANKED"
          : "RUN 5+ COURSES TO GET RANKED"
        : gen === "F"
          ? "RUN 4+ COURSES TO GET RANKED"
          : "RUN 8+ COURSES TO GET RANKED";

  const dividerRow: PlayerProfile = {
    pKey: `divider-${String(mode)}-${gen}`,
    name: dividerLabel,
    gender: gen,
    rating: 0,
    runs: 0,
    isDivider: true,
    label: dividerLabel,
  };

  if ((mode === false || mode === "open" || mode === "2026") && fQual.length === 0) {
    return [dividerRow, ...fUnranked];
  }
  return fQual.length && fUnranked.length
    ? [...fQual, dividerRow, ...fUnranked]
    : [...fQual, ...fUnranked];
}

export function buildTeamList(
  teamsAggregated: TeamsAggregated,
  cat: "gyms" | "teams",
  mode: boolean | string,
): TeamProfile[] {
  const contextStr =
    mode === "2026" ? "season26" : mode === true || mode === "all-time" ? "allTime" : "open";
  const arr = [...(teamsAggregated?.[cat]?.[contextStr] || [])].sort(
    (a, b) => (b.pts || 0) - (a.pts || 0),
  );
  return arr.map((t, i) => ({ ...t, currentRank: i + 1, category: cat }));
}

export function buildCourseLists(
  masterCourseList: CourseData[],
  lbOpen?: GenderedCourseBoards,
  lbSeason26?: GenderedCourseBoards,
): {
  courseList_AT: CourseData[];
  courseList_OP: CourseData[];
  courseList_2026: CourseData[];
} {
  const list = masterCourseList || [];

  const courseList_AT: CourseData[] = [...list]
    .filter((c) => c.isAllTimeCourse)
    .sort((a, b) => (b.totalAllTimeRuns || 0) - (a.totalAllTimeRuns || 0))
    .map((c, i) => ({ ...c, currentRank: i + 1 }));

  const courseList_OP: CourseData[] = list
    .filter((c) => c.isOpenCourse)
    .map((c) => {
      if (typeof c.openRuns === "number") return c;
      const mCount = Object.keys(lbOpen?.M?.[String(c.name).toUpperCase()] || {}).filter(
        (k) => !isPlaceholderPlayer(k),
      ).length;
      const fCount = Object.keys(lbOpen?.F?.[String(c.name).toUpperCase()] || {}).filter(
        (k) => !isPlaceholderPlayer(k),
      ).length;
      return { ...c, openRuns: mCount + fCount };
    })
    .sort((a, b) => (b.openRuns || 0) - (a.openRuns || 0))
    .map((c, i) => ({ ...c, currentRank: i + 1 }));

  const courseList_2026: CourseData[] = list
    .filter((c) => c.is2026Course)
    .map((c) => {
      if (typeof c.season26Runs === "number") return c;
      const mCount = Object.keys(lbSeason26?.M?.[String(c.name).toUpperCase()] || {}).filter(
        (k) => !isPlaceholderPlayer(k),
      ).length;
      const fCount = Object.keys(lbSeason26?.F?.[String(c.name).toUpperCase()] || {}).filter(
        (k) => !isPlaceholderPlayer(k),
      ).length;
      return { ...c, season26Runs: mCount + fCount };
    })
    .sort((a, b) => (b.season26Runs || 0) - (a.season26Runs || 0))
    .map((c, i) => ({ ...c, currentRank: i + 1 }));

  return { courseList_AT, courseList_OP, courseList_2026 };
}

export interface CompactFeedItem extends Omit<RecentFeedItem, "athlete" | "course"> {
  pKey?: string;
  courseKey?: string;
}

export interface CompactSnapshotWire
  extends Omit<
    ComputedASRState,
    | "recentFeed"
    | "setterMet"
    | "playerLB_AT"
    | "playerLB_OP"
    | "playerLB_2026"
    | "playerList_M_AT"
    | "playerList_F_AT"
    | "playerList_M_OP"
    | "playerList_F_OP"
    | "playerList_M_2026"
    | "playerList_F_2026"
    | "courseList_AT"
    | "courseList_OP"
    | "courseList_2026"
    | "settersList"
    | "teamList_gyms_AT"
    | "teamList_teams_AT"
    | "teamList_gyms_OP"
    | "teamList_teams_OP"
    | "teamList_gyms_2026"
    | "teamList_teams_2026"
  > {
  __compact: 1;
  recentFeed: CompactFeedItem[];
}

/**
 * Strips 100%-redundant derived arrays/maps and embedded recentFeed objects before
 * serializing `/api/snapshot` or saving to IndexedDB.
 */
export function dehydrateSnapshot(state: ComputedASRState): CompactSnapshotWire {
  const {
    setterMet: _setterMet,
    playerLB_AT: _pLBAT,
    playerLB_OP: _pLBOP,
    playerLB_2026: _pLB26,
    playerList_M_AT: _pMAT,
    playerList_F_AT: _pFAT,
    playerList_M_OP: _pMOP,
    playerList_F_OP: _pFOP,
    playerList_M_2026: _pM26,
    playerList_F_2026: _pF26,
    courseList_AT: _cAT,
    courseList_OP: _cOP,
    courseList_2026: _c26,
    settersList: _sList,
    teamList_gyms_AT: _tgAT,
    teamList_teams_AT: _ttAT,
    teamList_gyms_OP: _tgOP,
    teamList_teams_OP: _ttOP,
    teamList_gyms_2026: _tg26,
    teamList_teams_2026: _tt26,
    recentFeed,
    ...core
  } = state;

  void _setterMet;
  void _pLBAT;
  void _pLBOP;
  void _pLB26;
  void _pMAT;
  void _pFAT;
  void _pMOP;
  void _pFOP;
  void _pM26;
  void _pF26;
  void _cAT;
  void _cOP;
  void _c26;
  void _sList;
  void _tgAT;
  void _ttAT;
  void _tgOP;
  void _ttOP;
  void _tg26;
  void _tt26;

  const compactFeed: CompactFeedItem[] = (recentFeed || []).map((item) => {
    const { athlete, course, ...rest } = item;
    return {
      ...rest,
      pKey: athlete?.pKey || normalizeName(item.name || ""),
      courseKey: String(course?.name || item.courseName || "").toUpperCase(),
    };
  });

  return {
    ...core,
    __compact: 1,
    recentFeed: compactFeed,
  };
}

/**
 * Reconstructs all derived UI arrays, leaderboards, setter maps, and recentFeed
 * references from a compact snapshot payload in ~2-4ms. Safe to call on already-hydrated payloads.
 */
export function hydrateSnapshot(
  raw: CompactSnapshotWire | ComputedASRState,
): ComputedASRState {
  if (!("__compact" in raw) || raw.__compact !== 1) {
    return raw as ComputedASRState;
  }

  const { __compact: _flag, recentFeed: compactFeed, ...core } = raw;
  void _flag;

  const data = core.data || [];
  const openData = core.openData || [];
  const season26Data = core.season26Data || [];
  const atMet = core.atMet || {};
  const cMet = core.cMet || {};
  const masterCourseList = core.masterCourseList || [];
  const settersWithImpact = core.settersWithImpact || [];
  const teamsAggregated = core.teamsAggregated || {
    gyms: { open: [], allTime: [], season26: [] },
    teams: { open: [], allTime: [], season26: [] },
  };

  const setterMet: Record<string, SetterProfile> = {};
  settersWithImpact.forEach((s) => {
    setterMet[normalizeName(s.name)] = s;
  });

  const settersList: SetterProfile[] = [...settersWithImpact]
    .sort((a, b) => (b.impact || 0) - (a.impact || 0))
    .map((s, i) => ({ ...s, currentRank: i + 1 }));

  const { courseList_AT, courseList_OP, courseList_2026 } = buildCourseLists(
    masterCourseList,
    core.lbOpen,
    core.lbSeason26,
  );

  const recentFeed: RecentFeedItem[] = (compactFeed || []).map((item) => {
    const { pKey, courseKey, ...rest } = item;
    const normPKey = pKey || normalizeName(item.name || "");
    const normCKey = courseKey || String(item.courseName || "").toUpperCase();
    return {
      ...rest,
      athlete: atMet[normPKey],
      course: { ...(cMet[normCKey] || {}), name: item.courseName },
    };
  });

  return {
    ...core,
    recentFeed,
    setterMet,
    settersList,
    playerLB_AT: buildPlayerLeaderboardMap(data, atMet, true),
    playerLB_2026: buildPlayerLeaderboardMap(season26Data, atMet, "2026"),
    playerLB_OP: buildPlayerLeaderboardMap(openData, atMet, false),
    playerList_M_AT: buildPlayerList(data, season26Data, openData, true, "M"),
    playerList_F_AT: buildPlayerList(data, season26Data, openData, true, "F"),
    playerList_M_OP: buildPlayerList(data, season26Data, openData, false, "M"),
    playerList_F_OP: buildPlayerList(data, season26Data, openData, false, "F"),
    playerList_M_2026: buildPlayerList(data, season26Data, openData, "2026", "M"),
    playerList_F_2026: buildPlayerList(data, season26Data, openData, "2026", "F"),
    courseList_AT,
    courseList_OP,
    courseList_2026,
    teamList_gyms_AT: buildTeamList(teamsAggregated, "gyms", true),
    teamList_teams_AT: buildTeamList(teamsAggregated, "teams", true),
    teamList_gyms_OP: buildTeamList(teamsAggregated, "gyms", false),
    teamList_teams_OP: buildTeamList(teamsAggregated, "teams", false),
    teamList_gyms_2026: buildTeamList(teamsAggregated, "gyms", "2026"),
    teamList_teams_2026: buildTeamList(teamsAggregated, "teams", "2026"),
  };
}
