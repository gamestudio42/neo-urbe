import { chromium, type Page } from '@playwright/test';
import { ZoneDensity, ZoneType, type Command } from '../packages/shared/src';

/**
 * README stills for the underground network and three thematic maps.
 *
 * Founds a flat neon town, grows it, then shoots the underground view (pipes, pumps and fiber),
 * the data map, health coverage and pollution. The panel is closed before each frame.
 *
 *   pnpm exec tsx tools/shot-maps.ts [url] [out-dir]
 */
const URL = process.argv[2] ?? 'http://localhost:5178/';
const OUT_DIR = process.argv[3] ?? 'docs/screenshots';

function town(): Command[] {
  const avenueY = 20;
  const commands: Command[] = [];
  const road = (x0: number, y0: number, x1: number, y1: number) =>
    commands.push({ type: 'road', x0, y0, x1, y1 });
  const zone = (zone: ZoneType, x0: number, y0: number, x1: number, y1: number) =>
    commands.push({ type: 'zone', zone, density: ZoneDensity.Dense, x0, y0, x1, y1 });

  road(0, avenueY, 40, avenueY);
  for (let x = 6; x <= 40; x += 6) road(x, avenueY - 7, x, avenueY + 7);
  for (let x = 7; x + 4 <= 40; x += 6) zone(ZoneType.Residential, x, avenueY - 6, x + 4, avenueY - 1);
  zone(ZoneType.Commercial, 7, avenueY + 1, 23, avenueY + 3);
  zone(ZoneType.Industrial, 25, avenueY + 1, 35, avenueY + 6);
  zone(ZoneType.Commercial, 7, avenueY + 4, 23, avenueY + 6);
  commands.push({ type: 'place', kind: 'coalPlant', x: 44, y: avenueY + 2 });
  commands.push({ type: 'powerLine', x0: 36, y0: avenueY + 3, x1: 43, y1: avenueY + 3 });
  for (let p = 0; p < 3; p++) {
    commands.push({ type: 'place', kind: 'waterPump', x: 44, y: avenueY - 4 - 2 * p });
  }
  commands.push({ type: 'powerLine', x0: 44, y0: avenueY - 2, x1: 44, y1: avenueY + 1 });
  commands.push({ type: 'pipe', x0: 43, y0: avenueY - 3, x1: 7, y1: avenueY - 3 });
  commands.push({ type: 'pipe', x0: 7, y0: avenueY + 2, x1: 43, y1: avenueY + 2 });
  commands.push({ type: 'pipe', x0: 43, y0: avenueY - 3, x1: 43, y1: avenueY + 2 });
  commands.push({ type: 'fiber', x0: 7, y0: avenueY - 3, x1: 43, y1: avenueY - 3 });
  commands.push({ type: 'fiber', x0: 7, y0: avenueY + 2, x1: 47, y1: avenueY + 2 });
  commands.push({ type: 'fiber', x0: 43, y0: avenueY - 2, x1: 43, y1: avenueY + 1 });
  commands.push({ type: 'place', kind: 'datacenter', x: 47, y: avenueY + 2 });
  commands.push({ type: 'place', kind: 'policeStation', x: 4, y: avenueY - 3 });
  // West of the industry, so the health map shows a local blob around the hospital.
  commands.push({ type: 'place', kind: 'hospital', x: 8, y: avenueY + 1 });
  commands.push({ type: 'setDisasters', enabled: false });
  return commands;
}

async function found(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('cityBuilder.locale', 'pt-BR');
    localStorage.setItem('cityBuilder.tutorialDone', '1');
  });
  await page.goto(URL);
  await page.getByTestId('main-menu').waitFor();
  await page.getByTestId('seed-input').fill('map-gallery');
  await page.getByTestId('size-select').selectOption('64');
  await page.getByTestId('difficulty-select').selectOption('easy');
  await page.getByTestId('terrain-water').fill('0');
  await page.getByTestId('terrain-hills').fill('0');
  await page.getByTestId('terrain-forest').fill('0');
  await page.getByTestId('start-city').click();
  await page.waitForFunction(() => window.__cityDebug?.isReady() === true, null, {
    timeout: 60_000,
  });
}

async function frame(page: Page): Promise<void> {
  await page.evaluate(() => {
    const debug = window.__cityDebug;
    debug?.centerOnTile(24, 18);
    debug?.setZoom(0.55);
    debug?.setSpeed(0);
  });
  await page.waitForTimeout(600);
}

