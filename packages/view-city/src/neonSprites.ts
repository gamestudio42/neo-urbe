import type { Graphics } from 'pixi.js';
import { color, shade, type Theme } from '@theme/core';
import { TILE_H, TILE_W, type Point } from './iso';
import { Frame, poly } from './isoFrame';

/** Screen offset of a ground offset in grid units. */
function iso(gx: number, gy: number): Point {
  return { x: (gx - gy) * (TILE_W / 2), y: (gx + gy) * (TILE_H / 2) };
}

/**
 * Neon-only placeables and the aerial drones that fly between them.
 *
 * Every shape reads its colours from the theme, so the same drawing serves any cyberpunk skin;
 * the palette decides whether a substation reads as wet steel or as painted concrete.
 */

// ---------------------------------------------------------------------------------------------
// Power grid: substation and battery bank.

/** Step-up substation: fenced compound, transformer blocks, gantry and a lit busbar. */
export function drawSubstation(g: Graphics, theme: Theme): void {
  const f = new Frame(2);
  const wall = color(theme, 'substation.wall');
  const roof = color(theme, 'substation.roof');
  const coil = color(theme, 'substation.coil');
  const arc = color(theme, 'substation.arc');
  const bus = color(theme, 'substation.busbar');

  f.quad(g, 0.06, 0.06, 1.94, 1.94, shade(color(theme, 'ground.skirt'), 0.9));

  // Fence around the compound.
  const fence = shade(coil, 0.62);
  f.line(g, f.p(0.1, 0.1), f.p(1.9, 0.1), 1, fence, 9, 0.5);
  f.line(g, f.p(0.1, 0.1), f.p(0.1, 1.9), 1, fence, 9, 0.5);
  for (const [u, v] of [
    [0.1, 0.1],
    [1.9, 0.1],
    [0.1, 1.9],
  ] as const) {
    f.post(g, u, v, 9, fence, 1.2);
  }

  // Transformer blocks with cooling fins and roof bushings.
  f.box(g, [0.2, 1.05, 0.95, 1.7], 0, 13, wall, roof);
  f.box(g, [1.05, 1.05, 1.75, 1.7], 0, 13, shade(wall, 1.06), shade(roof, 1.2));
  for (let k = 0; k < 4; k++) {
    const u = 0.3 + k * 0.16;
    f.line(g, f.p(u, 1.68), f.p(u, 1.72), 1.2, shade(wall, 0.7), 10, 0.8);
  }
  for (const [u, v] of [
    [0.38, 1.2],
    [0.7, 1.5],
    [1.2, 1.2],
    [1.55, 1.5],
  ] as const) {
    const tip = f.post(g, u, v, 11, coil, 3, 13);
    g.circle(tip.x, tip.y, 2).fill(shade(coil, 1.15));
  }

  // Gantry over the blocks: two legs, a cross beam and the glowing busbar.
  const legA = f.post(g, 0.35, 0.35, 34, shade(coil, 0.8), 2.4);
  const legB = f.post(g, 1.65, 0.35, 34, shade(coil, 0.72), 2.4);
  g.moveTo(legA.x, legA.y + 2)
    .lineTo(legB.x, legB.y + 2)
    .stroke({ width: 2.2, color: shade(coil, 0.78) });
  f.trim(g, { x: legA.x, y: legA.y - 2 }, { x: legB.x, y: legB.y - 2 }, 1.8, bus, 0.95);
  for (const t of [0.3, 0.55, 0.8]) {
    const x = legA.x + (legB.x - legA.x) * t;
    const y = legA.y + (legB.y - legA.y) * t;
    g.moveTo(x, y)
      .lineTo(x, y + 9)
      .stroke({ width: 1.2, color: coil, alpha: 0.85 });
  }

  // Control cabinet with a lit status strip.
  f.box(g, [0.15, 0.15, 0.65, 0.7], 0, 16, shade(wall, 0.9), roof);
  f.trimAt(g, f.p(0.65, 0.25), f.p(0.65, 0.6), 11, 1.4, arc, 0.95);

  // Electric arcs crawling between the bushings.
  for (const [[ua, va], [ub, vb]] of [
    [
      [0.38, 1.2],
      [1.2, 1.2],
    ],
    [
      [0.7, 1.5],
      [1.55, 1.5],
    ],
  ] as const) {
    const p0 = f.p(ua, va, 22);
    const p1 = f.p(ub, vb, 22);
    g.moveTo(p0.x, p0.y)
      .lineTo((p0.x + p1.x) / 2, (p0.y + p1.y) / 2 - 4)
      .lineTo(p1.x, p1.y)
      .stroke({ width: 1.2, color: arc, alpha: 0.8 });
  }
}

