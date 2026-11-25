import type {
  CourseData,
  CourseRecordEntry,
  CourseRunEntry,
  GenderedCourseBoards,
  PlayerPerformance,
  PlayerProfile,
  RawBestRun,
  SearchLocationItem,
  SetterProfile,
  TeamProfile,
  TeamsAggregated,
} from "../types";
import {
  CONFIG,
  getContinentData,
  isPlaceholderPlayer,
  normalizeName,
  normalizeForSearch,
  isQualifiedAthlete,
  parseCoords,
  splitNameList,
} from "./asr-utils.ts";
import {
  processRankingData,
  processLiveFeedData,
  processSetListData,
  processSettersData,
} from "./asr-data.ts";
import {
  buildCourseLists,
  buildPlayerLeaderboardMap,
  buildPlayerList,
  buildTeamList,
  sortAthletesWithTiebreakers,
} from "./asr-snapshot.ts";

const toTimestamp = (d?: Date | string): number => {
  if (!d) return Infinity;
  const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
  return isNaN(t) ? Infinity : t;
};

export function computeAllState(payload: {
  rM: string;
  rF: string;
  rLive: string;
  rSet: string;
  hasTotalError: boolean;
  hasPartialError: boolean;
}) {
  const { rM, rF, rLive, rSet, hasTotalError, hasPartialError } = payload;

  const pM = processRankingData(rM || "", "M");
  const pF = processRankingData(rF || "", "F");
  const initialMetadata: Record<string, PlayerProfile> = {};

  pM.forEach((p) => {
    initialMetadata[p.pKey] = { ...p, gender: "M" };
  });
  pF.forEach((p) => {
    initialMetadata[p.pKey] = { ...p, gender: "F" };
  });

  const processed = processLiveFeedData(
    rLive || "",
    initialMetadata,
    processSetListData(rSet || ""),
  );

  const assignRanks = (
    arr: PlayerProfile[],
    gender: "M" | "F",
    isAllTime: boolean | string = true,
  ) => {
    const qualified = arr
      .filter((p) => isQualifiedAthlete(p, isAllTime, gender))
      .sort(sortAthletesWithTiebreakers);

    const buildRankMap = (qualifiedArr: PlayerProfile[]) => {
      const rm = new Map<string, number>();
      let currRank = 1;
      let prevRating = -1;
      let prevRuns = -1;
      let prevDate = -1;

      qualifiedArr.forEach((q, i) => {
        const r = q.rating || 0;
        const runs = q.runs || 0;
        const date = toTimestamp(q.latestRunDate);

        const diffRating = Math.abs(r - prevRating) > 0.000001;
        const diffRuns = runs !== prevRuns;
        const diffDate = date !== prevDate;

        if (diffRating || diffRuns || diffDate) {
          currRank = i + 1;
          prevRating = r;
          prevRuns = runs;
          prevDate = date;
        }
        rm.set(q.pKey, currRank);
      });
      return rm;
    };

    const rankMap = buildRankMap(qualified);

    arr.forEach((p) => {
      const rankVal: number | "UR" = rankMap.has(p.pKey) ? rankMap.get(p.pKey)! : "UR";
      if (isAllTime === true || isAllTime === "all-time") {
        p.allTimeRank = rankVal;
        if (initialMetadata[p.pKey]) initialMetadata[p.pKey].allTimeRank = rankVal;
      } else if (isAllTime === "2026") {
        p.season26Rank = rankVal;
        if (initialMetadata[p.pKey]) initialMetadata[p.pKey].season26Rank = rankVal;
      } else {
        p.openRank = rankVal;
        if (initialMetadata[p.pKey]) initialMetadata[p.pKey].openRank = rankVal;
      }
    });
  };

  // Calculate Open Ranks after processing live feed
  const openM = processed.openRankings.filter((p) => p.gender === "M");
  const openF = processed.openRankings.filter((p) => p.gender === "F");
  assignRanks(openM, "M", false);
  assignRanks(openF, "F", false);

  const s26M = processed.season26Rankings.filter((p) => p.gender === "M");
  const s26F = processed.season26Rankings.filter((p) => p.gender === "F");
  assignRanks(s26M, "M", "2026");
  assignRanks(s26F, "F", "2026");

  // Calculate All Time Ranks dynamically
  const atM = processed.allTimeRankings.filter((p) => p.gender === "M");
  const atF = processed.allTimeRankings.filter((p) => p.gender === "F");
  assignRanks(atM, "M", true);
  assignRanks(atF, "F", true);

  const allSetters: SetterProfile[] = [
    ...processSettersData(rM || ""),
    ...processSettersData(rF || ""),
  ];

  const nextState = {
    data: processed.allTimeRankings,
    openData: processed.openRankings,
    season26Data: processed.season26Rankings,
    atPerfs: processed.allTimePerformances,
    opPerfs: processed.openPerformances,
    season26Perfs: processed.season26Performances,
    lbAT: processed.allTimeLeaderboards,
    lbOpen: processed.openLeaderboards,
    lbSeason26: processed.season26Leaderboards,
    atMet: processed.athleteMetadata,
    dnMap: processed.athleteDisplayNameMap,
    cMet: processed.courseMetadata,
    atRawBest: processed.atRawBest,
    opRawBest: processed.opRawBest,
    season26RawBest: processed.season26RawBest,
    recentFeed: processed.recentFeed,
    courseRunsHistory: processed.courseRunsHistory,
    hasError: hasTotalError,
    hasPartialError,
    lastUpdated: Date.now(),
  };

  const settersData = allSetters;
  const {
    cMet,
    lbAT,
    lbOpen,
    lbSeason26,
    atRawBest,
    opRawBest,
    season26RawBest,
    dnMap,
    data,
    atMet,
    openData,
    season26Data,
    atPerfs,
    opPerfs,
    season26Perfs,
    courseRunsHistory,
  } = nextState;

  // COURSE STATS
  const courseNames = Array.from(
    new Set([
      ...Object.keys(cMet || {}),
      ...Object.keys(lbAT?.M || {}),
      ...Object.keys(lbAT?.F || {}),
    ]),
  ).filter(Boolean);

  const masterCourseList: CourseData[] = courseNames.map((name) => {
    const athletesMAll: [string, number, string?][] = Object.entries((lbAT?.M || {})[name] || {})
      .map(
        ([pKey, time]): [string, number, string?] => [
          pKey,
          time,
          (atRawBest || {})[pKey]?.[name]?.videoUrl,
        ],
      )
      .sort((a, b) => a[1] - b[1]);
    const athletesFAll: [string, number, string?][] = Object.entries((lbAT?.F || {})[name] || {})
      .map(
        ([pKey, time]): [string, number, string?] => [
          pKey,
          time,
          (atRawBest || {})[pKey]?.[name]?.videoUrl,
        ],
      )
      .sort((a, b) => a[1] - b[1]);
    const meta: Partial<CourseData> = (cMet || {})[name] || {};
    const contData = getContinentData(meta.country || "UNKNOWN");
    const mRecs = athletesMAll.map((a) => a[1]);
    const fRecs = athletesFAll.map((a) => a[1]);
    const parsedCoords = meta.parsedCoords ?? parseCoords(meta.coordinates);
    const filteredM = athletesMAll.filter((a) => !isPlaceholderPlayer(dnMap[a[0]] || a[0]));
    const filteredF = athletesFAll.filter((a) => !isPlaceholderPlayer(dnMap[a[0]] || a[0]));
    const normName = String(name).toUpperCase();
    const totalAllTimeRuns =
      (courseRunsHistory?.[normName] || []).length || filteredM.length + filteredF.length;
    const openRuns = processed.openCourseRunsCount?.[normName] || 0;
    const season26Runs = processed.season26CourseRunsCount?.[normName] || 0;
    if (cMet?.[name]) {
      cMet[name].totalRuns = totalAllTimeRuns;
      cMet[name].totalAllTimeRuns = totalAllTimeRuns;
      cMet[name].openRuns = openRuns;
      cMet[name].season26Runs = season26Runs;
    }
    return {
      ...meta,
      name,
      videoUrl: meta.demoVideo || meta.videoUrl,
      city: meta.city || "UNKNOWN",
      country: meta.country || "UNKNOWN",
      flag: meta.flag || "🏳️",
      continent: contData.name,
      continentFlag: contData.flag,
      mRecord: mRecs.length ? Math.min(...mRecs) : null,
      fRecord: fRecs.length ? Math.min(...fRecs) : null,
      totalAthletes: filteredM.length + filteredF.length,
      totalRuns: totalAllTimeRuns,
      allTimeMRecord: mRecs.length ? Math.min(...mRecs) : null,
      allTimeFRecord: fRecs.length ? Math.min(...fRecs) : null,
      allTimeAthletesM: athletesMAll,
      allTimeAthletesF: athletesFAll,
      athletesMAll,
      athletesFAll,
      totalAllTimeAthletes: filteredM.length + filteredF.length,
      totalAllTimeRuns,
      openRuns,
      season26Runs,
      parsedCoords,
      searchKey:
        meta.searchKey ||
        normalizeForSearch(`${name} ${meta.city || ""} ${meta.stateProv || ""} ${meta.country || ""}`),
    };
  });

  // PRECOMPUTED SEARCH LOCATIONS INDEX
  const locationMap = new Map<string, SearchLocationItem>();
  masterCourseList.forEach((c) => {
    if (c.city || c.stateProv || c.country) {
      const city = c.city || "";
      const stateProv = c.stateProv || "";
      const country = c.country || "";
      const locKey = normalizeForSearch(`${city}, ${stateProv}, ${country}`);
      const existing = locationMap.get(locKey);
      if (!existing) {
        const locName = [city, stateProv, country].filter(Boolean).join(", ");
        const normName = normalizeForSearch(locName);
        locationMap.set(locKey, {
          name: locName,
          city,
          stateProv,
          country,
          flag: c.flag || "📍",
          courseCount: 1,
          type: "region",
          searchKey: normName,
          normCity: normalizeForSearch(city),
          normState: normalizeForSearch(stateProv),
          normCountry: normalizeForSearch(country),
          normName,
        });
      } else {
        existing.courseCount += 1;
      }
    }
  });
  const searchLocations: SearchLocationItem[] = Array.from(locationMap.values()).sort(
    (a, b) => b.courseCount - a.courseCount,
  );

  // KPI STATS
  const kpiStats = {
    players: (data || []).filter((p) => !isPlaceholderPlayer(p.name)).length,
    courses: masterCourseList.length,
    cities: new Set(
      masterCourseList.map((c) => c.city).filter((v): v is string => Boolean(v && v !== "UNKNOWN")),
    ).size,
    countries: new Set(
      masterCourseList
        .map((c) => c.country)
        .filter((v): v is string => Boolean(v && v !== "UNKNOWN")),
    ).size,
    runs: masterCourseList.reduce((acc, c) => acc + (c.totalAllTimeRuns || 0), 0),
  };

  // KPI TRENDS (Sparklines)
  const parseTrendTimeMs = (d?: string | Date): number => {
    if (!d) return NaN;
    const s = typeof d === "string" ? d.trim() : d;
    if (typeof s === "string" && /^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
      return new Date(s.replace(/-/g, "/")).getTime();
    }
    return new Date(s).getTime();
  };

  let allRuns: CourseRunEntry[] = [];
  Object.values(courseRunsHistory || {}).forEach((runsArray) => {
    allRuns = allRuns.concat(runsArray);
  });

  const parsedRuns = allRuns.map((r) => ({
    ...r,
    timeMs: parseTrendTimeMs(r.date),
  }));

  const undatedRuns = parsedRuns.filter((r) => isNaN(r.timeMs));
  const datedRuns = parsedRuns.filter((r) => !isNaN(r.timeMs)).sort((a, b) => a.timeMs - b.timeMs);

  // Earliest run date per course (fallback if a course has no dateSet)
  const earliestCourseRunMs: Record<string, number> = {};
  datedRuns.forEach((r) => {
    const cKey = String(r.course).toUpperCase();
    if (!cKey) return;
    if (earliestCourseRunMs[cKey] === undefined || r.timeMs < earliestCourseRunMs[cKey]) {
      earliestCourseRunMs[cKey] = r.timeMs;
    }
  });

  // Earliest course set date per setter (used for zero-run setters in playersTrend)
  const earliestSetterCourseMs: Record<string, number> = {};
  const datedCourseEvents: { courseKey: string; country?: string; timeMs: number }[] = [];
  const undatedCourseKeys = new Set<string>();
  const undatedCourseCountries = new Set<string>();

  masterCourseList.forEach((c) => {
    const cKey = String(c.name).toUpperCase();
    const setMs = parseTrendTimeMs(c.dateSet);
    const runMs = earliestCourseRunMs[cKey];
    const effectiveMs = !isNaN(setMs) ? setMs : runMs;
    const countryStr = c.country && c.country !== "UNKNOWN" ? c.country : undefined;

    if (effectiveMs !== undefined && !isNaN(effectiveMs)) {
      datedCourseEvents.push({ courseKey: cKey, country: countryStr, timeMs: effectiveMs });
    } else {
      undatedCourseKeys.add(cKey);
      if (countryStr) undatedCourseCountries.add(countryStr);
    }

    const setterKeys = new Set<string>([
      ...(c.leadSettersNormalized || []),
      ...(c.assistantSettersNormalized || []),
    ]);
    setterKeys.forEach((sKey) => {
      if (!sKey || isNaN(setMs)) return;
      if (earliestSetterCourseMs[sKey] === undefined || setMs < earliestSetterCourseMs[sKey]) {
        earliestSetterCourseMs[sKey] = setMs;
      }
    });
  });
  datedCourseEvents.sort((a, b) => a.timeMs - b.timeMs);

  // Build earliest appearance timestamp for every real player in `data` (including zero-run setters)
  const earliestRunByPlayer: Record<string, number> = {};
  const playersWithUndatedRun = new Set<string>();
  undatedRuns.forEach((r) => {
    if (r.pKey) playersWithUndatedRun.add(r.pKey);
  });
  datedRuns.forEach((r) => {
    if (!r.pKey) return;
    if (earliestRunByPlayer[r.pKey] === undefined || r.timeMs < earliestRunByPlayer[r.pKey]) {
      earliestRunByPlayer[r.pKey] = r.timeMs;
    }
  });

  const datedPlayerEvents: { pKey: string; timeMs: number }[] = [];
  const currentUniquePlayers = new Set<string>();
  (data || []).forEach((p) => {
    if (!p || isPlaceholderPlayer(p.name)) return;
    const pKey = p.pKey;
    if (!pKey) return;
    if (playersWithUndatedRun.has(pKey)) {
      currentUniquePlayers.add(pKey);
      return;
    }
    const runMs = earliestRunByPlayer[pKey];
    const setMs = earliestSetterCourseMs[pKey];
    const effectiveMs =
      runMs !== undefined && setMs !== undefined
        ? Math.min(runMs, setMs)
        : runMs !== undefined
          ? runMs
          : setMs;
    if (effectiveMs !== undefined && !isNaN(effectiveMs)) {
      datedPlayerEvents.push({ pKey, timeMs: effectiveMs });
    } else {
      currentUniquePlayers.add(pKey);
    }
  });
  datedPlayerEvents.sort((a, b) => a.timeMs - b.timeMs);

  let currentRunsCount = undatedRuns.length;
  const currentUniqueCourses = new Set<string>(undatedCourseKeys);
  const currentUniqueCountries = new Set<string>(undatedCourseCountries);

  const runsTrend = [{ value: currentRunsCount }];
  const playersTrend = [{ value: currentUniquePlayers.size }];
  const coursesTrend = [{ value: currentUniqueCourses.size }];
  const countriesTrend = [{ value: currentUniqueCountries.size }];

  const numDataPoints = 40;
  const allTimestamps: number[] = [];
  if (datedRuns.length > 0) {
    allTimestamps.push(datedRuns[0].timeMs, datedRuns[datedRuns.length - 1].timeMs);
  }
  if (datedCourseEvents.length > 0) {
    allTimestamps.push(
      datedCourseEvents[0].timeMs,
      datedCourseEvents[datedCourseEvents.length - 1].timeMs,
    );
  }
  if (datedPlayerEvents.length > 0) {
    allTimestamps.push(
      datedPlayerEvents[0].timeMs,
      datedPlayerEvents[datedPlayerEvents.length - 1].timeMs,
    );
  }

  if (allTimestamps.length === 0) {
    for (let i = 0; i < numDataPoints - 1; i++) {
      runsTrend.push({ value: currentRunsCount });
      playersTrend.push({ value: currentUniquePlayers.size });
      coursesTrend.push({ value: currentUniqueCourses.size });
      countriesTrend.push({ value: currentUniqueCountries.size });
    }
  } else {
    const minTime = Math.min(...allTimestamps);
    const maxTime = Math.max(...allTimestamps);
    const timeSpan = Math.max(maxTime - minTime, 1);
    const chunkMs = timeSpan / (numDataPoints - 1);

    let runIdx = 0;
    let playerIdx = 0;
    let courseIdx = 0;

    for (let step = 1; step < numDataPoints; step++) {
      const bucketEndTime = minTime + step * chunkMs;

      while (runIdx < datedRuns.length && datedRuns[runIdx].timeMs <= bucketEndTime) {
        currentRunsCount++;
        runIdx++;
      }
      while (playerIdx < datedPlayerEvents.length && datedPlayerEvents[playerIdx].timeMs <= bucketEndTime) {
        currentUniquePlayers.add(datedPlayerEvents[playerIdx].pKey);
        playerIdx++;
      }
      while (courseIdx < datedCourseEvents.length && datedCourseEvents[courseIdx].timeMs <= bucketEndTime) {
        const ce = datedCourseEvents[courseIdx];
        currentUniqueCourses.add(ce.courseKey);
        if (ce.country) currentUniqueCountries.add(ce.country);
        courseIdx++;
      }

      runsTrend.push({ value: currentRunsCount });
      playersTrend.push({ value: currentUniquePlayers.size });
      coursesTrend.push({ value: currentUniqueCourses.size });
      countriesTrend.push({ value: currentUniqueCountries.size });
    }

    while (runIdx < datedRuns.length) {
      currentRunsCount++;
      runIdx++;
    }
    while (playerIdx < datedPlayerEvents.length) {
      currentUniquePlayers.add(datedPlayerEvents[playerIdx].pKey);
      playerIdx++;
    }
    while (courseIdx < datedCourseEvents.length) {
      const ce = datedCourseEvents[courseIdx];
      currentUniqueCourses.add(ce.courseKey);
      if (ce.country) currentUniqueCountries.add(ce.country);
      courseIdx++;
    }

    runsTrend[runsTrend.length - 1].value = currentRunsCount;
    playersTrend[playersTrend.length - 1].value = currentUniquePlayers.size;
    coursesTrend[coursesTrend.length - 1].value = currentUniqueCourses.size;
    countriesTrend[countriesTrend.length - 1].value = currentUniqueCountries.size;
  }

  const kpiTrends = {
    runs: runsTrend,
    players: playersTrend,
    courses: coursesTrend,
    countries: countriesTrend,
  };

  // SETTER STATS
  const leadMap: Record<string, CourseData[]> = {};
  const assistMap: Record<string, CourseData[]> = {};
  const setterRawNames: Record<string, string> = {};

  masterCourseList.forEach((c) => {
    const rawLeads = splitNameList(c.leadSetters);
    rawLeads.forEach((rawName) => {
      if (rawName === "-" || rawName.toLowerCase() === "n/a") return;
      const norm = normalizeName(rawName);
      if (norm && !setterRawNames[norm]) setterRawNames[norm] = rawName;
    });
    const leads =
      c.leadSettersNormalized ||
      (Array.isArray(c.leadSetters) ? c.leadSetters : c.leadSetters ? [c.leadSetters] : []);
    leads.forEach((name) => {
      if (!name) return;
      const norm = normalizeName(name);
      if (!norm) return;
      if (!leadMap[norm]) leadMap[norm] = [];
      leadMap[norm].push(c);
    });

    const rawAssists = splitNameList(c.assistantsetters);
    rawAssists.forEach((rawName) => {
      if (rawName === "-" || rawName.toLowerCase() === "n/a") return;
      const norm = normalizeName(rawName);
      if (norm && !setterRawNames[norm]) setterRawNames[norm] = rawName;
    });
    const assists =
      c.assistantSettersNormalized ||
      (Array.isArray(c.assistantsetters)
        ? c.assistantsetters
        : c.assistantsetters
          ? [c.assistantsetters]
          : []);
    assists.forEach((name) => {
      if (!name) return;
      const norm = normalizeName(name);
      if (!norm) return;
      if (!assistMap[norm]) assistMap[norm] = [];
      assistMap[norm].push(c);
    });
  });

  const seenSetterKeys = new Set<string>();
  const settersWithImpact: SetterProfile[] = (settersData || [])
    .map((s): SetterProfile | null => {
      const sName = s.name ? String(s.name).trim() : "";
      if (!sName) return null;

      const sNameNorm = normalizeName(sName);
      if (!sNameNorm || seenSetterKeys.has(sNameNorm)) return null;
      const leadCourses = leadMap[sNameNorm] || [];
      const assistCourses = assistMap[sNameNorm] || [];

      const allSetCourses = Array.from(new Set([...leadCourses, ...assistCourses]));
      const athleteMeta = atMet?.[sNameNorm];
      const totalCourses = allSetCourses.length;
      if (totalCourses === 0) return null;

      seenSetterKeys.add(sNameNorm);
      const totalRuns = allSetCourses.reduce((sum, c) => sum + (c.totalAllTimeRuns || 0), 0);

      return {
        ...s,
        leads: leadCourses.length,
        assists: assistCourses.length,
        sets: totalCourses,
        impact: totalRuns,
        films: athleteMeta?.films || 0,
        isAthlete: Boolean(athleteMeta),
      };
    })
    .filter((s): s is SetterProfile => s !== null);

  // Include setters credited in COURSE STATS even if absent from RANKINGS (M)/(F)
  const allCourseSetterKeys = new Set<string>([...Object.keys(leadMap), ...Object.keys(assistMap)]);
  allCourseSetterKeys.forEach((sNameNorm) => {
    if (!sNameNorm || seenSetterKeys.has(sNameNorm)) return;
    const leadCourses = leadMap[sNameNorm] || [];
    const assistCourses = assistMap[sNameNorm] || [];
    const allSetCourses = Array.from(new Set([...leadCourses, ...assistCourses]));
    if (allSetCourses.length === 0) return;

    const athleteMeta = atMet?.[sNameNorm];
    const displayName = athleteMeta?.name || setterRawNames[sNameNorm] || sNameNorm;
    if (isPlaceholderPlayer(displayName)) return;

    seenSetterKeys.add(sNameNorm);
    const totalRuns = allSetCourses.reduce((sum, c) => sum + (c.totalAllTimeRuns || 0), 0);

    settersWithImpact.push({
      id: `setter-${sNameNorm}`,
      name: displayName,
      pKey: sNameNorm,
      countryName: athleteMeta?.countryName || "",
      region: athleteMeta?.region || "🏳️",
      location: athleteMeta?.location || CONFIG.FALLBACKS.UNKNOWN_LOCATION,
      homeGym: athleteMeta?.homeGym || CONFIG.FALLBACKS.UNAFFILIATED,
      teams: athleteMeta?.teams || [],
      townFlag: athleteMeta?.townFlag || "",
      gymFlag: athleteMeta?.gymFlag || "",
      igHandle: athleteMeta?.igHandle || "",
      sets: allSetCourses.length,
      leads: leadCourses.length,
      assists: assistCourses.length,
      impact: totalRuns,
      films: athleteMeta?.films || 0,
      isAthlete: Boolean(athleteMeta),
      searchKey: normalizeForSearch(`${displayName} ${athleteMeta?.countryName || ""}`),
    });
  });

  const setterMet: Record<string, SetterProfile> = {};
  settersWithImpact.forEach((s) => {
    setterMet[normalizeName(s.name)] = s;
  });

  // RECALCULATE COIN STAT IN REAL TIME
  // Formula: (courses * 0.1) + (wins * 0.1) + (leads * 0.2) + (assists * 0.1)
  const atDataMap = new Map<string, PlayerProfile>();
  data.forEach((p) => atDataMap.set(p.pKey, p));

  const allKeys = new Set([...Object.keys(atMet || {}), ...Object.keys(setterMet || {})]);

  allKeys.forEach((pKey) => {
    const atPlayer = atDataMap.get(pKey);
    const courses = atPlayer ? (atPlayer.courses ?? 0) : 0;
    const wins = atPlayer ? (atPlayer.wins ?? 0) : 0;

    const setter = setterMet[pKey];
    const leads = setter?.leads || 0;
    const assists = setter?.assists || 0;

    const newCoins = courses * 0.1 + wins * 0.1 + leads * 0.2 + assists * 0.1;

    if (atMet[pKey]) atMet[pKey].contributionScore = newCoins;
    if (setterMet[pKey]) setterMet[pKey].contributionScore = newCoins;

    if (atMet[pKey] && setter) {
      atMet[pKey].sets = setter.sets || 0;
    }
  });

  data.forEach((p) => {
    p.contributionScore = atMet[p.pKey]?.contributionScore || 0;
    p.sets = atMet[p.pKey]?.sets || setterMet[p.pKey]?.sets || 0;
  });

  openData.forEach((p) => {
    p.contributionScore = atMet[p.pKey]?.contributionScore || 0;
    p.sets = atMet[p.pKey]?.sets || setterMet[p.pKey]?.sets || 0;
  });

  season26Data.forEach((p) => {
    p.contributionScore = atMet[p.pKey]?.contributionScore || 0;
    p.sets = atMet[p.pKey]?.sets || setterMet[p.pKey]?.sets || 0;
  });

  settersWithImpact.forEach((s) => {
    const pKey = s.pKey || normalizeName(s.name);
    s.contributionScore = atMet[pKey]?.contributionScore || setterMet[pKey]?.contributionScore || 0;
  });

  // TEAM STATS (Gyms and Teams)
  const computeTeamStats = (teamCategory: "gyms" | "teams", mode: boolean | string): TeamProfile[] => {
    const aggregated: Record<string, TeamProfile> = {};
    const isAllTime = mode === true || mode === "all-time";
    const sourcePlayers: PlayerProfile[] = isAllTime
      ? data
      : mode === "2026"
        ? season26Data
        : openData;

    (sourcePlayers || []).forEach((p) => {
      const pKey = p.pKey || normalizeName(p.name);
      if (!pKey) return;

      const perfsByMode: PlayerPerformance[] | undefined =
        mode === "2026"
          ? season26Perfs?.[pKey]
          : isAllTime
            ? atPerfs?.[pKey]
            : opPerfs?.[pKey];

      const playerRuns = Object.prototype.hasOwnProperty.call(p, "runs")
        ? p.runs
        : perfsByMode?.length || 0;
      if (playerRuns === 0) return;

      const itemsToProcess: { name: string; flag: string; location?: string }[] = [];

      if (teamCategory === "gyms") {
        if (p.homeGym && p.homeGym !== CONFIG.FALLBACKS.UNAFFILIATED) {
          itemsToProcess.push({
            name: p.homeGym,
            flag: p.gymFlag || p.townFlag || "🏳️",
            location: p.teamLocation || "UNKNOWN",
          });
        }
      } else {
        if (p.teams && p.teams.length > 0) {
          p.teams.forEach((t) => {
            if (t && t.name) {
              itemsToProcess.push({
                name: t.name,
                flag:
                  t.flag ||
                  (String(t.name).toUpperCase().includes("BLACK TEAM") ? "🇲🇽" : "🏳️"),
                location: t.location || "UNKNOWN",
              });
            }
          });
        }
      }

      itemsToProcess.forEach((item) => {
        const rawName = String(item.name || "").trim();
        const normName = normalizeName(rawName);
        if (!aggregated[normName]) {
          aggregated[normName] = {
            name: rawName,
            flag: item.flag,
            location: item.location || "UNKNOWN",
            pts: 0,
            players: [],
            playersCount: 0,
            bestPlayers: [],
            runsCount: 0,
            searchKey: normalizeForSearch(`${rawName} ${item.flag}`),
          };
        }
        if (
          (aggregated[normName].location === "UNKNOWN" || !aggregated[normName].location) &&
          item.location &&
          item.location !== "UNKNOWN"
        ) {
          aggregated[normName].location = item.location;
        }
        let playerPts = p.pts || 0;
        if (!playerPts || playerPts === 0) {
          if (perfsByMode) {
            playerPts = perfsByMode.reduce((sum, perf) => sum + (perf.points || 0), 0);
          }
        }

        aggregated[normName].pts += playerPts;
        aggregated[normName].players.push({
          ...p,
          contribution: playerPts,
        });
        aggregated[normName].runsCount += playerRuns;
      });
    });

    Object.values(aggregated).forEach((t) => {
      t.playersCount = t.players.length;
      t.players.sort((a, b) => (b.contribution || 0) - (a.contribution || 0));
      t.bestPlayers = t.players.slice(0, 5);
      if (t.playersCount > 0) {
        let majorityFlag = t.players[0].gymFlag || t.players[0].townFlag;
        for (const p of t.players) {
          if (p.gymFlag && p.gymFlag !== "🏳️") {
            majorityFlag = p.gymFlag;
            break;
          }
        }
        if (!t.flag || t.flag === "🏳️") {
          t.flag = majorityFlag || "🏳️";
        }
      }
    });

    return Object.values(aggregated).sort((a, b) => b.pts - a.pts);
  };

  const teamsAggregated: TeamsAggregated = {
    gyms: {
      open: computeTeamStats("gyms", false),
      allTime: computeTeamStats("gyms", true),
      season26: computeTeamStats("gyms", "2026"),
    },
    teams: {
      open: computeTeamStats("teams", false),
      allTime: computeTeamStats("teams", true),
      season26: computeTeamStats("teams", "2026"),
    },
  };

  // LEADERBOARDS & PRECOMPUTED LISTS (shared with snapshot hydration)
  const playerLB_AT = buildPlayerLeaderboardMap(data, atMet, true);
  const playerLB_2026 = buildPlayerLeaderboardMap(season26Data, atMet, "2026");
  const playerLB_OP = buildPlayerLeaderboardMap(openData, atMet, false);

  const {
    courseList_AT: cListAT,
    courseList_OP: cListOP,
    courseList_2026: cList2026,
  } = buildCourseLists(masterCourseList, lbOpen, lbSeason26);

  const sList: SetterProfile[] = [...settersWithImpact]
    .sort((a, b) => (b.impact || 0) - (a.impact || 0))
    .map((s, i) => ({ ...s, currentRank: i + 1 }));

  const courseRecords_M_AT: Record<string, CourseRecordEntry[]> = {};
  const courseRecords_F_AT: Record<string, CourseRecordEntry[]> = {};
  const courseRecords_M_OP: Record<string, CourseRecordEntry[]> = {};
  const courseRecords_F_OP: Record<string, CourseRecordEntry[]> = {};
  const courseRecords_M_2026: Record<string, CourseRecordEntry[]> = {};
  const courseRecords_F_2026: Record<string, CourseRecordEntry[]> = {};

  const computeRecords = (
    sourceSector: GenderedCourseBoards["M"] | undefined,
    rawBestSector: Record<string, Record<string, RawBestRun>> | undefined,
    cName: string,
    allTimeSourceSector?: GenderedCourseBoards["M"],
  ): CourseRecordEntry[] => {
    const source = sourceSector?.[cName] || {};
    const atSource = allTimeSourceSector?.[cName] || source;
    const atTimes = Object.values(atSource);
    const record = atTimes.length > 0 ? Math.min(...atTimes) : 0;

    const runsForCourse = courseRunsHistory?.[cName] || [];

    const sorted = Object.entries(source)
      .map(([pKey, time]) => {
        const num = typeof time === "number" ? time : parseFloat(String(time)) || 0;
        const isInterim = isPlaceholderPlayer(pKey);
        const run = runsForCourse.find((r) => r.pKey === pKey && Math.abs(r.time - num) < 0.001);

        return {
          pKey,
          time: num,
          pts: num > 0 ? (record / num) * 100 : 0,
          videoUrl: rawBestSector?.[pKey]?.[cName]?.videoUrl,
          date: run?.date,
          isInterim,
          name: isInterim ? "INTERIM TOP TIME" : undefined,
        };
      })
      .sort((a, b) => b.pts - a.pts);

    let currentRank = 1;
    let prevTime = -1;
    return sorted.map((r, i) => {
      if (r.time !== prevTime) {
        currentRank = i + 1;
        prevTime = r.time;
      }
      return { ...r, rank: currentRank };
    });
  };

  masterCourseList.forEach((c) => {
    const name = c.name;
    courseRecords_M_AT[name] = computeRecords(lbAT?.M, atRawBest, name, lbAT?.M);
    courseRecords_F_AT[name] = computeRecords(lbAT?.F, atRawBest, name, lbAT?.F);
    courseRecords_M_OP[name] = computeRecords(lbOpen?.M, opRawBest, name, lbAT?.M);
    courseRecords_F_OP[name] = computeRecords(lbOpen?.F, opRawBest, name, lbAT?.F);
    courseRecords_M_2026[name] = computeRecords(lbSeason26?.M, season26RawBest, name, lbAT?.M);
    courseRecords_F_2026[name] = computeRecords(lbSeason26?.F, season26RawBest, name, lbAT?.F);
  });

  return {
    ...nextState,
    masterCourseList,
    searchLocations,
    kpiStats,
    kpiTrends,
    settersWithImpact,
    setterMet,
    teamsAggregated,
    playerLB_AT,
    playerLB_OP,
    playerLB_2026,
    courseRunsHistory: nextState.courseRunsHistory || {},

    // PRECOMPUTED FLAT UI ARRAYS
    playerList_M_AT: buildPlayerList(data, season26Data, openData, true, "M"),
    playerList_F_AT: buildPlayerList(data, season26Data, openData, true, "F"),
    playerList_M_OP: buildPlayerList(data, season26Data, openData, false, "M"),
    playerList_F_OP: buildPlayerList(data, season26Data, openData, false, "F"),
    playerList_M_2026: buildPlayerList(data, season26Data, openData, "2026", "M"),
    playerList_F_2026: buildPlayerList(data, season26Data, openData, "2026", "F"),
    courseList_AT: cListAT,
    courseList_OP: cListOP,
    courseList_2026: cList2026,
    settersList: sList,
    teamList_gyms_AT: buildTeamList(teamsAggregated, "gyms", true),
    teamList_teams_AT: buildTeamList(teamsAggregated, "teams", true),
    teamList_gyms_OP: buildTeamList(teamsAggregated, "gyms", false),
    teamList_teams_OP: buildTeamList(teamsAggregated, "teams", false),
    teamList_gyms_2026: buildTeamList(teamsAggregated, "gyms", "2026"),
    teamList_teams_2026: buildTeamList(teamsAggregated, "teams", "2026"),

    courseRecords_M_AT,
    courseRecords_F_AT,
    courseRecords_M_OP,
    courseRecords_F_OP,
    courseRecords_M_2026,
    courseRecords_F_2026,
  };
}

