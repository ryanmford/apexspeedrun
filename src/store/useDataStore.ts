import { create } from 'zustand';
import type {
  CourseData,
  CourseRecordEntry,
  CourseRunEntry,
  GenderedCourseBoards,
  GenderedPlayerMap,
  KpiStats,
  KpiTrends,
  PlayerPerformance,
  PlayerProfile,
  RawBestRun,
  RecentFeedItem,
  SearchLocationItem,
  SetterProfile,
  TeamProfile,
  TeamsAggregated,
} from '../types';

export interface ASRDataState {
  data: PlayerProfile[];
  openData: PlayerProfile[];
  season26Data: PlayerProfile[];
  atPerfs: Record<string, PlayerPerformance[]>;
  opPerfs: Record<string, PlayerPerformance[]>;
  season26Perfs: Record<string, PlayerPerformance[]>;
  lbAT: GenderedCourseBoards;
  lbOpen: GenderedCourseBoards;
  lbSeason26: GenderedCourseBoards;
  atMet: Record<string, PlayerProfile>;
  dnMap: Record<string, string>;
  cMet: Record<string, CourseData>;
  atRawBest: Record<string, Record<string, RawBestRun>>;
  opRawBest: Record<string, Record<string, RawBestRun>>;
  season26RawBest: Record<string, Record<string, RawBestRun>>;
  recentFeed: RecentFeedItem[];
  courseRunsHistory: Record<string, CourseRunEntry[]>;

  // Computed Data
  masterCourseList: CourseData[];
  searchLocations: SearchLocationItem[];
  kpiStats: KpiStats | null;
  kpiTrends: KpiTrends | null;
  settersWithImpact: SetterProfile[];
  setterMet: Record<string, SetterProfile>;
  teamsAggregated: TeamsAggregated;
  playerLB_AT: GenderedPlayerMap;
  playerLB_OP: GenderedPlayerMap;
  playerLB_2026: GenderedPlayerMap;

  // Pre-computed lists
  courseRecords_M_AT: Record<string, CourseRecordEntry[]>;
  courseRecords_F_AT: Record<string, CourseRecordEntry[]>;
  courseRecords_M_OP: Record<string, CourseRecordEntry[]>;
  courseRecords_F_OP: Record<string, CourseRecordEntry[]>;
  courseRecords_M_2026: Record<string, CourseRecordEntry[]>;
  courseRecords_F_2026: Record<string, CourseRecordEntry[]>;
  playerList_M_AT: PlayerProfile[];
  playerList_F_AT: PlayerProfile[];
  playerList_M_OP: PlayerProfile[];
  playerList_F_OP: PlayerProfile[];
  playerList_M_2026: PlayerProfile[];
  playerList_F_2026: PlayerProfile[];
  courseList_AT: CourseData[];
  courseList_OP: CourseData[];
  courseList_2026: CourseData[];
  settersList: SetterProfile[];
  teamList_gyms_AT: TeamProfile[];
  teamList_teams_AT: TeamProfile[];
  teamList_gyms_OP: TeamProfile[];
  teamList_teams_OP: TeamProfile[];
  teamList_gyms_2026: TeamProfile[];
  teamList_teams_2026: TeamProfile[];

  isLoading: boolean;
  isSyncing: boolean;
  hasError: boolean;
  hasPartialError: boolean;
  lastUpdated: number | null;
  refreshTrigger: number;
  triggerRefresh: () => void;

  setData: (payload: Partial<ASRDataState>) => void;
  setFetchStatus: (status: { isLoading?: boolean; isSyncing?: boolean; hasError?: boolean; hasPartialError?: boolean }) => void;
}

const EMPTY_TEAMS_AGGREGATED: TeamsAggregated = {
  gyms: { open: [], allTime: [], season26: [] },
  teams: { open: [], allTime: [], season26: [] },
};

export const useDataStore = create<ASRDataState>((set) => ({
    data: [],
    openData: [],
    season26Data: [],
    atPerfs: {},
    opPerfs: {},
    season26Perfs: {},
    lbAT: { M: {}, F: {} },
    lbOpen: { M: {}, F: {} },
    lbSeason26: { M: {}, F: {} },
    atMet: {},
    dnMap: {},
    cMet: {},
    atRawBest: {},
    opRawBest: {},
    season26RawBest: {},
    recentFeed: [],
    courseRunsHistory: {},

    masterCourseList: [],
    searchLocations: [],
    kpiStats: null,
    kpiTrends: null,
    settersWithImpact: [],
    setterMet: {},
    teamsAggregated: EMPTY_TEAMS_AGGREGATED,
    playerLB_AT: { M: {}, F: {} },
    playerLB_OP: { M: {}, F: {} },
    playerLB_2026: { M: {}, F: {} },

    courseRecords_M_AT: {},
    courseRecords_F_AT: {},
    courseRecords_M_OP: {},
    courseRecords_F_OP: {},
    courseRecords_M_2026: {},
    courseRecords_F_2026: {},

    playerList_M_AT: [],
    playerList_F_AT: [],
    playerList_M_OP: [],
    playerList_F_OP: [],
    playerList_M_2026: [],
    playerList_F_2026: [],
    courseList_AT: [],
    courseList_OP: [],
    courseList_2026: [],
    settersList: [],
    teamList_gyms_AT: [],
    teamList_teams_AT: [],
    teamList_gyms_OP: [],
    teamList_teams_OP: [],
    teamList_gyms_2026: [],
    teamList_teams_2026: [],

    isLoading: true,
    isSyncing: false,
    hasError: false,
    hasPartialError: false,
    lastUpdated: null,
    refreshTrigger: 0,

    triggerRefresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),
    setData: (payload) => set((state) => ({ ...state, ...payload })),
    setFetchStatus: (status) => set((state) => ({ ...state, ...status })),
}));
