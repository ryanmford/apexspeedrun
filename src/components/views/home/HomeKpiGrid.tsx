import React from "react";
import { MapPin, User, ArrowRight, Trophy, Users } from "lucide-react";
import { motion } from "motion/react";
import { CountUp } from "../../common/CountUp";
import type { KpiStats } from "../../../types";

interface TrendPoint {
  value: number;
}

const MiniSparkline = React.memo(
  ({ data, stroke }: { data: TrendPoint[]; stroke: string }) => {
    const pathD = React.useMemo(() => {
      if (!data || data.length === 0) return "";
      const values = data.map((d) => Number(d.value) || 0);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;
      const padY = 4;
      const w = 100;
      const h = 40;
      const usableH = h - padY * 2;
      const pts = values.map((v, i) => ({
        x: values.length === 1 ? w : (i / (values.length - 1)) * w,
        y: padY + (1 - (v - min) / range) * usableH,
      }));
      if (pts.length === 1) return `M 0 ${pts[0].y.toFixed(2)} L ${w} ${pts[0].y.toFixed(2)}`;
      let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i];
        const p1 = pts[i + 1];
        const cx = ((p0.x + p1.x) / 2).toFixed(2);
        d += ` C ${cx} ${p0.y.toFixed(2)}, ${cx} ${p1.y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
      }
      return d;
    }, [data]);

    return (
      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible"
        aria-hidden="true"
      >
        <path
          d={pathD}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  },
);

interface HomeKpiGridProps {
  isLoading: boolean;
  kpi: KpiStats | null;
  totalGyms: number;
  totalTeams: number;
  totalMedals: number;
  playerCountries: number;
  teamCountries: number;
  totalFires: number;
  totalCoins: number;
  runsTrendData: TrendPoint[];
  countriesTrendData: TrendPoint[];
  medalsTrendData: TrendPoint[];
  coursesTrendData: TrendPoint[];
  onNavigatePlayers: () => void;
  onNavigateCourses: () => void;
  onNavigateTeams: () => void;
  onNavigateHof: () => void;
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const KPI_CARD_BASE =
  "col-span-12 sm:col-span-6 relative overflow-hidden bg-zinc-100/95 dark:bg-zinc-900/90 border border-black/5 dark:border-white/5 rounded-3xl p-6 sm:p-8 flex flex-col items-start text-left cursor-pointer transition-all duration-300 group hover:bg-zinc-200/80 dark:hover:bg-zinc-800/90 hover:-translate-y-1 active:scale-[0.98] min-h-[220px]";

export const HomeKpiGrid = React.memo(
  ({
    isLoading,
    kpi,
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
    onNavigatePlayers,
    onNavigateCourses,
    onNavigateTeams,
    onNavigateHof,
  }: HomeKpiGridProps) => {
    if (isLoading) {
      return (
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-12 gap-4 w-full max-w-4xl mx-auto px-2"
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="col-span-12 sm:col-span-6 bg-black/5 dark:bg-white/5 rounded-3xl p-6 h-[260px] flex flex-col items-center justify-center gap-4 animate-pulse"
            >
              <div className="w-8 h-8 bg-black/10 dark:bg-white/10 rounded-full" />
              <div className="w-20 h-10 bg-black/10 dark:bg-white/10 rounded-lg" />
              <div className="w-16 h-4 bg-black/10 dark:bg-white/10 rounded-full" />
              <div className="w-full h-12 bg-black/10 dark:bg-white/10 rounded-xl mt-4" />
            </div>
          ))}
        </motion.div>
      );
    }

    return (
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-12 gap-4 w-full max-w-4xl mx-auto px-2"
      >
        {/* Card 1: PLAYERS & RUNS */}
        <div className={KPI_CARD_BASE} onClick={onNavigatePlayers}>
          <div className="absolute inset-x-0 bottom-0 top-1/4 opacity-20 group-hover:opacity-40 pointer-events-none transition-opacity duration-500 flex items-end mask-image-bottom">
            {runsTrendData.length > 0 ? (
              <MiniSparkline data={runsTrendData} stroke="#3b82f6" />
            ) : (
              <div className="w-full h-full border-t border-dashed border-blue-500/20" />
            )}
          </div>

          <div className="absolute top-0 right-0 p-6 pointer-events-none z-30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 origin-top-right">
            <User className="w-12 h-12 text-blue-500/20 dark:text-blue-500/30 group-hover:text-blue-500/40 transition-colors" />
          </div>

          <div className="flex flex-col items-start gap-1 z-10 w-full relative pt-2">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase">
              Players
            </h2>
            <p className="text-sm font-medium text-zinc-500">View leaderboards</p>
          </div>

          <div className="mt-auto pt-8 w-full flex items-center justify-between z-10 text-xs sm:text-sm text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
            <div className="flex flex-col items-start gap-1 sm:gap-2 font-mono font-medium">
              <span className="flex items-baseline gap-1">
                <strong className="text-zinc-900 dark:text-white tabular-nums text-sm sm:text-base">
                  <CountUp end={kpi?.players || 0} />
                </strong>{" "}
                PLAYERS
              </span>
              <span className="flex items-baseline gap-1">
                <strong className="text-zinc-900 dark:text-white tabular-nums text-sm sm:text-base">
                  <CountUp end={kpi?.runs || 0} />
                </strong>{" "}
                RUNS
              </span>
              <span className="flex items-baseline gap-1">
                <strong className="text-zinc-900 dark:text-white tabular-nums text-sm sm:text-base">
                  <CountUp end={playerCountries || 0} />
                </strong>{" "}
                COUNTRIES
              </span>
            </div>
            <ArrowRight className="w-5 h-5 text-blue-500 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
          </div>
        </div>

        {/* Card 2: COURSES */}
        <div className={KPI_CARD_BASE} onClick={onNavigateCourses}>
          <div className="absolute inset-x-0 bottom-0 top-1/4 opacity-20 group-hover:opacity-40 pointer-events-none transition-opacity duration-500 flex items-end mask-image-bottom">
            {coursesTrendData.length > 0 ? (
              <MiniSparkline data={coursesTrendData} stroke="#10b981" />
            ) : (
              <div className="w-full h-full border-t border-dashed border-emerald-500/20" />
            )}
          </div>

          <div className="absolute top-0 right-0 p-6 pointer-events-none z-30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 origin-top-right">
            <MapPin className="w-12 h-12 text-emerald-500/20 dark:text-emerald-500/30 group-hover:text-emerald-500/40 transition-colors" />
          </div>

          <div className="flex flex-col items-start gap-1 z-10 w-full relative pt-2">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase">
              Courses
            </h2>
            <p className="text-sm font-medium text-zinc-500">Explore courses</p>
          </div>

          <div className="mt-auto pt-8 w-full flex items-center justify-between z-10 text-xs sm:text-sm text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
            <div className="flex flex-col items-start gap-1 sm:gap-2 font-mono font-medium">
              <span className="flex items-baseline gap-1">
                <strong className="text-zinc-900 dark:text-white tabular-nums text-sm sm:text-base">
                  <CountUp end={kpi?.courses || 0} />
                </strong>{" "}
                COURSES
              </span>
              <span className="flex items-baseline gap-1">
                <strong className="text-zinc-900 dark:text-white tabular-nums text-sm sm:text-base">
                  <CountUp end={kpi?.cities || 0} />
                </strong>{" "}
                CITIES
              </span>
              <span className="flex items-baseline gap-1">
                <strong className="text-zinc-900 dark:text-white tabular-nums text-sm sm:text-base">
                  <CountUp end={kpi?.countries || 0} />
                </strong>{" "}
                COUNTRIES
              </span>
            </div>
            <ArrowRight className="w-5 h-5 text-emerald-500 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
          </div>
        </div>

        {/* Card 3: GYMS & TEAMS */}
        <div className={KPI_CARD_BASE} onClick={onNavigateTeams}>
          <div className="absolute inset-x-0 bottom-0 top-1/4 opacity-20 group-hover:opacity-40 pointer-events-none transition-opacity duration-500 flex items-end mask-image-bottom">
            {countriesTrendData.length > 0 ? (
              <MiniSparkline data={countriesTrendData} stroke="#6366f1" />
            ) : (
              <div className="w-full h-full border-t border-dashed border-indigo-500/20" />
            )}
          </div>

          <div className="absolute top-0 right-0 p-6 pointer-events-none z-30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 origin-top-right">
            <Users className="w-12 h-12 text-indigo-500/20 dark:text-indigo-500/30 group-hover:text-indigo-500/40 transition-colors" />
          </div>

          <div className="flex flex-col items-start gap-1 z-10 w-full relative pt-2">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase">
              Teams
            </h2>
            <p className="text-sm font-medium text-zinc-500">Find gyms & teams</p>
          </div>

          <div className="mt-auto pt-8 w-full flex items-center justify-between z-10 text-xs sm:text-sm text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
            <div className="flex flex-col items-start gap-1 sm:gap-2 font-mono font-medium">
              <span className="flex items-baseline gap-1">
                <strong className="text-zinc-900 dark:text-white tabular-nums text-sm sm:text-base">
                  <CountUp end={totalGyms || 0} />
                </strong>{" "}
                GYMS
              </span>
              <span className="flex items-baseline gap-1">
                <strong className="text-zinc-900 dark:text-white tabular-nums text-sm sm:text-base">
                  <CountUp end={totalTeams || 0} />
                </strong>{" "}
                TEAMS
              </span>
              <span className="flex items-baseline gap-1">
                <strong className="text-zinc-900 dark:text-white tabular-nums text-sm sm:text-base">
                  <CountUp end={teamCountries || 0} />
                </strong>{" "}
                COUNTRIES
              </span>
            </div>
            <ArrowRight className="w-5 h-5 text-indigo-500 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
          </div>
        </div>

        {/* Card 4: HALL OF FAME */}
        <div className={KPI_CARD_BASE} onClick={onNavigateHof}>
          <div className="absolute inset-x-0 bottom-0 top-1/4 opacity-20 group-hover:opacity-40 pointer-events-none transition-opacity duration-500 flex items-end mask-image-bottom">
            {medalsTrendData.length > 0 ? (
              <MiniSparkline data={medalsTrendData} stroke="#f59e0b" />
            ) : (
              <div className="w-full h-full border-t border-dashed border-amber-500/20" />
            )}
          </div>

          <div className="absolute top-0 right-0 p-6 pointer-events-none z-30 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-12 origin-top-right">
            <Trophy className="w-12 h-12 text-amber-500/20 dark:text-amber-500/30 group-hover:text-amber-500/40 transition-colors" />
          </div>

          <div className="flex flex-col items-start gap-1 z-10 w-full relative pt-2">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase">
              HOF
            </h2>
            <p className="text-sm font-medium text-zinc-500">See ASR legends</p>
          </div>

          <div className="mt-auto pt-8 w-full flex items-center justify-between z-10 text-xs sm:text-sm text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
            <div className="flex flex-col items-start gap-1 sm:gap-2 font-mono font-medium">
              <span className="flex items-baseline gap-1">
                <strong className="text-zinc-900 dark:text-white tabular-nums text-sm sm:text-base">
                  <CountUp end={totalMedals || 0} />
                </strong>{" "}
                MEDALS
              </span>
              <span className="flex items-baseline gap-1">
                <strong className="text-zinc-900 dark:text-white tabular-nums text-sm sm:text-base">
                  <CountUp end={totalFires || 0} />
                </strong>{" "}
                FIRES
              </span>
              <span className="flex items-baseline gap-1">
                <strong className="text-zinc-900 dark:text-white tabular-nums text-sm sm:text-base">
                  <CountUp end={Number((totalCoins || 0).toFixed(2))} decimals={2} />
                </strong>{" "}
                COINS
              </span>
            </div>
            <ArrowRight className="w-5 h-5 text-amber-500 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
          </div>
        </div>
      </motion.div>
    );
  },
);
