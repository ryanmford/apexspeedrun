import { describe, it, expect } from "vitest";
import {
  cleanNumeric,
  fixCountryEntity,
  parseCourseDifficulty,
  isQualifiedAthlete,
  parseCoords,
  normalizeName,
  getSetterLevel,
  matchesRegionTarget,
  splitNameList,
  getNormalizedNameList,
} from "../asr-utils";
import { processSetListData, processRankingData, calculateWofStats } from "../asr-data";
import {
  computeAllState,
  computeSimulatedPlacement,
  computeLiveLadderWindow,
  computeSimulatedGlobalImpact,
  computeOriginalRanks,
} from "../asr-data-compute";
import { resolvePageMeta } from "../../meta-injector";
import type { ComputedASRState, PlayerProfile } from "../../types";

describe("asr-utils core helpers", () => {
  it("parses numeric run times including mm:ss.xx and hh:mm:ss.xx", () => {
    expect(cleanNumeric("12.34")).toBeCloseTo(12.34, 4);
    expect(cleanNumeric("1:05.50")).toBeCloseTo(65.5, 4);
    expect(cleanNumeric("1:02:03.25")).toBeCloseTo(3723.25, 4);
    expect(cleanNumeric("")).toBeNull();
    expect(cleanNumeric("N/A")).toBeNull();
    expect(cleanNumeric("#REF!")).toBeNull();
  });

  it("normalizes country aliases and resolves flags", () => {
    expect(fixCountryEntity("United States of America", "").flag).toBe("🇺🇸");
    expect(fixCountryEntity("Great Britain", "").flag).toBe("🇬🇧");
    expect(fixCountryEntity("Czech Republic", "").flag).toBe("🇨🇿");
    expect(fixCountryEntity("Japan", "").flag).toBe("🇯🇵");
  });

  it("parses ASR color-coded course difficulty ratings cleanly", () => {
    expect(parseCourseDifficulty("Green-")).toBe("1");
    expect(parseCourseDifficulty("Green")).toBe("2");
    expect(parseCourseDifficulty("Green+")).toBe("3");
    expect(parseCourseDifficulty("Blue-")).toBe("4");
    expect(parseCourseDifficulty("Blue")).toBe("5");
    expect(parseCourseDifficulty("Blue+")).toBe("6");
    expect(parseCourseDifficulty("Black-")).toBe("7");
    expect(parseCourseDifficulty("Black")).toBe("8");
    expect(parseCourseDifficulty("Black+")).toBe("9");
    expect(parseCourseDifficulty("4")).toBe("4");
    expect(parseCourseDifficulty("")).toBe("-");
  });

  it("parses coordinate strings strictly and rejects null island & out-of-range bounds", () => {
    expect(parseCoords("39.7392, -104.9903")).toEqual([39.7392, -104.9903]);
    expect(parseCoords("0, 0")).toBeNull();
    expect(parseCoords("95.0, 10.0")).toBeNull();
    expect(parseCoords("39.7, 190.0")).toBeNull();
    expect(parseCoords("not coords")).toBeNull();
    expect(parseCoords(undefined)).toBeNull();
  });

  it("enforces All-Time (8M/4F), 2026 (5M/3F), and Open (3) qualification thresholds", () => {
    // All-Time: M requires 8 courses, F requires 4 courses
    expect(isQualifiedAthlete({ courses: 7, gender: "M", name: "Alex" }, "all-time", "M")).toBe(false);
    expect(isQualifiedAthlete({ courses: 8, gender: "M", name: "Alex" }, "all-time", "M")).toBe(true);
    expect(isQualifiedAthlete({ courses: 3, gender: "F", name: "Maya" }, "all-time", "F")).toBe(false);
    expect(isQualifiedAthlete({ courses: 4, gender: "F", name: "Maya" }, "all-time", "F")).toBe(true);

    // 2026: M requires 5, F requires 3
    expect(isQualifiedAthlete({ courses: 4, gender: "M", name: "Alex" }, "2026", "M")).toBe(false);
    expect(isQualifiedAthlete({ courses: 5, gender: "M", name: "Alex" }, "2026", "M")).toBe(true);
    expect(isQualifiedAthlete({ courses: 2, gender: "F", name: "Maya" }, "2026", "F")).toBe(false);
    expect(isQualifiedAthlete({ courses: 3, gender: "F", name: "Maya" }, "2026", "F")).toBe(true);

    // Open: requires 3 courses
    expect(isQualifiedAthlete({ courses: 2, gender: "M", name: "Alex" }, "open", "M")).toBe(false);
    expect(isQualifiedAthlete({ courses: 3, gender: "M", name: "Alex" }, "open", "M")).toBe(true);

    // Placeholder players never qualify
    expect(isQualifiedAthlete({ courses: 20, gender: "M", name: "Interim WR" }, "all-time", "M")).toBe(false);
  });
});

