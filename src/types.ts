export interface PlayerTeamRef {
  name: string;
  flag?: string;
  location?: string;
}

export interface PlayerPerformance {
  label: string;
  value?: string;
  num: number;
  rank: number;
  points: number;
  videoUrl: string;
  date: string | null;
  fireCount: number;
  city?: string;
  country?: string;
  location?: string;
  [key: string]: unknown;
}

export interface RawBestRun {
  label: string;
  value?: string;
  num: number;
  videoUrl: string;
  date: string | null;
}

export interface CourseRunEntry {
  pKey: string;
  athlete: string;
  gender: "M" | "F";
  course: string;
  num: number;
  time: number;
  videoUrl: string;
  date: string | null;
}

export interface CourseRecordEntry {
  pKey: string;
  time: number;
  pts: number;
  rank: number;
  videoUrl?: string;
  date?: string | null;
  isInterim?: boolean;
  name?: string;
}

export interface RecentFeedItem {
  id: string;
  name: string;
  athlete?: PlayerProfile;
  courseName?: string;
  course: CourseData;
  result?: string;
  time: number | null;
  videoUrl: string;
  isCR: boolean;
  rank: number;
  fireCount: number;
  timeString: string;
}

export interface PlayerProfile {
  id?: string;
  pKey: string;
  name: string;
  gender: "M" | "F";
  rating: number;
  pts?: number;
  currentRank?: number | string;
  rank?: number | string;
  allTimeRank?: number | "UR";
  openRank?: number | "UR";
  season26Rank?: number | "UR";
  courses?: number;
  runs: number;
  latestRunDate?: Date | string;
  wins?: number;
  sets?: number;
  allTimeFireCount?: number;
  season26FireCount?: number;
  openFireCount?: number;
  fires?: number;
  films?: number;
  contributionScore?: number;
  avgTime?: number;
  certLevel?: string;
  shoe?: string;
  shoeSize?: string;
  homeGym?: string;
  gymFlag?: string;
  townFlag?: string;
  flag?: string;
  countryName?: string;
  region?: string;
  location?: string;
  igHandle?: string;
  teams?: PlayerTeamRef[];
  teamLocation?: string;
  searchKey?: string;
  isDivider?: boolean;
  label?: string;
  isQualified?: boolean;
  shouldFade?: boolean;
  cities?: number;
  countries?: number;
  reruns?: number;
  winPercentage?: number;
  contribution?: number;
  totalAllTimeRuns?: number;
  height?: string;
  weight?: string;
  wingspan?: string;
  apeIndex?: string;
  vitals?: {
    height?: string;
    weight?: string;
    wingspan?: string;
  };
}

export interface CourseData {
  name: string;
  videoUrl?: string;
  demoVideo?: string;
  coverImage?: string;
  city?: string;
  stateProv?: string;
  country?: string;
  flag?: string;
  continent?: string;
  continentFlag?: string;
  difficulty?: string;
  length?: string;
  elevation?: string;
  type?: string;
  textures?: string;
  interfaces?: string;
  shape?: string;
  startType?: string;
  googleMaps?: string;
  setter?: string;
  coordinates?: string;
  sponsorName?: string;
  sponsorLink?: string;
  searchKey?: string;
  currentRank?: number;
  openRuns?: number;
  season26Runs?: number;
  mRecord?: number | null;
  fRecord?: number | null;
  totalAthletes?: number;
  totalRuns?: number;
  allTimeMRecord?: number | null;
  allTimeFRecord?: number | null;
  allTimeAthletesM?: [string, number, string?][];
  allTimeAthletesF?: [string, number, string?][];
  athletesMAll?: [string, number, string?][];
  athletesFAll?: [string, number, string?][];
  totalAllTimeAthletes?: number;
  totalAllTimeRuns?: number;
  parsedCoords?: [number, number] | null;
  leadSettersNormalized?: string[];
  leadSetters?: string | string[];
  assistantSettersNormalized?: string[];
  assistantsetters?: string | string[];
  isOpenCourse?: boolean;
  is2026Course?: boolean;
  isAllTimeCourse?: boolean;
  dateSet?: string;
  pKey?: string;
  asrPatron?: string;
}

export interface SetterProfile {
  id?: string;
  pKey?: string;
  name: string;
  leads: number;
  assists: number;
  sets: number;
  impact?: number;
  films?: number;
  isAthlete?: boolean;
  region?: string;
  location?: string;
  homeGym?: string;
  teams?: (PlayerTeamRef | string)[];
  townFlag?: string;
  gymFlag?: string;
  countryName?: string;
  igHandle?: string;
  contributionScore?: number;
  certLevel?: string;
  currentRank?: number;
  searchKey?: string;
}

export interface TeamProfile {
  name: string;
  flag: string;
  location?: string;
  category?: string;
  pts: number;
  players: (PlayerProfile & { contribution?: number })[];
  playersCount: number;
  bestPlayers: PlayerProfile[];
  runsCount: number;
  currentRank?: number;
  website?: string;
  instagram?: string;
  youtube?: string;
  searchKey?: string;
}

export interface TeamsAggregated {
  gyms: {
    open: TeamProfile[];
    allTime: TeamProfile[];
    season26: TeamProfile[];
  };
  teams: {
    open: TeamProfile[];
    allTime: TeamProfile[];
    season26: TeamProfile[];
  };
}

