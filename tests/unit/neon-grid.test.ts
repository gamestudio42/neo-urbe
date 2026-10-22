import { BALANCE, NEON_GRID, NEON_VERTICAL, PLACEABLE_SPECS } from '@city/shared';
import {
  batterySummary,
  createEngine,
  isOverloaded,
  neonCapacity,
  neonMaxLevel,
  SimulationEngine,
} from '@city/simulation';
import { describe, expect, it } from 'vitest';

/** A flat neon city with a road, a coal plant and a few dense residential lots. */
function neonTown(size = 40): SimulationEngine {
  const e = createEngine({
    seed: 'neon-grid',
    size,
    name: 'Neon',
    ruleset: 'neon',
    terrain: { flat: true, water: 0, hills: 0, forest: 0, rivers: 0 },
    funds: 200_000,
  });
  e.disastersEnabled = false;
  e.execute({ type: 'road', x0: 4, y0: 10, x1: 30, y1: 10 });
  e.execute({ type: 'place', kind: 'coalPlant', x: 6, y: 12 });
  return e;
}

describe('neon power grid', () => {
  it('keeps a lightly loaded component out of overload', () => {
    const e = neonTown();
    e.runMonths(2);
    expect(e.neon.overloaded).toEqual([]);
    expect(isOverloaded(e, e.world.index(10, 10))).toBe(false);
  });

  it('adds substation supply to the solved grid', () => {
    const e = neonTown();
    e.refreshUtilities();
    const before = e.stats().power.supply;
    expect(e.execute({ type: 'place', kind: 'substation', x: 9, y: 12 }).ok).toBe(true);
    e.refreshUtilities();
    expect(e.stats().power.supply).toBe(before + NEON_GRID.substationSupply);
  });

  it('charges an idle battery bank and reports it', () => {
    const e = neonTown();
    // The coal plant footprint is 3x3 at (6,12); the bank sits on its east edge.
    expect(e.execute({ type: 'place', kind: 'battery', x: 9, y: 12 }).ok).toBe(true);
    e.runMonths(1);
    e.refreshUtilities();
    const summary = batterySummary(e);
    expect(summary.banks).toBe(1);
    expect(summary.charge).toBeGreaterThan(0);
  });

  it('marks a component as overloaded past the threshold', () => {
    const e = createEngine({
      seed: 'overload',
      size: 32,
      ruleset: 'neon',
      terrain: { flat: true, water: 0, hills: 0, forest: 0, rivers: 0 },
      funds: 400_000,
    });
    e.disastersEnabled = false;
    // One turbine at its rated output feeding a row of nodes that together ask for all of it.
    expect(e.execute({ type: 'place', kind: 'windTurbine', x: 4, y: 4 }).ok).toBe(true);
    for (let x = 5; x < 32; x++)
      expect(e.execute({ type: 'place', kind: 'firewall', x, y: 4 }).ok).toBe(true);
    e.refreshUtilities();
    const power = e.stats().power;
    expect(power.supply).toBe(60);
    expect(power.demand / power.supply).toBeGreaterThanOrEqual(NEON_GRID.overloadThreshold);
    expect(e.neon.overloaded.length).toBe(1);
    expect(isOverloaded(e, e.world.index(10, 4))).toBe(true);
    expect(isOverloaded(e, e.world.index(28, 4))).toBe(false);
  });

  it('is deterministic for the same seed and commands', () => {
    const a = neonTown();
    const b = neonTown();
    a.runMonths(4);
    b.runMonths(4);
    expect(a.stats()).toEqual(b.stats());
  });
});

describe('neon vertical density', () => {
  it('raises the level cap but keeps the classic cap for a classic city', () => {
    expect(neonMaxLevel(2, true, false, 5)).toBe(BALANCE.zones.maxLevelDense);
    expect(neonMaxLevel(2, true, true, 5)).toBe(NEON_VERTICAL.maxLevelDense);
    expect(neonMaxLevel(1, false, true, 2)).toBeLessThanOrEqual(2);
  });

  it('extrapolates capacity past the classic table', () => {
    const classic = 400;
    expect(neonCapacity('residential', 6)).toBeGreaterThan(classic);
    // Level 5 still reads the classic number exactly.
    expect(neonCapacity('residential', 5)).toBe(classic);
  });

  it('keeps the neon-only placeables out of the classic spec costs', () => {
    expect(PLACEABLE_SPECS.substation.powerSupply).toBeGreaterThan(0);
    expect(PLACEABLE_SPECS.battery.cost).toBeGreaterThan(0);
  });
});