export function computeSimulatedPlacement(
  targetTime: number,
  records: Array<{ time: number; rank: number | string }>,
  courseRecord?: number,
) {
  const hasFasterUnlistedCR =
    courseRecord !== undefined &&
    courseRecord > 0 &&
    targetTime > courseRecord &&
    !records.some((r) => r.time > 0 && r.time <= courseRecord);

  let rank = hasFasterUnlistedCR ? 2 : 1;
  for (let i = 0; i < records.length; i++) {
    if (targetTime < records[i].time) {
      break;
    }
    if (targetTime === records[i].time) {
      rank = Number(records[i].rank);
      break;
    }
    rank++;
  }
  return rank;
}

export function computeOriginalRanks(athletePool: PlayerProfile[]) {
  const ranks: Record<string, number> = {};
  const sorted = [...athletePool]
    .filter((a) => a.currentRank !== "UR" && a.rating !== undefined)
    .sort(sortAthletesWithTiebreakers);
  let currRank = 1;
  let prevRating = -1;
  let prevRuns = -1;
  let prevDate = -1;
  sorted.forEach((a, idx) => {
    const r = a.rating || 0;
    const runs = a.runs || 0;
    const date = toTimestamp(a.latestRunDate);
    if (
      Math.abs(r - prevRating) > 0.000001 ||
      runs !== prevRuns ||
      date !== prevDate
    ) {
      currRank = idx + 1;
      prevRating = r;
      prevRuns = runs;
      prevDate = date;
    }
    ranks[a.pKey] = currRank;
  });
  return ranks;
}