export interface SearchLocationItem {
  name: string;
  city: string;
  stateProv: string;
  country: string;
  flag: string;
  courseCount: number;
  type?: "region";
  searchKey: string;
  normCity?: string;
  normState?: string;
  normCountry?: string;
  normName?: string;
}

export interface KpiStats {
  players: number;
  courses: number;
  cities: number;
  countries: number;
  runs: number;
}

export interface KpiTrends {
  runs: { value: number }[];
  players: { value: number }[];
  courses: { value: number }[];
  countries: { value: number }[];
}

export type GenderedCourseBoards = {
  M: Record<string, Record<string, number>>;
  F: Record<string, Record<string, number>>;
};

export type GenderedPlayerMap = {
  M: Record<string, PlayerProfile>;
  F: Record<string, PlayerProfile>;
};

export interface ComputedASRState {
  lbAT?: GenderedCourseBoards;
  lbOpen?: GenderedCourseBoards;
  lbSeason26?: GenderedCourseBoards;
  season26Data?: PlayerProfile[];
  season26Perfs?: Record<string, PlayerPerformance[]>;
  atPerfs?: Record<string, PlayerPerformance[]>;
  opPerfs?: Record<string, PlayerPerformance[]>;
  atMet?: Record<string, PlayerProfile>;
  dnMap?: Record<string, string>;
  cMet?: Record<string, CourseData>;
  atRawBest?: Record<string, Record<string, RawBestRun>>;
  opRawBest?: Record<string, Record<string, RawBestRun>>;
  season26RawBest?: Record<string, Record<string, RawBestRun>>;
  recentFeed?: RecentFeedItem[];
  courseRunsHistory?: Record<string, CourseRunEntry[]>;
  setterMet?: Record<string, SetterProfile>;
  masterCourseList?: CourseData[];
  searchLocations?: SearchLocationItem[];
  kpiStats?: KpiStats | null;
  kpiTrends?: KpiTrends | null;
  courseRecords_M_AT?: Record<string, CourseRecordEntry[]>;
  courseRecords_F_AT?: Record<string, CourseRecordEntry[]>;
  courseRecords_M_OP?: Record<string, CourseRecordEntry[]>;
  courseRecords_F_OP?: Record<string, CourseRecordEntry[]>;
  courseRecords_M_2026?: Record<string, CourseRecordEntry[]>;
  courseRecords_F_2026?: Record<string, CourseRecordEntry[]>;
  data?: PlayerProfile[];
  openData?: PlayerProfile[];
  settersWithImpact?: SetterProfile[];
  teamsAggregated?: TeamsAggregated;
  playerLB_AT?: GenderedPlayerMap;
  playerLB_OP?: GenderedPlayerMap;
  playerLB_2026?: GenderedPlayerMap;
  playerList_M_AT?: PlayerProfile[];
  playerList_F_AT?: PlayerProfile[];
  playerList_M_OP?: PlayerProfile[];
  playerList_F_OP?: PlayerProfile[];
  playerList_M_2026?: PlayerProfile[];
  playerList_F_2026?: PlayerProfile[];
  courseList_AT?: CourseData[];
  courseList_OP?: CourseData[];
  courseList_2026?: CourseData[];
  settersList?: SetterProfile[];
  teamList_gyms_AT?: TeamProfile[];
  teamList_teams_AT?: TeamProfile[];
  teamList_gyms_OP?: TeamProfile[];
  teamList_teams_OP?: TeamProfile[];
  teamList_gyms_2026?: TeamProfile[];
  teamList_teams_2026?: TeamProfile[];
  hasTotalError?: boolean;
  hasPartialError?: boolean;
}

export interface ASRDataContext {
  lbAT?: GenderedPlayerMap;
  lbOP?: GenderedPlayerMap;
  lbSeason26?: GenderedPlayerMap;
  season26Data?: PlayerProfile[];
  season26Perfs?: Record<string, PlayerPerformance[]>;
  atPerfs?: Record<string, PlayerPerformance[]>;
  opPerfs?: Record<string, PlayerPerformance[]>;
  atMet?: Record<string, PlayerProfile>;
  dnMap?: Record<string, string>;
  cMet?: Record<string, CourseData>;
  pRaw?: Record<string, Record<string, PlayerPerformance[]>>;
  atRawBest?: Record<string, RawBestRun[]>;
  opRawBest?: Record<string, RawBestRun[]>;
  courseRunsHistory?: Record<string, CourseRunEntry[]>;
  setterMet?: Record<string, SetterProfile>;
  lbAT_Courses?: GenderedCourseBoards;
  lbOP_Courses?: GenderedCourseBoards;
  masterCourseList?: CourseData[];
  courseRecords_M_AT?: Record<string, CourseRecordEntry[]>;
  courseRecords_F_AT?: Record<string, CourseRecordEntry[]>;
  courseRecords_M_OP?: Record<string, CourseRecordEntry[]>;
  courseRecords_F_OP?: Record<string, CourseRecordEntry[]>;
  courseRecords_M_2026?: Record<string, CourseRecordEntry[]>;
  courseRecords_F_2026?: Record<string, CourseRecordEntry[]>;
  data?: PlayerProfile[];
  openData?: PlayerProfile[];
  settersWithImpact?: SetterProfile[];
  teamsAggregated?: TeamsAggregated;
  playerLB_AT?: GenderedPlayerMap;
  playerLB_OP?: GenderedPlayerMap;
  playerLB_2026?: GenderedPlayerMap;
}
