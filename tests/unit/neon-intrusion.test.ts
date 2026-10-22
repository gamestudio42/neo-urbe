import { NEON_INTRUSION, PLACEABLE_SPECS, isZoneKind, type BuildingRecord } from '@city/shared';
import {
  activeIntrusion,
  buildTown,
  cityFirewallCoverage,
  createEngine,
  firewallCoverage,
  tickIntrusions,
  updateIntrusions,
  type SimulationEngine,
} from '@city/simulation';
import { describe, expect, it } from 'vitest';

/**
 * A flat neon city with the standard town plus a corporate HQ, which is the simplest building
 * the intrusion pass can target: a non-zone service with jobs in the neon ruleset.
 */
function hackTown(seed = 'neon-hack'): SimulationEngine {
  const e = createEngine({
    seed,
    size: 64,
    ruleset: 'neon',
    terrain: { flat: true, water: 0, hills: 0, forest: 0, rivers: 0 },
    funds: 400_000,
  });
  e.disastersEnabled = false;
  buildTown(e);
  const hq = e.execute({ type: 'place', kind: 'corpHQ', x: 38, y: 21 });
  expect(hq.ok).toBe(true);
  e.refreshUtilities();
  return e;
}

/**
 * An edge node beside a firewall. The node only counts once it is on the data network,
 * so coverage tests place this after the node and before they expect a radius.
 */
function linkFirewall(e: SimulationEngine, x: number, y: number): void {
  const spots: Array<[number, number]> = [
    [x + 1, y],
    [x - 1, y],
    [x, y + 1],
    [x, y - 1],
  ];
  for (const [sx, sy] of spots) {
    if (sx < 0 || sy < 0) continue;
    if (e.execute({ type: 'place', kind: 'edgeNode', x: sx, y: sy }).ok) return;
  }
  throw new Error(`no tile for an edge node beside the firewall at ${x},${y}`);
}

/** The corporate HQ, the service the intrusion pass can target. */
function serviceOf(e: SimulationEngine): BuildingRecord | undefined {
  return [...e.buildings.values()].find(
    (b) => !isZoneKind(b.kind) && !b.abandoned && PLACEABLE_SPECS[b.kind].jobs > 0,
  );
}

describe('neon intrusions', () => {
  it('only rolls once per month', () => {
    const e = hackTown();
    const first = updateIntrusions(e);
    const second = updateIntrusions(e);
    expect(first.attempts).toBeLessThanOrEqual(1);
    expect(second).toEqual({ attempts: 0, blocked: 0, offline: 0 });
  });

  it('attempts intrusions across seeds and never exceeds one attempt per month', () => {
    let attempts = 0;
    for (let seed = 0; seed < 30; seed++) {
      const e = hackTown(`hack-${seed}`);
      attempts += updateIntrusions(e).attempts;
    }
    expect(attempts).toBeGreaterThan(0);
    expect(attempts).toBeLessThanOrEqual(30);
    expect(NEON_INTRUSION.maxChance).toBeLessThanOrEqual(1);
  });

  it('takes a hacked service offline for the configured window', () => {
    const e = hackTown();
    const service = serviceOf(e);
    expect(service).toBeDefined();
    if (!service) return;
    service.offline = NEON_INTRUSION.offlineTicks;
    e.neon.intrusions.push({
      buildingId: service.id,
      ticks: NEON_INTRUSION.offlineTicks,
      firewall: 0,
      kind: 'ransom',
    });
    expect(activeIntrusion(e, service.id)).toBe(true);
    for (let k = 0; k < NEON_INTRUSION.offlineTicks; k++) tickIntrusions(e);
    expect(activeIntrusion(e, service.id)).toBe(false);
    expect(service.offline).toBe(0);
  });

  it('measures firewall coverage from a powered node inside the radius', () => {
    const e = hackTown();
    const service = serviceOf(e);
    expect(service).toBeDefined();
    if (!service) return;
    expect(firewallCoverage(e, service)).toBe(0);
    expect(e.execute({ type: 'place', kind: 'firewall', x: service.x, y: service.y + 3 }).ok).toBe(
      true,
    );
    e.refreshUtilities();
    expect(firewallCoverage(e, service)).toBe(0);
    linkFirewall(e, service.x, service.y + 3);
    e.refreshUtilities();
    expect(firewallCoverage(e, service)).toBeGreaterThan(0);
    expect(firewallCoverage(e, service)).toBeLessThanOrEqual(1);
  });

  it('ignores firewall nodes that are offline', () => {
    const e = hackTown();
    const service = serviceOf(e);
    expect(service).toBeDefined();
    if (!service) return;
    e.execute({ type: 'place', kind: 'firewall', x: service.x, y: service.y + 3 });
    linkFirewall(e, service.x, service.y + 3);
    e.refreshUtilities();
    const node = e.buildings.ofKind('firewall')[0];
    expect(node).toBeDefined();
    if (!node) return;
    expect(firewallCoverage(e, service)).toBeGreaterThan(0);
    node.offline = 10;
    expect(firewallCoverage(e, service)).toBe(0);
  });

  it('ignores firewall nodes outside the radius', () => {
    const e = hackTown();
    const service = serviceOf(e);
    expect(service).toBeDefined();
    if (!service) return;
    const far = NEON_INTRUSION.firewallRadius + 4;
    expect(e.execute({ type: 'place', kind: 'firewall', x: service.x + far, y: service.y }).ok).toBe(
      true,
    );
    linkFirewall(e, service.x + far, service.y);
    e.refreshUtilities();
    expect(firewallCoverage(e, service)).toBe(0);
  });

  it('reports city-wide coverage between zero and one', () => {
    const e = hackTown();
    const coverage = cityFirewallCoverage(e);
    expect(coverage).toBeGreaterThanOrEqual(0);
    expect(coverage).toBeLessThanOrEqual(1);
  });

  it('is deterministic for the same seed', () => {
    const a = hackTown('hack-same');
    const b = hackTown('hack-same');
    a.runMonths(12);
    b.runMonths(12);
    expect(a.neon.intrusions).toEqual(b.neon.intrusions);
    expect(a.neon.blocked).toBe(b.neon.blocked);
  });

  it('stays silent in the classic ruleset', () => {
    const e = createEngine({
      seed: 'classic-hack',
      size: 64,
      terrain: { flat: true, water: 0, hills: 0, forest: 0, rivers: 0 },
      funds: 400_000,
    });
    e.disastersEnabled = false;
    buildTown(e);
    e.runMonths(12);
    expect(e.neon.intrusions).toEqual([]);
    expect(e.neon.blocked).toBe(0);
  });
});
