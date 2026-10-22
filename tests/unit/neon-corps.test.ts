import { NEON_CORPS, isZoneKind } from '@city/shared';
import {
  buildTown,
  createEngine,
  initCorporations,
  ownerOf,
  type SimulationEngine,
} from '@city/simulation';
import { describe, expect, it } from 'vitest';

/** A flat neon city with the standard grown town, so there are lots and services to take over. */
function corpTown(): SimulationEngine {
  const e = createEngine({
    seed: 'neon-corp',
    size: 64,
    ruleset: 'neon',
    terrain: { flat: true, water: 0, hills: 0, forest: 0, rivers: 0 },
    funds: 400_000,
  });
  e.disastersEnabled = false;
  buildTown(e);
  return e;
}

describe('neon corporations', () => {
  it('founds exactly one set of corporations and never duplicates it', () => {
    const e = corpTown();
    expect(initCorporations(e)).toBe(NEON_CORPS.count);
    expect(initCorporations(e)).toBe(0);
    expect(e.neon.corporations).toHaveLength(NEON_CORPS.count);
    expect(e.neon.corporations.map((c) => c.quadrant)).toEqual([0, 1, 2, 3]);
  });

  it('gives every corporation cash and a preferred quadrant', () => {
    const e = corpTown();
    initCorporations(e);
    for (const corp of e.neon.corporations) {
      expect(corp.capital).toBe(NEON_CORPS.startingCapital);
      expect(corp.quadrant).toBeGreaterThanOrEqual(0);
      expect(corp.quadrant).toBeLessThan(4);
      expect(corp.name.length).toBeGreaterThan(0);
    }
  });

  it('only takes over zoned land, never the city network', () => {
    const e = corpTown();
    e.runMonths(24);
    for (const b of e.buildings.values()) {
      if (b.owner === undefined) continue;
      expect(isZoneKind(b.kind)).toBe(true);
    }
  });

  it('only moves treasury cash when a purchase happens', () => {
    const e = corpTown();
    e.runMonths(24);
    const bought = e.neon.corporations.reduce((sum, c) => sum + c.holdings, 0);
    if (bought === 0) expect(e.neon.skimmed).toBe(0);
    else expect(e.neon.skimmed).toBeGreaterThan(0);
  });

  it('spends corporate capital on every holding it reports', () => {
    const e = corpTown();
    e.runMonths(24);
    for (const corp of e.neon.corporations) {
      expect(corp.capital).toBeLessThanOrEqual(NEON_CORPS.startingCapital);
      if (corp.holdings > 0) expect(corp.capital).toBeLessThan(NEON_CORPS.startingCapital);
    }
  });

  it('reports the owning corporation by name', () => {
    const e = corpTown();
    e.runMonths(24);
    const owned = [...e.buildings.values()].find((b) => b.owner !== undefined);
    expect(owned).toBeDefined();
    if (!owned) return;
    const name = ownerOf(e, owned);
    expect(name).not.toBeNull();
    expect(e.neon.corporations.map((c) => c.name)).toContain(name);
  });

  it('is deterministic for the same seed', () => {
    const a = corpTown();
    const b = corpTown();
    a.runMonths(18);
    b.runMonths(18);
    expect(a.neon.corporations).toEqual(b.neon.corporations);
    expect(a.neon.skimmed).toBe(b.neon.skimmed);
  });

  it('leaves a classic city without corporations', () => {
    const e = createEngine({
      seed: 'classic-corp',
      size: 64,
      terrain: { flat: true, water: 0, hills: 0, forest: 0, rivers: 0 },
      funds: 400_000,
    });
    e.disastersEnabled = false;
    buildTown(e);
    e.runMonths(18);
    expect(e.neon.corporations).toHaveLength(0);
    expect(e.neon.skimmed).toBe(0);
  });
});