describe("processSetListData elevation and coordinate regression", () => {
  it("maps elev column to course.elevation and parses coords to parsedCoords", () => {
    const setsCsv = [
      "Course,Length,Elev,Diff,Type,City,State,Country,Flag,Set On,Demo,Coords,Lead,Assistant,Open?,2026?,All-Time?,Sponsor Name,Sponsor Link",
      "Iron Works,85m,+4.5m,Blue-,Urban,Boulder,CO,USA,🇺🇸,2026-03-10,https://youtu.be/abc,\"40.0150, -105.2705\",Ryan Ford,Taylor Carpenter,YES,YES,YES,Apex Movement,https://apexmovement.com",
    ].join("\n");

    const map = processSetListData(setsCsv);
    const course = map["IRON WORKS"];
    expect(course).toBeDefined();
    expect(course.elevation).toBe("+4.5m");
    expect(course.difficulty).toBe("4");
    expect(course.length).toBe("85m");
    expect(course.parsedCoords).toEqual([40.015, -105.2705]);
    expect(course.flag).toBe("🇺🇸");
    expect(course.isOpenCourse).toBe(true);
    expect(course.is2026Course).toBe(true);
    expect(course.isAllTimeCourse).toBe(true);
  });
});

describe("computeAllState LQ math, tie-breakers, coin formula, and Open aggregation", () => {
  const mensCsv = [
    "Name,Country,Flag,OVR,PTS,Runs,Wins,Sets,🪙,🔥,IG,Avg Time,Cert,Col13,Col14,Col15,Col16,Col17,Location,Col19,Home Gym,Gym Loc,Col22,Team1,T1Loc,T1Flag",
    "Alice Alpha,USA,🇺🇸,0,0,0,0,0,0,0,@alice,0,L1,,,,,,Boulder,CO,Apex Denver,Denver,🇺🇸,Team Apex,Denver,🇺🇸",
    "Bob Beta,USA,🇺🇸,0,0,0,0,0,0,0,@bob,0,L1,,,,,,Boulder,CO,Apex Denver,Denver,🇺🇸,Vans,CA,🇺🇸",
    "Charlie Tie,USA,🇺🇸,0,0,0,0,0,0,0,@charlie,0,L1,,,,,,Denver,CO,Apex Denver,Denver,🇺🇸,Team Apex,Denver,🇺🇸",
    "Interim WR,USA,🇺🇸,0,0,0,0,0,0,0,,0,,,,,,,Unknown,,Unaffiliated,,,,,",
  ].join("\n");

  // 8 courses so Men's athletes qualify across All-Time (8), 2026 (5), AND Open (3)
  const courseDefs = [
    { name: "Course One", city: "Boulder", state: "CO", coords: "40.0150, -105.2705", lead: "Alice Alpha", assist: "Bob Beta" },
    { name: "Course Two", city: "Denver", state: "CO", coords: "39.7392, -104.9903", lead: "Alice Alpha", assist: "" },
    { name: "Course Three", city: "Austin", state: "TX", coords: "30.2672, -97.7431", lead: "Bob Beta", assist: "Alice Alpha" },
    { name: "Course Four", city: "Boulder", state: "CO", coords: "40.0200, -105.2800", lead: "Charlie Tie", assist: "" },
    { name: "Course Five", city: "Denver", state: "CO", coords: "39.7500, -104.9950", lead: "Charlie Tie", assist: "" },
    { name: "Course Six", city: "Boulder", state: "CO", coords: "40.0100, -105.2600", lead: "Charlie Tie", assist: "" },
    { name: "Course Seven", city: "Denver", state: "CO", coords: "39.7400, -104.9800", lead: "Charlie Tie", assist: "" },
    { name: "Course Eight", city: "Austin", state: "TX", coords: "30.2700, -97.7500", lead: "Charlie Tie", assist: "" },
  ];

  const setsCsv = [
    "Course,Length,Elev,Diff,Type,City,State,Country,Flag,Set On,Demo,Coords,Lead,Assistant,Open?,2026?,All-Time?",
    ...courseDefs.map(
      (c, i) =>
        `${c.name},50m,+2m,Blue,Urban,${c.city},${c.state},USA,🇺🇸,2026-01-1${i},https://youtu.be/c${i},"${c.coords}",${c.lead},${c.assist},YES,YES,YES`,
    ),
  ].join("\n");

  const liveRows = [
    "Athlete,Course,Result,Div,Date,Tag,Proof,🔥,Filmer",
    // Alice sets CR (10.00s) on all 8 courses -> 100.00 LQ, 8 wins, 8 courses
    ...courseDefs.map((c, i) => `Alice Alpha,${c.name},10.00,M,2026-03-1${i},Open,https://youtu.be/a${i},0,FilmerOne`),
    // Bob runs 12.50s (LQ 80.00) on all 8 courses, latest run on 2026-03-25
    ...courseDefs.map((c, i) => `Bob Beta,${c.name},12.50,M,2026-03-${18 + i},Open,https://youtu.be/b${i},0,`),
    // Charlie runs exact same 12.50s (LQ 80.00) on all 8 courses, earlier latest run 2026-03-20 -> beats Bob on tiebreaker #3
    ...courseDefs.map((c, i) => `Charlie Tie,${c.name},12.50,M,2026-03-${13 + i},Open,https://youtu.be/ch${i},0,`),
  ];
  const liveCsv = liveRows.join("\n");

  it("computes LQ = (CR / Time) * 100, tie-breakers, coin score, footwear filtering, and searchLocations", () => {
    const state = computeAllState({
      rM: mensCsv,
      rF: "",
      rLive: liveCsv,
      rSet: setsCsv,
      hasTotalError: false,
      hasPartialError: false,
    });

    // Placeholder filtered out of ranking metadata
    const pM = processRankingData(mensCsv, "M");
    expect(pM.some((p) => p.name === "Interim WR")).toBe(false);

    // Footwear brand ("Vans") filtered out of player teams
    const bobMeta = state.atMet[normalizeName("Bob Beta")];
    expect(bobMeta.teams?.some((t) => t.name.toLowerCase() === "vans")).toBe(false);

    // Alice = Rank 1 with LQ 100.00
    const alice = state.playerLB_AT.M[normalizeName("Alice Alpha")];
    expect(alice).toBeDefined();
    expect(alice.rating).toBeCloseTo(100, 2);
    expect(alice.rank).toBe(1);
    expect(alice.wins).toBe(8);

    // Charlie beats Bob on tiebreaker #3 (earlier latestRunDate at identical 80.00 LQ & 8 runs)
    const charlie = state.playerLB_AT.M[normalizeName("Charlie Tie")];
    const bob = state.playerLB_AT.M[normalizeName("Bob Beta")];
    expect(charlie.rating).toBeCloseTo(80, 2);
    expect(bob.rating).toBeCloseTo(80, 2);
    expect(charlie.rank).toBe(2);
    expect(bob.rank).toBe(3);

    // Coin formula: (courses * 0.1) + (wins * 0.1) + (leads * 0.2) + (assists * 0.1)
    // Alice: 8 courses (0.8) + 8 wins (0.8) + 2 leads (0.4) + 1 assist (0.1) = 2.10
    expect(state.atMet[normalizeName("Alice Alpha")].contributionScore).toBeCloseTo(2.1, 2);

    // Open team aggregation uses opPerfs cleanly without throwing
    expect(state.teamsAggregated.gyms.open.length).toBeGreaterThan(0);
    expect(state.teamsAggregated.gyms.open[0].name).toBe("Apex Denver");

    // Precomputed searchLocations index populated
    expect(state.searchLocations.length).toBeGreaterThanOrEqual(3);
    expect(
      state.searchLocations.some(
        (l) => l.city === "BOULDER" && l.normCity === "boulder" && l.searchKey.includes("boulder"),
      ),
    ).toBe(true);
  });

  it("resolves OG page metadata accurately for players (pKey + homeGym) and courses (parsedCoords)", () => {
    const state = computeAllState({
      rM: mensCsv,
      rF: "",
      rLive: liveCsv,
      rSet: setsCsv,
      hasTotalError: false,
      hasPartialError: false,
    }) as unknown as ComputedASRState;

    const playerMeta = resolvePageMeta(state, "/players/alice-alpha", new URLSearchParams("eventType=all-time"));
    expect(playerMeta.ogType).toBe("player");
    expect(playerMeta.title).toContain("ALICE ALPHA");
    expect(playerMeta.ogStats?.[0]).toEqual({ value: "100.00", label: "LQ" });
    expect(playerMeta.ogStats?.[1]).toEqual({ value: "1", label: "RANK" });
    // Regression: completed courses resolved via pKey should yield valid parsedCoords
    expect(playerMeta.ogMapCoords).toEqual([40.015, -105.2705]);

    const s26Meta = resolvePageMeta(state, "/players/alice-alpha", new URLSearchParams("eventType=2026"));
    expect(s26Meta.description).toContain("GYM: APEX DENVER");

    const courseMeta = resolvePageMeta(state, "/courses/course-one", new URLSearchParams());
    expect(courseMeta.ogType).toBe("course");
    expect(courseMeta.ogMapCoords).toEqual([40.015, -105.2705]);
    expect(courseMeta.ogStats?.[0]).toEqual({ value: "10.00", label: "WR (M)" });
  });
});