/** Battery bank: rows of cells, a lit charge column and a hazard strip. */
export function drawBattery(g: Graphics, theme: Theme): void {
  const f = new Frame(1);
  const wall = color(theme, 'battery.wall');
  const roof = color(theme, 'battery.roof');
  const cell = color(theme, 'battery.cell');
  const charge = color(theme, 'battery.charge');
  const strip = color(theme, 'battery.strip');

  f.quad(g, 0.04, 0.04, 0.96, 0.96, shade(color(theme, 'ground.skirt'), 0.9));
  f.box(g, [0.12, 0.12, 0.88, 0.88], 0, 15, wall, roof);
  // Cell racks on the front wall.
  for (let k = 0; k < 3; k++) {
    const u0 = 0.2 + k * 0.22;
    f.quad(g, u0, 0.88, u0 + 0.14, 0.88, cell, 2);
    f.quad(g, u0, 0.88, u0 + 0.14, 0.88, cell, 8);
  }
  // Charge column on the right corner, base to roof.
  const a = f.p(0.82, 0.2);
  f.trim(g, a, { x: a.x, y: a.y - 15 }, 3.2, charge, 0.95);
  const top = f.p(0.5, 0.5, 15);
  g.circle(top.x, top.y, 3.4).fill(shade(cell, 1.15));
  g.circle(top.x, top.y, 1.8).fill(charge);
  f.line(g, f.p(0.14, 0.86), f.p(0.86, 0.86), 1.4, strip, 1.5, 0.8);
}

/** Firewall: a windowless secure rack, dish uplink and magenta status LEDs. */
export function drawFirewall(g: Graphics, theme: Theme): void {
  const f = new Frame(1);
  const wall = color(theme, 'firewall.wall');
  const roof = color(theme, 'firewall.roof');
  const rack = color(theme, 'firewall.rack');
  const led = color(theme, 'firewall.led');
  const dish = color(theme, 'firewall.dish');

  f.quad(g, 0.04, 0.04, 0.96, 0.96, shade(color(theme, 'ground.skirt'), 0.9));
  f.box(g, [0.18, 0.18, 0.82, 0.82], 0, 18, wall, roof);
  // Server racks visible through the open front face.
  for (let k = 0; k < 2; k++) {
    const u0 = 0.26 + k * 0.28;
    f.quad(g, u0, 0.82, u0 + 0.2, 0.82, rack, 2);
    f.quad(g, u0, 0.82, u0 + 0.2, 0.82, rack, 14);
  }
  // The only light on the building: a column of status LEDs.
  for (let k = 0; k < 4; k++) {
    f.trimAt(g, f.p(0.84, 0.28), f.p(0.84, 0.5), 4 + k * 3.4, 1.2, led, 0.95);
  }
  // Dish on the roof.
  const base = f.p(0.42, 0.42, 18);
  g.rect(base.x - 1, base.y - 9, 2, 9).fill(shade(wall, 0.8));
  g.ellipse(base.x, base.y - 10, 6, 3.4).fill(shade(dish, 0.85));
  g.ellipse(base.x, base.y - 11, 4, 2.2).fill(dish);
  g.rect(base.x + 1, base.y - 16, 1.2, 6).fill(shade(dish, 0.7));
}

// ---------------------------------------------------------------------------------------------
// Aerial layer: drone port.

