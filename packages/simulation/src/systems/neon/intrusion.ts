import {
  NEON_INTRUSION,
  PLACEABLE_SPECS,
  isZoneKind,
  type BuildingRecord,
} from '@city/shared';
import type { SimulationEngine } from '../../engine';
import { monthIndex } from '../../time';

/**
 * Hackers and ICE (neon ruleset).
 *
 * Once a month a city may suffer an intrusion. The chance grows with population and falls with
 * firewall coverage around the target. A successful intrusion takes one service offline for
 * `offlineTicks`, which the utilities pass already respects, and steals cash; a blocked one only
 * emits an event so the player sees the firewall paying off.
 *
 * Target selection and the roll both use `engine.rng`, in building order after the firewall scan.
 */

/** Kinds of attack, purely for flavour and the toast copy. */
export const INTRUSION_KINDS = ['ransom', 'wipe', 'spoof'] as const;
export type IntrusionKind = (typeof INTRUSION_KINDS)[number];

export interface IntrusionResult {
  attempts: number;
  blocked: number;
  offline: number;
}

/** Monthly: one roll for the whole city, then one target among the services. */
export function updateIntrusions(engine: SimulationEngine): IntrusionResult {
  const result: IntrusionResult = { attempts: 0, blocked: 0, offline: 0 };
  const month = monthIndex(engine.tick);
  if (engine.neon.lastIntrusionMonth === month) return result;
  engine.neon.lastIntrusionMonth = month;

  expireIntrusions(engine);
  const population = cityPopulation(engine);
  const chance = Math.min(
    NEON_INTRUSION.maxChance,
    NEON_INTRUSION.baseChance + (population / 1000) * NEON_INTRUSION.populationChance,
  );
  if (!engine.rng.chance(chance)) return result;
  result.attempts++;

  const targets = [...engine.buildings.values()].filter(isServiceTarget);
  if (targets.length === 0) return result;
  const target = targets[engine.rng.range(0, targets.length - 1)] as BuildingRecord;
  const firewall = firewallCoverage(engine, target);
  const blocked = engine.rng.chance(firewall * NEON_INTRUSION.firewallMitigation);
  const kind = INTRUSION_KINDS[engine.rng.int(INTRUSION_KINDS.length)] as IntrusionKind;

  if (blocked) {
    result.blocked++;
    engine.neon.blocked++;
    engine.emit({ type: 'intrusion', x: target.x, y: target.y, kind, blocked: true });
    return result;
  }
  target.offline = Math.max(target.offline, NEON_INTRUSION.offlineTicks);
  engine.buildings.touch(target);
  engine.neon.intrusions.push({
    buildingId: target.id,
    ticks: NEON_INTRUSION.offlineTicks,
    firewall: Math.round(firewall * 1000) / 1000,
    kind,
  });
  const theft = Math.min(NEON_INTRUSION.theft, Math.max(0, engine.economy.funds));
  engine.economy.funds -= theft;
  engine.networksDirty = true;
  result.offline++;
  engine.emit({ type: 'intrusion', x: target.x, y: target.y, kind, blocked: false });
  return result;
}

/** A service has jobs, is not a zone and is not a power plant: only those can be intruded on. */
function isServiceTarget(b: BuildingRecord): boolean {
  if (isZoneKind(b.kind) || b.abandoned) return false;
  return PLACEABLE_SPECS[b.kind].jobs > 0;
}

/**
 * Firewall coverage 0..1 at a building: the best node within `firewallRadius` scaled by its
 * distance, capped at 1. Nodes only cover while they are powered, online and on the data network.
 */
export function firewallCoverage(engine: SimulationEngine, b: BuildingRecord): number {
  let best = 0;
  const radius = NEON_INTRUSION.firewallRadius;
  for (const node of engine.buildings.ofKind('firewall')) {
    if (!node.powered || node.offline > 0 || node.linked !== true) continue;
    const d = Math.max(
      Math.max(node.x - b.x, b.x - (node.x + node.w - 1), 0),
      Math.max(node.y - b.y, b.y - (node.y + node.h - 1), 0),
    );
    if (d > radius) continue;
    best = Math.max(best, 1 - d / (radius + 1));
  }
  return Math.min(1, best);
}

/** City-wide share of services under firewall cover, 0..1 (HUD and diagnostics). */
export function cityFirewallCoverage(engine: SimulationEngine): number {
  let total = 0;
  let covered = 0;
  for (const b of engine.buildings.values()) {
    if (!isServiceTarget(b)) continue;
    total++;
    if (firewallCoverage(engine, b) >= 0.5) covered++;
  }
  return total === 0 ? 0 : Math.round((covered / total) * 1000) / 1000;
}

/** Tick: counts down active intrusions, clearing the ones that expired. */
export function tickIntrusions(engine: SimulationEngine): void {
  if (engine.neon.intrusions.length === 0) return;
  let changed = false;
  for (const intrusion of engine.neon.intrusions) {
    intrusion.ticks--;
    if (intrusion.ticks > 0) continue;
    const b = engine.buildings.get(intrusion.buildingId);
    if (b && b.offline > 0) {
      b.offline = 0;
      engine.buildings.touch(b);
      changed = true;
    }
  }
  engine.neon.intrusions = engine.neon.intrusions.filter((i) => i.ticks > 0);
  if (changed) engine.networksDirty = true;
}

/** Drops intrusions whose building was demolished or destroyed. */
function expireIntrusions(engine: SimulationEngine): void {
  engine.neon.intrusions = engine.neon.intrusions.filter((i) =>
    engine.buildings.get(i.buildingId) !== undefined,
  );
}

function cityPopulation(engine: SimulationEngine): number {
  let total = 0;
  for (const b of engine.buildings.values()) {
    if (b.kind === 'residential' && !b.abandoned) total += b.occupancy;
  }
  return total;
}

/** Diagnostic: is this building currently under an active intrusion? */
export function activeIntrusion(engine: SimulationEngine, id: number): boolean {
  return engine.neon.intrusions.some((i) => i.buildingId === id && i.ticks > 0);
}
