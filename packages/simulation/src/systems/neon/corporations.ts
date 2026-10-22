import {
  CORP_NAMES,
  NEON_CORPS,
  isZoneKind,
  type BuildingRecord,
} from '@city/shared';
import type { SimulationEngine } from '../../engine';
import { monthIndex } from '../../time';

/**
 * Megacorporations (neon ruleset).
 *
 * Each corporation is an agent with cash, a preferred quadrant and a portfolio. Once a month it
 * looks for a vacant lot inside its quadrant and buys it: the lot keeps its kind and level, gains
 * an `owner`, and the corporation stamps extra land value around its new property.
 *
 * Nothing new is spawned, so the classic growth pipeline keeps running untouched; the corporation
 * only takes over lots the city failed to fill.
 */

/** Result of one corporate pass, for the report. */
export interface CorpResult {
  /** Lots bought this month. */
  bought: number;
  /** Corporations founded on this pass (only the first one). */
  founded: number;
  /** Cash the purchases moved out of the city treasury. */
  skimmed: number;
}

/** Founds the corporations once; returns how many were created. */
export function initCorporations(engine: SimulationEngine): number {
  const state = engine.neon;
  if (state.corporations.length > 0) return 0;
  for (let k = 0; k < NEON_CORPS.count; k++) {
    state.corporations.push({
      id: k + 1,
      name: CORP_NAMES[k % CORP_NAMES.length] as string,
      capital: NEON_CORPS.startingCapital,
      quadrant: k % 4,
      holdings: 0,
    });
  }
  return state.corporations.length;
}

/**
 * Monthly: each corporation may buy one vacant lot in its quadrant. Corporations act in id order
 * and scan lots in index order, so the RNG stream stays reproducible for a given seed.
 */
export function updateCorporations(engine: SimulationEngine): CorpResult {
  const result: CorpResult = { bought: 0, founded: 0, skimmed: 0 };
  const month = monthIndex(engine.tick);
  if (engine.neon.corporations.length === 0) result.founded = initCorporations(engine);
  if (engine.neon.lastCorpMonth === month) return result;
  engine.neon.lastCorpMonth = month;

  for (const corp of engine.neon.corporations) {
    if (corp.capital < NEON_CORPS.startingCapital * NEON_CORPS.buyReserve) continue;
    if (!engine.rng.chance(NEON_CORPS.expandChance)) continue;
    const lot = findLot(engine, corp.quadrant);
    if (!lot) continue;
    const price = Math.round(corp.capital * NEON_CORPS.lotPrice);
    corp.capital -= price;
    corp.holdings++;
    lot.owner = corp.id;
    engine.buildings.touch(lot);
    // The premium the corporation charges the city for "redeveloping" the lot.
    const fee = Math.round(price * NEON_CORPS.taxSkim);
    engine.economy.funds -= fee;
    engine.neon.skimmed += fee;
    result.skimmed += fee;
    engine.emit({ type: 'corpPurchase', corp: corp.id, x: lot.x, y: lot.y });
    stampLandValue(engine, lot);
    result.bought++;
  }
  return result;
}

/** First vacant zoned lot in a quadrant: nobody lives or works there yet and no one owns it. */
function findLot(engine: SimulationEngine, quadrant: number): BuildingRecord | null {
  const w = engine.world;
  const half = Math.floor(w.size / 2);
  const minX = quadrant % 2 === 0 ? 0 : half;
  const minY = quadrant < 2 ? 0 : half;
  const maxX = minX + half;
  const maxY = minY + half;
  for (const b of engine.buildings.values()) {
    // Only zoned land is for sale: the city keeps its plants, pumps and network nodes.
    if (!isZoneKind(b.kind)) continue;
    if (b.owner !== undefined || b.abandoned) continue;
    if (b.x < minX || b.y < minY || b.x >= maxX || b.y >= maxY) continue;
    // Homes with people and shops with customers are not for sale; a vacant lot is.
    if (b.occupancy > NEON_CORPS.maxOccupancy) continue;
    if (b.capacity > NEON_CORPS.maxOccupancy && b.occupancy > 2) continue;
    return b;
  }
  return null;
}

/** Adds land value around a corporate lot; the influence pass averages it out again. */
function stampLandValue(engine: SimulationEngine, b: BuildingRecord): void {
  const w = engine.world;
  const radius = NEON_CORPS.landValueRadius;
  for (let y = b.y - radius; y < b.y + b.h + radius; y++) {
    for (let x = b.x - radius; x < b.x + b.w + radius; x++) {
      if (!w.inBounds(x, y)) continue;
      const d = Math.max(
        Math.max(b.x - x, x - (b.x + b.w - 1), 0),
        Math.max(b.y - y, y - (b.y + b.h - 1), 0),
      );
      const add = Math.round(NEON_CORPS.landValue * (1 - d / (radius + 1)));
      if (add <= 0) continue;
      const i = w.index(x, y);
      w.influence.landValue[i] = Math.min(255, (w.influence.landValue[i] as number) + add);
      w.markDirty(i);
    }
  }
}

/** Name of the corporation that owns a lot, or null for city-owned property. */
export function ownerOf(engine: SimulationEngine, b: BuildingRecord): string | null {
  if (b.owner === undefined) return null;
  return engine.neon.corporations.find((c) => c.id === b.owner)?.name ?? null;
}