/** Drops the pause chip and any leftover notices so the map fills the frame. */
async function quiet(page: Page): Promise<void> {
  await page.addStyleTag({
    content: '[data-testid="pause-overlay"] { visibility: hidden !important; }',
  });
  for (let n = 0; n < 6; n++) {
    const toast = page.locator('.toast').first();
    if ((await toast.count()) === 0) return;
    await toast.click({ timeout: 1000 }).catch(() => undefined);
  }
}

/** Escape is ignored while a checkbox has focus, so blur before closing the panel. */
async function closePanel(page: Page, testId: string): Promise<void> {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('Escape');
  await page.getByTestId(testId).waitFor({ state: 'hidden' });
  await page.waitForTimeout(400);
}

/** Opens the system menu and sets the underground view, then closes the panel. */
async function showUnderground(page: Page, on: boolean): Promise<void> {
  await page.getByTestId('open-system').click();
  await page.getByTestId('system-panel').waitFor({ state: 'visible' });
  const box = page.getByTestId('underground-enabled');
  await box.scrollIntoViewIfNeeded();
  if ((await box.isChecked()) !== on) await box.click();
  await closePanel(page, 'system-panel');
}

/** Opens the map list, picks one, and closes the panel so the city fills the frame. */
async function showMap(page: Page, mode: string): Promise<void> {
  await page.keyboard.press('Escape');
  await page.getByTestId('open-overlays').click();
  await page.getByTestId('overlay-panel').waitFor({ state: 'visible' });
  const control = page.getByTestId(`overlay-${mode}`);
  await control.scrollIntoViewIfNeeded();
  await control.click();
  await closePanel(page, 'overlay-panel');
}

async function main(): Promise<void> {
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(10_000);
  await found(page);

  const built = await page.evaluate(async (commands) => {
    const debug = window.__cityDebug;
    if (!debug) return { error: 'no debug api' };
    const failed: string[] = [];
    for (const command of commands) {
      const result = await debug.command(command);
      if (!result.ok) failed.push(`${command.type} ${result.reason ?? ''}`);
    }
    await debug.runTicks(24 * 120);
    // Intrusions mute the hall for part of a month, and a young city can still be in debt.
    // Sample inside the month until the hall is supplying and the treasury is out of the red.
    let stats = debug.getStats();
    for (let step = 0; step < 200; step++) {
      const supply = stats?.neon?.data.supply ?? 0;
      const funds = stats?.funds ?? -1;
      if (supply > 0 && funds >= 0 && !stats?.bankrupt) break;
      await debug.runTicks(15);
      stats = debug.getStats();
    }
    debug.setSpeed(0);
    const hall = debug.getTile(47, 22);
    const home = debug.getTile(20, 17);
    return {
      failed,
      population: stats?.population ?? 0,
      funds: stats?.funds ?? 0,
      power: stats?.power.served ?? 0,
      water: stats?.water.served ?? 0,
      data: stats?.neon?.data ?? null,
      hallPowered: hall?.powered ?? false,
      hallLinked: hall?.linked ?? false,
      homeLinked: home?.linked ?? false,
      hospitalPowered: debug.getTile(9, 22)?.powered ?? false,
      hospitalHealth: debug.getTile(9, 22)?.health ?? 0,
    };
  }, town());
  console.log(JSON.stringify(built, null, 2));
  if (!built || 'error' in built) throw new Error('city did not start');
  if (built.failed.length > 0) throw new Error(`commands failed: ${built.failed.join('; ')}`);
  if (!built.data || built.data.supply <= 0) throw new Error('datacenter was not supplying');
  if (built.funds < 0) throw new Error('city was still in debt');

  await quiet(page);
  await frame(page);
  await showUnderground(page, true);
  await page.screenshot({
    path: `${OUT_DIR}/underground.jpg`,
    type: 'jpeg',
    quality: 82,
  });

  await showUnderground(page, false);
  await showMap(page, 'data');
  await page.screenshot({ path: `${OUT_DIR}/data.jpg`, type: 'jpeg', quality: 82 });
  await showMap(page, 'health');
  await page.screenshot({ path: `${OUT_DIR}/coverage.jpg`, type: 'jpeg', quality: 82 });
  await showMap(page, 'pollution');
  await page.screenshot({ path: `${OUT_DIR}/pollution.jpg`, type: 'jpeg', quality: 82 });

  await browser.close();
  console.log(`screenshots in ${OUT_DIR}`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
