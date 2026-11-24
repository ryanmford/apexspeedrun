import { describe, it, expect } from "vitest";
import { computeAllState } from "../asr-data-compute";
import { dehydrateSnapshot, hydrateSnapshot } from "../asr-snapshot";
import { escapeHtml, getSafeHostFromHeaders, isValidSheetGid } from "../server-utils";
import { computeDistanceKm, isSignificantGpsMove } from "../geo-utils";
import { formatAnnotatorTimer, stepFrameTime, findActiveFreeze } from "../annotator-utils";
import { normalizeName } from "../asr-utils";
import type { ComputedASRState } from "../../types";

describe("snapshot dehydration & hydration round-trip", () => {
  const mensCsv = [
    "Name,Country,Flag,OVR,PTS,Runs,Wins,Sets,🪙,🔥,IG,Avg Time,Cert,Col13,Col14,Col15,Col16,Col17,Location,Col19,Home Gym,Gym Loc,Col22,Team1,T1Loc,T1Flag",
    "Alice Alpha,USA,🇺🇸,0,0,0,0,0,0,0,@alice,0,L1,,,,,,Boulder,CO,Apex Denver,Denver,🇺🇸,Team Apex,Denver,🇺🇸",
    "Bob Beta,USA,🇺🇸,0,0,0,0,0,0,0,@bob,0,L1,,,,,,Denver,CO,Apex Denver,Denver,🇺🇸,Team Apex,Denver,🇺🇸",
  ].join("\n");

  const womensCsv = [
    "Name,Country,Flag,OVR,PTS,Runs,Wins,Sets,🪙,🔥,IG,Avg Time,Cert,Col13,Col14,Col15,Col16,Col17,Location,Col19,Home Gym,Gym Loc,Col22,Team1,T1Loc,T1Flag",
    "Maya Swift,UK,🇬🇧,0,0,0,0,0,0,0,@maya,0,L1,,,,,,London,UK,Parkour UK,London,🇬🇧,Team UK,London,🇬🇧",
  ].join("\n");

  const courseNames = [
    "Course 1", "Course 2", "Course 3", "Course 4",
    "Course 5", "Course 6", "Course 7", "Course 8",
  ];

  const setsCsv = [
    "Course,Length,Elev,Diff,Type,City,State,Country,Flag,Set On,Demo,Coords,Lead,Assistant,Open?,2026?,All-Time?",
    ...courseNames.map(
      (name, i) =>
        `${name},50m,+2m,Blue,Urban,Boulder,CO,USA,🇺🇸,2026-01-1${i},https://youtu.be/c${i},"40.0150, -105.2705",Alice Alpha,Bob Beta,YES,YES,YES`,
    ),
  ].join("\n");

  const liveCsv = [
    "Athlete,Course,Result,Div,Date,Tag,Proof,🔥,Filmer",
    ...courseNames.map((c, i) => `Alice Alpha,${c},10.00,M,2026-03-1${i},Open,https://youtu.be/a${i},0,Filmer`),
    ...courseNames.map((c, i) => `Bob Beta,${c},11.50,M,2026-03-2${i},Open,https://youtu.be/b${i},0,`),
    ...courseNames.slice(0, 4).map((c, i) => `Maya Swift,${c},10.50,F,2026-03-1${i},Open,https://youtu.be/m${i},0,`),
  ].join("\n");

  it("strips derived fields on dehydrate and restores identical state on hydrate", () => {
    const fullState = computeAllState({
      rM: mensCsv,
      rF: womensCsv,
      rLive: liveCsv,
      rSet: setsCsv,
      hasTotalError: false,
      hasPartialError: false,
    }) as ComputedASRState;

    const compact = dehydrateSnapshot(fullState);

    // Compact payload should carry version flag and be significantly smaller when serialized
    expect(compact.__compact).toBe(1);
    const fullSize = JSON.stringify(fullState).length;
    const compactSize = JSON.stringify(compact).length;
    expect(compactSize).toBeLessThan(fullSize);

    // Derived keys should not be serialized on the wire
    expect("playerList_M_AT" in compact).toBe(false);
    expect("courseList_AT" in compact).toBe(false);
    expect("playerLB_AT" in compact).toBe(false);
    expect("setterMet" in compact).toBe(false);

    // Round-trip through JSON parse (simulating network / IndexedDB boundary)
    const wire = JSON.parse(JSON.stringify(compact));
    const hydrated = hydrateSnapshot(wire);

    // Derived lists and maps must match the original computed state
    expect(hydrated.playerList_M_AT?.length).toBe(fullState.playerList_M_AT?.length);
    expect(hydrated.playerList_F_AT?.length).toBe(fullState.playerList_F_AT?.length);
    expect(hydrated.playerList_M_2026?.length).toBe(fullState.playerList_M_2026?.length);
    expect(hydrated.courseList_AT?.length).toBe(fullState.courseList_AT?.length);
    expect(hydrated.courseList_OP?.length).toBe(fullState.courseList_OP?.length);
    expect(hydrated.courseList_2026?.length).toBe(fullState.courseList_2026?.length);
    expect(hydrated.settersList?.length).toBe(fullState.settersList?.length);
    expect(hydrated.teamList_gyms_AT?.length).toBe(fullState.teamList_gyms_AT?.length);
    expect(hydrated.teamList_teams_AT?.length).toBe(fullState.teamList_teams_AT?.length);

    // Leaderboards & ranks preserved
    expect(hydrated.playerLB_AT?.M[normalizeName("Alice Alpha")]?.rank).toBe(1);
    expect(hydrated.playerLB_AT?.M[normalizeName("Bob Beta")]?.rank).toBe(2);
    expect(hydrated.playerLB_AT?.F[normalizeName("Maya Swift")]?.rank).toBe(1);

    // Recent feed athlete & course object references restored cleanly
    expect(hydrated.recentFeed?.length).toBe(fullState.recentFeed?.length);
    expect(hydrated.recentFeed?.[0]?.athlete?.name).toBe(fullState.recentFeed?.[0]?.athlete?.name);
    expect(hydrated.recentFeed?.[0]?.course?.name).toBe(fullState.recentFeed?.[0]?.course?.name);

    // Idempotent: calling hydrateSnapshot on an already-hydrated state returns it unchanged
    expect(hydrateSnapshot(hydrated)).toBe(hydrated);
  });
});

