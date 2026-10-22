/** Persisted state of the neon ruleset systems. Plain data, serialized with the snapshot. */

/** One megacorporation: an autonomous land buyer with a war chest and a taste for a district. */
export interface Corporation {
  id: number;
  name: string;
  /** Cash available for land purchases. */
  capital: number;
  /** Preferred quadrant of the map: 0 north-west, 1 north-east, 2 south-west, 3 south-east. */
  quadrant: number;
  /** Lots bought so far, for the UI and diagnostics. */
  holdings: number;
}

/** A battery bank's stored energy, 0..1 of its rated capacity. */
export interface BatteryState {
  buildingId: number;
  /** Fraction of a full charge. */
  charge: number;
}

/** A live intrusion against one service building. */
export interface Intrusion {
  /** Building under attack. */
  buildingId: number;
  /** Ticks the service stays offline. */
  ticks: number;
  /** Firewall coverage at the moment of the attack, 0..1 (for diagnostics). */
  firewall: number;
  /** Intrusion flavour: `ransom`, `wipe` or `spoof`. */
  kind: string;
}

/** Persisted state of every neon system. */
export interface NeonState {
  corporations: Corporation[];
  batteries: BatteryState[];
  intrusions: Intrusion[];
  /** Anchor tile index of districts currently overloaded. */
  overloaded: number[];
  /** Month index of the last corporate expansion, so it happens once a month. */
  lastCorpMonth: number;
  /** Month index of the last intrusion roll. */
  lastIntrusionMonth: number;
  /** Total cash the corporations have taken from the city. */
  skimmed: number;
  /** Intrusions blocked by a firewall, for the report and diagnostics. */
  blocked: number;
}

export const CORP_NAMES = [
  'Kirin Dynamics',
  'Zaibatsu Nine',
  'Helix Combine',
  'Onyx Holdings',
  'Sable Systems',
] as const;

export function defaultNeonState(): NeonState {
  return {
    corporations: [],
    batteries: [],
    intrusions: [],
    overloaded: [],
    lastCorpMonth: -1,
    lastIntrusionMonth: -1,
    skimmed: 0,
    blocked: 0,
  };
}