/** Landing-pad deck on stilts, control tower and the parked drone on the pad. */
export function drawDronePort(g: Graphics, theme: Theme): void {
  const f = new Frame(2);
  const deck = color(theme, 'dronePort.deck');
  const edge = color(theme, 'dronePort.deckEdge');
  const pad = color(theme, 'dronePort.pad');
  const ring = color(theme, 'dronePort.padRing');
  const beacon = color(theme, 'dronePort.beacon');
  const tower = color(theme, 'dronePort.tower');
  const lamp = color(theme, 'dronePort.towerLamp');

  // Deck on stilts, so the port reads as an airfield above the street.
  f.quad(g, 0.06, 0.06, 1.94, 1.94, shade(deck, 0.7));
  for (const [u, v] of [
    [0.25, 0.25],
    [1.75, 0.25],
    [0.25, 1.75],
    [1.75, 1.75],
  ] as const) {
    f.post(g, u, v, 16, shade(tower, 0.85), 2.6);
  }
  f.quad(g, 0.1, 0.1, 1.9, 1.9, deck, 16);
  f.quad(g, 0.14, 0.14, 1.86, 1.86, pad, 16.4);
  f.trimAt(g, f.p(0.1, 0.1), f.p(1.9, 0.1), 16, 1.6, edge);
  f.trimAt(g, f.p(1.9, 0.1), f.p(1.9, 1.9), 16, 1.6, edge);
  f.trimAt(g, f.p(0.1, 1.9), f.p(1.9, 1.9), 16, 1.6, edge);

  // Landing circle and the H marking painted on it.
  const c = f.p(1.15, 1.15, 16.5);
  g.ellipse(c.x, c.y, 22, 11).stroke({ width: 2, color: ring, alpha: 0.9 });
  g.ellipse(c.x, c.y, 14, 7).stroke({ width: 1.4, color: ring, alpha: 0.55 });
  g.moveTo(c.x - 6, c.y - 4)
    .lineTo(c.x - 6, c.y + 4)
    .moveTo(c.x + 6, c.y - 4)
    .lineTo(c.x + 6, c.y + 4)
    .moveTo(c.x - 6, c.y)
    .lineTo(c.x + 6, c.y)
    .stroke({ width: 2, color: ring, alpha: 0.8 });

  // Corner beacons on the deck rim.
  for (const [u, v] of [
    [0.16, 0.16],
    [1.84, 0.16],
    [0.16, 1.84],
    [1.84, 1.84],
  ] as const) {
    const p = f.p(u, v, 16);
    g.rect(p.x - 1, p.y - 4, 2, 4).fill(shade(edge, 0.6));
    g.circle(p.x, p.y - 5, 4.4).fill({ color: beacon, alpha: 0.22 });
    g.circle(p.x, p.y - 5, 2).fill(beacon);
  }

  // Control tower at the back corner with its antenna.
  f.box(g, [0.14, 0.14, 0.62, 0.62], 16, 26, tower, shade(tower, 0.72), {
    color: lamp,
    rows: 2,
  });
  const spire = f.post(g, 0.38, 0.38, 18, shade(tower, 0.8), 2, 42);
  g.circle(spire.x, spire.y, 5).fill({ color: lamp, alpha: 0.18 });
  g.circle(spire.x, spire.y, 2.2).fill(lamp);

  // Parked drone waiting on the pad.
  drawDrone(g, theme, { x: c.x, y: c.y - 3 }, 0, 1, 0, 0.45);
}

// ---------------------------------------------------------------------------------------------
// Corporate HQ.

/** Corporate tower: dark glass slab, stacked setbacks, magenta crown and a lit sign. */
export function drawCorpHQ(g: Graphics, theme: Theme): void {
  const f = new Frame(2);
  const wall = color(theme, 'corpHQ.wall');
  const roof = color(theme, 'corpHQ.roof');
  const window = color(theme, 'corpHQ.window');
  const trim = color(theme, 'corpHQ.trim');
  const sign = color(theme, 'corpHQ.sign');
  const signGlow = color(theme, 'corpHQ.signGlow');
  const spire = color(theme, 'corpHQ.spire');
  const beacon = color(theme, 'corpHQ.beacon');

  // Plaza with a reflecting pool.
  f.quad(g, 0.02, 0.02, 1.98, 1.98, shade(color(theme, 'ground.skirt'), 1.05));
  const pool = f.p(0.5, 1.72);
  g.ellipse(pool.x, pool.y, 20, 9).fill(shade(color(theme, 'park.pond'), 0.6));
  g.ellipse(pool.x, pool.y, 20, 9).stroke({ width: 1, color: trim, alpha: 0.5 });

  // Podium, then two setbacks so the silhouette steps back from the street.
  f.box(g, [0.18, 0.18, 1.82, 1.82], 0, 16, shade(wall, 0.82), roof, {
    color: window,
    rows: 1,
  });
  f.trimAt(g, f.p(0.18, 1.82), f.p(1.82, 1.82), 14, 1.6, trim, 0.85);
  f.box(g, [0.3, 0.3, 1.7, 1.7], 16, 42, wall, roof, { color: window, rows: 7 });
  // Vertical light strips on both visible faces.
  for (const u of [0.46, 0.78, 1.1, 1.42]) {
    f.trimAt(g, f.p(u, 1.7), f.p(u, 1.7), 18, 1.2, trim, 0.7);
    f.line(g, f.p(u, 1.7), f.p(u, 1.7), 1.2, trim, 56, 0.5);
  }
  for (const v of [0.46, 0.78, 1.1, 1.42]) {
    f.line(g, f.p(1.7, v), f.p(1.7, v), 1.2, trim, 18, 0.55);
    f.line(g, f.p(1.7, v), f.p(1.7, v), 1.2, trim, 56, 0.4);
  }
  f.box(g, [0.52, 0.52, 1.48, 1.48], 58, 26, shade(wall, 1.05), roof, {
    color: window,
    rows: 4,
  });

  // Crown: an overhanging cap carrying the corporate sign.
  const cap = f.p(1.0, 1.0, 84);
  g.rect(cap.x - 26, cap.y - 6, 52, 6).fill(shade(trim, 0.8));
  g.rect(cap.x - 26, cap.y - 7.5, 52, 2).fill(signGlow);
  const plate = f.p(1.0, 1.0, 92);
  g.circle(plate.x, plate.y - 5, 16).fill({ color: sign, alpha: 0.14 });
  g.rect(plate.x - 14, plate.y - 10, 28, 10).fill(sign);
  g.rect(plate.x - 12, plate.y - 8.6, 24, 7.2).fill(shade(signGlow, 0.55));

  // Antenna mast with the aircraft warning beacon.
  const mast = f.post(g, 1.0, 1.0, 26, spire, 2.2, 84);
  g.moveTo(mast.x - 5, mast.y + 9)
    .lineTo(mast.x, mast.y)
    .lineTo(mast.x + 5, mast.y + 9)
    .stroke({ width: 1.2, color: shade(spire, 0.8), alpha: 0.8 });
  g.circle(mast.x, mast.y, 5.6).fill({ color: beacon, alpha: 0.2 });
  g.circle(mast.x, mast.y, 2.4).fill(beacon);
}

