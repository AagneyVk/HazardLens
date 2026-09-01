import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

await mkdir('artifacts', { recursive: true });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--config', 'viewer/vite.config.ts', '--host', '127.0.0.1', '--port', '4173'], { stdio: 'inherit' });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) { try { if ((await fetch('http://127.0.0.1:4173')).ok) { ready = true; break; } } catch {} await delay(200); }
  assert.ok(ready, 'Viewer preview must start');
  browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-webgl'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }), errors = [];
  async function assertSceneRendered() {
    await page.waitForFunction(() => document.querySelector('canvas')?.dataset.renderState === 'ready');
    // Inspect actual canvas pixels, not just UI presence or a render counter.
    const colors = await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => {
      const source = document.querySelector('canvas'), copy = document.createElement('canvas');
      copy.width = 160; copy.height = 100;
      const context = copy.getContext('2d'); context.drawImage(source, 0, 0, 160, 100);
      const pixels = context.getImageData(0, 0, 160, 100).data, unique = new Set();
      for (let i = 0; i < pixels.length; i += 4) unique.add(`${pixels[i] >> 4},${pixels[i+1] >> 4},${pixels[i+2] >> 4}`);
      resolve(unique.size);
    })));
    assert.ok(colors > 12, `Facility canvas must contain geometry, not a blank frame (${colors} colors)`);
    assert.equal(await page.locator('canvas').count(), 1);
  }
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'HazardLens', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Select T-001', exact: true }).waitFor();
  await assertSceneRendered();
  for (let reload = 0; reload < 2; reload++) {
    await page.reload({ waitUntil: 'networkidle' });
    await assertSceneRendered();
  }
  assert.equal(await page.locator('canvas').count(), 1);
  await page.screenshot({ path: 'artifacts/indoor-overview.png' });
  await page.getByRole('button', { name: 'Select T-001', exact: true }).click();
  await page.getByRole('button', { name: 'Ignite fire', exact: true }).click();
  await page.getByRole('button', { name: 'Apply disturbance', exact: true }).click();
  await page.waitForFunction(() => Number(document.querySelector('[data-metric="fires"] strong')?.textContent) > 0);
  await page.getByRole('button', { name: 'Focus ↗', exact: true }).click();
  await page.waitForFunction(() => Number(document.querySelector('.hl-clock')?.textContent.replace('s', '')) > 2);
  await page.getByRole('button', { name: 'Ⅱ Pause', exact: true }).click();
  await page.screenshot({ path: 'artifacts/indoor-fire.png' });
  const before = await page.locator('.hl-clock').textContent(); await delay(300); assert.equal(await page.locator('.hl-clock').textContent(), before);
  await page.getByRole('button', { name: 'Connections', exact: true }).click();
  await page.getByRole('button', { name: 'Compare response', exact: true }).click();
  await page.getByRole('heading', { name: 'Response comparison · 10 seconds', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Close comparison', exact: true }).click();
  const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export', exact: true }).click();
  const download = await downloadPromise; await download.saveAs('artifacts/incident.json');
  const report = JSON.parse(await readFile('artifacts/incident.json', 'utf8'));
  assert.equal(report.snapshot.twins.filter(t => t.kind === 'worker').length, 8);
  assert.ok(report.snapshot.twins.some(t => t.kind === 'worker' && ['evacuating', 'safe'].includes(t.metadata.status)));
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await assertSceneRendered();
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await page.getByRole('button', { name: 'Select T-001', exact: true }).click();
  await page.getByRole('button', { name: 'Trigger blast', exact: true }).click();
  await page.getByLabel('Failure severity', { exact: true }).press('End');
  await page.getByLabel('Simulation speed', { exact: true }).selectOption('0.25');
  await page.getByRole('button', { name: 'Apply disturbance', exact: true }).click();
  await page.waitForFunction(() => Number(document.querySelector('[data-metric="collapsed"] strong')?.textContent) > 0);
  await page.screenshot({ path: 'artifacts/indoor-blast.png' });
  await page.getByLabel('Simulation speed', { exact: true }).selectOption('5');
  await page.waitForFunction(() => Number(document.querySelector('.hl-clock')?.textContent.replace('s', '')) > 3);
  await page.getByRole('button', { name: 'Ⅱ Pause', exact: true }).click();
  await page.screenshot({ path: 'artifacts/indoor-collapse.png' });
  await page.getByRole('button', { name: 'Domino chain', exact: true }).click();
  await page.getByRole('heading', { name: 'Live domino chain' }).waitFor();
  assert.ok(await page.locator('.hl-chain-event').count() > 1);
  await page.screenshot({ path: 'artifacts/domino-chain.png' });
  await page.getByRole('button', { name: 'Close chain', exact: true }).click();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByLabel('Search assets', { exact: true }).fill('P-00');
  await page.getByRole('button', { name: 'Select P-001', exact: true }).click();
  await page.getByRole('button', { name: 'Select P-002', exact: true }).click({ modifiers: ['Shift'] });
  await page.getByRole('button', { name: 'Start leak', exact: true }).click();
  await page.getByRole('button', { name: 'Apply disturbance', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-metric="releases"] strong')?.textContent === '2');
  await page.getByRole('button', { name: 'Isolate', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/mobile-controls.png' });
  assert.ok(await page.getByRole('button', { name: 'Apply disturbance', exact: true }).isVisible());
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const extension = canvas.getContext('webgl2').getExtension('WEBGL_lose_context');
    if (!extension) throw new Error('Context-loss regression requires WEBGL_lose_context');
    window.restoreTestContext = () => extension.restoreContext();
    extension.loseContext();
  });
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.renderState === 'recovering');
  await page.evaluate(() => window.restoreTestContext());
  await assertSceneRendered();
  await page.screenshot({ path: 'artifacts/context-restored.png' });
  assert.deepEqual(errors, [], 'Browser must not report uncaught errors');
  console.log('PASS: indoor WebGL, contextual actions, fire, blast, collapsed walls, evacuation, pause, forecast, export, multi-selection, isolation and mobile controls');
} finally { await browser?.close(); server.kill('SIGTERM'); }
