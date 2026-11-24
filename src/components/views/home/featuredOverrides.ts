export interface FeaturedDateOverride {
  playerNameIncludes?: string;
  courseNameIncludes?: string[];
  runCourseIncludes?: string;
  runPlayerIncludes?: string;
}

/**
 * Declarative America/Denver date overrides (M/D/YYYY) for "Of The Day" cards.
 * Keeps editorial picks out of core view logic.
 */
export const FEATURED_DATE_OVERRIDES: Record<string, FeaturedDateOverride> = {
  "5/26/2026": {
    playerNameIncludes: "matt jang",
    courseNameIncludes: ["funda", "mexico"],
    runCourseIncludes: "confluence",
    runPlayerIncludes: "joey",
  },
};