describe("What-If simulator math and qualification flip regression", () => {
  const pool: PlayerProfile[] = [
    { pKey: "p1", name: "Ranked One", gender: "M", rating: 95, runs: 8, courses: 8, currentRank: 1 },
    { pKey: "p2", name: "Ranked Two", gender: "M", rating: 85, runs: 8, courses: 8, currentRank: 2 },
    // Unranked male athlete with 7 courses; adding the 8th course must flip them to qualified in All-Time!
    { pKey: "p3", name: "Unranked Rising", gender: "M", rating: 98, runs: 7, courses: 7, currentRank: "UR" },
  ];

  const fullLeaderboards: Record<string, Record<string, number>> = {
    C1: { p1: 10, p2: 11.76, p3: 10.05 },
    C2: { p1: 10, p2: 11.76, p3: 10.05 },
    C3: { p1: 10, p2: 11.76, p3: 10.05 },
    C4: { p1: 10, p2: 11.76, p3: 10.05 },
    C5: { p1: 10, p2: 11.76, p3: 10.05 },
    C6: { p1: 10, p2: 11.76, p3: 10.05 },
    C7: { p1: 10, p2: 11.76, p3: 10.05 },
    C8: { p1: 10, p2: 11.76 },
  };

  it("computes simulated placement and live ladder window accurately", () => {
    const records = [
      { pKey: "p1", time: 10.0, pts: 100, rank: 1 },
      { pKey: "p2", time: 12.0, pts: 83.33, rank: 2 },
    ];
    expect(computeSimulatedPlacement(9.5, records)).toBe(1);
    expect(computeSimulatedPlacement(10.0, records)).toBe(1);
    expect(computeSimulatedPlacement(11.0, records)).toBe(2);
    expect(computeSimulatedPlacement(15.0, records)).toBe(3);

    const ladder = computeLiveLadderWindow(records, "p3", "Unranked Rising", 11.0, 90.91, pool);
    expect(ladder.find((r) => r.isMe)?.rank).toBe(2);
  });

  it("flips an unranked athlete to qualified on hitting the 8th course and demotes overtaken athletes", () => {
    const originalRanks = computeOriginalRanks(pool);
    const impact = computeSimulatedGlobalImpact(
      pool[2], // Unranked Rising (7 courses)
      9.5, // New course record on C8 (8th course -> qualifies!)
      "C8",
      fullLeaderboards,
      pool,
      10.0,
      originalRanks,
    );

    expect(impact.beatsCR).toBe(true);
    expect(impact.simulatedCR).toBe(9.5);
    expect(impact.newRating).toBeGreaterThan(95);
    // Regression check: previously isQualifiedAthlete was called with wrong arg order, so p3 stayed unranked & demoted 0 athletes
    expect(impact.athletesDemoted).toBeGreaterThanOrEqual(2);
    expect(impact.pointsDestroyed).toBeGreaterThan(0);
  });
});

