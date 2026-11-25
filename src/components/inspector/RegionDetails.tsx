import React, { useMemo, useState } from "react";
import {
  cn,
  normalizeName,
  fixCountryEntity,
  getCombinedFlags,
  matchesRegionTarget,
} from "../../lib/asr-utils";
import { ASRStatCard } from "../common/ASRStatCard";
import { FallbackAvatar } from "../common/FallbackAvatar";
import { ProfileHeader, InspectorTabContainer } from "./InspectorComponents";
import { ASRRankList } from "../list/ASRRankList";

import { ASRNeonToggle } from "../common/ASRNeonToggle";
import { ModalScrollContext } from "../common/ASRBaseModal";
import { ASREmptyState } from "../common/ASREmptyState";
import { useDataStore } from "../../store/useDataStore";

import { ASRDataContext, CourseData, PlayerProfile } from "../../types";

interface RegionDetailsProps {
  region: { name: string; flag?: string; type?: string };
  dataContext: ASRDataContext;
  onEntityClick: (type: string, data: Record<string, unknown> | string | { name?: string; pKey?: string }) => void;
  theme: "light" | "dark";
}

export const RegionDetails = React.memo(
  ({ region, dataContext, onEntityClick, theme }: RegionDetailsProps) => {
    const { atMet = {}, data: contextData } = dataContext || {};

    const storeData = useDataStore((s) => s.data);
    const playerList_M_AT = useDataStore((s) => s.playerList_M_AT);
    const playerList_F_AT = useDataStore((s) => s.playerList_F_AT);

    const allTimeRankedPKeys = useMemo(() => {
      const pKeys = new Set<string>();
      [...(playerList_M_AT || []), ...(playerList_F_AT || [])].forEach((p: PlayerProfile) => {
        if (p.currentRank !== "UR" && !p.isDivider) {
          pKeys.add(p.pKey || normalizeName(p.name));
        }
      });
      return pKeys;
    }, [playerList_M_AT, playerList_F_AT]);

    const [activeTab, setActiveTab] = useState("players");

    const scrollRef = React.useContext(ModalScrollContext);

    const scrollToTop = () => {
      if (scrollRef?.current) {
        if (scrollRef.current.scrollTop > 150) {
          scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    };

    const regionNameUpper = region.name.toUpperCase().replace(/[\uD83C][\uDDE6-\uDDFF]|\p{Extended_Pictographic}/gu, '').trim();
    const parts = regionNameUpper.split(",");
    const potentialCountry = parts[parts.length - 1]?.trim() || "";
    const computedFlagInfo = fixCountryEntity(potentialCountry, region.flag || "");
    const finalFlag = (computedFlagInfo.flag && computedFlagInfo.flag !== "🏳️") 
      ? computedFlagInfo.flag 
      : getCombinedFlags(region.name);

    const regionalCourses = useMemo(() => {
      const allCourses: CourseData[] = dataContext.masterCourseList || [];
      return allCourses
        .filter((c) => matchesRegionTarget(region, c))
        .map(c => ({
          ...c,
          runs: c.totalAllTimeRuns || c.totalRuns || 0,
          pKey: normalizeName(c.name)
        }))
        .sort((a, b) => (b.runs) - (a.runs));
    }, [dataContext.masterCourseList, region]);

    const totalRegionalRuns = useMemo(
      () => regionalCourses.reduce((sum, c) => sum + (c.runs || 0), 0),
      [regionalCourses],
    );

    const regionalPlayers = useMemo(() => {
      const competedPKeys = new Set<string>();

      regionalCourses.forEach((c) => {
        const mMAll = c.allTimeAthletesM || c.athletesMAll;
        if (Array.isArray(mMAll)) {
          mMAll.forEach((a) => {
            if (a && a[0]) {
              competedPKeys.add(normalizeName(a[0]));
            }
          });
        }

        const fFAll = c.allTimeAthletesF || c.athletesFAll;
        if (Array.isArray(fFAll)) {
          fFAll.forEach((a) => {
            if (a && a[0]) {
              competedPKeys.add(normalizeName(a[0]));
            }
          });
        }
      });

      const playersPool =
        contextData && contextData.length > 0
          ? contextData
          : storeData && storeData.length > 0
            ? storeData
            : Object.values(atMet);

      return playersPool
        .filter((p: PlayerProfile) => {
          const pKey = p.pKey || normalizeName(p.name);
          if (!allTimeRankedPKeys.has(pKey)) return false;
          const isFromRegion = matchesRegionTarget(region, p);
          const competedHere = competedPKeys.has(pKey);
          return isFromRegion || competedHere;
        })
        .sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }, [contextData, storeData, atMet, region, regionalCourses, allTimeRankedPKeys]);

    return (
      <div
        className={cn(
          "flex flex-col relative pb-32 transition-colors",
          theme === "dark" ? "bg-[#0a0a0c]" : "bg-white",
        )}
      >
        <ProfileHeader
          theme={theme}
          avatar={<FallbackAvatar name={region.name} sizeCls="text-3xl" />}
          title={
            <span className="flex items-center gap-2">
              <span className="shrink-0 leading-none">{finalFlag}</span>
              <span className="truncate">{region.name}</span>
            </span>
          }
        />

        <div
          className={cn(
            "flex items-center justify-center border-y sticky top-0 z-40 transition-colors py-2",
            theme === "dark"
              ? "border-white/5 bg-zinc-950/95 shadow-[0_4px_30px_rgba(0,0,0,0.1)]"
              : "border-black/5 bg-white/95 shadow-[0_4px_30px_rgba(0,0,0,0.03)]",
          )}
        >
          <div className="flex w-full max-w-2xl px-4">
            <ASRNeonToggle
              options={[
                { label: "PLAYERS", value: "players" },
                { label: "COURSES", value: "courses" },
              ]}
              activeOption={activeTab}
              onChange={(t) => {
                setActiveTab(t);
                scrollToTop();
              }}
              layoutId="region-tabs"
              theme={theme}
              className="w-full"
            />
          </div>
        </div>

        <div
          className={cn(
            "flex flex-col flex-1 transition-colors",
            theme === "dark" ? "bg-[#050505]" : "bg-[#FAFAFA]",
          )}
        >
          {activeTab === "players" && (
            <InspectorTabContainer>
              <div className="grid grid-cols-2 gap-4">
                <ASRStatCard label="PLAYERS" value={regionalPlayers.length} />
                <ASRStatCard label="RUNS" value={totalRegionalRuns} />
              </div>

              {regionalPlayers.length > 0 ? (
                <div className="mt-4">
                  <ASRRankList
                    athletes={regionalPlayers.map((p) => [
                      p.pKey || normalizeName(p.name),
                      p.rating || 0,
                    ])}
                    valueLabel="LQ"
                    dataContext={dataContext}
                    onEntityClick={onEntityClick}
                    entityType="player"
                    hideSubtitle={true}
                  />
                </div>
              ) : (
                <div className="mt-4">
                  <ASREmptyState 
                    theme={theme}
                    title="NO REGIONAL PLAYERS"
                    message="THERE ARE NO ALL-TIME RANKED PLAYERS REGISTERED IN THIS LOCATION YET."
                  />
                </div>
              )}
            </InspectorTabContainer>
          )}

          {activeTab === "courses" && (
            <InspectorTabContainer>
              <div className="grid grid-cols-2 gap-4">
                <ASRStatCard label="COURSES" value={regionalCourses.length} />
                <ASRStatCard label="RUNS" value={totalRegionalRuns} />
              </div>

              <div className="flex flex-col gap-4 mt-4 mb-8">
                {regionalCourses.length > 0 ? (
                  <ASRRankList
                    athletes={regionalCourses}
                    valueLabel="RUNS"
                    onEntityClick={onEntityClick}
                    dataContext={dataContext}
                    hideSubtitle={true}
                    entityType="course"
                  />
                ) : (
                  <ASREmptyState 
                    theme={theme}
                    title="NO REGIONAL COURSES"
                    message="THERE ARE NO OFFICIAL COURSES REGISTERED IN THIS LOCATION YET."
                  />
                )}
              </div>
            </InspectorTabContainer>
          )}
        </div>
      </div>
    );
  },
);