// ---------------------------------------------------------------------------------------------
// Drones.

/** Body length of a drone in tiles, used to size its shadow and its hit area. */
export const DRONE_SIZE = 0.62;

/**
 * Flying drones are half the previous flight scale: small craft above the street, not the size
 * of the pad they leave.
 */
export const DRONE_FLIGHT_SCALE = 0.925;

/**
 * Quadcopter seen from above, centred on `origin` and lifted by `z` pixels. `spin` is the rotor
 * angle in radians; `glow` scales the thruster light, so a parked drone can be dimmer.
 */
export function drawDrone(
  g: Graphics,
  theme: Theme,
  origin: Point,
  spin: number,
  scale = 1,
  z = 0,
  glow = 1,
): void {
  const body = color(theme, 'dronePort.droneBody');
  const trim = color(theme, 'dronePort.droneTrim');
  const light = color(theme, 'dronePort.droneGlow');
  const s = scale;
  const at = (a: number, c: number, lift = 0): Point => {
    const o = iso(a * s, c * s);
    return { x: origin.x + o.x, y: origin.y + o.y - z - lift };
  };
  const rotors = [
    [0.28, 0.28],
    [0.28, -0.28],
    [-0.28, 0.28],
    [-0.28, -0.28],
  ] as const;

  // Arms from the chassis to each rotor.
  for (const [ax, ay] of [
    [1, 1],
    [1, -1],
  ] as const) {
    const a = at(-0.26 * ax, -0.26 * ay);
    const b = at(0.26 * ax, 0.26 * ay);
    g.moveTo(a.x, a.y)
      .lineTo(b.x, b.y)
      .stroke({ width: 2.2 * s, color: trim });
  }
  // Rotor discs with a hint of spin.
  for (const [rx, ry] of rotors) {
    const c = at(rx, ry, 2);
    const rx2 = 7 * s;
    const ry2 = 3.4 * s;
    g.ellipse(c.x, c.y, rx2, ry2).fill({ color: trim, alpha: 0.55 });
    const ca = Math.cos(spin) * rx2;
    const sa = Math.sin(spin) * ry2;
    g.moveTo(c.x - ca, c.y - sa)
      .lineTo(c.x + ca, c.y + sa)
      .stroke({ width: 1, color: shade(trim, 1.5), alpha: 0.5 });
  }
  // Chassis and canopy.
  poly(g, [at(0.22, 0), at(0, 0.13), at(-0.22, 0), at(0, -0.13)], trim);
  poly(g, [at(0.15, 0, 2.5), at(0, 0.09, 2.5), at(-0.15, 0, 2.5), at(0, -0.09, 2.5)], body);
  // Sensor eye and thruster lights.
  const eye = at(0.16, 0, 3);
  g.circle(eye.x, eye.y, 1.6 * s).fill(light);
  for (const [lx, ly] of rotors) {
    const c = at(lx, ly, 1.5);
    g.circle(c.x, c.y, 2.4 * s).fill({ color: light, alpha: 0.28 * glow });
    g.circle(c.x, c.y, 1.1 * s).fill({ color: light, alpha: 0.95 });
  }
}

/** Flat silhouette of a drone, for its shadow on the street. */
export function drawDroneShadow(g: Graphics, theme: Theme, origin: Point, scale = 1): void {
  const shadow = color(theme, 'plane.shadow');
  const s = scale;
  for (const [rx, ry] of [
    [0.24, 0.24],
    [0.24, -0.24],
    [-0.24, 0.24],
    [-0.24, -0.24],
  ] as const) {
    const c = iso(rx * s, ry * s);
    g.ellipse(origin.x + c.x, origin.y + c.y, 7 * s, 3.4 * s).fill({
      color: shadow,
      alpha: 0.5,
    });
  }
  g.ellipse(origin.x, origin.y, 6 * s, 3 * s).fill({ color: shadow, alpha: 0.6 });
}