describe("Updated Google Sheet schema & Unicode difficulty regression", () => {
  it("parses Unicode emoji plus/minus course difficulty ratings", () => {
    expect(parseCourseDifficulty("🟢➖")).toBe("1");
    expect(parseCourseDifficulty("🟢")).toBe("2");
    expect(parseCourseDifficulty("🟢➕")).toBe("3");
    expect(parseCourseDifficulty("🔵➖")).toBe("4");
    expect(parseCourseDifficulty("🔵 ➖")).toBe("4");
    expect(parseCourseDifficulty("🔵")).toBe("5");
    expect(parseCourseDifficulty("🔵➕")).toBe("6");
    expect(parseCourseDifficulty("⚫️➖")).toBe("7");
    expect(parseCourseDifficulty("⚫️ ➖")).toBe("7");
    expect(parseCourseDifficulty("⚫️")).toBe("8");
    expect(parseCourseDifficulty("⚫️➕")).toBe("9");
  });

  it("parses restructured MENS, SETS (with leading empty row), and LIVE schemas without column-shift corruption", () => {
    const updatedMensCsv = [
      ",Rank,Country,Flag,Name,LQ,Courses,Runs,Reruns,Points,Wins,Win %,🔥,Time,Avg. time,Distance (m),Avg Speed (m/s),Sets,Leads,Assists,Setter LVL,🪙,IG,Home town,Home town flag,Home gym,Home gym location,Home gym flag,Team,Team location,Team flags,Shoes,",
      ',1,USA,🇺🇸,Joey Jepsen,98.87,72,82,10,"7,118.78",54,75.00%,20,16:15.80,11.90,4680,4.80,62,51,11,2,23.90,joeyjpk,"Broomfield, Colorado, USA",🇺🇸,Apex Denver,"Denver, Colorado, USA",🇺🇸,ASR Pro,"Denver, Colorado, USA",🇺🇸,Strike Movement,',
      ',,,237,,"88.10",1200,1500,300,"105,000",250,,60,,,,,,,350,,200,,,,,,,,,,,',
    ].join("\n");

    const updatedSetsCsv = [
      ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
      ",#,Course,Length (m),Elevation (m),Rating,Type,Textures,Interfaces,Shape,City,State/Province,Country,Flag,Coordinates,Google Maps,Date set,Top Male,Country,Time (sec),Avg m/s,Date,Top Female,Country,Time (sec),Avg m/s,Date,± (sec),± (%),Leads,Assistants,Course rules,All-time?,2026?,Open?,Start,Sponsor,Sponsor link,",
      ',1,Iron Works,50,-2,⚫️➕,urban,"concrete, metal","bars, walls",U,Boulder,Colorado,USA,🇺🇸,"40.0150, -105.2705",Apex Speed Run (Iron Works),2025-05-01,Joey Jepsen,🇺🇸,10.00,5.00,2026-03-01,,,,,,0,0%,Ryan Ford,Joey Jepsen,https://youtu.be/rules1,YES,YES,YES,open,STR/KE MVMNT,https://strike-mvmnt.com/,',
    ].join("\n");

    const updatedLiveCsv = [
      ",Date,Course,Player,Time,Points,Division,Event,Video proof,Filmer,Camera,Shoes,+/- (sec),+/- (%),Course ID,Player ID,Run ID,Country,🏴,new CR?,former CR holder?,",
      ",2026-03-01,Iron Works,Joey Jepsen,10.00,100.00,M,ASR OPEN,,Joey Jepsen,iPhone,Strike Movement,0.00,0.00%,1,1,1,USA,🇺🇸,TRUE,,",
      ",2026-03-02,Iron Works,Joey Jepsen,10.20,98.04,M,ASR OPEN,https://youtu.be/realrun,,iPhone,Strike Movement,0.20,2.00%,1,1,2,USA,🇺🇸,FALSE,,",
    ].join("\n");

    const state = computeAllState({
      rM: updatedMensCsv,
      rF: "",
      rLive: updatedLiveCsv,
      rSet: updatedSetsCsv,
      hasTotalError: false,
      hasPartialError: false,
    });

    // Bottom totals row ignored, Joey parsed with accurate header-driven fields
    const players = processRankingData(updatedMensCsv, "M");
    expect(players).toHaveLength(1);
    const joey = players[0];
    expect(joey.rating).toBeCloseTo(98.87, 2);
    expect(joey.certLevel).toBe("2");
    expect(joey.location).toBe("Broomfield, Colorado, USA");
    expect(joey.townFlag).toBe("🇺🇸");
    expect(joey.homeGym).toBe("Apex Denver");
    expect(joey.teamLocation).toBe("Denver, Colorado, USA");
    expect(joey.gymFlag).toBe("🇺🇸");
    expect(joey.shoe).toBe("Strike Movement");
    expect(joey.teams).toEqual([{ name: "ASR Pro", location: "Denver, Colorado, USA", flag: "🇺🇸" }]);

    // SETS leading blank row skipped, exact-match Sponsor vs Sponsor link, Unicode difficulty, Course DNA fields
    const course = state.masterCourseList.find((c) => c.name === "IRON WORKS");
    expect(course).toBeDefined();
    expect(course?.difficulty).toBe("9");
    expect(course?.sponsorName).toBe("STR/KE MVMNT");
    expect(course?.sponsorLink).toBe("https://strike-mvmnt.com/");
    expect(course?.textures).toBe("concrete, metal");
    expect(course?.interfaces).toBe("bars, walls");
    expect(course?.shape).toBe("U");
    expect(course?.startType).toBe("open");
    expect(course?.googleMaps).toBe("Apex Speed Run (Iron Works)");
    expect(course?.demoVideo).toBe("https://youtu.be/rules1");

    // LIVE blank Video proof must NOT inherit Event ("ASR OPEN"), blank Filmer must NOT inherit Video URL
    const runs = state.courseRunsHistory["IRON WORKS"] || [];
    expect(runs).toHaveLength(2);
    const runWithoutVideo = runs.find((r) => Math.abs(r.time - 10.0) < 0.001);
    const runWithoutFilmer = runs.find((r) => Math.abs(r.time - 10.2) < 0.001);
    expect(runWithoutVideo?.videoUrl || "").toBe("");
    expect(runWithoutFilmer?.videoUrl).toBe("https://youtu.be/realrun");
    expect(state.atMet[normalizeName("Joey Jepsen")]?.films).toBe(1);
    expect(state.atMet[normalizeName("https://youtu.be/realrun")]).toBeUndefined();
  });
});

