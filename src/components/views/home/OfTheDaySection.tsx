import React from "react";
import { MapPin, User, ChevronRight, Timer } from "lucide-react";
import { motion } from "motion/react";
import { cn, getCombinedFlags } from "../../../lib/asr-utils";
import type { CourseData, PlayerProfile } from "../../../types";

export interface DailyRecordFeature {
  athleteName: string;
  time: string;
  pts: string;
  videoUrl: string;
  courseName: string;
  course: CourseData;
}

export interface FeaturedPlayerOfDay extends PlayerProfile {
  _gRank: number;
}

interface OfTheDaySectionProps {
  topPlayer: FeaturedPlayerOfDay | null;
  topCourse: CourseData | null;
  dailyRecord: DailyRecordFeature | null;
  onPlayVideo: (url: string) => void;
  onNavigateEntity: (type: string, data: Record<string, unknown>) => void;
}

interface FeaturedCardSpec {
  type: "video" | "player" | "course";
  fallbackType?: string;
  videoUrl?: string;
  entityData: Record<string, unknown>;
  displayName: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  hoverBg: string;
  hoverText: string;
  metrics: { label: string; value: React.ReactNode }[];
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export const OfTheDaySection = React.memo(
  ({
    topPlayer,
    topCourse,
    dailyRecord,
    onPlayVideo,
    onNavigateEntity,
  }: OfTheDaySectionProps) => {
    if (!topPlayer && !topCourse && !dailyRecord) return null;

    const cards: FeaturedCardSpec[] = [];

    if (dailyRecord) {
      cards.push({
        type: "video",
        fallbackType: "course",
        videoUrl: dailyRecord.videoUrl,
        entityData: {
          name: dailyRecord.course.name,
          ...dailyRecord.course,
        },
        displayName: dailyRecord.athleteName,
        label: "Run of the Day",
        icon: <Timer className="w-4 h-4" />,
        color: "text-pink-500",
        bg: "bg-pink-500/10",
        hoverBg: "group-hover:bg-pink-500",
        hoverText: "group-hover:text-pink-500 dark:group-hover:text-pink-400",
        metrics: [
          { label: "Course", value: dailyRecord.courseName },
          { label: "Time", value: dailyRecord.time },
          { label: "POINTS", value: dailyRecord.pts },
        ],
      });
    }

    if (topPlayer) {
      const pFlags = getCombinedFlags(topPlayer).trim();
      cards.push({
        type: "player",
        entityData: topPlayer as unknown as Record<string, unknown>,
        displayName: pFlags ? `${pFlags} ${topPlayer.name}` : topPlayer.name,
        label: "Player of the Day",
        icon: <User className="w-4 h-4" />,
        color: "text-blue-500",
        bg: "bg-blue-500/10",
        hoverBg: "group-hover:bg-blue-500",
        hoverText: "group-hover:text-blue-500 dark:group-hover:text-blue-400",
        metrics: [
          { label: "Rank", value: topPlayer._gRank },
          { label: "LQ", value: Number(topPlayer.rating || 0).toFixed(2) },
          {
            label: "POINTS",
            value: Number(
              topPlayer.pts || (topPlayer.rating || 0) * (topPlayer.runs || 0),
            ).toFixed(2),
          },
        ],
      });
    }

    if (topCourse) {
      const cFlags = getCombinedFlags(topCourse).trim();
      cards.push({
        type: "course",
        entityData: topCourse as unknown as Record<string, unknown>,
        displayName: cFlags ? `${cFlags} ${topCourse.name}` : topCourse.name,
        label: "Course of the Day",
        icon: <MapPin className="w-4 h-4" />,
        color: "text-emerald-500",
        bg: "bg-emerald-500/10",
        hoverBg: "group-hover:bg-emerald-500",
        hoverText: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
        metrics: [
          {
            label: "Runs",
            value: topCourse.totalAllTimeRuns || topCourse.totalRuns || 0,
          },
          {
            label: "CR (M)",
            value: topCourse.mRecord ? Number(topCourse.mRecord).toFixed(2) : "--",
          },
          {
            label: "CR (W)",
            value: topCourse.fRecord ? Number(topCourse.fRecord).toFixed(2) : "--",
          },
        ],
      });
    }

    return (
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-3 mt-4 sm:mt-8 mb-4 sm:mb-8 w-full max-w-4xl mx-auto"
      >
        <div className="flex flex-col gap-4 px-2">
          {cards.map((feat, idx) => {
            const hasVideo = feat.type === "video" && !!feat.videoUrl;
            const handleActivate = () => {
              if (hasVideo && feat.videoUrl) {
                onPlayVideo(feat.videoUrl);
              } else {
                onNavigateEntity(feat.fallbackType || feat.type, feat.entityData);
              }
            };

            return (
              <div
                key={idx}
                role="button"
                tabIndex={0}
                style={{ containerType: "inline-size" }}
                onClick={handleActivate}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleActivate();
                  }
                }}
                className="relative text-left w-full flex flex-col items-start justify-between rounded-[2rem] p-6 sm:p-8 cursor-pointer group overflow-hidden transition-all hover:-translate-y-1 active:-translate-y-1 active:scale-[0.98] focus:outline-none appearance-none border border-transparent min-h-[160px] bg-black/5 dark:bg-white/5"
              >
                <div className="w-full relative z-30 flex flex-col gap-2">
                  <div
                    className={cn(
                      "text-[10px] sm:text-xs md:text-[11px] font-bold tracking-widest uppercase flex items-center gap-1.5",
                      feat.color,
                    )}
                  >
                    {feat.icon} {feat.label}
                  </div>
                  <div
                    style={{
                      fontSize: `clamp(1rem, ${80 / (Math.max(10, feat.displayName.length || 10) * 0.6)}cqi, 3rem)`,
                    }}
                    className={cn(
                      "font-black transition-colors uppercase leading-[1.1] text-wrap break-words w-full pr-12 pb-1 text-zinc-900 dark:text-white",
                      feat.hoverText,
                    )}
                  >
                    {feat.displayName}
                  </div>
                </div>

                <div className="w-full relative z-30 flex items-end justify-between mt-6 sm:mt-8">
                  <div className="flex items-center flex-wrap gap-4 sm:gap-6 shrink-0">
                    {feat.metrics.map((m, i) => {
                      const valStr =
                        typeof m.value === "string" || typeof m.value === "number"
                          ? String(m.value)
                          : "";
                      const len = valStr.length || 5;
                      return (
                        <div key={i} className="flex flex-col min-w-0 flex-shrink">
                          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest break-words w-full text-zinc-500">
                            {m.label}
                          </span>
                          <span
                            className={cn(
                              "font-black flex flex-wrap items-center mt-0.5 leading-none break-words w-full max-w-[120px] sm:max-w-[180px] text-zinc-900 dark:text-white tabular-nums",
                              len > 15
                                ? "text-xs sm:text-sm md:text-base leading-tight"
                                : len > 10
                                  ? "text-sm sm:text-base md:text-lg leading-tight"
                                  : "text-base sm:text-lg md:text-xl",
                            )}
                          >
                            {m.value}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div
                    className={cn(
                      "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex flex-shrink-0 items-center justify-center transition-all transform group-hover:scale-110 shadow-lg shadow-black/5 shrink-0 self-end ml-4",
                      feat.bg,
                      feat.color,
                      feat.hoverBg,
                      "group-hover:text-white",
                    )}
                  >
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    );
  },
);
