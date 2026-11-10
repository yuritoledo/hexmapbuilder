import { expect, test } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

const defaultTerrains = ['Deserto', 'Pântano', 'Pradaria', 'Floresta', 'Rio', 'Oceano', 'Montanha'];
const allTerrains = [...defaultTerrains, 'Ártico', 'Selva', 'Litoral'];

for (const medium of ['screen', 'print'] as const) {
  test(`mixed edited terrains have a complete, unclipped ${medium} legend on the same A4 map`, async ({ page }, testInfo) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('#comparison .legend text')).toHaveText(defaultTerrains);
    let baselinePages = 0;
    if (medium === 'print') {
      await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
      await page.emulateMedia({ media: 'print' });
      baselinePages = (await PDFDocument.load(await page.pdf({ preferCSSPageSize: true }))).getPageCount();
      await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
      await page.emulateMedia({ media: 'screen' });
    }
    for (const [index, terrain] of allTerrains.entries()) {
      await page.locator(`#comparison .hex[data-index="${index}"]`).focus();
      await page.keyboard.press('Enter');
      await page.getByLabel('Terreno do hexágono').selectOption(terrain);
      await expect(page.locator(`#comparison .hex[data-index="${index}"]`)).toHaveAccessibleName(new RegExp(` · ${terrain} ·`));
    }
    if (medium === 'print') {
      await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
      await page.emulateMedia({ media: 'print' });
    }
    const map = page.locator(`${medium === 'screen' ? '#comparison' : '#print-output'} .map-sheet`);
    await expect(map.locator('.legend text')).toHaveText(allTerrains);
    // Measure the rendered symbols and text, including the symbol stroke, in SVG millimetres.
    const geometry = await map.evaluate(svg => {
      const sheet = svg.getBoundingClientRect();
      const unit = sheet.width / 210;
      const bounds = (element: Element) => {
        const rect = element.getBoundingClientRect();
        const stroke = element.matches('.terrain-symbol') ? 0.4 * 0.62 / 2 : 0;
        return { left: (rect.left - sheet.left) / unit - stroke, right: (rect.right - sheet.left) / unit + stroke,
          top: (rect.top - sheet.top) / unit - stroke, bottom: (rect.bottom - sheet.top) / unit + stroke };
      };
      return {
        symbols: [...svg.querySelectorAll('.legend > .terrain-symbol')].map(bounds),
        labels: [...svg.querySelectorAll('.legend text')].map(bounds),
        cellsBottom: bounds(svg.querySelector('.cells')!).bottom,
        notesTop: bounds(svg.querySelector('.scale-note')!).top,
      };
    });
    for (const row of [geometry.symbols, geometry.labels]) {
      expect(row).toHaveLength(10);
      row.forEach((box, index) => {
        expect(box.left).toBeGreaterThanOrEqual(12);
        expect(box.right).toBeLessThanOrEqual(198);
        expect(box.top).toBeGreaterThan(geometry.cellsBottom);
        expect(box.bottom).toBeLessThan(geometry.notesTop);
        if (index) expect(box.left).toBeGreaterThan(row[index - 1]!.right);
      });
    }
    expect(Math.max(...geometry.symbols.map(box => box.bottom))).toBeLessThan(Math.min(...geometry.labels.map(box => box.top)));
    if (medium === 'print') {
      await map.screenshot({ path: '/tmp/hexmap-final-legend-print.png' });
      const pdf = await PDFDocument.load(await page.pdf({ path: testInfo.outputPath('mixed-terrains-a4.pdf'), preferCSSPageSize: true }));
      expect(pdf.getPageCount()).toBe(baselinePages);
      expect(baselinePages).toBe(5);
      for (const sheet of pdf.getPages()) {
        expect(sheet.getWidth() * 25.4 / 72).toBeCloseTo(210, 0);
        expect(sheet.getHeight() * 25.4 / 72).toBeCloseTo(297, 0);
      }
    } else {
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await map.locator('.legend').scrollIntoViewIfNeeded();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: `/tmp/hexmap-final-legend-${width}.png` });
        await map.screenshot({ path: `/tmp/hexmap-final-map-${width}.png` });
      }
    }
  });
}