export function computeLiveLadderWindow(
  records: Array<{ pKey: string; time: number; pts: number; rank: number | string }>,
  myKey: string,
  myName: string,
  targetTime: number,
  simulatedPts: number,
  athletePool: PlayerProfile[],
  courseRecord?: number,
) {
  const recordsWithMe = [...records];
  const myIndex = recordsWithMe.findIndex((r) => r.pKey === myKey);

  if (myIndex !== -1) {
    recordsWithMe[myIndex] = { ...recordsWithMe[myIndex], time: targetTime, pts: simulatedPts };
  } else {
    recordsWithMe.push({ pKey: myKey, time: targetTime, pts: simulatedPts, rank: 0 });
  }

  const namedRecords = recordsWithMe.map((r) => ({
    ...r,
    name:
      r.pKey === myKey
        ? myName
        : athletePool.find((a) => a.pKey === r.pKey)?.name || "Unknown",
    isMe: r.pKey === myKey,
  }));

  namedRecords.sort((a, b) => a.time - b.time);

  const hasFasterUnlistedCR =
    courseRecord !== undefined &&
    courseRecord > 0 &&
    targetTime > courseRecord &&
    !records.some((r) => r.time > 0 && r.time <= courseRecord);
  const rankOffset = hasFasterUnlistedCR ? 1 : 0;

  let curRank = 1 + rankOffset;
  for (let i = 0; i < namedRecords.length; i++) {
    if (i > 0 && namedRecords[i].time > namedRecords[i - 1].time) {
      curRank = i + 1 + rankOffset;
    }
    namedRecords[i].rank = curRank;
  }

  const myLiveRankIndex = namedRecords.findIndex((r) => r.isMe);
  const startIdx = Math.max(0, myLiveRankIndex - 1);
  const endIdx = Math.min(namedRecords.length, startIdx + 3);

  let finalStart = startIdx;
  if (endIdx - startIdx < 3) {
    finalStart = Math.max(0, endIdx - 3);
  }

  return namedRecords.slice(finalStart, endIdx);
}

