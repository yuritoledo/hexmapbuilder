import { expect, test } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

for (const longNames of [false, true]) {
  test(`prints full terrain and local names with shared handwritten space, long names=${longNames}`, async ({ page }, testInfo) => {
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
        for (const cell of region.cells) cell.local = { category: 'santuário', name: '<img> & ' + 'W漢'.repeat(52) + cell.coordinate };
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
    await expect(key.locator('table')).toHaveCount(4);
    await expect(key.locator('tbody tr')).toHaveCount(108);
    await expect(key.locator('.key-observations')).toHaveCount(0);
    await expect(key.getByRole('columnheader', { name: 'Terreno', exact: true })).toHaveCount(4);
    expect(await key.locator('tbody th').allTextContents()).toEqual(
      Array.from({ length: 108 }, (_, i) => `${String(i % 9 + 1).padStart(2, '0')}${String(Math.floor(i / 9) + 1).padStart(2, '0')}`),
    );
    await expect(key.locator('tbody td').first()).toHaveText(longNames ? /.+/ : 'Montanha');
    await expect(key.locator('.key-notes-space')).toBeEmpty();
    await expect(key).not.toContainText('Sem local');
    await expect(key).not.toContainText('…');
    await expect(key.locator('img')).toHaveCount(0);
    await expect(key.locator('.key-locations')).toContainText('Base das Expedições');
    if (longNames) {
      const expectedNames = Array.from({ length: 108 }, (_, i) =>
        '<img> & ' + 'W漢'.repeat(52) + `${String(i % 9 + 1).padStart(2, '0')}${String(Math.floor(i / 9) + 1).padStart(2, '0')}`);
      const printedNames = await key.locator('.key-local-name').allTextContents();
      expect(printedNames.filter(name => name !== 'Base das Expedições')).toEqual(expectedNames);
      await expect(key.locator('.key-local-name')).toHaveCount(109);
    } else {
      await expect(key.locator('.key-local-name')).toHaveCount(19);
      await expect(key.locator('.key-locations')).toContainText('Cripta das seis portas');
    }
    expect(await page.locator('#region-key').innerHTML()).toBe(originalKey);
    const layout = await key.evaluate(section => {
      const box = section.getBoundingClientRect();
      return { width: box.width, height: box.height,
        notesHeight: section.querySelector('.key-notes-space')!.getBoundingClientRect().height,
        clipped: [...section.querySelectorAll('th, td, li')].some(cell => cell.scrollWidth > cell.clientWidth + 1) };
    });
    expect(layout.width * 25.4 / 96).toBeLessThanOrEqual(186.1);
    expect(layout.clipped).toBe(false);
    expect(layout.notesHeight * 25.4 / 96).toBeGreaterThanOrEqual(39.9);
    if (!longNames) expect(layout.height * 25.4 / 96).toBeLessThanOrEqual(273.1);
    if (!longNames) await key.screenshot({ path: '/tmp/hexmap-approved-key.png' });
    const pdf = await PDFDocument.load(await page.pdf({ path: testInfo.outputPath('mapa-chave.pdf'), preferCSSPageSize: true }));
    if (longNames) expect(pdf.getPageCount()).toBeGreaterThan(2);
    else expect(pdf.getPageCount()).toBe(2);
    for (const sheet of pdf.getPages()) {
      expect(sheet.getWidth() * 25.4 / 72).toBeCloseTo(210, 0);
      expect(sheet.getHeight() * 25.4 / 72).toBeCloseTo(297, 0);
    }
  });
}
