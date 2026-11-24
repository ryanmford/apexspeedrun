import { describe, it, expect } from "vitest";
import {
  cleanNumeric,
  fixCountryEntity,
  parseCourseDifficulty,
  isQualifiedAthlete,
  parseCoords,
  normalizeName,
} from "../asr-utils";
import { processSetListData, processRankingData } from "../asr-data";
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

    // Coin formula: (runs * 0.1) + (wins * 0.1) + (leads * 0.2) + (assists * 0.1)
    // Alice: 8 runs (0.8) + 8 wins (0.8) + 2 leads (0.4) + 1 assist (0.1) = 2.10
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