describe("server-utils header and HTML hygiene", () => {
  it("escapes HTML entities safely", () => {
    expect(escapeHtml(`<script>alert("x" & 'y')</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot; &amp; &#39;y&#39;)&lt;/script&gt;",
    );
  });

  it("accepts clean hostnames and rejects forged or injected Host headers", () => {
    expect(getSafeHostFromHeaders("apexspeedrun.com", undefined)).toBe("apexspeedrun.com");
    expect(getSafeHostFromHeaders("localhost:3000, proxy.internal", undefined)).toBe("localhost:3000");
    expect(getSafeHostFromHeaders(["sub.apexspeedrun.com"], undefined)).toBe("sub.apexspeedrun.com");
    expect(getSafeHostFromHeaders("evil.com/path?x=1", undefined)).toBe("apexspeedrun.com");
    expect(getSafeHostFromHeaders(`" onclick="alert(1)`, undefined)).toBe("apexspeedrun.com");
    expect(getSafeHostFromHeaders(undefined, undefined, "fallback.local")).toBe("fallback.local");
  });

  it("validates Google Sheet gid values as strict unsigned integer strings", () => {
    expect(isValidSheetGid("0")).toBe(true);
    expect(isValidSheetGid("184920341")).toBe(true);
    expect(isValidSheetGid("123&extra=1")).toBe(false);
    expect(isValidSheetGid("../secret")).toBe(false);
    expect(isValidSheetGid("")).toBe(false);
    expect(isValidSheetGid(12345)).toBe(false);
  });
});

describe("geo-utils Haversine distance and GPS movement gate", () => {
  it("computes accurate great-circle distance between known cities", () => {
    // Boulder, CO to Denver, CO is ~39-40 km straight-line
    const boulder: [number, number] = [40.015, -105.2705];
    const denver: [number, number] = [39.7392, -104.9903];
    const km = computeDistanceKm(boulder, denver);
    expect(km).toBeGreaterThan(38);
    expect(km).toBeLessThan(41);
    expect(computeDistanceKm(boulder, boulder)).toBe(0);
  });

  it("gates tiny GPS jitter under 50m and triggers on moves >= 50m", () => {
    const start: [number, number] = [40.015, -105.2705];
    // First fix always significant
    expect(isSignificantGpsMove(null, start, 0.05)).toBe(true);
    // ~11m north (0.0001 deg lat) -> suppressed
    expect(isSignificantGpsMove(start, [40.0151, -105.2705], 0.05)).toBe(false);
    // ~111m north (0.001 deg lat) -> significant
    expect(isSignificantGpsMove(start, [40.016, -105.2705], 0.05)).toBe(true);
  });
});

describe("annotator-utils timing and freeze frame helpers", () => {
  it("formats timers to 2 decimal places for sub-minute and multi-minute runs", () => {
    expect(formatAnnotatorTimer(0)).toBe("0.00");
    expect(formatAnnotatorTimer(8.459)).toBe("8.45");
    expect(formatAnnotatorTimer(65.07)).toBe("1:05.07");
    expect(formatAnnotatorTimer(-5)).toBe("0.00");
    expect(formatAnnotatorTimer(Number.NaN)).toBe("0.00");
  });

  it("steps frame times accurately at 30fps and 60fps with boundary clamping", () => {
    expect(stepFrameTime(1.0, 1, 60, 10)).toBeCloseTo(1.016667, 5);
    expect(stepFrameTime(1.0, -30, 30, 10)).toBeCloseTo(0, 5);
    expect(stepFrameTime(0.01, -10, 30, 10)).toBe(0);
    expect(stepFrameTime(9.99, 10, 30, 10)).toBe(10);
  });

  it("matches active freeze frames within tolerance window", () => {
    const freezes = [
      { id: "start", time: 1.25, duration: 0.66 },
      { id: "stop", time: 8.75, duration: 0.66 },
    ];
    expect(findActiveFreeze(freezes, 1.27)?.id).toBe("start");
    expect(findActiveFreeze(freezes, 8.72)?.id).toBe("stop");
    expect(findActiveFreeze(freezes, 5.0)).toBeUndefined();
  });
});