describe("Stats audit regressions (coins, setter levels, medals, course run counts, recentFeed, ties)", () => {
  it("enforces updated setter level thresholds (L1: 20/10, L2: 250/50, L3: 1000/100)", () => {
    expect(getSetterLevel(19, 10)).toBeNull();
    expect(getSetterLevel(20, 9)).toBeNull();
    expect(getSetterLevel(20, 10)).toBe("1");
    expect(getSetterLevel(249, 50)).toBe("1");
    expect(getSetterLevel(250, 49)).toBe("1");
    expect(getSetterLevel(250, 50)).toBe("2");
    expect(getSetterLevel(999, 100)).toBe("2");
    expect(getSetterLevel(1000, 99)).toBe("2");
    expect(getSetterLevel(1000, 100)).toBe("3");
  });

  it("rewards coins on unique courses only, excludes placeholders from 2026/Open run counts & HOF golds, and computes non-PB recentFeed ranks", () => {
    const mensCsv = [
      "Name,Country,Flag,LQ,Courses,Runs,Reruns,Points,Wins,Win %,🔥,IG",
      "Taylor Runner,USA,🇺🇸,0,0,0,0,0,0,0,0,@taylor",
      "Sam Tied,Canada,🇨🇦,0,0,0,0,0,0,0,0,@sam",
    ].join("\n");

    const setsCsv = [
      "Course,City,State,Country,Flag,Lead,Assistant,Open?,2026?,All-Time?",
      "Alpha Course,Boulder,CO,USA,🇺🇸,Taylor Runner,,YES,YES,YES",
      "Beta Course,Denver,CO,USA,🇺🇸,,,YES,YES,YES",
    ].join("\n");

    // Interim Top Time holds #1 on Alpha Course (9.00s); Taylor has PB 10.00s and a slower rerun 11.00s;
    // Sam ties Taylor at 10.00s on Alpha Course; blank-time stub row should be ignored in recentFeed.
    const liveCsv = [
      "Athlete,Course,Result,Div,Date,Tag,Proof,🔥,Filmer",
      "INTERIM TOP TIME,Alpha Course,9.00,M,2026-03-01,Open,,0,",
      "Taylor Runner,Alpha Course,10.00,M,2026-03-05,Open,https://youtu.be/t1,0,",
      "Taylor Runner,Alpha Course,11.00,M,2026-03-10,Open,https://youtu.be/t2,0,",
      "Sam Tied,Alpha Course,10.00,M,2026-03-06,Open,https://youtu.be/s1,0,",
      "Taylor Runner,Beta Course,,M,2026-03-12,Open,,0,",
    ].join("\n");

    const state = computeAllState({
      rM: mensCsv,
      rF: "",
      rLive: liveCsv,
      rSet: setsCsv,
      hasTotalError: false,
      hasPartialError: false,
    });

    const tKey = normalizeName("Taylor Runner");
    // Coins: 1 unique course (0.1) + 0 wins (0.0, Interim holds #1) + 1 lead (0.2) = 0.30 (rerun does NOT add 0.1)
    expect(state.atMet[tKey].contributionScore).toBeCloseTo(0.3, 4);

    // 2026 & Open course run counts: 3 real runs (Taylor x2 + Sam x1), excluding INTERIM TOP TIME
    const alpha2026 = state.courseList_2026.find((c) => c.name === "ALPHA COURSE");
    const alphaOpen = state.courseList_OP.find((c) => c.name === "ALPHA COURSE");
    expect(alpha2026?.season26Runs).toBe(3);
    expect(alphaOpen?.openRuns).toBe(3);

    // RecentFeed ignores blank-time row and assigns rank >= 1 (never 0) for Taylor's slower 11.00s rerun
    expect(state.recentFeed).toHaveLength(3);
    const slowerRerun = state.recentFeed.find((r) => r.time === 11.0);
    expect(slowerRerun).toBeDefined();
    expect(slowerRerun?.rank).toBe(4); // behind Interim 9.00, Taylor 10.00, Sam 10.00
    expect(slowerRerun?.isCR).toBe(false);

    // HOF Medal Count: Interim is #1 -> Taylor (USA) & Sam (Canada) tie at rank #2 -> 0 Golds, 2 Silvers (1 USA, 1 Canada)
    const wof = calculateWofStats(
      state.data,
      state.atPerfs,
      state.lbAT,
      state.atMet,
      null,
      state.settersWithImpact,
      state.cMet,
      state.courseRunsHistory,
    );
    const usa = wof?.medalCount.find((m) => m.name === "USA");
    const canada = wof?.medalCount.find((m) => m.name === "CANADA");
    expect(usa?.gold).toBe(0);
    expect(usa?.silver).toBe(1);
    expect(canada?.gold).toBe(0);
    expect(canada?.silver).toBe(1);
  });

  it("matches city/state regions strictly without leaking entire countries via flag short-circuit", () => {
    const boulderCourse = { city: "Boulder", stateProv: "Colorado", country: "USA", flag: "🇺🇸" };
    const denverCourse = { city: "Denver", stateProv: "Colorado", country: "USA", flag: "🇺🇸" };
    const boulderMontanaCourse = { city: "Boulder", stateProv: "Montana", country: "USA", flag: "🇺🇸" };
    const londonCourse = { city: "London", stateProv: "", country: "United Kingdom", flag: "🇬🇧" };
    const denverPlayerWithBoulderTeam = {
      location: "Denver, Colorado, USA",
      country: "USA",
      region: "🇺🇸",
      teamLocation: "Boulder, Colorado, USA",
    };

    // City + State + Country target must NOT match other US cities or same-name city in another state
    const boulderTarget = { name: "BOULDER, COLORADO, USA", flag: "🇺🇸" };
    expect(matchesRegionTarget(boulderTarget, boulderCourse)).toBe(true);
    expect(matchesRegionTarget(boulderTarget, denverCourse)).toBe(false);
    expect(matchesRegionTarget(boulderTarget, boulderMontanaCourse)).toBe(false);
    expect(matchesRegionTarget(boulderTarget, londonCourse)).toBe(false);
    expect(matchesRegionTarget(boulderTarget, denverPlayerWithBoulderTeam)).toBe(true);

    // Single-city target (even if passed a country flag) must NOT match other US cities
    expect(matchesRegionTarget({ name: "BOULDER", flag: "🇺🇸" }, boulderCourse)).toBe(true);
    expect(matchesRegionTarget({ name: "BOULDER", flag: "🇺🇸" }, denverCourse)).toBe(false);

    // Country-level targets still match all courses in that country via flag/alias
    expect(matchesRegionTarget({ name: "USA", flag: "🇺🇸", type: "country" }, boulderCourse)).toBe(true);
    expect(matchesRegionTarget({ name: "USA", flag: "🇺🇸", type: "country" }, denverCourse)).toBe(true);
    expect(matchesRegionTarget({ name: "USA", flag: "🇺🇸", type: "country" }, londonCourse)).toBe(false);
    expect(matchesRegionTarget({ name: "UK", flag: "🇬🇧", type: "country" }, londonCourse)).toBe(true);
  });

  it("splits multi-setter strings consistently across commas, ampersands, slashes, and 'and'", () => {
    expect(splitNameList("Ryan Ford, Joey Jepsen & Taylor Carpenter / Alex One and Sam Two")).toEqual([
      "Ryan Ford",
      "Joey Jepsen",
      "Taylor Carpenter",
      "Alex One",
      "Sam Two",
    ]);
    expect(getNormalizedNameList(["Ryan Ford & Joey Jepsen", "Sam Two / Alex One"])).toEqual([
      normalizeName("Ryan Ford"),
      normalizeName("Joey Jepsen"),
      normalizeName("Sam Two"),
      normalizeName("Alex One"),
    ]);
  });

  it("keeps simulator newRank as 'UR' when an unranked athlete stays below qualification threshold", () => {
    const pool: PlayerProfile[] = [
      { pKey: "p1", name: "Ranked One", gender: "M", rating: 95, runs: 8, courses: 8, currentRank: 1 },
      { pKey: "p2", name: "Still Unranked", gender: "M", rating: 99, runs: 5, courses: 5, currentRank: "UR" },
    ];
    const fullLeaderboards: Record<string, Record<string, number>> = {
      C1: { p1: 10, p2: 10 },
      C2: { p1: 10, p2: 10 },
      C3: { p1: 10, p2: 10 },
      C4: { p1: 10, p2: 10 },
      C5: { p1: 10, p2: 10 },
      C6: { p1: 10 },
      C7: { p1: 10 },
      C8: { p1: 10 },
    };
    const originalRanks = computeOriginalRanks(pool);
    const impact = computeSimulatedGlobalImpact(
      pool[1], // 5 courses -> simulating C6 gives 6 courses (< 8 required for M)
      9.5,
      "C6",
      fullLeaderboards,
      pool,
      10.0,
      originalRanks,
    );
    expect(impact.originalRank).toBe("UR");
    expect(impact.newRank).toBe("UR");
    expect(impact.athletesDemoted).toBe(0);
  });

  it("ignores zero and negative run times in LIVE FEED so they cannot corrupt course records", () => {
    const mensCsv = [
      "Name,Country,Flag,LQ,Courses,Runs,Reruns,Points,Wins,Win %,🔥,IG",
      "Valid Runner,USA,🇺🇸,0,0,0,0,0,0,0,0,@valid",
      "Bad Row,USA,🇺🇸,0,0,0,0,0,0,0,0,@bad",
    ].join("\n");
    const setsCsv = [
      "Course,City,State,Country,Flag,Lead,Assistant,Open?,2026?,All-Time?",
      "Zero Guard,Boulder,CO,USA,🇺🇸,,,YES,YES,YES",
    ].join("\n");
    const liveCsv = [
      "Athlete,Course,Result,Div,Date,Tag,Proof,🔥,Filmer",
      "Bad Row,Zero Guard,0,M,2026-03-01,Open,,0,",
      "Bad Row,Zero Guard,-4.50,M,2026-03-02,Open,,0,",
      "Valid Runner,Zero Guard,12.50,M,2026-03-03,Open,,0,",
    ].join("\n");

    const state = computeAllState({
      rM: mensCsv,
      rF: "",
      rLive: liveCsv,
      rSet: setsCsv,
      hasTotalError: false,
      hasPartialError: false,
    });

    const validKey = normalizeName("Valid Runner");
    expect(state.lbAT.M["ZERO GUARD"]?.[validKey]).toBe(12.5);
    expect(Object.keys(state.lbAT.M["ZERO GUARD"] || {})).toHaveLength(1);
    expect(state.playerLB_AT.M[validKey]?.rating).toBeCloseTo(100, 4);
    expect(state.playerLB_AT.M[validKey]?.wins).toBe(1);
  });

  it("does not report #1 in simulator placement or live ladder when slower than an unlisted interim course record", () => {
    const interimCR = 17.0;
    const realRecords = [
      { pKey: "ryan", time: 20.35, pts: (17 / 20.35) * 100, rank: 2 },
      { pKey: "manuel", time: 21.85, pts: (17 / 21.85) * 100, rank: 3 },
      { pKey: "ramses", time: 22.09, pts: (17 / 22.09) * 100, rank: 4 },
    ];
    const pool: PlayerProfile[] = [
      { pKey: "ryan", name: "Ryan", gender: "M", rating: 83.54, runs: 1 },
      { pKey: "manuel", name: "Manuel", gender: "M", rating: 77.8, runs: 1 },
      { pKey: "ramses", name: "Ramses", gender: "M", rating: 76.96, runs: 1 },
    ];

    expect(computeSimulatedPlacement(17.5, realRecords, interimCR)).toBe(2);
    expect(computeSimulatedPlacement(17.0, realRecords, interimCR)).toBe(1);
    expect(computeSimulatedPlacement(16.5, realRecords, interimCR)).toBe(1);

    const ladderSlower = computeLiveLadderWindow(
      realRecords,
      "SIMULATED_USER",
      "YOU",
      17.5,
      (17 / 17.5) * 100,
      pool,
      interimCR,
    );
    expect(ladderSlower.find((r) => r.isMe)?.rank).toBe(2);
    expect(ladderSlower.find((r) => r.pKey === "ryan")?.rank).toBe(3);

    const ladderFaster = computeLiveLadderWindow(
      realRecords,
      "SIMULATED_USER",
      "YOU",
      16.5,
      100,
      pool,
      interimCR,
    );
    expect(ladderFaster.find((r) => r.isMe)?.rank).toBe(1);
    expect(ladderFaster.find((r) => r.pKey === "ryan")?.rank).toBe(2);
  });

  it("respects the 2026? eligibility column when filtering Season 2026 runs", () => {
    const mensCsv = [
      "Name,Country,Flag,LQ,Courses,Runs,Reruns,Points,Wins,Win %,🔥,IG",
      "Fast Athlete,USA,🇺🇸,0,0,0,0,0,0,0,0,@fast",
    ].join("\n");

    const setsCsv = [
      "Course,City,State,Country,Flag,Lead,Assistant,Open?,2026?,All-Time?",
      "Included 2026,Boulder,CO,USA,🇺🇸,Fast Athlete,,YES,YES,YES",
      "Excluded 2026,Denver,CO,USA,🇺🇸,Fast Athlete,,NO,NO,YES",
    ].join("\n");

    const liveCsv = [
      "Athlete,Course,Result,Div,Date,Tag,Proof,🔥,Filmer",
      "Fast Athlete,Included 2026,9.00,M,2026-06-01,,https://youtu.be/f1,0,",
      "Fast Athlete,Excluded 2026,12.00,M,2026-06-03,,https://youtu.be/e1,0,",
    ].join("\n");

    const state = computeAllState({
      rM: mensCsv,
      rF: "",
      rLive: liveCsv,
      rSet: setsCsv,
      hasTotalError: false,
      hasPartialError: false,
    });

    const fastKey = normalizeName("Fast Athlete");
    expect(state.atPerfs[fastKey]).toHaveLength(2);
    expect(state.season26Perfs[fastKey]).toHaveLength(1);
    expect(state.season26Perfs[fastKey]?.[0]?.label.toUpperCase()).toBe("INCLUDED 2026");
  });

  it("keeps computeOriginalRanks and computeSimulatedGlobalImpact consistent on exact LQ ties", () => {
    const athleteA: PlayerProfile = {
      pKey: "athletea",
      name: "Athlete A",
      gender: "M",
      rating: 100,
      runs: 10,
      courses: 8,
      currentRank: 1,
      latestRunDate: "2026-01-01T00:00:00.000Z",
    };
    const athleteB: PlayerProfile = {
      pKey: "athleteb",
      name: "Athlete B",
      gender: "M",
      rating: 100,
      runs: 8,
      courses: 8,
      currentRank: 2,
      latestRunDate: "2026-01-02T00:00:00.000Z",
    };
    const pool = [athleteA, athleteB];
    const lb: Record<string, Record<string, number>> = {
      "COURSE 1": { athletea: 10, athleteb: 10 },
    };
    const origRanks = computeOriginalRanks(pool);
    expect(origRanks.athletea).toBe(1);
    expect(origRanks.athleteb).toBe(2);

    // Simulating Athlete B's exact existing time must NOT report a fake rank jump to #1
    const sim = computeSimulatedGlobalImpact(athleteB, 10, "COURSE 1", lb, pool, 10, origRanks);
    expect(sim.newRank).toBe(2);
    expect(sim.athletesDemoted).toBe(0);
  });
});



