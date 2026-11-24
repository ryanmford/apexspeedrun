import React, { useMemo, useContext, useCallback } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useDataStore } from "../../store/useDataStore";
import { useAppStore } from "../../store/useAppStore";
import { useAppNavigation } from "../../hooks/useDerivedData";
import { ThemeContext } from "../../theme-context";
import { getCombinedFlags, isPlaceholderPlayer } from "../../lib/asr-utils";
import type { CourseData, PlayerProfile } from "../../types";
import { FEATURED_DATE_OVERRIDES } from "./home/featuredOverrides";
import { HomeHero } from "./home/HomeHero";
import {
  OfTheDaySection,
  type DailyRecordFeature,
  type FeaturedPlayerOfDay,
} from "./home/OfTheDaySection";
import { HomeKpiGrid } from "./home/HomeKpiGrid";
import {
  RecentActivitySection,
  type RecentSetItem,
} from "./home/RecentActivitySection";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const seededRandomIndex = (str: string, max: number): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  const x = Math.sin(hash) * 10000;
  return Math.floor((x - Math.floor(x)) * max);
};

export const HomeView = React.memo(() => {
  const navigate = useNavigate();
  const theme = useContext(ThemeContext) as "light" | "dark";
  const masterCourseList = useDataStore((s) => s.masterCourseList);
  const playerList_M_AT = useDataStore((s) => s.playerList_M_AT);
  const playerList_F_AT = useDataStore((s) => s.playerList_F_AT);
  const playerList_M_OP = useDataStore((s) => s.playerList_M_OP);
  const playerList_F_OP = useDataStore((s) => s.playerList_F_OP);
  const kpiStats = useDataStore((s) => s.kpiStats);
  const kpiTrends = useDataStore((s) => s.kpiTrends);
  const recentFeed = useDataStore((s) => s.recentFeed);
  const isLoading = useDataStore((s) => s.isLoading);
  const setShowOnboarding = useAppStore((s) => s.setShowOnboarding);
  const setPlayingVideoUrl = useAppStore((s) => s.setPlayingVideoUrl);
  const homeVisibleRuns = useAppStore((s) => s.homeVisibleRuns);
  const setHomeVisibleRuns = useAppStore((s) => s.setHomeVisibleRuns);
  const homeVisibleSets = useAppStore((s) => s.homeVisibleSets);
  const setHomeVisibleSets = useAppStore((s) => s.setHomeVisibleSets);
  const setTeamCategory = useAppStore((s) => s.setTeamCategory);
  const { navigateToEntity } = useAppNavigation();

  const courseList_AT = useDataStore((s) => s.courseList_AT);
  const teamList_gyms_AT = useDataStore((s) => s.teamList_gyms_AT);
  const teamList_teams_AT = useDataStore((s) => s.teamList_teams_AT);
  const atPerfs = useDataStore((s) => s.atPerfs);
  const atMet = useDataStore((s) => s.atMet);
  const dnMap = useDataStore((s) => s.dnMap);
  const courseRunsHistory = useDataStore((s) => s.courseRunsHistory);

  const allRunsWithDates = useMemo(() => {
    if (!courseRunsHistory) return [];
    return Object.values(courseRunsHistory).flatMap((runs) =>
      runs
        .filter((r): r is typeof r & { date: string } => Boolean(r.date))
        .map((r) => ({ date: r.date })),
    );
  }, [courseRunsHistory]);

  const allSetsWithDates = useMemo(() => {
    if (!masterCourseList) return [];
    return masterCourseList
      .filter((c): c is CourseData & { dateSet: string } => Boolean(c.dateSet))
      .map((c) => ({ date: c.dateSet }));
  }, [masterCourseList]);

  const handleJumpToContent = useCallback(() => {
    const el = document.getElementById("home-content");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
    }
  }, []);

  const recentSets = useMemo<RecentSetItem[]>(() => {
    if (!masterCourseList || !masterCourseList.length) return [];

    return masterCourseList
      .reduce<RecentSetItem[]>((acc, c) => {
        if (c.dateSet) {
          const timestamp = new Date(c.dateSet).getTime();
          if (!isNaN(timestamp)) {
            acc.push({ ...c, timestamp });
          }
        }
        return acc;
      }, [])
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 100);
  }, [masterCourseList]);

  const { topPlayer, topCourse, dailyRecord } = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Denver",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
    const seedStr = formatter.format(new Date());
    const override = FEATURED_DATE_OVERRIDES[seedStr];

    const combinedP = [
      ...(playerList_M_AT || []),
      ...(playerList_F_AT || []),
      ...(playerList_M_OP || []),
      ...(playerList_F_OP || []),
    ].filter((p) => p && !p.isDivider && (p.isQualified || p.currentRank !== "UR"));

    const uniquePlayersMap = new Map<string, PlayerProfile>();
    combinedP.forEach((p) => {
      if (p.pKey && !uniquePlayersMap.has(p.pKey)) {
        uniquePlayersMap.set(p.pKey, p);
      }
    });
    const uniquePlayers = Array.from(uniquePlayersMap.values());

    let pOfDay: FeaturedPlayerOfDay | null = null;
    if (uniquePlayers.length > 0) {
      const forcedPlayer = override?.playerNameIncludes
        ? uniquePlayers.find((p) =>
            p.name?.toLowerCase().includes(override.playerNameIncludes!),
          )
        : undefined;
      const chosenPlayer =
        forcedPlayer ||
        uniquePlayers[seededRandomIndex(seedStr + "feature_player", uniquePlayers.length)];

      let gRank: number;
      if (chosenPlayer.gender === "F") {
        const atIdx =
          playerList_F_AT?.findIndex((p) => p.name === chosenPlayer.name) ?? -1;
        gRank =
          atIdx >= 0
            ? atIdx + 1
            : (playerList_F_OP?.findIndex((p) => p.name === chosenPlayer.name) ?? 0) + 1;
      } else {
        const atIdx =
          playerList_M_AT?.findIndex((p) => p.name === chosenPlayer.name) ?? -1;
        gRank =
          atIdx >= 0
            ? atIdx + 1
            : (playerList_M_OP?.findIndex((p) => p.name === chosenPlayer.name) ?? 0) + 1;
      }
      pOfDay = { ...chosenPlayer, _gRank: gRank };
    }

    let cOfDay: CourseData | null = null;
    const sortedCourses = [...(courseList_AT || [])].sort(
      (a, b) =>
        (b.totalAllTimeRuns || b.totalRuns || 0) -
        (a.totalAllTimeRuns || a.totalRuns || 0),
    );

    const validCoursesForDay = sortedCourses.filter((c) => {
      const atM = c.allTimeAthletesM || [];
      const atF = c.allTimeAthletesF || [];
      const hasRealM = atM.some((run) => {
        if (!run || !run[0]) return false;
        const name = (dnMap && dnMap[run[0]]) || run[0];
        return !isPlaceholderPlayer(name);
      });
      const hasRealF = atF.some((run) => {
        if (!run || !run[0]) return false;
        const name = (dnMap && dnMap[run[0]]) || run[0];
        return !isPlaceholderPlayer(name);
      });
      return hasRealM && hasRealF;
    });

    if (validCoursesForDay.length > 0) {
      const forcedCourse = override?.courseNameIncludes
        ? sortedCourses.find((c) => {
            const lower = (c.name || "").toLowerCase();
            return override.courseNameIncludes!.every((token) =>
              lower.includes(token),
            );
          })
        : undefined;
      cOfDay =
        forcedCourse ||
        validCoursesForDay[
          seededRandomIndex(seedStr + "feature_course", validCoursesForDay.length)
        ];
    }

    let rOfDay: DailyRecordFeature | null = null;
    const allValidRuns: {
      run: [string, number, string?];
      course: CourseData;
      gender: "M" | "F";
    }[] = [];

    sortedCourses.forEach((c) => {
      (c.allTimeAthletesM || []).forEach((run) => {
        if (run && run[2] && uniquePlayersMap.has(run[0])) {
          allValidRuns.push({ run, course: c, gender: "M" });
        }
      });
      (c.allTimeAthletesF || []).forEach((run) => {
        if (run && run[2] && uniquePlayersMap.has(run[0])) {
          allValidRuns.push({ run, course: c, gender: "F" });
        }
      });
    });

    if (allValidRuns.length > 0) {
      const forcedRun =
        override?.runCourseIncludes && override?.runPlayerIncludes
          ? allValidRuns.find((item) => {
              const playerName =
                uniquePlayersMap.get(item.run[0])?.name || item.run[0];
              return (
                item.course.name
                  .toLowerCase()
                  .includes(override.runCourseIncludes!) &&
                playerName.toLowerCase().includes(override.runPlayerIncludes!)
              );
            })
          : undefined;
      const selected =
        forcedRun ||
        allValidRuns[
          seededRandomIndex(seedStr + "feature_record", allValidRuns.length)
        ];

      const bestRun = selected.run;
      const targetCourse = selected.course;
      const pObj = uniquePlayersMap.get(bestRun[0]);
      const pFlagStr = pObj ? getCombinedFlags(pObj).trim() : "";
      const athleteName = pObj ? pObj.name : bestRun[0];
      const cFlagStr = getCombinedFlags(targetCourse).trim();

      const cr =
        selected.gender === "F"
          ? targetCourse.fRecord || targetCourse.mRecord
          : targetCourse.mRecord;
      const runTime = bestRun[1];
      const pts = cr && runTime > 0 ? (cr / runTime) * 100 : 0;

      rOfDay = {
        athleteName: pFlagStr ? `${pFlagStr} ${athleteName}` : athleteName,
        time: bestRun[1].toFixed(2),
        pts: pts.toFixed(2),
        videoUrl: bestRun[2] || "",
        courseName: cFlagStr ? `${cFlagStr} ${targetCourse.name}` : targetCourse.name,
        course: targetCourse,
      };
    }

    return { topPlayer: pOfDay, topCourse: cOfDay, dailyRecord: rOfDay };
  }, [
    playerList_M_AT,
    playerList_F_AT,
    playerList_M_OP,
    playerList_F_OP,
    courseList_AT,
    dnMap,
  ]);

  const {
    totalGyms,
    totalTeams,
    totalMedals,
    playerCountries,
    teamCountries,
    totalFires,
    totalCoins,
    runsTrendData,
    countriesTrendData,
    medalsTrendData,
    coursesTrendData,
  } = useMemo(() => {
    const tGyms = Math.max(teamList_gyms_AT?.length || 0, 1);
    const tTeams = Math.max(teamList_teams_AT?.length || 0, 1);
    const tMedals = masterCourseList.reduce((acc, c) => {
      const mCount = Math.min(3, c.allTimeAthletesM?.length || 0);
      const fCount = Math.min(3, c.allTimeAthletesF?.length || 0);
      return acc + mCount + fCount;
    }, 0);

    const cTrendData = kpiTrends?.courses || [];
    const rTrendData = kpiTrends?.runs || [];
    const countryTrendData = kpiTrends?.countries || [];

    const medalsMultiplier = kpiStats.courses ? tMedals / kpiStats.courses : 6;
    const mTrendData = rTrendData.map((d) => ({
      value: Math.round(d.value * (medalsMultiplier / 10)),
    }));

    const flagRegex = /[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g;

    const pFlags = new Set<string>();
    [...(playerList_M_AT || []), ...(playerList_F_AT || [])].forEach((p) => {
      [p.gymFlag, p.townFlag, p.region].forEach((f) => {
        if (f) {
          const matches = String(f).match(flagRegex);
          if (matches) matches.forEach((m) => pFlags.add(m));
        }
      });
      if (Array.isArray(p.teams)) {
        p.teams.forEach((t) => {
          if (t.flag) {
            const matches = String(t.flag).match(flagRegex);
            if (matches) matches.forEach((m) => pFlags.add(m));
          }
        });
      }
    });

    const tFlags = new Set<string>();
    [...(teamList_teams_AT || []), ...(teamList_gyms_AT || [])].forEach((t) => {
      if (t.flag) {
        const matches = String(t.flag).match(flagRegex);
        if (matches) matches.forEach((m) => tFlags.add(m));
      }
    });

    let tFires = 0;
    if (atPerfs) {
      Object.values(atPerfs).forEach((runs) => {
        if (Array.isArray(runs)) {
          runs.forEach((r) => {
            tFires += r.fireCount || 0;
          });
        }
      });
    }

    let tCoins = 0;
    if (atMet) {
      Object.values(atMet).forEach((p) => {
        tCoins += p.contributionScore || 0;
      });
    }

    return {
      totalGyms: tGyms,
      totalTeams: tTeams,
      totalMedals: tMedals,
      playerCountries: Math.max(pFlags.size, 1),
      teamCountries: Math.max(tFlags.size, 1),
      totalFires: tFires,
      totalCoins: tCoins,
      runsTrendData: rTrendData,
      countriesTrendData: countryTrendData,
      medalsTrendData: mTrendData,
      coursesTrendData: cTrendData,
    };
  }, [
    kpiStats,
    teamList_gyms_AT,
    teamList_teams_AT,
    masterCourseList,
    kpiTrends,
    playerList_M_AT,
    playerList_F_AT,
    atPerfs,
    atMet,
  ]);

  const handleGetStarted = useCallback(
    () => setShowOnboarding(true),
    [setShowOnboarding],
  );
  const handleNavigatePlayers = useCallback(
    () => navigate("/players?eventType=all-time&mode=players"),
    [navigate],
  );
  const handleNavigateCourses = useCallback(
    () => navigate("/courses"),
    [navigate],
  );
  const handleNavigateTeams = useCallback(() => {
    setTeamCategory("gyms");
    navigate("/gyms?eventType=all-time&mode=gyms");
  }, [setTeamCategory, navigate]);
  const handleNavigateHof = useCallback(() => navigate("/hof"), [navigate]);
  const handleShowMoreSets = useCallback(
    () =>
      setHomeVisibleSets(
        Math.min(homeVisibleSets + 10, 100, recentSets.length),
      ),
    [setHomeVisibleSets, homeVisibleSets, recentSets.length],
  );
  const handleShowMoreRuns = useCallback(
    () =>
      setHomeVisibleRuns(
        Math.min(homeVisibleRuns + 10, 100, recentFeed.length),
      ),
    [setHomeVisibleRuns, homeVisibleRuns, recentFeed.length],
  );

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-4 pt-0 sm:pt-1 pb-24 gap-2 sm:gap-4"
    >
      <HomeHero
        theme={theme}
        onGetStarted={handleGetStarted}
        onJumpToContent={handleJumpToContent}
      />

      <div id="home-content" className="scroll-mt-20 sm:scroll-mt-24" />

      <OfTheDaySection
        topPlayer={topPlayer}
        topCourse={topCourse}
        dailyRecord={dailyRecord}
        onPlayVideo={setPlayingVideoUrl}
        onNavigateEntity={navigateToEntity}
      />

      <HomeKpiGrid
        isLoading={isLoading}
        kpi={kpiStats}
        totalGyms={totalGyms}
        totalTeams={totalTeams}
        totalMedals={totalMedals}
        playerCountries={playerCountries}
        teamCountries={teamCountries}
        totalFires={totalFires}
        totalCoins={totalCoins}
        runsTrendData={runsTrendData}
        countriesTrendData={countriesTrendData}
        medalsTrendData={medalsTrendData}
        coursesTrendData={coursesTrendData}
        onNavigatePlayers={handleNavigatePlayers}
        onNavigateCourses={handleNavigateCourses}
        onNavigateTeams={handleNavigateTeams}
        onNavigateHof={handleNavigateHof}
      />

      <RecentActivitySection
        isLoading={isLoading}
        allSetsWithDates={allSetsWithDates}
        allRunsWithDates={allRunsWithDates}
        recentSets={recentSets}
        recentFeed={recentFeed}
        homeVisibleSets={homeVisibleSets}
        homeVisibleRuns={homeVisibleRuns}
        onShowMoreSets={handleShowMoreSets}
        onShowMoreRuns={handleShowMoreRuns}
        onPlayVideo={setPlayingVideoUrl}
        onNavigateEntity={navigateToEntity}
      />
    </motion.div>
  );
});
