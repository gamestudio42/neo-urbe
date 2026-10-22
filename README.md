<p align="center">
  <img src="apps/neon/public/favicon.svg" width="88" alt="Neo Urbe">
</p>

<h1 align="center">Neo Urbe</h1>

<p align="center"><strong>Raise a neon skyline. Keep the grid alive.</strong></p>

<p align="center">
  A cyberpunk isometric city builder that runs in the browser.
  Zone the land, hold an unstable power grid, keep the megacorps out —
  then watch demand, traffic and disasters do the rest.
  No install. Interface in English, Portuguese, Spanish, French and German.
</p>

## Why Neo Urbe

- **Play in the browser.** Found a city. Nothing to download.
- **You create the conditions.** Roads, zones, plants and fiber. The simulator grows — or abandons — the lots.
- **A city with extra pressure.** The grid overloads, corporations buy lots, hackers probe the network, drones follow the avenues and spires climb past the classic skyline.
- **A living city.** Cars follow traffic, chimneys smoke, boats leave the marina, drones fly the streets.
- **A mayor's desk.** Taxes, department funding, charts, thematic maps and a tile inspector that tells you _why_ a lot is not growing.
- **Original soundtrack.** Synthwave, synthesized on the fly.
- **Your city stays with you.** Autosave in the browser, plus export and import of `.neon.json` files.

Hotkeys: `R` road · `1–6` zones · `E` power · `T` water · `P` pause · `M` sound.

## Develop

```sh
pnpm install
pnpm dev        # http://localhost:5178
```

Or with Docker: `docker compose up` serves the dev build on port 5178.

| Command         | Description                                                 |
| --------------- | ----------------------------------------------------------- |
| `pnpm check`    | Lint, type check, unit/integration/scenario tests and build |
| `pnpm test:e2e` | Playwright end-to-end tests                                 |
| `pnpm sim`      | Headless simulation over presets and seeds                  |
| `pnpm bench`    | Tick timing benchmark (`--strict` for CI)                   |

`pnpm build` writes `apps/neon/dist`. GitHub Pages publishes that folder. To host it elsewhere:

```sh
BASE_PATH=/path/ pnpm build
```

Docs: [architecture](docs/architecture.md) · [neon spec](docs/neon-spec.md) · [simulation spec](docs/simulation-spec.md) · [balancing](docs/balancing.md) · [mechanics](docs/mechanics-matrix.md) · [roadmap](docs/roadmap.md) · [testing](docs/testing-strategy.md) · [agents](AGENTS.md) · [contributing](CONTRIBUTING.md)

## Licence

Original code, procedural sprites and synthesized sound and music, MIT licence.
Micropolis (GPLv3) and OpenSC2K were studied as references for behaviour only;
no code or assets were copied.
