# Neo Urbe ruleset

Neo Urbe is the same city builder as Urbe, running `ruleset: 'neon'`. The classic ruleset is
untouched: every new rule behind this flag has its own unit test in `tests/unit/neon-*.test.ts`,
and the classic suites keep passing with the same hashes for the same seeds.

Constants live in [packages/shared/src/balance/neon.ts](../packages/shared/src/balance/neon.ts).
This document holds the formulas and their provenance.

## How the ruleset is selected

- `EngineOptions.ruleset` (`'classic' | 'neon'`, default `'classic'`) is stored in the snapshot and
  in the save state, so a loaded city keeps playing by its own rules.
- The save envelope is versioned (`SAVE_VERSION = 2`); a v1 file migrates to `ruleset: 'classic'`.
- Neo Urbe writes its own envelope (`neon-city-save`, `.neon.json`), so the two games never import
  each other's files. IndexedDB uses the same `SaveStore` with the neon prefix.
- `pnpm sim --preset neon-balanced` runs the ruleset headless; `pnpm bench` keeps the 128×128
  budget honest.

## 1. Unstable power grid

`packages/simulation/src/systems/neon/grid.ts`, driven by `NEON_GRID`.

The classic solver already finds connected power components and serves them nearest-first. The
neon layer reads the **same** components (`powerNetworkComponents` in `systems/utilities.ts`,
including the hop over a road tile) and adds three failure modes:

| Quantity | Formula |
| --- | --- |
| Component stress | `demand / supply >= overloadThreshold` (0.9) |
| Cascade probability | `cascadeChance` (0.08) per day while short **and** stressed |
| Buildings taken offline | `max(1, round(targets * cascadeShare))`, `cascadeShare = 0.35` |
| Outage length | `cascadeOutageDays * 4` ticks (2 days) |
| Substation supply | `+400` while online |
| Battery discharge | `min(batteryOutput, shortfall / banks)` power, draining `1/240` charge per tick |
| Battery charge | `+1/240` per tick while the component has headroom |

Cascade targets are chosen with `engine.rng` over the component's buildings in id order, skipping
batteries and substations, so a seed plus a command log reproduces every blackout. Overloaded
components are exposed in `CityStats.neon.overloaded` and `isOverloaded()` backs the inspector.

Provenance: **New**. The failure modes are the cyberpunk fantasy; capacity, demand and the
component solver come from the classic model (`Code`).

## 2. Megacorporations

`packages/simulation/src/systems/neon/corporations.ts`, driven by `NEON_CORPS`.

Four corporations exist from the first month, each with starting capital, a preferred quadrant and
a portfolio. Once a month, in id order:

1. Skip the corporation when `capital < startingCapital * buyReserve` (0.35).
2. Roll `expandChance` (0.5) on `engine.rng`.
3. Buy the first vacant **zoned** lot inside its quadrant (index order): no owner, not abandoned,
   `occupancy <= maxOccupancy` (6), and not a full-capacity lot with residents.
4. Pay `round(capital * lotPrice)` (0.18), own the lot, and stamp land value.

The stamp adds `round(landValue * (1 - d / (radius + 1)))` to `influence.landValue` inside
`landValueRadius` (5), capped at 255; the normal influence pass averages it out again. The city
also loses `round(price * taxSkim)` (0.12) to the corporation, tracked in `neon.skimmed`.

Nothing new is spawned, so the classic growth pipeline is untouched; a corporation only takes over
lots the city failed to fill. `BuildingRecord.owner` is optional and ignored by the classic rules.

Provenance: **New**. The land-value stamp reuses the influence model (`Observed`); the agent
behaviour is ours.

## 3. Hackers and ICE

`packages/simulation/src/systems/neon/intrusion.ts`, driven by `NEON_INTRUSION`.

| Quantity | Formula |
| --- | --- |
| Attempt chance | `min(maxChance, baseChance + population/1000 * populationChance)` |
| Base / per 1000 / cap | `0.35` / `0.12` / `0.8` |
| Firewall coverage at a building | `max(1 - d / (radius + 1))` over powered, online, linked nodes, capped at 1 |
| Block chance | `coverage * firewallMitigation` (0.75) |
| Outage | `offlineTicks` (60) |
| Theft | `min(theft, funds)`, `theft = 400` |

Only services (non-zone buildings with jobs) can be targeted. Coverage needs a node that is
**powered, online and on the data network** within `firewallRadius` (6). A firewall with no fiber
to a live source covers nothing. `tickIntrusions` counts the outage down and clears `offline` when it
expires; the utilities pass already treats `offline > 0` as unpowered. Every attempt and every
target uses `engine.rng`, in building order after the firewall scan.

Provenance: **New**. Integration with `SimEvent` (`intrusion`) and the existing `offline` counter
is `Code`.

## 4. Drone air traffic

`packages/simulation/src/systems/neon/airTraffic.ts`, driven by `NEON_DRONES`.

The aerial layer is additive by construction: it never writes the ground `traffic` layer. The
traffic pass reads `droneRelief(engine, roadTiles)` and subtracts it from the congestion it
reports.

| Quantity | Formula |
| --- | --- |
| Capacity | `onlinePorts * perPort` (4) |
| Relief | `relief * min(1, capacity / max(1, roadTiles / 24))`, `relief = 0.15` |
| Lane length | longest straight run of road tiles touching the port, along that road or away from the building, capped at 14 |

