import React, { useState, useMemo } from "react";
import { useDataStore } from "../../store/useDataStore";
import { useAppNavigation } from "../../hooks/useDerivedData";
import { ASRSearchInput } from "./ASRSearchInput";
import { MapPin, User, Users, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, normalizeForSearch } from "../../lib/asr-utils";
import { ASREmptyState } from "./ASREmptyState";
import { useDebounce } from "../../hooks/useDataHooks";
import type { CourseData, PlayerProfile, SearchLocationItem, TeamProfile } from "../../types";

type SearchEntityUnion =
  | { type: "location"; data: SearchLocationItem }
  | { type: "course"; data: CourseData }
  | { type: "team"; data: TeamProfile }
  | { type: "player"; data: PlayerProfile };

export const ASRGlobalSearch = React.memo(({ theme }: { theme: "light" | "dark" }) => {
  const [search, setSearch] = useState("");
  const { navigateToEntity } = useAppNavigation();

  const masterCourseList = useDataStore((s) => s.masterCourseList);
  const precomputedLocations = useDataStore((s) => s.searchLocations);
  const playerList_M_AT = useDataStore((s) => s.playerList_M_AT);
  const playerList_F_AT = useDataStore((s) => s.playerList_F_AT);
  const teamsAggregated = useDataStore((s) => s.teamsAggregated);

  const debouncedSearch = useDebounce(search, 200);

  // Fallback location index computed once if hydrating from an older cached snapshot
  const indexedLocations = useMemo<SearchLocationItem[]>(() => {
    if (precomputedLocations && precomputedLocations.length > 0) {
      return precomputedLocations;
    }
    const locationMap = new Map<string, SearchLocationItem>();
    masterCourseList.forEach((c) => {
      if (c.city || c.stateProv || c.country) {
        const city = c.city || "";
        const stateProv = c.stateProv || "";
        const country = c.country || "";
        const locKey = normalizeForSearch(`${city}, ${stateProv}, ${country}`);
        const existing = locationMap.get(locKey);
        if (!existing) {
          const locName = [city, stateProv, country].filter(Boolean).join(", ");
          const normName = normalizeForSearch(locName);
          locationMap.set(locKey, {
            name: locName,
            city,
            stateProv,
            country,
            flag: c.flag || "📍",
            courseCount: 1,
            type: "region",
            searchKey: normName,
            normCity: normalizeForSearch(city),
            normState: normalizeForSearch(stateProv),
            normCountry: normalizeForSearch(country),
            normName,
          });
        } else {
          existing.courseCount += 1;
        }
      }
    });
    return Array.from(locationMap.values()).sort((a, b) => b.courseCount - a.courseCount);
  }, [precomputedLocations, masterCourseList]);

  const searchResults = useMemo(() => {
    if (debouncedSearch.length < 2) return null;
    const q = normalizeForSearch(debouncedSearch);
    const searchTerms = q.split(/[\s,]+/).filter(Boolean);
    if (searchTerms.length === 0) return null;

    const players = [...playerList_M_AT, ...playerList_F_AT]
      .filter((p) => {
        if (p.isDivider) return false;
        const key =
          p.searchKey ||
          normalizeForSearch(
            `${p.name} ${p.igHandle || ""} ${p.teams?.map((t) => t.name).join(" ") || ""} ${p.location || ""} ${p.homeGym || ""}`,
          );
        return searchTerms.every((term) => key.includes(term));
      })
      .sort((a, b) => (b.runs || 0) - (a.runs || 0));

    const courses = masterCourseList
      .filter((c) => {
        const key =
          c.searchKey ||
          normalizeForSearch(`${c.name} ${c.city || ""} ${c.stateProv || ""} ${c.country || ""}`);
        return searchTerms.every((term) => key.includes(term));
      })
      .sort((a, b) => (b.totalAllTimeRuns || 0) - (a.totalAllTimeRuns || 0));

    const gymsArr = teamsAggregated?.gyms?.allTime || [];
    const teamsArr = teamsAggregated?.teams?.allTime || [];

    const matchedGyms = gymsArr
      .filter((t) => {
        const key = t.searchKey || normalizeForSearch(t.name);
        return searchTerms.every((term) => key.includes(term));
      })
      .sort((a, b) => (b.pts || 0) - (a.pts || 0));

    const matchedTeams = teamsArr
      .filter((t) => {
        const key = t.searchKey || normalizeForSearch(t.name);
        return searchTerms.every((term) => key.includes(term));
      })
      .sort((a, b) => (b.pts || 0) - (a.pts || 0));

    const locations = indexedLocations.filter((l) => {
      const key = l.searchKey || normalizeForSearch(l.name);
      return searchTerms.every((term) => key.includes(term));
    });

    const isGeoSearch =
      locations.length > 0 &&
      locations.some((l) => {
        const nCity = l.normCity ?? normalizeForSearch(l.city);
        const nState = l.normState ?? normalizeForSearch(l.stateProv);
        const nCountry = l.normCountry ?? normalizeForSearch(l.country);
        const nName = l.normName ?? l.searchKey ?? normalizeForSearch(l.name);
        return nCity === q || nState === q || nCountry === q || nName === q;
      });

    return {
      players: isGeoSearch ? [] : players,
      courses,
      gyms: matchedGyms,
      teams: isGeoSearch ? [] : matchedTeams,
      locations,
    };
  }, [debouncedSearch, playerList_M_AT, playerList_F_AT, masterCourseList, teamsAggregated, indexedLocations]);

  const allSearchResults = useMemo<SearchEntityUnion[]>(() => {
    if (!searchResults) return [];
    return [
      ...searchResults.locations.slice(0, 50).map((l): SearchEntityUnion => ({ type: "location", data: l })),
      ...searchResults.courses.slice(0, 50).map((c): SearchEntityUnion => ({ type: "course", data: c })),
      ...searchResults.gyms.slice(0, 50).map((g): SearchEntityUnion => ({ type: "team", data: g })),
      ...searchResults.players.slice(0, 50).map((p): SearchEntityUnion => ({ type: "player", data: p })),
      ...searchResults.teams.slice(0, 50).map((t): SearchEntityUnion => ({ type: "team", data: t })),
    ];
  }, [searchResults]);

  const [searchFocusedIndex, setSearchFocusedIndex] = useState(-1);

  React.useEffect(() => {
    setSearchFocusedIndex(-1);
  }, [search]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!allSearchResults.length) return;
    if (e.key === "ArrowDown") {
      setSearchFocusedIndex((prev) => (prev + 1) % allSearchResults.length);
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setSearchFocusedIndex((prev) =>
        prev === -1 ? allSearchResults.length - 1 : (prev - 1 + allSearchResults.length) % allSearchResults.length,
      );
      e.preventDefault();
    } else if (e.key === "Enter") {
      if (searchFocusedIndex >= 0 && searchFocusedIndex < allSearchResults.length) {
        const item = allSearchResults[searchFocusedIndex];
        navigateToEntity(item.type, item.data as unknown as Record<string, unknown>);
        setSearch("");
      }
    }
  };

  const clearSearch = () => setSearch("");

  return (
    <div className="relative w-full z-[100] group">
      <ASRSearchInput
        value={search}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
        onKeyDown={handleSearchKeyDown}
        placeholder="search Apex Speed Run..."
        theme={theme}
        className="w-full"
        enableFocusShortcut="slash"
      />
      <AnimatePresence>
        {searchResults && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-[calc(100%+8px)] left-0 w-full min-w-[250px] sm:max-w-2xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[60vh] lg:max-h-[70vh] overflow-y-auto overscroll-none"
          >
            {/* Locations */}
            {searchResults.locations && searchResults.locations.length > 0 && (
              <div className="p-2 border-b border-black/10 dark:border-white/10">
                <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Locations</div>
                {searchResults.locations.slice(0, 50).map((l, i) => {
                  const isFocused = searchFocusedIndex === i;
                  return (
                    <button
                      type="button"
                      key={l.name || i}
                      onClick={() => {
                        navigateToEntity("location", l as unknown as Record<string, unknown>);
                        clearSearch();
                      }}
                      onTouchStart={() => {}}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-left rounded-xl transition-all active:scale-[0.98]",
                        isFocused
                          ? "bg-black/10 dark:bg-white/10 ring-1 ring-zinc-500"
                          : "hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10",
                      )}
                    >
                      <span className="text-base">{l.flag}</span>
                      <div className="flex flex-1 items-center gap-2 overflow-hidden">
                        <span className="font-bold text-sm truncate">{l.name}</span>
                        {l.courseCount > 0 && (
                          <span className="text-xs font-medium text-zinc-500 flex-shrink-0">
                            ({l.courseCount})
                          </span>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-30 ml-auto flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
            {/* Courses */}
            {searchResults.courses.length > 0 && (
              <div className="p-2 border-b border-black/10 dark:border-white/10">
                <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Courses</div>
                {searchResults.courses.slice(0, 50).map((c, i) => {
                  const isFocused = searchFocusedIndex === i + searchResults.locations.slice(0, 50).length;
                  return (
                    <button
                      type="button"
                      key={c.name}
                      onClick={() => {
                        navigateToEntity("course", c as unknown as Record<string, unknown>);
                        clearSearch();
                      }}
                      onTouchStart={() => {}}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-left rounded-xl transition-all active:scale-[0.98]",
                        isFocused
                          ? "bg-black/10 dark:bg-white/10 ring-1 ring-zinc-500"
                          : "hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10",
                      )}
                    >
                      <MapPin className="w-4 h-4 opacity-50 flex-shrink-0" />
                      <span className="font-bold flex-1 text-sm truncate">{c.name}</span>
                      <ChevronRight className="w-4 h-4 opacity-30 ml-auto flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
            {/* Gyms */}
            {searchResults.gyms.length > 0 && (
              <div className="p-2 border-b border-black/10 dark:border-white/10">
                <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Gyms</div>
                {searchResults.gyms.slice(0, 50).map((g, i) => {
                  const isFocused =
                    searchFocusedIndex ===
                    i + searchResults.locations.slice(0, 50).length + searchResults.courses.slice(0, 50).length;
                  return (
                    <button
                      type="button"
                      key={g.name || i}
                      onClick={() => {
                        navigateToEntity("team", g as unknown as Record<string, unknown>);
                        clearSearch();
                      }}
                      onTouchStart={() => {}}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-left rounded-xl transition-all active:scale-[0.98]",
                        isFocused
                          ? "bg-black/10 dark:bg-white/10 ring-1 ring-zinc-500"
                          : "hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10",
                      )}
                    >
                      <Users className="w-4 h-4 opacity-50 flex-shrink-0" />
                      <span className="font-bold flex-1 text-sm truncate">{g.name}</span>
                      <ChevronRight className="w-4 h-4 opacity-30 ml-auto flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
            {/* Players */}
            {searchResults.players.length > 0 && (
              <div className="p-2 border-b border-black/10 dark:border-white/10">
                <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Players</div>
                {searchResults.players.slice(0, 50).map((p, i) => {
                  const isFocused =
                    searchFocusedIndex ===
                    i +
                      searchResults.locations.slice(0, 50).length +
                      searchResults.courses.slice(0, 50).length +
                      searchResults.gyms.slice(0, 50).length;
                  return (
                    <button
                      type="button"
                      key={p.pKey || p.name || i}
                      onClick={() => {
                        navigateToEntity("player", p as unknown as Record<string, unknown>);
                        clearSearch();
                      }}
                      onTouchStart={() => {}}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-left rounded-xl transition-all active:scale-[0.98]",
                        isFocused
                          ? "bg-black/10 dark:bg-white/10 ring-1 ring-zinc-500"
                          : "hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10",
                      )}
                    >
                      <User className="w-4 h-4 opacity-50 flex-shrink-0" />
                      <span className="font-bold flex-1 text-sm truncate">{p.name}</span>
                      <ChevronRight className="w-4 h-4 opacity-30 ml-auto flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
            {/* Teams */}
            {searchResults.teams.length > 0 && (
              <div className="p-2 border-b border-black/10 dark:border-white/10">
                <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Teams</div>
                {searchResults.teams.slice(0, 50).map((t, i) => {
                  const isFocused =
                    searchFocusedIndex ===
                    i +
                      searchResults.locations.slice(0, 50).length +
                      searchResults.courses.slice(0, 50).length +
                      searchResults.gyms.slice(0, 50).length +
                      searchResults.players.slice(0, 50).length;
                  return (
                    <button
                      type="button"
                      key={t.name || i}
                      onClick={() => {
                        navigateToEntity("team", t as unknown as Record<string, unknown>);
                        clearSearch();
                      }}
                      onTouchStart={() => {}}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-left rounded-xl transition-all active:scale-[0.98]",
                        isFocused
                          ? "bg-black/10 dark:bg-white/10 ring-1 ring-zinc-500"
                          : "hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10",
                      )}
                    >
                      <Users className="w-4 h-4 opacity-50 flex-shrink-0" />
                      <span className="font-bold flex-1 text-sm truncate">{t.name}</span>
                      <ChevronRight className="w-4 h-4 opacity-30 ml-auto flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
            {searchResults.players.length === 0 &&
              searchResults.courses.length === 0 &&
              searchResults.teams.length === 0 &&
              searchResults.gyms.length === 0 &&
              searchResults.locations.length === 0 && (
                <div className="p-4">
                  <ASREmptyState
                    theme={theme}
                    title="NO RESULTS FOUND"
                    message="TRY ANOTHER SEARCH TERM."
                  />
                </div>
              )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
