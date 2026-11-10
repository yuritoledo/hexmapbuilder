import { expect, test } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

test('print controls start hidden and remain independent without changing the screen map', async ({ page }) => {
  await page.goto('/');
  const locations = page.getByRole('checkbox', { name: 'Mostrar locais no mapa impresso' });
  const danger = page.getByRole('checkbox', { name: 'Mostrar perigo no mapa impresso' });
  await expect(locations).not.toBeChecked();
  await expect(danger).not.toBeChecked();
  await locations.check();
  await expect(danger).not.toBeChecked();
  await danger.check();
  await locations.uncheck();
  await expect(danger).toBeChecked();
  await expect(page.locator('#comparison [data-expedition-base]')).toHaveCount(1);
  await expect(page.locator('#comparison .hex[data-danger="4"]').first().locator('[data-biome-unit]')).toHaveCount(4);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('.print-controls').scrollIntoViewIfNeeded();
    await page.screenshot({ path: test.info().outputPath(`controls-${width}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

for (const showLocations of [false, true]) {
  for (const showDanger of [false, true]) {
    test(`print secrecy: locations=${showLocations}, danger=${showDanger}`, async ({ page }) => {
      await page.goto('/');
      await page.getByRole('checkbox', { name: 'Mostrar locais no mapa impresso' }).setChecked(showLocations);
      await page.getByRole('checkbox', { name: 'Mostrar perigo no mapa impresso' }).setChecked(showDanger);
      const screen = await page.locator('#comparison').innerHTML();
      await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
      await page.emulateMedia({ media: 'print' });
      const map = page.locator('#print-output .map-sheet');
      await expect(map).toBeVisible();
      await expect(map.locator('.hex')).toHaveCount(108);
      await expect(map.locator('[data-expedition-base]')).toHaveCount(showLocations ? 1 : 0);
      expect(await map.locator('[data-local]').count()).toBe(showLocations ? await page.locator('#comparison [data-local]').count() : 0);
      await expect(map.locator('.danger-legend')).toHaveCount(showDanger ? 1 : 0);
      const counts = await map.locator('.hex').evaluateAll(hexes => hexes.map(hex => ({
        danger: Number(hex.getAttribute('data-danger')), units: hex.querySelectorAll('[data-biome-unit]').length,
      })));
      expect(counts.every(cell => cell.units === (showDanger ? cell.danger : 1))).toBe(true);
      if (!showLocations) expect(await map.getAttribute('aria-label')).not.toContain('Base');
      await expect(page.locator('#print-output')).not.toContainText('Vilarejo: base central');
      expect(await page.locator('#comparison').innerHTML()).toBe(screen);
      expect(await page.locator('#print-output .print-key tbody tr').allTextContents()).toEqual(await page.locator('#region-key tbody tr').allTextContents());
      await page.pdf({ path: test.info().outputPath(`mapa-${showLocations}-${showDanger}.pdf`), preferCSSPageSize: true });
      await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
      await expect(page.locator('#print-output')).toHaveCount(0);
    });
  }
}

test('prints the full key on separate A4 pages even when its screen disclosure is closed', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const expectedRows = await page.locator('#region-key tbody tr').allTextContents();
  await expect(page.locator('#region-key details')).not.toHaveAttribute('open', '');
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  await page.emulateMedia({ media: 'print' });
  const key = page.locator('#print-output .print-key');
  await expect(key).toBeVisible();
  expect(await key.locator('tbody tr').allTextContents()).toEqual(expectedRows);
  await expect(key).toContainText('Base das Expedições (base permanente)');
  await expect(key.locator('tbody tr').last()).toContainText('0912');
  const pdf = await page.pdf({ path: testInfo.outputPath('mapa-e-chave-a4.pdf'), preferCSSPageSize: true });
  const pdfDocument = await PDFDocument.load(pdf);
  expect(pdfDocument.getPageCount()).toBeGreaterThan(1);
  for (const sheet of pdfDocument.getPages()) {
    expect(sheet.getWidth() * 25.4 / 72).toBeCloseTo(210, 0);
    expect(sheet.getHeight() * 25.4 / 72).toBeCloseTo(297, 0);
  }
});

test('prints edited water/base/local data safely, with long names and applied options', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByLabel('Semente', { exact: true }).fill('rascunho não aplicado');
  const state = await page.evaluate(async () => {
    const generationPath = '/src/generation.ts';
    const gridPath = '/src/grid.ts';
    const printPath = '/src/print-view.ts';
    const { generateRegion, defaultOptions } = await import(generationPath);
    const { densities } = await import(gridPath);
    const { printMap, printKey } = await import(printPath);
    const region = generateRegion(densities.compacta, { ...defaultOptions, seed: '  água & <teste>  ', water: 'Litoral' });
    for (const cell of region.cells) {
      cell.local = { name: '<img src=x onerror=alert(1)> & ' + 'W'.repeat(50), category: 'ruína' };
      cell.terrain = 'Oceano';
      cell.danger = 4;
    }
    const before = JSON.stringify(region);
    const render = () => {
      document.querySelector('#print-output')?.remove();
      const output = document.createElement('div');
      output.id = 'print-output';
      document.body.append(output);
      printMap(output, region, { showLocations: true, showDanger: true });
      printKey(output, region);
    };
    render();
    // Render the edited fixture again after the application's beforeprint listener.
    window.addEventListener('beforeprint', render);
    return { before, after: JSON.stringify(region) };
  });
  expect(state.after).toBe(state.before);
  await page.emulateMedia({ media: 'print' });
  const output = page.locator('#print-output');
  await expect(output.locator('img')).toHaveCount(0);
  await expect(output.locator('[data-expedition-base]')).toHaveCount(1);
  await expect(output.locator('[data-local]')).toHaveCount(108);
  await expect(output.locator('.print-key tbody tr')).toHaveCount(108);
  await expect(output.locator('.print-key')).toContainText('Litoral');
  await expect(output).not.toContainText('rascunho não aplicado');
  await page.pdf({ path: testInfo.outputPath('chave-nomes-longos.pdf'), preferCSSPageSize: true });
});

test('native print uses applied metadata and fits a maximum-length seed within A4 margins', async ({ page }, testInfo) => {
  await page.goto('/');
  const seed = 'W'.repeat(80);
  page.on('dialog', dialog => dialog.accept());
  await page.getByLabel('Semente', { exact: true }).fill(seed);
  await page.getByLabel('Floresta ou selva').selectOption('Selva');
  await page.getByRole('button', { name: 'Gerar região', exact: true }).click();
  await page.getByLabel('Semente', { exact: true }).fill('rascunho');
  await page.getByLabel('Floresta ou selva').selectOption('Floresta');
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  await page.emulateMedia({ media: 'print' });
  const metadata = page.locator('#print-output .map-generation');
  await expect(metadata.first()).toContainText(seed);
  await expect(metadata.last()).toContainText('Selva');
  await expect(page.locator('#print-output .print-key p')).toContainText(seed);
  const bounds = await metadata.first().evaluate(element => {
    const box = (element as SVGGraphicsElement).getBBox();
    return { left: box.x, right: box.x + box.width };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(11.99);
  expect(bounds.right).toBeLessThanOrEqual(198.1);
  await page.pdf({ path: testInfo.outputPath('semente-longa.pdf'), preferCSSPageSize: true });
});
