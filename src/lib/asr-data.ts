import {
  normalizeName,
  fixCountryEntity,
  cleanNumeric,
  getFireCountForRun,
  isPlaceholderPlayer,
  csvToObjects,
  CONFIG,
  robustSort,
  getNormalizedNameList,
  parseCourseDifficulty,
  parseCoords,
  normalizeForSearch,
} from "./asr-utils";
import type {
  CourseData,
  CourseRunEntry,
  GenderedCourseBoards,
  PlayerPerformance,
  PlayerProfile,
  PlayerTeamRef,
  RawBestRun,
  RecentFeedItem,
  SetterProfile,
} from "../types";

const parseSafeDate = (dStr: string | null | undefined): Date | null => {
  if (!dStr) return null;
  const s = String(dStr).trim();
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    return new Date(s.replace(/-/g, "/"));
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const toTimestamp = (d?: Date | string): number => {
  if (!d) return Infinity;
  const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
  return isNaN(t) ? Infinity : t;
};

const comparePlayersByTiebreaker = (a: PlayerProfile, b: PlayerProfile): number => {
  if (Math.abs((b.rating || 0) - (a.rating || 0)) > 0.000001) {
    return (b.rating || 0) - (a.rating || 0);
  }
  if ((b.runs || 0) !== (a.runs || 0)) {
    return (b.runs || 0) - (a.runs || 0);
  }
  return toTimestamp(a.latestRunDate) - toTimestamp(b.latestRunDate);
};

const isFootwearTeam = (name: string, shoeField?: string): boolean => {
  if (!name) return false;
  const nLow = name.toLowerCase().trim();
  const shoeKeywords = [
    "vans", "salomon", "feiyue", "adidas", "puma", "nike",
    "strike mvmnt", "strike movement", "new balance", "inov-8",
    "merrell", "asics", "reebok", "saucony", "hoka", "on running",
    "trail running", "ultrarange", "speedcross", "haze", "trainer",
    "shoes", "footwear", "equipment",
  ];
  if (shoeKeywords.some((kw) => nLow === kw || nLow.includes(kw))) {
    return true;
  }
  if (shoeField) {
    const sLow = shoeField.toLowerCase().trim();
    if (sLow && sLow !== "-" && (nLow.includes(sLow) || sLow.includes(nLow))) {
      return true;
    }
  }
  return false;
};

const extractPlayerTeams = (
  headers: string[] = [],
  raw: string[] = [],
  shoeField?: string,
): PlayerTeamRef[] => {
  const teams: PlayerTeamRef[] = [];
  for (let i = 0; i < headers.length; i++) {
    const h = (headers[i] || "").toLowerCase().trim();
    if (!/^team(\s*\d+)?$/.test(h)) continue;

    const tName = (raw[i] || "").trim();
    if (!tName || tName.toUpperCase() === "UNAFFILIATED" || isFootwearTeam(tName, shoeField)) {
      continue;
    }

    let loc = "";
    let flag = "";
    const next1 = (headers[i + 1] || "").toLowerCase().trim();
    const next2 = (headers[i + 2] || "").toLowerCase().trim();
    if (next1 && /loc/i.test(next1)) {
      loc = (raw[i + 1] || "").trim();
    }
    if (next2 && /flag/i.test(next2)) {
      flag = (raw[i + 2] || "").trim();
    } else if (next1 && /flag/i.test(next1)) {
      flag = (raw[i + 1] || "").trim();
    }

    teams.push({ name: tName, location: loc, flag });
  }
  return teams;
};

const RANKING_MAPPING = {
  name: ["name", "athlete", "player"],
  country: ["country"],
  flag: ["flag"],
  rating: ["lq", "ovr", "overall", "rating"],
  courses: ["courses"],
  pts: ["points", "pts", "asr"],
  runs: ["runs", "totalruns", "total", "#"],
  reruns: ["reruns"],
  wins: ["wins", "victories"],
  sets: ["sets", "total sets"],
  contribution: ["🪙", "contribution"],
  fire: ["🔥", "fire"],
  ig: ["ig", "instagram", "social"],
  avg: ["avg. time", "avg time", "average", "avg"],
  cert: ["setter lvl", "cert", "level", "certification"],
  location: ["home town", "hometown", "location", "city", "region"],
  townFlag: ["home town flag", "hometown flag", "town flag"],
  homeGym: ["home gym", "gym"],
  homeGymLocation: ["home gym location", "gym location", "gym loc"],
  gymFlag: ["home gym flag", "gym flag"],
  shoe: ["shoes", "shoe", "footwear"],
  shoeSize: ["shoe size", "size"],
};

const SET_LIST_MAPPING = {
  course: ["course", "track", "level"],
  length: ["length (m)", "length", "dist"],
  elev: ["elevation (m)", "elevation", "elev", "gain"],
  rating: ["rating", "diff", "difficulty"],
  type: ["type", "style"],
  textures: ["textures", "texture"],
  interfaces: ["interfaces", "interface"],
  shape: ["shape"],
  city: ["city", "location"],
  country: ["country", "nation"],
  flag: ["flag", "emoji"],
  dateSet: ["date set", "set on", "updated"],
  demo: ["course rules", "rules", "demo", "video", "url"],
  coverImage: ["img", "pic", "photo", "cover", "image", "coverimage"],
  coords: ["coordinates", "coords", "coord", "gps", "pin"],
  googleMaps: ["google maps"],
  state: ["state/province", "state", "prov", "region"],
  leads: ["leads", "lead", "lead setter", "leadsetters"],
  assists: ["assistants", "assistant", "assistant setter", "assistantsetters"],
  isOpen: ["open?"],
  is2026: ["2026?"],
  isAllTime: ["all-time?"],
  startType: ["start"],
  sponsorName: ["sponsor", "sponsor name", "course sponsor sponsor"],
  sponsorLink: ["sponsor link"],
};

const SETTER_MAPPING = {
  name: ["name", "setter"],
  leads: ["leads", "lead"],
  assists: ["assists", "assist", "assistant"],
  sets: ["sets", "total sets"],
  country: ["country", "nation"],
  flag: ["flag", "emoji", "region"],
  ig: ["ig", "instagram"],
  contribution: ["🪙", "contribution"],
  cert: ["setter lvl", "cert", "level", "certification"],
  location: ["home town", "hometown", "location", "city"],
  townFlag: ["home town flag", "hometown flag", "town flag"],
  homeGym: ["home gym", "gym"],
  homeGymLocation: ["home gym location", "gym location", "gym loc"],
  gymFlag: ["home gym flag", "gym flag"],
  shoe: ["shoes", "shoe", "footwear"],
};

const LIVE_FEED_MAPPING = {
  athlete: ["player", "athlete", "name"],
  course: ["course", "track", "level"],
  result: ["time", "result", "pb"],
  gender: ["division", "div", "gender", "sex"],
  date: ["date", "day", "timestamp"],
  tag: ["event", "tag", "category", "season"],
  proof: ["video proof", "proof", "video", "link", "url"],
  fire: ["🔥"],
  filmer: ["filmer", "videographer", "filmed by"],
};

export interface ProcessLiveFeedResult {
  allTimePerformances: Record<string, PlayerPerformance[]>;
  openPerformances: Record<string, PlayerPerformance[]>;
  season26Performances: Record<string, PlayerPerformance[]>;
  allTimeRankings: PlayerProfile[];
  openRankings: PlayerProfile[];
  season26Rankings: PlayerProfile[];
  allTimeLeaderboards: GenderedCourseBoards;
  openLeaderboards: GenderedCourseBoards;
  season26Leaderboards: GenderedCourseBoards;
  athleteMetadata: Record<string, PlayerProfile>;
  athleteDisplayNameMap: Record<string, string>;
  courseMetadata: Record<string, CourseData>;
  courseRunsHistory: Record<string, CourseRunEntry[]>;
  openCourseRunsCount: Record<string, number>;
  season26CourseRunsCount: Record<string, number>;
  atRawBest: Record<string, Record<string, RawBestRun>>;
  opRawBest: Record<string, Record<string, RawBestRun>>;
  season26RawBest: Record<string, Record<string, RawBestRun>>;
  filmerCredits: Record<string, number>;
  recentFeed: RecentFeedItem[];
}

export const processRankingData = (csv: string, gender: "M" | "F"): PlayerProfile[] => {
  const dataRows = csvToObjects(csv, RANKING_MAPPING);
  return dataRows
    .map((vals, i): PlayerProfile | null => {
      const pName = (vals.name || "").trim() || "UNKNOWN";
      if (pName.length < 2 || isPlaceholderPlayer(pName)) return null;

      const fixed = fixCountryEntity(vals.country || "", vals.flag || "");
      const rawIg = (vals.ig || "")
        .replace(/(https?:\/\/)?(www\.)?instagram\.com\//i, "")
        .replace(/\?.*/, "")
        .replace(/@/g, "")
        .replace(/\/$/, "")
        .trim();

      const pLocation = (vals.location || "").trim() || CONFIG.FALLBACKS.UNKNOWN_LOCATION;
      const pHomeGym = (vals.homeGym || "").trim() || CONFIG.FALLBACKS.UNAFFILIATED;
      const pTeamLocation = (vals.homeGymLocation || "").trim();

      const shoeField = (vals.shoe || "").trim();
      const pTeams: PlayerTeamRef[] = extractPlayerTeams(vals.__headers, vals.__raw, shoeField);

      const townFlagRaw = (vals.townFlag || "").trim();
      const gymFlagRaw = (vals.gymFlag || "").trim();
      const townEntity = fixCountryEntity("", townFlagRaw);
      const gymEntity = fixCountryEntity("", gymFlagRaw);

      const teamNamesStr = pTeams.map((t) => t.name).join(" ");
      const searchKey = normalizeForSearch(
        `${pName} ${fixed.name} ${rawIg} ${pLocation} ${pHomeGym} ${teamNamesStr}`,
      );
      return {
        id: `${gender}-${normalizeName(pName)}-${i}`,
        name: pName,
        pKey: normalizeName(pName),
        gender,
        countryName: fixed.name,
        region: fixed.flag,
        location: pLocation,
        homeGym: pHomeGym,
        teams: pTeams,
        teamLocation: pTeamLocation,
        townFlag: townEntity.flag,
        gymFlag: gymEntity.flag,
        igHandle: rawIg,
        rating: cleanNumeric(vals.rating) || 0,
        courses: Math.floor(cleanNumeric(vals.courses) || 0),
        runs: Math.floor(cleanNumeric(vals.runs) || 0),
        wins: Math.floor(cleanNumeric(vals.wins) || 0),
        pts: cleanNumeric(vals.pts) || 0,
        sets: Math.floor(cleanNumeric(vals.sets) || 0),
        contributionScore: cleanNumeric(vals.contribution) || 0,
        allTimeFireCount: Math.floor(cleanNumeric(vals.fire) || 0),
        avgTime: cleanNumeric(vals.avg) || 0,
        certLevel: (vals.cert || "").trim().toUpperCase() || "NONE",
        shoe: (vals.shoe || "").trim(),
        shoeSize: (vals.shoeSize || "").trim(),
        searchKey,
      };
    })
    .filter((p): p is PlayerProfile => p !== null);
};

export const processSetListData = (csv: string): Record<string, CourseData> => {
  const dataRows = csvToObjects(csv, SET_LIST_MAPPING);
  const map: Record<string, CourseData> = {};
  dataRows.forEach((vals) => {
    const course = (vals.course || "").trim().toUpperCase();
    if (course) {
      const fixed = fixCountryEntity(vals.country || "", vals.flag || "");
      const isOpenRaw = vals.isOpen ? String(vals.isOpen).toUpperCase().trim() : "";
      const is2026Raw = vals.is2026 ? String(vals.is2026).toUpperCase().trim() : "";
      const isAllTimeRaw = vals.isAllTime ? String(vals.isAllTime).toUpperCase().trim() : "";
      const rulesVideoFromCol = (vals.demo || "").trim();
      const sponsorName = (vals.sponsorName || "").trim();
      const sponsorLink = (vals.sponsorLink || "").trim();

      const isOpenCourse = isOpenRaw === "YES" || isOpenRaw === "TRUE" || isOpenRaw.includes("OPEN");
      const is2026Course = is2026Raw === "YES" || is2026Raw === "TRUE" || is2026Raw.includes("2026");
      const isAllTimeCourse = isAllTimeRaw === "YES" || isAllTimeRaw === "TRUE" || isAllTimeRaw.includes("ALL");
      const leadsRaw = (vals.leads || "").trim();
      const assistsRaw = (vals.assists || "").trim();
      const coordsRaw = (vals.coords || "").trim();

      map[course] = {
        name: course,
        isOpenCourse,
        is2026Course,
        isAllTimeCourse,
        flag: fixed.flag || "🏳️",
        city: (vals.city || "").trim().toUpperCase() || "UNKNOWN",
        stateProv: (vals.state || "").trim().toUpperCase(),
        country: fixed.name.toUpperCase() || "UNKNOWN",
        difficulty: parseCourseDifficulty((vals.rating || "").trim()),
        length: (vals.length || "").trim(),
        elevation: (vals.elev || "").trim(),
        type: (vals.type || "").trim(),
        textures: (vals.textures || "").trim(),
        interfaces: (vals.interfaces || "").trim(),
        shape: (vals.shape || "").trim(),
        startType: (vals.startType || "").trim(),
        googleMaps: (vals.googleMaps || "").trim(),
        dateSet: (vals.dateSet || "").trim(),
        setter: leadsRaw + (assistsRaw ? `, ${assistsRaw}` : ""),
        leadSetters: leadsRaw,
        leadSettersNormalized: getNormalizedNameList(leadsRaw),
        assistantsetters: assistsRaw,
        assistantSettersNormalized: getNormalizedNameList(assistsRaw),
        demoVideo: rulesVideoFromCol || (vals.demo || "").trim(),
        coverImage: (vals.coverImage || "").trim(),
        coordinates: coordsRaw,
        parsedCoords: parseCoords(coordsRaw),
        sponsorName,
        sponsorLink,
        searchKey: normalizeForSearch(
          `${course} ${vals.city || ""} ${vals.state || ""} ${fixed.name} ${(vals.city || "").replace(/ /g, "")}`,
        ),
      };
    }
  });
  return map;
};

export const processSettersData = (csv: string): SetterProfile[] => {
  const dataRows = csvToObjects(csv, SETTER_MAPPING);
  return dataRows
    .map((vals, i): SetterProfile | null => {
      const name = (vals.name || "").trim();
      if (!name || isPlaceholderPlayer(name)) return null;
      const fixed = fixCountryEntity(vals.country || "", vals.flag || "");

      const pLocation = (vals.location || "").trim() || CONFIG.FALLBACKS.UNKNOWN_LOCATION;
      const pHomeGym = (vals.homeGym || "").trim() || CONFIG.FALLBACKS.UNAFFILIATED;

      const townFlagRaw = (vals.townFlag || "").trim();
      const gymFlagRaw = (vals.gymFlag || "").trim();
      const townEntity = fixCountryEntity("", townFlagRaw);
      const gymEntity = fixCountryEntity("", gymFlagRaw);

      const shoeField = (vals.shoe || "").trim();
      const pTeams: PlayerTeamRef[] = extractPlayerTeams(vals.__headers, vals.__raw, shoeField);

      const teamNamesStr = pTeams.map((t) => t.name).join(" ");
      return {
        id: `setter-${normalizeName(name)}-${i}`,
        name,
        pKey: normalizeName(name),
        region: fixed.flag || "🏳️",
        location: pLocation,
        homeGym: pHomeGym,
        teams: pTeams,
        townFlag: townEntity.flag,
        gymFlag: gymEntity.flag,
        countryName: fixed.name,
        igHandle: (vals.ig || "").replace(/@/g, "").trim(),
        sets: cleanNumeric(vals.sets) || 0,
        leads: cleanNumeric(vals.leads) || 0,
        assists: cleanNumeric(vals.assists) || 0,
        contributionScore: cleanNumeric(vals.contribution) || 0,
        certLevel: (vals.cert || "").trim().toUpperCase() || "NONE",
        searchKey: normalizeForSearch(
          `${name} ${fixed.name} ${pLocation} ${pHomeGym} ${teamNamesStr}`,
        ),
      };
    })
    .filter((s): s is SetterProfile => s !== null);
};

export const processLiveFeedData = (
  csv: string,
  athleteMetadata: Record<string, PlayerProfile> = {},
  courseSetMap: Record<string, CourseData> = {},
): ProcessLiveFeedResult => {
  const result: ProcessLiveFeedResult = {
    allTimePerformances: {},
    openPerformances: {},
    season26Performances: {},
    allTimeRankings: [],
    openRankings: [],
    season26Rankings: [],
    allTimeLeaderboards: { M: {}, F: {} },
    openLeaderboards: { M: {}, F: {} },
    season26Leaderboards: { M: {}, F: {} },
    athleteMetadata,
    athleteDisplayNameMap: {},
    courseMetadata: courseSetMap,
    courseRunsHistory: {},
    openCourseRunsCount: {},
    season26CourseRunsCount: {},
    atRawBest: {},
    opRawBest: {},
    season26RawBest: {},
    filmerCredits: {},
    recentFeed: [],
  };
  if (!csv) return result;
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim());
  let hIdx = -1;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    if (/athlete|name|player|course|track|pb|result/i.test(lines[i])) {
      hIdx = i;
      break;
    }
  }
  if (hIdx === -1) return result;

  const dataRows = csvToObjects(csv, LIVE_FEED_MAPPING, hIdx);
  const OPEN_START = new Date(CONFIG.DATES.OPEN_START);
  const OPEN_END = new Date(CONFIG.DATES.OPEN_END);
  const allTimeAthleteBestTimes: Record<string, Record<string, RawBestRun>> = {};
  const allTimeCourseLeaderboards: GenderedCourseBoards = { M: {}, F: {} };
  const allTimeAthleteTotalSubmissions: Record<string, number> = {};
  const openAthleteBestTimes: Record<string, Record<string, RawBestRun>> = {};
  const openCourseLeaderboards: GenderedCourseBoards = { M: {}, F: {} };
  const openAthleteTotalSubmissions: Record<string, number> = {};
  const season26AthleteBestTimes: Record<string, Record<string, RawBestRun>> = {};
  const season26CourseLeaderboards: GenderedCourseBoards = { M: {}, F: {} };
  const season26AthleteTotalSubmissions: Record<string, number> = {};
  const athleteDisplayNameMap: Record<string, string> = {};
  const filmerCreditsCount: Record<string, number> = {};
  const courseRunsHistory: Record<string, CourseRunEntry[]> = {};
  const openCourseRunsCount: Record<string, number> = {};
  const season26CourseRunsCount: Record<string, number> = {};

  dataRows.forEach((vals) => {
    const pName = (vals.athlete || "").trim();
    const rawCourse = (vals.course || "").trim();
    const numericValue = cleanNumeric(vals.result);
    if (!pName || !rawCourse || numericValue === null || numericValue <= 0) return;

    const rawGenderValue = (vals.gender || "").toUpperCase().trim();
    const baseKey = normalizeName(pName);
    const pGender: "M" | "F" =
      rawGenderValue.startsWith("W") || rawGenderValue.startsWith("F")
        ? "F"
        : rawGenderValue.startsWith("M")
          ? "M"
          : athleteMetadata[baseKey]?.gender || "M";

    let pKey = baseKey;
    if (isPlaceholderPlayer(pName)) {
      pKey = `${baseKey}-${pGender.toLowerCase()}`;
    }

    const normC = rawCourse.toUpperCase();
    const isCourseOpen = Boolean(courseSetMap[normC]?.isOpenCourse);
    const isPlaceholder = isPlaceholderPlayer(pName);
    const parsedDateIso = vals.date ? parseSafeDate(vals.date)?.toISOString() || null : null;
    const proofUrl = (vals.proof || "").trim();

    if (!isPlaceholder) {
      if (!courseRunsHistory[normC]) courseRunsHistory[normC] = [];
      courseRunsHistory[normC].push({
        pKey,
        athlete: pName,
        gender: pGender,
        course: rawCourse,
        num: numericValue,
        time: numericValue,
        videoUrl: proofUrl,
        date: parsedDateIso,
      });

      if (!athleteDisplayNameMap[pKey]) athleteDisplayNameMap[pKey] = pName;

      allTimeAthleteTotalSubmissions[pKey] = (allTimeAthleteTotalSubmissions[pKey] || 0) + 1;

      const rawFilmer = (vals.filmer || "").trim();
      if (rawFilmer) {
        getNormalizedNameList(rawFilmer).forEach((filmerKey) => {
          if (!filmerKey || filmerKey === "na" || filmerKey === "none") return;
          filmerCreditsCount[filmerKey] = (filmerCreditsCount[filmerKey] || 0) + 1;
        });
      }

      if (!athleteMetadata[pKey]) {
        athleteMetadata[pKey] = {
          pKey,
          name: pName,
          gender: pGender,
          rating: 0,
          runs: 0,
          region: "🏳️",
          location: "",
          homeGym: "",
          teamLocation: "",
          countryName: "",
          searchKey: normalizeForSearch(pName),
        };
      } else if (pName.length > (athleteMetadata[pKey].name || "").length) {
        athleteMetadata[pKey].name = pName;
        athleteDisplayNameMap[pKey] = pName;
      }

      if (!allTimeAthleteBestTimes[pKey]) allTimeAthleteBestTimes[pKey] = {};
      if (
        !allTimeAthleteBestTimes[pKey][normC] ||
        numericValue < allTimeAthleteBestTimes[pKey][normC].num
      ) {
        allTimeAthleteBestTimes[pKey][normC] = {
          label: rawCourse,
          value: vals.result,
          num: numericValue,
          videoUrl: proofUrl,
          date: parsedDateIso,
        };
      }
    }

    if (!allTimeCourseLeaderboards[pGender][normC]) {
      allTimeCourseLeaderboards[pGender][normC] = {};
    }
    if (
      !allTimeCourseLeaderboards[pGender][normC][pKey] ||
      numericValue < allTimeCourseLeaderboards[pGender][normC][pKey]
    ) {
      allTimeCourseLeaderboards[pGender][normC][pKey] = numericValue;
    }

    const runDate = vals.date ? parseSafeDate(vals.date) : null;
    const isASROpenTag = (vals.tag || "").toUpperCase().includes("OPEN");
    const isInOpenWindow =
      runDate &&
      !isNaN(runDate.getTime()) &&
      runDate >= OPEN_START &&
      runDate <= OPEN_END;

    if ((isASROpenTag || isInOpenWindow) && isCourseOpen) {
      if (!isPlaceholder) {
        if (!openAthleteBestTimes[pKey]) openAthleteBestTimes[pKey] = {};
        if (
          !openAthleteBestTimes[pKey][normC] ||
          numericValue < openAthleteBestTimes[pKey][normC].num
        ) {
          openAthleteBestTimes[pKey][normC] = {
            label: rawCourse,
            value: vals.result,
            num: numericValue,
            videoUrl: proofUrl,
            date: parsedDateIso,
          };
        }
        openAthleteTotalSubmissions[pKey] =
          (openAthleteTotalSubmissions[pKey] || 0) + 1;
        openCourseRunsCount[normC] = (openCourseRunsCount[normC] || 0) + 1;
      }
      if (!openCourseLeaderboards[pGender][normC]) {
        openCourseLeaderboards[pGender][normC] = {};
      }
      if (
        !openCourseLeaderboards[pGender][normC][pKey] ||
        numericValue < openCourseLeaderboards[pGender][normC][pKey]
      ) {
        openCourseLeaderboards[pGender][normC][pKey] = numericValue;
      }
    }

    const tagString = (vals.tag || "").toUpperCase();
    let is2026 = false;
    if (tagString.includes("2026")) {
      is2026 = true;
    } else if (vals.date) {
      const dateStr = String(vals.date).trim();
      if (dateStr.includes("2026") || /\/(?:20)?26(?:\s|$)/.test(dateStr) || dateStr.endsWith("/26")) {
        is2026 = true;
      } else {
        const d = parseSafeDate(dateStr);
        if (d && d.getFullYear() === 2026) is2026 = true;
      }
    }

    const isCourse2026 = courseSetMap[normC]?.is2026Course !== false;
    if (is2026 && isCourse2026) {
      if (!isPlaceholder) {
        if (!season26AthleteBestTimes[pKey]) season26AthleteBestTimes[pKey] = {};
        if (
          !season26AthleteBestTimes[pKey][normC] ||
          numericValue < season26AthleteBestTimes[pKey][normC].num
        ) {
          season26AthleteBestTimes[pKey][normC] = {
            label: rawCourse,
            value: vals.result,
            num: numericValue,
            videoUrl: proofUrl,
            date: parsedDateIso,
          };
        }
        season26AthleteTotalSubmissions[pKey] = (season26AthleteTotalSubmissions[pKey] || 0) + 1;
        season26CourseRunsCount[normC] = (season26CourseRunsCount[normC] || 0) + 1;
      }
      if (!season26CourseLeaderboards[pGender][normC]) {
        season26CourseLeaderboards[pGender][normC] = {};
      }
      if (
        !season26CourseLeaderboards[pGender][normC][pKey] ||
        numericValue < season26CourseLeaderboards[pGender][normC][pKey]
      ) {
        season26CourseLeaderboards[pGender][normC][pKey] = numericValue;
      }
    }
  });

  const buildPerfs = (
    source: Record<string, Record<string, RawBestRun>>,
    mode: "all-time" | "open" | "2026" = "all-time",
  ): Record<string, PlayerPerformance[]> => {
    const res: Record<string, PlayerPerformance[]> = {};
    const memoizedBoards: Record<
      string,
      { record: number; rankMap: Map<string, number> }
    > = {};

    Object.keys(source).forEach((pKey) => {
      const pGender: "M" | "F" = athleteMetadata[pKey]?.gender || "M";
      let fireTotal = 0;
      res[pKey] = Object.entries(source[pKey]).map(([normL, data]) => {
        const boardKey = `${pGender}-${normL}-${mode}`;
        if (!memoizedBoards[boardKey]) {
          const allTimeBoard = (allTimeCourseLeaderboards[pGender] || {})[normL] || {};
          const contextBoard =
            mode === "2026"
              ? (season26CourseLeaderboards[pGender] || {})[normL] || {}
              : mode === "open"
                ? (openCourseLeaderboards[pGender] || {})[normL] || {}
                : allTimeBoard;
          const vals = Object.values(allTimeBoard);
          const record = vals.length ? Math.min(...vals) : 0;
          const sorted = Object.entries(contextBoard).sort((a, b) => a[1] - b[1]);
          let currentRank = 1;
          let prevTime = -1;
          const rankMap = new Map<string, number>();
          sorted.forEach((e, idx) => {
            const time = e[1];
            if (time !== prevTime) {
              currentRank = idx + 1;
              prevTime = time;
            }
            rankMap.set(e[0], currentRank);
          });
          memoizedBoards[boardKey] = { record, rankMap };
        }

        const { record, rankMap } = memoizedBoards[boardKey];
        const rank = rankMap.get(pKey) || 0;
        const fires = getFireCountForRun(data.num, pGender);
        const courseMeta = courseSetMap[normL];
        fireTotal += fires;
        return {
          label: data.label,
          value: data.value,
          num: data.num,
          rank,
          points: record && data.num ? (record / data.num) * 100 : 0,
          videoUrl: data.videoUrl,
          date: data.date,
          fireCount: fires,
          city: courseMeta?.city,
          country: courseMeta?.country,
          location: courseMeta?.city || courseMeta?.country,
        };
      });

      if (athleteMetadata[pKey]) {
        if (mode === "all-time") {
          athleteMetadata[pKey].allTimeFireCount = fireTotal;
        } else if (mode === "open") {
          athleteMetadata[pKey].openFireCount = fireTotal;
        } else if (mode === "2026") {
          athleteMetadata[pKey].season26FireCount = fireTotal;
        }
        athleteMetadata[pKey].films = filmerCreditsCount[pKey] || 0;
      }
    });
    return res;
  };

  result.allTimePerformances = buildPerfs(allTimeAthleteBestTimes, "all-time");
  result.season26Performances = buildPerfs(season26AthleteBestTimes, "2026");
  result.openPerformances = buildPerfs(openAthleteBestTimes, "open");
  Object.keys(athleteMetadata).forEach((pKey) => {
    athleteMetadata[pKey].films = filmerCreditsCount[pKey] || 0;
  });
  result.allTimeLeaderboards = allTimeCourseLeaderboards;
  result.openLeaderboards = openCourseLeaderboards;
  result.season26Leaderboards = season26CourseLeaderboards;
  result.season26RawBest = season26AthleteBestTimes;
  result.athleteDisplayNameMap = athleteDisplayNameMap;
  result.courseRunsHistory = courseRunsHistory;
  result.openCourseRunsCount = openCourseRunsCount;
  result.season26CourseRunsCount = season26CourseRunsCount;
  result.atRawBest = allTimeAthleteBestTimes;
  result.opRawBest = openAthleteBestTimes;
  result.filmerCredits = filmerCreditsCount;

  const chronologicalRuns = [...dataRows]
    .filter((run) => {
      const pName = (run.athlete || "").trim();
      const cName = (run.course || "").trim();
      return Boolean(pName && cName && cleanNumeric(run.result) !== null && !isPlaceholderPlayer(pName));
    })
    .sort((a, b) => {
      const dateA = a.date ? parseSafeDate(a.date)?.getTime() || 0 : 0;
      const dateB = b.date ? parseSafeDate(b.date)?.getTime() || 0 : 0;
      return dateB - dateA;
    })
    .slice(0, 100);

  const recentFeedMemoBoards: Record<string, [string, number][]> = {};
  result.recentFeed = chronologicalRuns.map((run, i): RecentFeedItem => {
    const pName = (run.athlete || "").trim();
    const courseName = (run.course || "").trim();
    const normC = courseName.toUpperCase();
    const numericValue = cleanNumeric(run.result);
    const pKey = normalizeName(pName);
    const athleteMeta = athleteMetadata[pKey];
    const pGender: "M" | "F" = athleteMeta?.gender || "M";

    const boardKey = `${pGender}-${normC}`;
    let sortedResults = recentFeedMemoBoards[boardKey];
    if (!sortedResults) {
      const courseRecords = (allTimeCourseLeaderboards[pGender] || {})[normC] || {};
      sortedResults = Object.entries(courseRecords).sort((a, b) => a[1] - b[1]);
      recentFeedMemoBoards[boardKey] = sortedResults;
    }

    const runRank =
      numericValue !== null
        ? sortedResults.filter((entry) => entry[1] < numericValue).length + 1
        : 0;
    const fireCount = numericValue !== null ? getFireCountForRun(numericValue, pGender) : 0;

    return {
      id: `feed-${i}`,
      name: pName,
      athlete: athleteMeta,
      courseName,
      course: { ...(courseSetMap[normC] || {}), name: courseName },
      result: run.result,
      time: numericValue,
      videoUrl: (run.proof || "").trim(),
      isCR: runRank === 1 && !isPlaceholderPlayer(pName),
      rank: runRank,
      fireCount,
      timeString: run.date || "LATEST",
    };
  });

  const getLatestRunDate = (perfs: PlayerPerformance[]): Date =>
    perfs.reduce((latest: Date, p) => {
      if (!p.date) return latest;
      const runDate = new Date(p.date);
      if (isNaN(runDate.getTime())) return latest;
      return runDate > latest ? runDate : latest;
    }, new Date(0));

  result.season26Rankings = Object.keys(athleteMetadata)
    .filter((k) => {
      const meta = athleteMetadata[k];
      const perfs = result.season26Performances[k] || [];
      return !isPlaceholderPlayer(meta.name) && perfs.length > 0;
    })
    .map((pKey): PlayerProfile => {
      const meta = athleteMetadata[pKey];
      const perfs = result.season26Performances[pKey] || [];
      const totalPts = perfs.reduce((sum, p) => sum + (p.points || 0), 0);
      return {
        ...meta,
        id: `season26-${pKey}`,
        rating: perfs.length > 0 ? totalPts / perfs.length : 0,
        courses: perfs.length,
        runs: Math.max(season26AthleteTotalSubmissions[pKey] || 0, perfs.length),
        latestRunDate: getLatestRunDate(perfs),
        wins: perfs.filter((p) => p.rank === 1).length,
        pts: totalPts,
        sets: meta.sets || 0,
        season26FireCount: perfs.reduce((sum, p) => sum + (p.fireCount || 0), 0),
      };
    })
    .sort(comparePlayersByTiebreaker);

  result.openRankings = Object.keys(athleteMetadata)
    .filter((k) => {
      const meta = athleteMetadata[k];
      const perfs = result.openPerformances[k] || [];
      return !isPlaceholderPlayer(meta.name) && perfs.length > 0;
    })
    .map((pKey): PlayerProfile => {
      const meta = athleteMetadata[pKey];
      const perfs = result.openPerformances[pKey] || [];
      const totalPts = perfs.reduce((sum, p) => sum + (p.points || 0), 0);
      return {
        ...meta,
        id: `open-${pKey}`,
        rating: perfs.length > 0 ? totalPts / perfs.length : 0,
        courses: perfs.length,
        runs: Math.max(openAthleteTotalSubmissions[pKey] || 0, perfs.length),
        latestRunDate: getLatestRunDate(perfs),
        wins: perfs.filter((p) => p.rank === 1).length,
        pts: totalPts,
        sets: meta.sets || 0,
        openFireCount: perfs.reduce((sum, p) => sum + (p.fireCount || 0), 0),
      };
    })
    .sort(comparePlayersByTiebreaker);

  result.allTimeRankings = Object.keys(athleteMetadata)
    .filter((k) => {
      const meta = athleteMetadata[k];
      const perfs = result.allTimePerformances[k] || [];
      return (
        !isPlaceholderPlayer(meta.name) &&
        (perfs.length > 0 || (meta.sets || 0) > 0 || (meta.contributionScore || 0) > 0)
      );
    })
    .map((pKey): PlayerProfile => {
      const meta = athleteMetadata[pKey];
      const perfs = result.allTimePerformances[pKey] || [];
      const totalPts = perfs.reduce((sum, p) => sum + (p.points || 0), 0);
      return {
        ...meta,
        id: `at-${pKey}`,
        rating: perfs.length > 0 ? totalPts / perfs.length : 0,
        courses: perfs.length,
        runs: Math.max(allTimeAthleteTotalSubmissions[pKey] || 0, perfs.length),
        latestRunDate: getLatestRunDate(perfs),
        wins: perfs.filter((p) => p.rank === 1).length,
        pts: totalPts,
        sets: meta.sets || 0,
        allTimeFireCount: perfs.reduce((sum, p) => sum + (p.fireCount || 0), 0),
      };
    })
    .sort(comparePlayersByTiebreaker);

  return result;
};

