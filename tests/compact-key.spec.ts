import { expect, test } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

for (const longNames of [false, true]) {
  test(`prints exactly one map and one key with 108 handwritten observations, long names=${longNames}`, async ({ page }, testInfo) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    if (longNames) {
      const state = await page.evaluate(async () => {
        const generationPath = '/src/generation.ts';
        const gridPath = '/src/grid.ts';
        const printPath = '/src/print-view.ts';
        const persistencePath = '/src/persistence.ts';
        const { encodeRegion, decodeRegion } = await import(persistencePath);
        const { generateRegion, defaultOptions } = await import(generationPath);
        const { densities } = await import(gridPath);
        const { printMap, printKey } = await import(printPath);
        const region = generateRegion(densities.compacta, { ...defaultOptions, seed: 'W'.repeat(80) });
        for (const cell of region.cells) cell.local = { category: 'santuário', name: '<img> & ' + 'W漢'.repeat(56) };
        const before = encodeRegion(region);
        const render = () => {
          document.querySelector('#print-output')?.remove();
          const output = document.createElement('div');
          output.id = 'print-output';
          document.body.append(output);
          printMap(output, region, { showLocations: false, showDanger: false });
          printKey(output, region);
        };
        render();
        window.addEventListener('beforeprint', render);
        return { before, after: encodeRegion(region), roundTrip: encodeRegion(decodeRegion(encodeRegion(region))) };
      });
      expect(state.after).toBe(state.before);
      expect(JSON.parse(state.roundTrip)).toEqual(JSON.parse(state.before));
    }
    const originalKey = await page.locator('#region-key').innerHTML();
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    await page.emulateMedia({ media: 'print' });
    const key = page.locator('.print-key');
    await expect(key.locator('table')).toHaveCount(3);
    await expect(key.locator('tbody tr')).toHaveCount(108);
    await expect(key.locator('.key-observations')).toHaveCount(108);
    await expect(key.getByRole('columnheader', { name: 'Obs.', exact: true })).toHaveCount(3);
    expect(await key.locator('tbody th').allTextContents()).toEqual(
      Array.from({ length: 108 }, (_, i) => `${String(i % 9 + 1).padStart(2, '0')}${String(Math.floor(i / 9) + 1).padStart(2, '0')}`),
    );
    expect((await key.locator('.key-observations').allTextContents()).every(text => text === '')).toBe(true);
    await expect(key).not.toContainText('Sem local');
    await expect(key.locator('img')).toHaveCount(0);
    await expect(key).toContainText('Base');
    if (longNames) await expect(key.locator('.key-local').first()).toContainText('…');
    expect(await page.locator('#region-key').innerHTML()).toBe(originalKey);
    const layout = await key.evaluate(section => {
      const box = section.getBoundingClientRect();
      const cells = [...section.querySelectorAll('tbody tr')].map(row => row.getBoundingClientRect());
      return { width: box.width, height: box.height, cellsInside: cells.every(cell => cell.right <= box.right + 1 && cell.bottom <= box.bottom + 1),
        rowHeight: Math.min(...cells.map(cell => cell.height)) };
    });
    expect(layout.height * 25.4 / 96).toBeLessThanOrEqual(273);
    expect(layout.width * 25.4 / 96).toBeLessThanOrEqual(186.1);
    expect(layout.cellsInside).toBe(true);
    expect(layout.rowHeight * 25.4 / 96).toBeGreaterThanOrEqual(6);
    await key.screenshot({ path: `/tmp/hexmap-compact-key-${longNames ? 'long' : 'normal'}.png` });
    const pdf = await PDFDocument.load(await page.pdf({ path: testInfo.outputPath('mapa-chave-duas-folhas.pdf'), preferCSSPageSize: true }));
    expect(pdf.getPageCount()).toBe(2);
    for (const sheet of pdf.getPages()) {
      expect(sheet.getWidth() * 25.4 / 72).toBeCloseTo(210, 0);
      expect(sheet.getHeight() * 25.4 / 72).toBeCloseTo(297, 0);
    }
  });
}
