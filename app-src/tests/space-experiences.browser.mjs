import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fixture = JSON.parse(await readFile(new URL('../../data.json', import.meta.url), 'utf8'));
const output = new URL('../../.impeccable/review/space-experiences/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
async function start(mobile = false, noGL = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, reducedMotion: 'reduce' });
  let saved = structuredClone(fixture);
  await context.route('**/api/data', route => {
    if (route.request().method() === 'POST') { saved = route.request().postDataJSON(); return route.fulfill({ json: { ok: true } }); }
    return route.fulfill({ json: saved });
  });
  if (noGL) await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type.includes('webgl') ? null : original.call(this, type, ...args); };
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:8643/#/projects/incident-command');
  await page.getByRole('button', { name: 'Explore architecture', exact: true }).waitFor();
  return { page, context, saved: () => saved, mobile };
}
async function navigate(session, name) {
  if (session.mobile) await session.page.getByRole('button', { name: 'Toggle navigation' }).click();
  await session.page.getByRole('button', { name, exact: true }).click();
}
async function capture(page, selector, name) {
  const section = page.locator(selector);
  await section.scrollIntoViewIfNeeded();
  if (await section.locator('.space-artifact').count()) {
    await section.locator('.space-artifact').scrollIntoViewIfNeeded();
    await section.locator('.artifact-render[data-ready="true"]').waitFor({ timeout: 30000 });
  }
  await page.waitForTimeout(900);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name}: horizontal overflow`);
  if (process.env.SPACE_CAPTURE !== '0') await section.screenshot({ path: fileURLToPath(new URL(`${name}.png`, output)) });
}
try {
  for (const mobile of [false, true]) {
    const session = await start(mobile);
    const { page, saved } = session;
    const suffix = mobile ? 'mobile' : 'desktop';
    const original = structuredClone(saved().buildProjects);
    await page.getByRole('button', { name: 'Explore architecture', exact: true }).click();
    await page.getByRole('button', { name: 'Spring Boot control', exact: true }).click();
    await capture(page, '.station-panel', `station-${suffix}`);
    await page.locator('.station-documents summary').click();
    await page.locator('.station-documents button').first().click();
    await page.getByRole('dialog', { name: 'Project document' }).waitFor();
    await page.getByRole('button', { name: 'Close document', exact: false }).click();
    await page.getByRole('button', { name: 'Implement an approval gate Open step', exact: false }).click();
    await page.locator('.build-detail').waitFor();
    assert.deepEqual(saved().buildProjects, original, 'station exploration must not mutate progress');
    await navigate(session, 'Dashboard');
    await capture(page, '.quest-hero', `dock-${suffix}`);
    await page.getByRole('button', { name: 'Continue learning', exact: false }).click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await navigate(session, 'Challenge Series');
    await page.getByRole('button', { name: 'Open failure simulator' }).click();
    const challengeBefore = structuredClone(saved().challengeSeries);
    await page.getByLabel('Service connected').uncheck();
    await page.getByLabel('Traffic burst').check();
    for (let i = 0; i < 6; i++) await page.getByRole('button', { name: 'Advance one tick' }).click();
    assert.match(await page.locator('.lab-result').innerText(), /Tick 6.*108 received.*30 dropped/);
    await capture(page, '.failure-lab', `lab-${suffix}`);
    await page.getByRole('button', { name: 'Run simulation' }).click();
    await page.waitForTimeout(1400);
    assert.equal(await page.locator('.request-flow').getAttribute('data-flowing'), 'false', 'quiet motion keeps packets stationary');
    await page.getByRole('button', { name: 'Pause simulation' }).click();
    await page.getByRole('button', { name: 'Reset experiment' }).click();
    assert.match(await page.locator('.lab-result').innerText(), /Tick 0 · 0 received · 0 dropped/);
    assert.deepEqual(saved().challengeSeries, challengeBefore);
    await navigate(session, fixture.books[0].name);
    await page.getByRole('button', { name: 'Chapter globe', exact: true }).click();
    await page.getByLabel('Explore a section region').selectOption('1');
    assert.equal(await page.getByLabel('Choose a chapter').inputValue(), `${fixture.books[0].id}:1:0`);
    await page.locator('.learning-scene[data-ready="true"]').waitFor();
    await capture(page, '.chapter-globe', `globe-${suffix}`);
    await page.getByLabel('Show section reading route').uncheck();
    await page.getByRole('button', { name: 'Read chapter', exact: false }).click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await navigate(session, 'Profile');
    await capture(page, '.astronaut-bay', `astronaut-${suffix}`);
    const achievementBefore = structuredClone(saved().achievementState);
    await page.getByLabel('Inspect a mission patch').selectOption('century_club');
    await page.getByRole('button', { name: 'Rotate model right', exact: true }).click();
    assert.deepEqual(saved().achievementState, achievementBefore);
    await navigate(session, 'Achievements');
    await page.getByRole('button', { name: 'Inspect astronaut equipment' }).click();
    await page.getByLabel('Inspect a mission patch').waitFor();
    await session.context.close();
  }
  const fallback = await start(false, true);
  await fallback.page.getByRole('button', { name: 'Explore architecture', exact: true }).click();
  await fallback.page.locator('.station-panel').scrollIntoViewIfNeeded();
  await fallback.page.getByText('3D preview unavailable', { exact: true }).waitFor();
  await fallback.page.getByRole('button', { name: 'Python intelligence', exact: true }).click();
  await fallback.page.getByRole('button', { name: 'Qualify installed Llama models Open step', exact: false }).waitFor();
  await fallback.context.close();
  assert.deepEqual(errors, []);
  console.log('Space experiences: desktop/mobile, assets, task/docs, resume, simulation conservation/reset, quiet motion, globe regions, earned state and WebGL fallback passed.');
} finally { await browser.close(); }
