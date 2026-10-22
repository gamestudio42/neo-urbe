import type { Department } from '../balance/balance';
import type { DisasterKind } from '../commands/commands';
import type { ZoneBuildingKind } from './buildings';

export type RciValues = Record<ZoneBuildingKind, number>;

export const EXPENSE_CATEGORIES = [
  'transport',
  'power',
  'water',
  'police',
  'fire',
  'health',
  'education',
  'parks',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface MonthlyReport {
  revenue: RciValues;
  expenses: Record<ExpenseCategory, number>;
  /** One-off construction spending during the month (not part of `net`). */
  construction: number;
  net: number;
}

export interface EconomyState {
  funds: number;
  /** Construction spending accumulated since the last monthly report. */
  constructionThisMonth: number;
  taxes: RciValues;
  funding: Record<Department, number>;
  lastMonth: MonthlyReport;
  monthsInDebt: number;
  bankrupt: boolean;
}

export interface ActiveDisaster {
  kind: DisasterKind;
  remainingTicks: number;
  x: number;
  y: number;
  /** Building affected by a blackout, or 0. */
  targetId: number;
}

export interface UtilityStats {
  supply: number;
  demand: number;
  /** Fraction of consumer buildings served, 0..1. */
  served: number;
}

export interface CityStats {
  name: string;
  /** Rules this city runs; the UI hides neon-only tools for `classic`. */
  ruleset: 'classic' | 'neon';
  tick: number;
  day: number;
  month: number;
  year: number;
  funds: number;
  population: number;
  housingCapacity: number;
  workforce: number;
  jobs: RciValues;
  employed: RciValues;
  unemployment: number;
  demand: RciValues;
  taxes: RciValues;
  funding: Record<Department, number>;
  lastMonth: MonthlyReport;
  power: UtilityStats;
  water: UtilityStats;
  avgCongestion: number;
  averages: { pollution: number; crime: number; landValue: number };
  coverage: { police: number; fire: number; health: number; education: number };
  counts: {
    roads: number;
    residential: number;
    commercial: number;
    industrial: number;
    abandoned: number;
    services: number;
    plants: number;
  };
  monthsInDebt: number;
  bankrupt: boolean;
  activeFires: number;
  disasters: ActiveDisaster[];
  disastersEnabled: boolean;
  edgeConnected: boolean;
  /** Neon-only telemetry; absent in a classic city. */
  neon?: {
    /** Districts above the grid overload threshold. */
    overloaded: number;
    /** Battery banks and their mean charge 0..1. */
    batteries: { banks: number; charge: number };
    /** Share of services under firewall cover 0..1. */
    firewall: number;
    /** Online drone ports. */
    dronePorts: number;
    /** Corporations and their total holdings. */
    corporations: { count: number; holdings: number };
    /** Cash corporations moved out of the treasury. */
    skimmed: number;
    /** Data network: bandwidth supply, demand and the share of consumers served. */
    data: { supply: number; demand: number; served: number };
  };
}

export interface HistoryEntry {
  month: number;
  population: number;
  funds: number;
  jobs: number;
  demandR: number;
  demandC: number;
  demandI: number;
  revenue: number;
  expenses: number;
  pollution: number;
  crime: number;
  landValue: number;
}

export type SimEvent =
  | { type: 'fireStarted'; x: number; y: number }
  | { type: 'buildingDestroyed'; x: number; y: number; cause: 'fire' | 'flood' | 'earthquake' }
  | { type: 'disasterStarted'; disaster: DisasterKind; x: number; y: number }
  | { type: 'disasterEnded'; disaster: DisasterKind }
  | { type: 'brownout' }
  | { type: 'waterShortage' }
  | { type: 'debt'; months: number }
  | { type: 'bankrupt' }
  | { type: 'recovered' }
  | { type: 'milestone'; population: number }
  | { type: 'newYear'; year: number }
  // Neo ruleset only.
  | { type: 'gridOverload'; x: number; y: number }
  | { type: 'cascadeBlackout'; x: number; y: number; tiles: number }
  | { type: 'corpPurchase'; corp: number; x: number; y: number }
  | { type: 'intrusion'; x: number; y: number; kind: string; blocked: boolean }
  | { type: 'droneLane'; x: number; y: number };

export type ProblemCode =
  | 'NO_ZONE'
  | 'NO_ROAD'
  | 'NO_POWER'
  | 'BROWNOUT'
  | 'NO_WATER_FOR_LEVEL'
  | 'LOW_DEMAND'
  | 'NO_JOB_ACCESS'
  | 'NO_CUSTOMERS'
  | 'NO_WORKERS'
  | 'POLLUTION'
  | 'CRIME'
  | 'LOW_LAND_VALUE'
  | 'CONGESTION'
  | 'HIGH_TAXES'
  | 'SLOPE'
  | 'ABANDONED'
  | 'ON_FIRE'
  | 'RUBBLE'
  | 'FLOODED'
  | 'MAX_LEVEL'
  | 'GROWING'
  // Neo ruleset only.
  | 'GRID_OVERLOAD'
  | 'CORP_OWNED'
  | 'HACKED'
  | 'NO_FIREWALL'
  | 'DRONE_PORT'
  | 'NO_DATA';

export interface Problem {
  code: ProblemCode;
  /** 0 = info, 1 = minor, 2 = major, 3 = blocking. */
  severity: 0 | 1 | 2 | 3;
}