A port only counts while powered, online and linked to a data source. The run is measured from every road tile beside the
footprint, so a port on an avenue flies the avenue. Lanes are a derived read model rebuilt for the
renderer (`droneLanes`), so the only serialized state is the port buildings themselves. The
picture in the sky is separate: at most one drone per direction and three in the air, leaving and
returning on the same cadence as marina boats.

Provenance: **New**.

## 5. Vertical density

`packages/simulation/src/systems/neon/vertical.ts`, driven by `NEON_VERTICAL`.

| Quantity | Formula |
| --- | --- |
| Dense level cap | `maxLevelDense` (7) |
| Light level cap | `maxLevelLight` (3) |
| Capacity above the classic table | `classic[5] * capacityPerLevel^(level - 5)`, 1.35 |
| Power above the classic table | `classic[5] * powerPerLevel^(level - 5)`, 1.2 |
| Water above the classic table | `classic[5] * waterPerLevel^(level - 5)`, 1.15 |
| Cap without water or without data | `min(cap, NEON_DATA.maxLevelWithoutData)` which is 2 |

`neonCapacity`, `neonPower` and `neonWater` are exact at or below level 5, so the classic table
stays authoritative and only the extra spires extrapolate. `growth.ts` and `utilities.ts` branch on
`ruleset === 'neon'` and call these functions; the classic path is byte-identical. A neon lot
reaches the tall cap only when it has both water and a data link. Missing either one stops it at
level 2. Attractiveness weights are unchanged.

Provenance: **New** formulas over the `Observed` level caps.

## 6. Data network

`packages/simulation/src/systems/utilities.ts` (the third pass) and `NEON_DATA`. Internet is not a
second network: a tile is online when the data pass marks it served.

The pass runs only when `ruleset === 'neon'`, after power and then water, because a datacenter's
output depends on both. It uses the same nearest-first search as water, including the hop over one
plain road tile. Two road tiles in a row isolate the far side. Conductors are a building footprint
or `Infra.Fiber` (bit 16). An empty zone does not conduct. An empty zoned tile orthogonally next to
a served tile is marked served, the same spread water uses, so a lot can be linked before the first
building appears.

| Quantity | Formula |
| --- | --- |
| Datacenter supply | 800 if powered, online and watered; 150 if powered and online but dry; 0 otherwise |
| Edge node supply | 80 if powered and online; 0 otherwise. No jobs, so it is not an intrusion target |
| Demand at level ≤ 5 | `NEON_DATA.demand[kind][level]`. Level 5 is residential 14, commercial 48, industrial 24 |
| Demand above level 5 | `demand[kind][5] * dataPerLevel^(level - 5)`, `dataPerLevel = 1.4` |
| Level cap without a link | 2, the same ceiling as a lot without water |
| Fiber cost / upkeep | 5 per tile, 0.05 per tile per month, booked on the power line of the budget |

A level-7 shop asks for `round(48 * 1.4^2) = 94`, which is more than one edge node, so the first
block can start on the cheap node and a spire still needs a datacenter. A cooled hall at 500
could not cover the reference town (demand passed 580) and a second hall, at 40 power each,
browned out the coal plant once the spires arrived. One hall calibrated to 800 covers that town
and still draws 40 power and 20 jobs; an intrusion that takes it offline drops its supply to zero.
The edge node draws 4 power and no water.

Fiber is a path tool with the same placement rules as a pipe (it may share a tile with a road, a
power line and a pipe, and it does not refuse a slope or open water). Underground demolish removes
pipe and fiber as separate operations. A classic city rejects the `fiber` command, so the bit stays
zero and the demolish plan never gains a fiber op.

`World.linked` is a `Uint8Array` beside the structure layers. It is written into the snapshot only
when the ruleset is neon, so a classic hash does not gain a layer. `SAVE_VERSION` stays 2: a neon
file that predates the layer loads as zeros and sets `networksDirty`. `BuildingRecord.linked` is
omitted in a classic city. `CityStats.neon.data` reports supply, demand and the served fraction.
The inspector adds `NO_DATA` on a neon tile that is zoned but not linked, and on a firewall or
drone port that is not linked.

Provenance: **New**. The solver, the road hop and the empty-zone spread are `Code` reused from the
water pass.

## Theme, audio and copy

- `@theme/core` holds the colourless `Theme` interface. `@theme/urbe` is the current Urbe palette;
  `@theme/neon` is the cyberpunk palette, its CSS custom properties and its audio parameters.
- `@view/city` never hardcodes a colour: `SpriteFactory`, `chunkDraw` and `AnimationLayer` receive a
  `Theme` in the constructor.
- `apps/neon` wraps `apps/web`'s `App` with `theme={neon} ruleset="neon"` and its own synthwave
  composer (`apps/neon/src/audio/composer.ts`, a pure bar generator tested in
  `tests/unit/neon-music.test.ts`), so the shared board keeps mute and the audio bus.
- Copy lives in the same five catalogues as Urbe; `apps/neon/src/i18n.ts` overrides the labels with
  cyberpunk vocabulary instead of translating Urbe literally.

## Acceptance

- Classic Urbe: same unit, scenario and E2E suites, same hashes for the same seeds.
- Neo Urbe: same seed plus the same command log produces the same `hashState`.
- The six mechanics are playable through the UI and explained by the inspector. Fiber is laid from
  the toolbar (underground view) and the data map sits with the other overlays.
- `pnpm check`, `pnpm test:e2e` and `pnpm build` are green.
