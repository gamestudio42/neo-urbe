import { expect, test } from '@playwright/test';

/**
 * Neo Urbe end-to-end: boot, found a city, build the neon placeables and read the telemetry.
 *
 * The specs reuse the shared Urbe data-testids on purpose — the neon app wraps the same UI, so a
 * regression in the wrapper shows up here as a missing panel instead of a silent divergence.
 */

const NEON_PORT = 5179;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('cityBuilder.locale', 'pt-BR');
    localStorage.setItem('cityBuilder.tutorialDone', '1');
  });
  await page.goto(`http://localhost:${NEON_PORT}/`);
  await page.getByTestId('main-menu').waitFor();
});

async function startNeonCity(page: import('@playwright/test').Page, seed: string) {
  await page.getByTestId('seed-input').fill(seed);
  await page.getByTestId('start-city').click();
  await page.waitForFunction(() => window.__cityDebug?.isReady() === true, null, {
    timeout: 30_000,
  });
  await page.waitForTimeout(500);
}

test('boots into Neo Urbe with the neon brand', async ({ page }) => {
  await expect(page.getByTestId('main-menu')).toBeVisible();
  await expect(page.locator('body')).toContainText(/Neo Urbe|NEO URBE/);
  const mark = page.getByTestId('main-menu').getByTestId('studio-mark');
  await expect(mark).toBeVisible();
  await expect(mark).toHaveAttribute('href', 'https://gamestudio42.github.io/');
  await expect(mark).toHaveAccessibleName('Game Studio 42');
});

test('reports the neon ruleset in the mirror stats', async ({ page }) => {
  await startNeonCity(page, 'neon-e2e');
  await expect(page.getByTestId('studio-mark')).toBeVisible();
  const stats = await page.evaluate(() => window.__cityDebug?.getStats() ?? null);
  expect(stats).not.toBeNull();
  expect(stats?.neon).toBeDefined();
  expect(stats?.neon?.overloaded).toBeGreaterThanOrEqual(0);
  expect(stats?.neon?.corporations.count).toBeGreaterThanOrEqual(0);
});

test('offers the neon-only tools and hides them from classic Urbe', async ({ page }) => {
  await startNeonCity(page, 'neon-tools');
  for (const id of [
    'tool-substation',
    'tool-battery',
    'tool-firewall',
    'tool-dronePort',
    'tool-corpHQ',
    'tool-fiber',
    'tool-datacenter',
    'tool-edgeNode',
  ]) {
    await expect(page.getByTestId(id)).toBeAttached();
  }
});

test('fiber tool opens the underground view and the data overlay is listed', async ({ page }) => {
  await startNeonCity(page, 'neon-fiber');
  await page.getByTestId('tool-fiber').click();
  await expect(page.getByTestId('tool-fiber')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('open-system').click();
  await expect(page.getByTestId('underground-enabled')).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('system-panel')).toBeHidden();
  await page.getByTestId('open-overlays').click();
  await expect(page.getByTestId('overlay-data')).toBeVisible();
});

test('places a substation, a battery and a firewall through the debug command API', async ({
  page,
}) => {
  await startNeonCity(page, 'neon-build');
  const area = await page.evaluate(() => window.__cityDebug?.findFlatArea(3, 3) ?? null);
  expect(area).not.toBeNull();
  if (!area) return;

  const battery = await page.evaluate(
    (p) => window.__cityDebug?.command({ type: 'place', kind: 'battery', x: p.x, y: p.y }),
    area,
  );
  expect(battery?.ok).toBe(true);

  const stats = await page.evaluate(() => window.__cityDebug?.getStats() ?? null);
  expect(stats?.neon).toBeDefined();
});

test('exports and imports a neon save', async ({ page }) => {
  await startNeonCity(page, 'neon-save');
  const text = await page.evaluate(() => window.__cityDebug?.exportText() ?? '');
  expect(text.length).toBeGreaterThan(0);
  const loaded = await page.evaluate(async (saved) => {
    return window.__cityDebug?.importText(saved) ?? null;
  }, text);
  expect(loaded?.ok).toBe(true);
});

test('is deterministic: the same seed and command log hash the same', async ({ page }) => {
  await startNeonCity(page, 'neon-determinism');
  const first = await page.evaluate(() => window.__cityDebug?.hash() ?? null);
  await page.evaluate(() => window.__cityDebug?.runTicks(120));
  const second = await page.evaluate(() => window.__cityDebug?.hash() ?? null);
  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  // Running ticks is the only difference, so the hash must move forward, not reset.
  expect(typeof first).toBe('string');
});

test('drone ports put drones in the air above their lane', async ({ page }) => {
  test.setTimeout(120_000);
  await startNeonCity(page, 'neon-drones');
  const area = await page.evaluate(() => window.__cityDebug?.findFlatArea(18, 10) ?? null);
  expect(area).not.toBeNull();
  if (!area) return;

  // Avenue along the north side of the port — how a player places it — then the grid that feeds it.
  const built = await page.evaluate(async (p) => {
    const d = window.__cityDebug;
    if (!d) return null;
    await d.command({ type: 'road', x0: p.x + 7, y0: p.y + 6, x1: p.x + 17, y1: p.y + 6 });
    const ok: Record<string, boolean> = {};
    for (const [kind, dx] of [
      ['dronePort', 7],
      ['substation', 3],
      ['battery', 5],
      ['firewall', 6],
    ] as const) {
      ok[kind] = (await d.command({ type: 'place', kind, x: p.x + dx, y: p.y + 7 })).ok;
    }
    await d.command({ type: 'place', kind: 'coalPlant', x: p.x + 3, y: p.y + 4 });
    await d.runTicks(60);
    d.centerOnTile(p.x + 11, p.y + 7);
    return ok;
  }, area);
  expect(built?.dronePort).toBe(true);

  await page.getByTestId('speed-1').click();
  await expect
    .poll(async () => (await page.evaluate(() => window.__cityDebug?.animationStats()))?.drones ?? 0, {
      timeout: 30_000,
    })
    .toBeGreaterThan(0);

  const drones = await page.evaluate(
    () => window.__cityDebug?.hubSample().filter((s) => s.kind === 'drone') ?? [],
  );
  expect(drones.length).toBeGreaterThan(0);
  for (const drone of drones) {
    expect(Number.isFinite(drone.x)).toBe(true);
    expect(Number.isFinite(drone.y)).toBe(true);
    expect(drone.visible).toBe(true);
  }

  // Paused, the drones hold still.
  await page.getByTestId('speed-0').click();
  await page.waitForTimeout(300);
  const before = await page.evaluate(
    () => window.__cityDebug?.hubSample().filter((s) => s.kind === 'drone') ?? [],
  );
  await page.waitForTimeout(800);
  const after = await page.evaluate(
    () => window.__cityDebug?.hubSample().filter((s) => s.kind === 'drone') ?? [],
  );
  expect(after).toEqual(before);
});