interface MedalRow extends Record<string, unknown> {
  name: string;
  flag: string;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
  displayRank?: number;
}

export const calculateWofStats = (
  data: PlayerProfile[],
  atPerfs: Record<string, PlayerPerformance[]>,
  lbAT: GenderedCourseBoards,
  atMet: Record<string, PlayerProfile>,
  medalSort: { key: string; direction: "ascending" | "descending" } | null,
  settersWithImpact: SetterProfile[],
  cMet?: Record<string, CourseData>,
  courseRunsHistory?: Record<string, CourseRunEntry[]>,
) => {
  try {
    if (!data || !data.length) return null;
    const courseHistoryRerunsMap: Record<string, number> = {};
    if (courseRunsHistory) {
      Object.values(courseRunsHistory).forEach((runs) => {
        const courseAthleteRuns: Record<string, number> = {};
        runs.forEach((r) => {
          if (r.pKey) {
            courseAthleteRuns[r.pKey] = (courseAthleteRuns[r.pKey] || 0) + 1;
          }
        });
        Object.entries(courseAthleteRuns).forEach(([pKey, count]) => {
          if (count > 1) {
            courseHistoryRerunsMap[pKey] = (courseHistoryRerunsMap[pKey] || 0) + (count - 1);
          }
        });
      });
    }

    const qualifiedAthletes = data
      .filter((p) => !isPlaceholderPlayer(p.name) && (p.courses || 0) >= 10)
      .map((p) => {
        const performances = atPerfs?.[p.pKey] || [];
        const calculatedFires = performances.reduce((sum, run) => sum + (run.fireCount || 0), 0);
        const uniqueCities = new Set<string>();
        const uniqueCountries = new Set<string>();
        performances.forEach((run) => {
          const courseKey = String(run.label || run.name || run.course || "").toUpperCase();
          const courseMeta = (cMet && courseKey && cMet[courseKey]) || undefined;
          const city = String(run.city || courseMeta?.city || "").trim().toUpperCase();
          const country = String(run.country || courseMeta?.country || "").trim().toUpperCase();
          if (city && city !== "UNKNOWN" && city !== "N/A" && city !== "NONE") {
            uniqueCities.add(city);
          }
          if (country && country !== "UNKNOWN" && country !== "N/A" && country !== "NONE") {
            uniqueCountries.add(country);
          }
        });

        const reruns = courseRunsHistory
          ? (courseHistoryRerunsMap[p.pKey] ?? Math.max(0, (p.runs || 0) - (p.courses || 0)))
          : Math.max(0, (p.runs || 0) - (p.courses || 0));

        const denom = p.courses || p.runs || 0;
        return {
          ...p,
          allTimeFireCount: calculatedFires,
          cities: uniqueCities.size,
          countries: uniqueCountries.size,
          reruns,
          winPercentage: denom > 0 ? ((p.wins || 0) / denom) * 100 : 0,
        };
      });

    const medalsBase: Record<string, MedalRow> = {};
    const processMedals = (lb: Record<string, Record<string, number>> | undefined) => {
      if (!lb) return;
      Object.entries(lb).forEach(([, athletesRec]) => {
        if (!athletesRec) return;
        const sorted = Object.entries(athletesRec).sort((a, b) => a[1] - b[1]);
        let currentRank = 1;
        let prevTime = -1;
        sorted.forEach(([pKey, time], idx) => {
          if (time !== prevTime) {
            currentRank = idx + 1;
            prevTime = time;
          }
          if (currentRank > 3) return;
          const name = atMet[pKey]?.name || pKey;
          if (isPlaceholderPlayer(pKey) || isPlaceholderPlayer(name)) return;

          const athlete = atMet[pKey];
          const names = String(athlete?.countryName || "")
            .split(/[,/]/)
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean);
          if (names.length === 0) names.push("UNKNOWN");
          const flags = String(athlete?.region || "").match(
            /[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g,
          ) || [athlete?.region || "🏳️"];

          const primaryName = names[0];
          const primaryFlag = flags[0] || "🏳️";

          const fixed = fixCountryEntity(primaryName, primaryFlag);
          if (!medalsBase[fixed.name]) {
            medalsBase[fixed.name] = {
              name: fixed.name,
              flag: fixed.flag,
              gold: 0,
              silver: 0,
              bronze: 0,
              total: 0,
            };
          }
          if (currentRank === 1) medalsBase[fixed.name].gold++;
          else if (currentRank === 2) medalsBase[fixed.name].silver++;
          else medalsBase[fixed.name].bronze++;
          medalsBase[fixed.name].total++;
        });
      });
    };
    processMedals(lbAT?.M);
    processMedals(lbAT?.F);

    const sortedMedalCount = Object.values(medalsBase)
      .sort((a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze)
      .map((c, i) => ({ ...c, displayRank: i + 1 }));

    if (medalSort && medalSort.key) {
      const dir = medalSort.direction === "ascending" ? 1 : -1;
      sortedMedalCount.sort((a, b) => robustSort(a, b, medalSort.key, dir));
    }

    return {
      medalCount: sortedMedalCount,
      topStats: {
        rating: [...qualifiedAthletes]
          .filter((a) => (a.rating || 0) > 0)
          .sort(comparePlayersByTiebreaker)
          .slice(0, 20),
        courses: [...qualifiedAthletes]
          .filter((a) => (a.courses || 0) > 0)
          .sort((a, b) => (b.courses || 0) - (a.courses || 0) || b.runs - a.runs)
          .slice(0, 20),
        runs: [...qualifiedAthletes]
          .filter((a) => (a.runs || 0) > 0)
          .sort((a, b) => b.runs - a.runs)
          .slice(0, 20),
        reruns: [...qualifiedAthletes]
          .filter((a) => (a.reruns || 0) > 0)
          .sort(
            (a, b) =>
              (b.reruns || 0) - (a.reruns || 0) ||
              (b.runs || 0) - (a.runs || 0) ||
              (b.courses || 0) - (a.courses || 0),
          )
          .slice(0, 20),
        cities: [...qualifiedAthletes]
          .filter((a) => (a.cities || 0) > 0)
          .sort(
            (a, b) =>
              (b.cities || 0) - (a.cities || 0) ||
              (b.courses || 0) - (a.courses || 0) ||
              b.runs - a.runs,
          )
          .slice(0, 20),
        countries: [...qualifiedAthletes]
          .filter((a) => (a.countries || 0) > 0)
          .sort(
            (a, b) =>
              (b.countries || 0) - (a.countries || 0) ||
              (b.courses || 0) - (a.courses || 0) ||
              b.runs - a.runs,
          )
          .slice(0, 20),
        winPercentage: [...qualifiedAthletes]
          .filter((a) => (a.winPercentage || 0) > 0)
          .sort((a, b) => b.winPercentage - a.winPercentage || b.runs - a.runs)
          .slice(0, 20),
        wins: [...qualifiedAthletes]
          .filter((a) => (a.wins || 0) > 0)
          .sort((a, b) => (b.wins || 0) - (a.wins || 0))
          .slice(0, 20),
        impact: [...(settersWithImpact || [])]
          .filter((a) => (a.impact || 0) > 0)
          .sort((a, b) => (b.impact || 0) - (a.impact || 0))
          .slice(0, 20),
        sets: [...(settersWithImpact || [])]
          .filter((a) => (a.sets || 0) > 0)
          .sort((a, b) => b.sets - a.sets)
          .slice(0, 20),
        contributionScore: [...qualifiedAthletes]
          .filter((a) => (a.contributionScore || 0) > 0)
          .sort((a, b) => (b.contributionScore || 0) - (a.contributionScore || 0))
          .slice(0, 20),
        totalFireCount: [...qualifiedAthletes]
          .filter((a) => (a.allTimeFireCount || 0) > 0)
          .sort((a, b) => (b.allTimeFireCount || 0) - (a.allTimeFireCount || 0))
          .slice(0, 20),
      },
    };
  } catch (e) {
    console.error("HOF stats calculation failed", e);
    return null;
  }
};

export const fetchGoogleSheetCSV = async (sheetId: string, gid: string): Promise<string> => {
  const cacheBucket = Math.floor(Date.now() / 300000); // 5 mins cache bucket for gviz
  const directUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}&cb=${cacheBucket}`;
  const isStaticDeploy =
    typeof import.meta !== "undefined" &&
    (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_STATIC_DEPLOY === "true";

  let response = await fetch(directUrl).catch(() => null);

  if ((!response || !response.ok) && !isStaticDeploy) {
    const proxyUrl = `/api/proxy-sheet?gid=${gid}&cb=${cacheBucket}`;
    response = await fetch(proxyUrl);
  }

  if (!response || !response.ok) {
    throw new Error(`Failed to fetch spreadsheet: ${response?.statusText || "Unknown Network Error"}`);
  }

  return response.text();
};
