import React, { useMemo } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../../lib/asr-utils";

const ALL_HERO_VIDEOS = [
  "/ben-tivoli.mp4",
  "/joey-harbourfront1.mp4",
  "/leon-iron-works.mp4",
  "/olof-c4c.mp4",
  "/taylor-navfac.mp4",
];

interface HomeHeroProps {
  theme: "light" | "dark";
  onGetStarted: () => void;
  onJumpToContent: () => void;
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export const HomeHero = React.memo(
  ({ theme, onGetStarted, onJumpToContent }: HomeHeroProps) => {
    const [failedVideos, setFailedVideos] = React.useState<string[]>([]);

    const availableVideos = useMemo(() => {
      const working = ALL_HERO_VIDEOS.filter((v) => !failedVideos.includes(v));
      return working.length > 0 ? working : [ALL_HERO_VIDEOS[0]];
    }, [failedVideos]);

    const [activeVideoIndex] = React.useState(() => {
      const key = "asr_hero_video_index";
      let nextIndex = Math.floor(Math.random() * ALL_HERO_VIDEOS.length);
      try {
        const saved = sessionStorage.getItem(key);
        if (saved !== null) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed) && parsed >= 0 && parsed < ALL_HERO_VIDEOS.length) {
            nextIndex = (parsed + 1) % ALL_HERO_VIDEOS.length;
          }
        }
        sessionStorage.setItem(key, String(nextIndex));
      } catch {
        // safe fallback
      }
      return nextIndex;
    });

    const currentVideoSrc = useMemo(() => {
      const preferred = ALL_HERO_VIDEOS[activeVideoIndex] || ALL_HERO_VIDEOS[0];
      return failedVideos.includes(preferred) ? availableVideos[0] : preferred;
    }, [activeVideoIndex, failedVideos, availableVideos]);

    const currentPosterSrc = useMemo(() => {
      const base = currentVideoSrc.replace(/^\//, "").replace(/\.mp4$/i, "");
      return `/posters/${base}.webp`;
    }, [currentVideoSrc]);

    const videoRef = React.useRef<HTMLVideoElement>(null);
    const heroContainerRef = React.useRef<HTMLDivElement>(null);
    const isHeroVisibleRef = React.useRef(true);

    React.useEffect(() => {
      const video = videoRef.current;
      if (!video) return;
      video.load();
      if (isHeroVisibleRef.current && document.visibilityState === "visible") {
        video.play()?.catch(() => {});
      }
    }, [currentVideoSrc]);

    React.useEffect(() => {
      const container = heroContainerRef.current;
      const syncPlayback = () => {
        const video = videoRef.current;
        if (!video) return;
        const shouldPlay =
          isHeroVisibleRef.current &&
          (typeof document === "undefined" || document.visibilityState === "visible");
        if (shouldPlay) {
          if (video.paused) video.play()?.catch(() => {});
        } else if (!video.paused) {
          video.pause();
        }
      };

      let observer: IntersectionObserver | null = null;
      if (container && typeof IntersectionObserver !== "undefined") {
        observer = new IntersectionObserver(
          (entries) => {
            isHeroVisibleRef.current = Boolean(entries[0]?.isIntersecting);
            syncPlayback();
          },
          { threshold: 0.05 },
        );
        observer.observe(container);
      }

      document.addEventListener("visibilitychange", syncPlayback);
      return () => {
        observer?.disconnect();
        document.removeEventListener("visibilitychange", syncPlayback);
      };
    }, []);

    const handleVideoError = React.useCallback(() => {
      setFailedVideos((prev) =>
        prev.includes(currentVideoSrc) ? prev : [...prev, currentVideoSrc],
      );
    }, [currentVideoSrc]);

    return (
      <motion.div
        ref={heroContainerRef}
        variants={itemVariants}
        className={cn(
          "relative h-[105dvh] sm:h-[105dvh] w-[100vw] ml-[calc(50%-50vw)] mr-[calc(50%-50vw)] flex flex-col justify-start overflow-hidden transition-all duration-500 group border-b z-10",
          theme === "dark"
            ? "bg-[#0A0A0A] border-white/5"
            : "bg-black border-white/10",
        )}
      >
        <div className="absolute inset-0 z-0 bg-black">
          <video
            ref={videoRef}
            src={currentVideoSrc}
            poster={currentPosterSrc}
            preload="metadata"
            autoPlay
            playsInline
            muted
            loop
            onError={handleVideoError}
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/40 pointer-events-none" />
        </div>

        <div
          className="absolute left-0 right-0 w-full max-w-5xl mx-auto px-4 pointer-events-none z-10 flex flex-col items-center bottom-[240px] md:bottom-[280px]"
          style={{
            marginBottom: "env(safe-area-inset-bottom, 0px)",
            gap: "24px",
          }}
        >
          <div className="flex w-auto mx-auto relative z-30 pointer-events-auto">
            <button
              type="button"
              className="group/btn relative px-8 py-4 sm:py-5 overflow-hidden rounded-full font-medium text-sm sm:text-base tracking-[0.2em] text-white transition-all duration-500 active:scale-[0.98] shadow-2xl bg-black/70 border border-white/25"
              onClick={onGetStarted}
              onTouchStart={() => {}}
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500 z-10" />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/20 rounded-full z-[15]" />
              <span className="relative z-20 flex items-center justify-center gap-2 uppercase font-black tracking-widest text-[#FFF]">
                Get Started
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover/btn:translate-x-1.5 transition-transform duration-500 opacity-90" />
              </span>
            </button>
          </div>
        </div>

        <div
          className="absolute left-0 right-0 w-full mx-auto px-4 z-20 flex justify-center bottom-[110px] sm:bottom-[125px] md:bottom-[135px] pointer-events-auto select-none"
          style={{
            marginBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          <button
            type="button"
            onClick={onJumpToContent}
            aria-label="Jump to next section"
            className="flex items-center justify-center w-11 h-11 text-zinc-400 hover:text-white dark:text-zinc-400 dark:hover:text-white active:scale-90 transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-full"
          >
            <ChevronDown size={24} strokeWidth={2.25} className="animate-bounce" />
          </button>
        </div>
      </motion.div>
    );
  },
);
