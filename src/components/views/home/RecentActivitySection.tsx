import React from "react";
import {
  MapPin,
  ChevronDown,
  Activity,
  Play,
  Timer,
  Waypoints,
} from "lucide-react";
import { motion } from "motion/react";
import { fixCountryEntity, getCombinedFlags } from "../../../lib/asr-utils";
import { ASRWeeklyActivityChart } from "../../inspector/ASRWeeklyActivityChart";
import type { CourseData, RecentFeedItem } from "../../../types";

export interface RecentSetItem extends CourseData {
  timestamp: number;
}

interface RecentActivitySectionProps {
  isLoading: boolean;
  allSetsWithDates: { date: string }[];
  allRunsWithDates: { date: string }[];
  recentSets: RecentSetItem[];
  recentFeed: RecentFeedItem[];
  homeVisibleSets: number;
  homeVisibleRuns: number;
  onShowMoreSets: () => void;
  onShowMoreRuns: () => void;
  onPlayVideo: (url: string) => void;
  onNavigateEntity: (type: string, data: Record<string, unknown>) => void;
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export const RecentActivitySection = React.memo(
  ({
    isLoading,
    allSetsWithDates,
    allRunsWithDates,
    recentSets,
    recentFeed,
    homeVisibleSets,
    homeVisibleRuns,
    onShowMoreSets,
    onShowMoreRuns,
    onPlayVideo,
    onNavigateEntity,
  }: RecentActivitySectionProps) => {
    return (
      <>
        {/* Unified Sets Section */}
        <motion.div
          variants={itemVariants}
          className="mt-8 sm:mt-12 mb-8 sm:mb-12 w-full max-w-4xl mx-auto px-2"
        >
          <div className="flex flex-col bg-zinc-100/95 dark:bg-zinc-900/90 border border-black/5 dark:border-white/5 rounded-[2rem] p-4 sm:p-8 relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6 px-2 sm:px-0">
              <div className="p-2 bg-emerald-500/10 rounded-xl">
                <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-zinc-900 dark:text-white leading-none">
                  Recent Sets
                </h3>
              </div>
            </div>

            <div className="w-full pb-8 mb-6 border-b border-black/5 dark:border-white/5 px-2 sm:px-0">
              <ASRWeeklyActivityChart
                runs={allSetsWithDates}
                type="set"
                themeColor="emerald"
                isLoading={isLoading}
              />
            </div>

            {(isLoading || recentSets.length > 0) && (
              <div className="flex flex-col gap-3 w-full">
                <div className="relative pl-4 sm:pl-6 sm:pr-2">
                  <div className="absolute top-4 bottom-4 left-[27.5px] sm:left-[39.5px] w-px bg-gradient-to-b from-emerald-500/50 via-emerald-500/20 to-transparent" />

                  <div className="flex flex-col gap-4 relative z-10">
                    {isLoading
                      ? Array.from({ length: 4 }).map((_, idx) => (
                          <div
                            key={idx}
                            className="relative flex items-start gap-4 sm:gap-6 mt-2"
                          >
                            <div className="relative mt-1.5 flex-shrink-0 z-20">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-black/5 dark:bg-white/5 border-2 border-black/10 dark:border-white/10 animate-pulse" />
                            </div>
                            <div className="flex-1 bg-black/5 dark:bg-white/5 rounded-2xl p-4 sm:p-5 h-[100px] animate-pulse" />
                          </div>
                        ))
                      : (() => {
                          let currentMonth = "";
                          return recentSets
                            .slice(0, homeVisibleSets)
                            .map((item, idx) => {
                              const dateObj = new Date(item.timestamp);
                              const dayStr = dateObj.getDate().toString();
                              const monthStr = dateObj.toLocaleString("default", {
                                month: "short",
                              });
                              const isNewMonth =
                                Boolean(monthStr) && monthStr !== currentMonth;
                              if (isNewMonth) {
                                currentMonth = monthStr;
                              }
                              const courseFlag = fixCountryEntity(
                                item.country || "",
                                item.flag || "",
                              ).flag;

                              const setterList: string[] = Array.isArray(item.leadSetters)
                                ? item.leadSetters
                                : (
                                    item.leadSetters ||
                                    item.setter ||
                                    "Local Community"
                                  ).split(",");

                              const videoLink = item.videoUrl || item.demoVideo;

                              return (
                                <React.Fragment key={`set-${item.name}-${idx}`}>
                                  {isNewMonth && (
                                    <div className="relative flex items-center justify-start gap-4 sm:gap-6 mt-1 mb-1">
                                      <div className="relative z-20 flex-shrink-0 flex justify-center w-6 sm:w-8">
                                        <div className="bg-white text-zinc-900 border-zinc-200 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest shadow-sm border z-30">
                                          {monthStr}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  <div className="relative flex items-start gap-4 sm:gap-6 group">
                                    <div className="relative mt-1.5 flex-shrink-0 z-20">
                                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.05)] dark:shadow-[0_0_10px_rgba(255,255,255,0.05)] group-hover:scale-110 transition-all duration-300">
                                        <span className="text-[10px] sm:text-xs font-black text-zinc-900 dark:text-white">
                                          {dayStr}
                                        </span>
                                      </div>
                                    </div>

                                    <div
                                      className="group/card flex-1 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl p-4 sm:p-5 hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] transition-all duration-300 cursor-pointer flex flex-row items-center justify-between min-w-0"
                                      onClick={() =>
                                        onNavigateEntity(
                                          "course",
                                          item as unknown as Record<string, unknown>,
                                        )
                                      }
                                      onTouchStart={() => {}}
                                    >
                                      <div className="flex flex-col items-start text-left gap-1 sm:gap-1.5 flex-1 min-w-0 pr-4">
                                        <div className="flex items-center gap-2 max-w-full w-full">
                                          <span className="text-sm sm:text-base font-black text-zinc-900 dark:text-white uppercase transition-colors flex items-center gap-1.5 min-w-0 max-w-full shrink group-hover/card:text-emerald-500 group-has-[.setter-target:hover]/card:!text-zinc-900 dark:group-has-[.setter-target:hover]/card:!text-white group-has-[.location-target:hover]/card:!text-zinc-900 dark:group-has-[.location-target:hover]/card:!text-white">
                                            {courseFlag && (
                                              <span className="text-[12px] opacity-90 shrink-0">
                                                {courseFlag}
                                              </span>
                                            )}
                                            <span className="truncate">
                                              {item.name}
                                            </span>
                                          </span>
                                        </div>
                                        <div className="flex flex-col items-start gap-1 text-[11px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1 max-w-full w-full min-w-0 pr-2">
                                          <div
                                            className="location-target flex items-center gap-1.5 max-w-full min-w-0 hover:text-emerald-500 transition-colors cursor-pointer"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const locArr = [
                                                item.city,
                                                item.stateProv,
                                                item.country,
                                              ]
                                                .filter(
                                                  (v): v is string =>
                                                    Boolean(v) &&
                                                    v.toUpperCase() !== "UNKNOWN",
                                                )
                                                .join(", ");
                                              if (locArr) {
                                                onNavigateEntity("region", {
                                                  name: locArr,
                                                });
                                              }
                                            }}
                                          >
                                            <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                                            <span className="truncate uppercase tracking-wider text-[10px] sm:text-[11px]">
                                              {[
                                                item.city,
                                                item.stateProv,
                                                item.country,
                                              ]
                                                .filter(
                                                  (v): v is string =>
                                                    Boolean(v) &&
                                                    v.toUpperCase() !== "UNKNOWN",
                                                )
                                                .join(", ")}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1.5 max-w-full min-w-0">
                                            <Waypoints className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                                            <div className="truncate max-w-full text-[10px] sm:text-[11px] uppercase tracking-wider text-zinc-900 dark:text-white">
                                              {setterList.map((s, idxSetter) => {
                                                const trimmed = s.trim();
                                                if (
                                                  trimmed.toUpperCase() ===
                                                  "LOCAL COMMUNITY"
                                                ) {
                                                  return (
                                                    <span
                                                      key={idxSetter}
                                                      className="uppercase tracking-wider text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400"
                                                    >
                                                      LOCAL COMMUNITY
                                                    </span>
                                                  );
                                                }
                                                return (
                                                  <React.Fragment key={idxSetter}>
                                                    {idxSetter > 0 && (
                                                      <span className="text-zinc-500 dark:text-zinc-400 mr-1">
                                                        ,
                                                      </span>
                                                    )}
                                                    <span
                                                      className="setter-target hover:text-emerald-500 transition-colors cursor-pointer uppercase tracking-wider text-[10px] sm:text-[11px]"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        onNavigateEntity("setter", {
                                                          name: trimmed,
                                                        });
                                                      }}
                                                    >
                                                      {trimmed.toUpperCase()}
                                                    </span>
                                                  </React.Fragment>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex flex-col justify-center items-end shrink-0 pl-2">
                                        <div className="flex items-center justify-center w-[36px] sm:w-[48px] shrink-0">
                                          {videoLink && (
                                            <button
                                              type="button"
                                              className="p-2 sm:p-3 transition-all active:scale-90 text-zinc-500 group-hover/card:text-emerald-500 hover:!text-emerald-500 flex items-center justify-center cursor-pointer"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onPlayVideo(videoLink);
                                              }}
                                            >
                                              <Play
                                                className="w-[20px] h-[20px] sm:w-[24px] sm:h-[24px]"
                                                strokeWidth={3}
                                              />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </React.Fragment>
                              );
                            });
                        })()}
                  </div>

                  {!isLoading && recentSets.length > homeVisibleSets && (
                    <div className="flex justify-center mt-8">
                      <button
                        type="button"
                        className="group flex flex-col items-center gap-1 px-8 py-3 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] text-[10px] font-black tracking-widest uppercase text-zinc-400 hover:text-emerald-500 transition-all duration-300 rounded-2xl"
                        onClick={onShowMoreSets}
                        onTouchStart={() => {}}
                      >
                        <ChevronDown className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
                        Load More
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Unified Runs Section */}
        <motion.div
          variants={itemVariants}
          className="mt-8 sm:mt-12 mb-8 sm:mb-12 w-full max-w-4xl mx-auto px-2"
        >
          <div className="flex flex-col bg-zinc-100/95 dark:bg-zinc-900/90 border border-black/5 dark:border-white/5 rounded-[2rem] p-4 sm:p-8 relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6 px-2 sm:px-0">
              <div className="p-2 bg-pink-500/10 rounded-xl">
                <Timer className="w-5 h-5 sm:w-6 sm:h-6 text-pink-500" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-zinc-900 dark:text-white leading-none">
                  Recent Runs
                </h3>
              </div>
            </div>

            <div className="w-full pb-8 mb-6 border-b border-black/5 dark:border-white/5 px-2 sm:px-0">
              <ASRWeeklyActivityChart
                runs={allRunsWithDates}
                type="run"
                themeColor="pink"
                isLoading={isLoading}
              />
            </div>

            {(isLoading || recentFeed.length > 0) && (
              <div className="flex flex-col gap-3 w-full">
                <div className="relative pl-4 sm:pl-6 sm:pr-2">
                  <div className="absolute top-4 bottom-4 left-[27.5px] sm:left-[39.5px] w-px bg-gradient-to-b from-pink-500/50 via-pink-500/20 to-transparent" />

                  <div className="flex flex-col gap-4 relative z-10">
                    {isLoading
                      ? Array.from({ length: 4 }).map((_, idx) => (
                          <div
                            key={idx}
                            className="relative flex items-start gap-4 sm:gap-6 mt-2"
                          >
                            <div className="relative mt-1.5 flex-shrink-0 z-20">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-black/5 dark:bg-white/5 border-2 border-black/10 dark:border-white/10 animate-pulse" />
                            </div>
                            <div className="flex-1 bg-black/5 dark:bg-white/5 rounded-2xl p-4 sm:p-5 h-[100px] animate-pulse" />
                          </div>
                        ))
                      : (() => {
                          let currentMonth = "";
                          return recentFeed
                            .slice(0, homeVisibleRuns)
                            .map((item, idx) => {
                              const fires = item.fireCount || 0;
                              const rank = item.rank || 0;
                              const playerName = String(item.name || "").trim();
                              const courseName = String(
                                item.courseName ||
                                  item.course?.name ||
                                  "UNKNOWN COURSE",
                              ).trim();
                              const resultVal =
                                item.result ||
                                (typeof item.time === "number"
                                  ? item.time.toFixed(2)
                                  : "--");

                              const athleteFlag = item.athlete
                                ? getCombinedFlags(item.athlete).trim()
                                : "";

                              const rankBadge =
                                rank === 1
                                  ? { icon: "🥇" }
                                  : rank === 2
                                    ? { icon: "🥈" }
                                    : rank === 3
                                      ? { icon: "🥉" }
                                      : null;

                              const dateObj =
                                item.timeString && item.timeString !== "LATEST"
                                  ? new Date(item.timeString)
                                  : null;
                              const dayStr =
                                dateObj && !isNaN(dateObj.getTime())
                                  ? dateObj.getDate().toString()
                                  : "";
                              const monthStr =
                                dateObj && !isNaN(dateObj.getTime())
                                  ? dateObj.toLocaleString("default", {
                                      month: "short",
                                    })
                                  : "";

                              const isNewMonth =
                                Boolean(monthStr) && monthStr !== currentMonth;
                              if (isNewMonth) {
                                currentMonth = monthStr;
                              }

                              const videoLink =
                                item.videoUrl || item.course?.demoVideo;

                              return (
                                <React.Fragment key={`${item.id}-${idx}`}>
                                  {isNewMonth && (
                                    <div className="relative flex items-center justify-start gap-4 sm:gap-6 mt-1 mb-1">
                                      <div className="relative z-20 flex-shrink-0 flex justify-center w-6 sm:w-8">
                                        <div className="bg-white text-zinc-900 border-zinc-200 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest shadow-sm border z-30">
                                          {monthStr}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  <div className="relative flex items-start gap-4 sm:gap-6 group">
                                    <div className="relative mt-1.5 flex-shrink-0 z-20">
                                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
                                        {dayStr ? (
                                          <span className="text-[10px] sm:text-xs font-black text-zinc-900 dark:text-white">
                                            {dayStr}
                                          </span>
                                        ) : (
                                          <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-pink-500/50" />
                                        )}
                                      </div>
                                    </div>

                                    <div
                                      className="group/card flex-1 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl p-4 sm:p-5 hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] transition-all duration-300 cursor-pointer flex flex-row items-center justify-between min-w-0"
                                      onClick={() =>
                                        onNavigateEntity(
                                          "player",
                                          (item.athlete || {
                                            name: item.name,
                                          }) as unknown as Record<string, unknown>,
                                        )
                                      }
                                      onTouchStart={() => {}}
                                    >
                                      <div className="flex flex-col items-start text-left gap-1 sm:gap-1.5 flex-1 min-w-0 pr-4">
                                        <div className="flex items-center gap-2 max-w-full w-full">
                                          <span className="text-sm sm:text-base font-black text-zinc-900 dark:text-white uppercase transition-colors flex items-center gap-1.5 min-w-0 max-w-full shrink group-hover/card:text-pink-500 group-has-[.course-target:hover]/card:!text-zinc-900 dark:group-has-[.course-target:hover]/card:!text-white">
                                            {athleteFlag && (
                                              <span className="text-[12px] opacity-90 shrink-0">
                                                {athleteFlag}
                                              </span>
                                            )}
                                            <span className="truncate">
                                              {playerName}
                                            </span>
                                          </span>
                                        </div>

                                        <div className="flex flex-col items-start gap-1 text-[11px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1 max-w-full w-full min-w-0 pr-2">
                                          <div className="flex items-center max-w-full min-w-0 -mx-1 px-1 rounded-md">
                                            <div className="course-target flex items-baseline min-w-0 max-w-full">
                                              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 mr-1.5 self-center" />
                                              <span
                                                className="truncate uppercase tracking-wider text-[10px] sm:text-[11px] hover:!text-pink-500 transition-colors cursor-pointer"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onNavigateEntity(
                                                    "course",
                                                    (item.course || {
                                                      name: item.courseName,
                                                    }) as unknown as Record<string, unknown>,
                                                  );
                                                }}
                                              >
                                                {courseName}
                                              </span>
                                              {item.course?.city && (
                                                <span
                                                  className="truncate uppercase tracking-wider text-[10px] sm:text-[11px] text-zinc-500 hover:!text-pink-500 transition-colors cursor-pointer"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onNavigateEntity("region", {
                                                      name: item.course.city,
                                                    });
                                                  }}
                                                >
                                                  {`, ${item.course.city}`}
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-1.5 max-w-full min-w-0">
                                            <Timer className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                                            <span className="tabular-nums truncate max-w-[200px] sm:max-w-xs uppercase tracking-wider text-[10px] sm:text-[11px]">
                                              {resultVal}
                                            </span>
                                            {(rankBadge || fires > 0) && (
                                              <span className="flex items-center gap-1.5 ml-0.5">
                                                {rankBadge && (
                                                  <span className="inline-block animate-bounce text-[14px] sm:text-[16px]">
                                                    {rankBadge.icon}
                                                  </span>
                                                )}
                                                {fires > 0 && (
                                                  <span className="flex items-center text-[10px] sm:text-[12px] opacity-90 shrink-0 tracking-[0.2em]">
                                                    {Array.from({
                                                      length: Math.min(3, fires),
                                                    }).map((_, i) => (
                                                      <span
                                                        key={i}
                                                        className="inline-block animate-pulse"
                                                      >
                                                        🔥
                                                      </span>
                                                    ))}
                                                  </span>
                                                )}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex flex-col justify-center items-end shrink-0 pl-2">
                                        <div className="flex items-center justify-center w-[36px] sm:w-[48px] shrink-0">
                                          {videoLink && (
                                            <button
                                              type="button"
                                              className="p-2 sm:p-3 transition-all active:scale-90 text-zinc-500 group-hover/card:text-pink-500 hover:!text-pink-500 flex items-center justify-center cursor-pointer"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onPlayVideo(videoLink);
                                              }}
                                            >
                                              <Play
                                                className="w-[20px] h-[20px] sm:w-[24px] sm:h-[24px]"
                                                strokeWidth={3}
                                              />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </React.Fragment>
                              );
                            });
                        })()}
                  </div>

                  {!isLoading && recentFeed.length > homeVisibleRuns && (
                    <div className="flex justify-center mt-8">
                      <button
                        type="button"
                        className="group flex flex-col items-center gap-1 px-8 py-3 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] text-[10px] font-black tracking-widest uppercase text-zinc-400 hover:text-pink-500 transition-all duration-300 rounded-2xl"
                        onClick={onShowMoreRuns}
                        onTouchStart={() => {}}
                      >
                        <ChevronDown className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
                        Load More
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </>
    );
  },
);