export function computeSimulatedGlobalImpact(
  selectedAthlete: PlayerProfile,
  targetTime: number,
  courseName: string,
  fullLeaderboards: Record<string, Record<string, number>>,
  athletePool: PlayerProfile[],
  courseRecord: number,
  originalRanks: Record<string, number>,
) {
  const existingTimesList = fullLeaderboards[courseName] || {};
  let minOtherTime = Infinity;
  for (const pKey in existingTimesList) {
    const t = existingTimesList[pKey];
    if (pKey !== selectedAthlete.pKey && typeof t === "number" && t > 0 && t < minOtherTime) {
      minOtherTime = t;
    }
  }

  const baselineCR = minOtherTime !== Infinity ? minOtherTime : courseRecord;
  const simulatedCR =
    targetTime > 0
      ? baselineCR > 0
        ? Math.min(baselineCR, targetTime)
        : targetTime
      : baselineCR;
  const oldCR = courseRecord || 1;

  const allCourseNames = new Set(Object.keys(fullLeaderboards));
  allCourseNames.add(courseName);

  const courseRecords: Record<string, number> = {};
  for (const cName of allCourseNames) {
    if (cName === courseName) {
      courseRecords[cName] = simulatedCR;
    } else {
      const times = Object.values(fullLeaderboards[cName] || {});
      const validTimes = times.filter((t) => typeof t === "number" && t > 0);
      courseRecords[cName] = validTimes.length > 0 ? Math.min(...validTimes) : 0;
    }
  }

  const simulatedRatings: Record<string, number> = {};
  const simulatedCoursesCount: Record<string, number> = {};
  let totalPointsDestroyed = 0;

  for (const pt of athletePool) {
    let totalPts = 0;
    let totalRuns = 0;

    for (const cName of allCourseNames) {
      let time = fullLeaderboards[cName]?.[pt.pKey];

      if (cName === courseName) {
        if (pt.pKey === selectedAthlete.pKey) {
          time = targetTime;
        }
        const cr = courseRecords[cName];
        if (typeof time === "number" && time > 0 && cr > 0) {
          totalPts += Math.min(100, (cr / time) * 100);
          totalRuns++;
        }
      } else {
        const cr = courseRecords[cName];
        if (typeof time === "number" && time > 0 && cr > 0) {
          totalPts += Math.min(100, (cr / time) * 100);
          totalRuns++;
        }
      }
    }

    simulatedRatings[pt.pKey] = totalRuns > 0 ? totalPts / totalRuns : 0;
    simulatedCoursesCount[pt.pKey] = totalRuns;

    if (pt.pKey !== selectedAthlete.pKey) {
      const ptOriginalTime = existingTimesList[pt.pKey];
      if (typeof ptOriginalTime === "number" && ptOriginalTime > 0) {
        const oldCoursePts = Math.min(100, (oldCR / ptOriginalTime) * 100);
        const newCoursePts = Math.min(100, (simulatedCR / ptOriginalTime) * 100);
        const pointsDelta = newCoursePts - oldCoursePts;
        if (pointsDelta < 0) {
          totalPointsDestroyed += Math.abs(pointsDelta);
        }
      }
    }
  }

  const mySimRating = Math.round(simulatedRatings[selectedAthlete.pKey] * 1000000) / 1000000;
  const currentRating = Math.round((selectedAthlete.rating || 0) * 1000000) / 1000000;
  const myQualifies =
    Boolean(selectedAthlete.currentRank && selectedAthlete.currentRank !== "UR") ||
    isQualifiedAthlete(
      {
        courses: simulatedCoursesCount[selectedAthlete.pKey] || 0,
        gender: selectedAthlete.gender || "M",
        name: selectedAthlete.name,
      },
      "all-time",
      selectedAthlete.gender || "M",
    );

  const newRanks: Record<string, number> = {};
  const sortedNew = [...athletePool]
    .filter(
      (a) =>
        (a.currentRank !== "UR" && a.rating !== undefined) ||
        (a.pKey === selectedAthlete.pKey && myQualifies),
    )
    .sort((a, b) => {
      const rA = simulatedRatings[a.pKey] || 0;
      const rB = simulatedRatings[b.pKey] || 0;
      if (Math.abs(rB - rA) > 0.000001) return rB - rA;
      const runsDiff = (b.runs || 0) - (a.runs || 0);
      if (runsDiff !== 0) return runsDiff;
      return toTimestamp(a.latestRunDate) - toTimestamp(b.latestRunDate);
    });

  let currRank = 1;
  let prevRating = -1;
  let prevRuns = -1;
  let prevDate = -1;
  sortedNew.forEach((a, idx) => {
    const r = simulatedRatings[a.pKey] || 0;
    const runs = a.runs || 0;
    const date = toTimestamp(a.latestRunDate);
    if (
      Math.abs(r - prevRating) > 0.000001 ||
      runs !== prevRuns ||
      date !== prevDate
    ) {
      currRank = idx + 1;
      prevRating = r;
      prevRuns = runs;
      prevDate = date;
    }
    newRanks[a.pKey] = currRank;
  });

  const simulatedGlobalRank = newRanks[selectedAthlete.pKey] || 1;

  let athletesDemoted = 0;
  for (const pKey of Object.keys(originalRanks)) {
    if (pKey === selectedAthlete.pKey) continue;
    if ((newRanks[pKey] || 0) > (originalRanks[pKey] || 0)) {
      athletesDemoted++;
    }
  }

  return {
    originalRating: selectedAthlete.rating || 0,
    newRating: mySimRating,
    originalRank: selectedAthlete.currentRank || "UR",
    newRank: myQualifies ? simulatedGlobalRank : ("UR" as const),
    isImprovement: mySimRating > currentRating,
    pointsDestroyed: totalPointsDestroyed,
    athletesDemoted,
    beatsCR: targetTime < courseRecord,
    simulatedCR,
  };
}
