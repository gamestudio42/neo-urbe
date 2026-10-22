import { NEON_DATA, NEON_VERTICAL, ZONE_SPECS, type ZoneBuildingKind } from '@city/shared';

/**
 * Vertical density (neon ruleset).
 *
 * Classic cities cap a dense zone at level 5. Neon cities let it reach `maxLevelDense` (7) and a
 * light zone `maxLevelLight` (3). Levels 6 and 7 have no row in `ZONE_SPECS`, so capacity and
 * utility demand extrapolate from the classic table with the `NEON_VERTICAL` multipliers.
 *
 * The functions take a `neon` flag instead of the engine so the pure growth helpers can stay free
 * of the engine type, which also keeps them usable from the UI inspector.
 */

/**
 * Highest level a zone may reach, or `classicCap` for a classic city. `density` is the raw
 * `ZoneDensity` value (2 = dense).
 */
export function neonMaxLevel(
  density: number,
  watered: boolean,
  neon: boolean,
  classicCap: number,
  linked = true,
): number {
  if (!neon) return classicCap;
  const cap = density >= 2 ? NEON_VERTICAL.maxLevelDense : NEON_VERTICAL.maxLevelLight;
  if (!watered || !linked) return Math.min(cap, NEON_DATA.maxLevelWithoutData);
  return cap;
}

/** Capacity of a zone at a level, extrapolating past the classic table when needed. */
export function neonCapacity(kind: ZoneBuildingKind, level: number): number {
  const table = ZONE_SPECS[kind].capacity;
  if (level < table.length) return table[level] as number;
  const last = table[table.length - 1] as number;
  const extra = level - (table.length - 1);
  return Math.round(last * NEON_VERTICAL.capacityPerLevel ** extra);
}

/** Power demand of a zone at a level, extrapolating past the classic table. */
export function neonPower(kind: ZoneBuildingKind, level: number): number {
  const table = ZONE_SPECS[kind].power;
  if (level < table.length) return table[level] as number;
  const last = table[table.length - 1] as number;
  const extra = level - (table.length - 1);
  return Math.round(last * NEON_VERTICAL.powerPerLevel ** extra);
}

/** Water demand of a zone at a level, extrapolating past the classic table. */
export function neonWater(kind: ZoneBuildingKind, level: number): number {
  const table = ZONE_SPECS[kind].water;
  if (level < table.length) return table[level] as number;
  const last = table[table.length - 1] as number;
  const extra = level - (table.length - 1);
  return Math.round(last * NEON_VERTICAL.waterPerLevel ** extra);
}

/** Data demand of a zone at a level. Exact on the neon table, extrapolated for spires. */
export function neonData(kind: ZoneBuildingKind, level: number): number {
  const table = NEON_DATA.demand[kind];
  if (level < table.length) return table[level] as number;
  const last = table[table.length - 1] as number;
  const extra = level - (table.length - 1);
  return Math.round(last * NEON_DATA.dataPerLevel ** extra);
}

/**
 * Vertical scale of a lot, 1 for a classic tower and up to ~1.6 for a neon spire. The renderer
 * multiplies a sprite's height by it; nothing in the simulation depends on the number.
 */
export function verticalScale(level: number, neon: boolean): number {
  if (!neon) return 1;
  const extra = Math.max(0, level - 5);
  return Math.round((1 + extra * 0.15) * 100) / 100;
}
