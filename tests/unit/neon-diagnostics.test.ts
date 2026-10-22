import { PLACEABLE_SPECS, isZoneKind, type BuildingRecord } from '@city/shared';
import {
  buildTown,
  createEngine,
  diagnoseTile,
  type SimulationEngine,
} from '@city/simulation';
import { describe, expect, it } from 'vitest';

/**
 * The inspector has to explain a neon failure without asking the worker again. These tests feed
 * the same hints the UI computes from `CityStats.neon` plus the mirrored building.
 */

function neonTown(): SimulationEngine {
  const e = createEngine({
    seed: 'neon-diag',
    size: 64,
    ruleset: 'neon',
    terrain: { flat: true, water: 0, hills: 0, forest: 0, rivers: 0 },
    funds: 400_000,
  });
  e.disastersEnabled = false;
  buildTown(e);
  // The HQ is a service with jobs, so the intrusion hints have a target to describe.
  e.execute({ type: 'place', kind: 'corpHQ', x: 38, y: 21 });
  return e;
}

function serviceOf(e: SimulationEngine): BuildingRecord | undefined {
  return [...e.buildings.values()].find(
    (b) => !isZoneKind(b.kind) && PLACEABLE_SPECS[b.kind].jobs > 0 && b.offline === 0,
  );
}

function codes(
  e: SimulationEngine,
  x: number,
  y: number,
  neon: NonNullable<Parameters<typeof diagnoseTile>[0]['neon']>,
): string[] {
  const s = e.stats();
  return diagnoseTile(
    {
      world: e.world,
      building: (id) => e.buildings.get(id),
      demand: s.demand,
      taxes: s.taxes,
      power: s.power,
      neon,
    },
    x,
    y,
  ).map((p) => p.code);
}

const calm = { overloaded: false, owner: null, hacked: false, unguarded: false, drones: false };

describe('neon diagnostics', () => {
  it('reports a hacked service first', () => {
    const e = neonTown();
    const service = serviceOf(e);
    expect(service).toBeDefined();
    if (!service) return;
    const found = codes(e, service.x, service.y, { ...calm, hacked: true });
    expect(found).toContain('HACKED');
    // Weight 3 outranks every other hint.
    expect(found[0]).toBe('HACKED');
  });

  it('reports an overloaded district', () => {
    const e = neonTown();
    const found = codes(e, 20, 20, { ...calm, overloaded: true });
    expect(found).toContain('GRID_OVERLOAD');
  });

  it('reports corporate ownership', () => {
    const e = neonTown();
    const found = codes(e, 20, 20, { ...calm, owner: '#1' });
    expect(found).toContain('CORP_OWNED');
  });

  it('reports a missing firewall', () => {
    const e = neonTown();
    const found = codes(e, 20, 20, { ...calm, unguarded: true });
    expect(found).toContain('NO_FIREWALL');
  });

  it('adds nothing when the neon hints are calm', () => {
    const e = neonTown();
    const found = codes(e, 20, 20, calm);
    for (const code of ['HACKED', 'GRID_OVERLOAD', 'CORP_OWNED', 'NO_FIREWALL', 'NO_DATA']) {
      expect(found).not.toContain(code);
    }
  });

  it('reports a zoned lot that is not on the data network', () => {
    const e = neonTown();
    // Residential block north of the avenue. The town has water pipes and no fiber yet.
    const found = codes(e, 10, 16, calm);
    expect(found).toContain('NO_DATA');
    const service = serviceOf(e);
    expect(service).toBeDefined();
    if (!service) return;
    expect(codes(e, service.x, service.y, calm)).not.toContain('NO_DATA');
  });

  it('keeps the classic diagnostics free of neon codes', () => {
    const e = createEngine({
      seed: 'classic-diag',
      size: 64,
      terrain: { flat: true, water: 0, hills: 0, forest: 0, rivers: 0 },
      funds: 400_000,
    });
    e.disastersEnabled = false;
    buildTown(e);
    const s = e.stats();
    const found = diagnoseTile(
      {
        world: e.world,
        building: (id) => e.buildings.get(id),
        demand: s.demand,
        taxes: s.taxes,
        power: s.power,
      },
      20,
      20,
    ).map((p) => p.code);
    for (const code of ['HACKED', 'GRID_OVERLOAD', 'CORP_OWNED', 'NO_FIREWALL', 'DRONE_PORT', 'NO_DATA']) {
      expect(found).not.toContain(code);
    }
  });
});
