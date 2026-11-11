import { expect, test } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

test('abre a grade aprovada e consulta um hexágono pelo mouse', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Hexmap Builder — geração de terrenos');
  await expect(page.getByRole('heading', { name: 'A região ganha vida.' })).toBeVisible();
  const map = page.getByRole('group', { name: 'Grade B · Compacta' });
  await expect(map.getByRole('button')).toHaveCount(108);
  const hex = map.getByRole('button').first();
  const label = await hex.getAttribute('aria-label');
  await hex.click();
  await expect(hex).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#selection')).toContainText('0101');
  await expect(page.locator('#selection')).toContainText(label!.split(' · ')[1]!);
});


test('navega e seleciona pelo teclado sem sair dos limites da grade', async ({ page }) => {
  await page.goto('/');
  const map = page.getByRole('group', { name: 'Grade B · Compacta' });
  const hexes = map.getByRole('button');
  await hexes.first().focus();
  await page.keyboard.press('ArrowLeft');
  await expect(hexes.first()).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await expect(hexes.nth(10)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(hexes.nth(10)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#selection')).toContainText('0202');
  await page.keyboard.press('End');
  await expect(hexes.nth(17)).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(hexes.nth(17)).toBeFocused();
  await page.keyboard.press('Home');
  await expect(hexes.nth(9)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(hexes.nth(9)).toHaveAttribute('aria-pressed', 'true');
  await expect(hexes.nth(10)).toHaveAttribute('aria-pressed', 'false');
  await hexes.last().focus();
  await page.keyboard.press('ArrowDown');
  await expect(hexes.last()).toBeFocused();
});


test('consulta o terreno no celular sem rolagem horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#keyboard-help')).toBeVisible();
  const hex = page.getByRole('group', { name: 'Grade B · Compacta' }).getByRole('button').last();
  await hex.click();
  await expect(page.locator('#selection')).toContainText('0912');
  await expect(page.locator('#selection')).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('imprime uma página A4 em tamanho real e sem destaque da seleção', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole('group', { name: 'Grade B · Compacta' }).getByRole('button').first().click();
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('heading', { name: 'A região ganha vida.' })).toBeHidden();
  const polygon = page.locator('#print-output .hex polygon').first();
  await expect(polygon).toHaveCSS('fill', 'rgb(255, 255, 255)');
  await expect(polygon).toHaveCSS('stroke-width', '0.3px');
  const dimensions = await page.locator('#print-output .map-sheet').first().evaluate(element => {
    const { width, height } = element.getBoundingClientRect();
    return { width, height };
  });
  expect(dimensions.width * 25.4 / 96).toBeCloseTo(210, 1);
  expect(dimensions.height * 25.4 / 96).toBeCloseTo(297, 1);
  const pdf = await page.pdf({ path: testInfo.outputPath('comparacao-a4.pdf'), preferCSSPageSize: true });
  const pdfDocument = await PDFDocument.load(pdf);
  expect(pdfDocument.getPageCount()).toBeGreaterThan(1);
  for (const sheet of pdfDocument.getPages()) {
    expect(sheet.getWidth() * 25.4 / 72).toBeCloseTo(210, 0);
    expect(sheet.getHeight() * 25.4 / 72).toBeCloseTo(297, 0);
  }
});


test('mantém os vetores Kenney dentro dos recortes no mapa e na legenda impressa', async ({ page }) => {
  await page.goto('/');
  page.on('dialog', dialog => dialog.accept());
  for (const forest of ['Floresta', 'Selva']) {
    await page.getByLabel('Floresta ou selva').selectOption(forest);
    await page.getByRole('button', { name: 'Gerar região', exact: true }).click();
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    await page.emulateMedia({ media: 'print' });
    const symbols = page.locator('#print-output .terrain-symbol[data-source="kenney"] svg');
    expect(await symbols.count()).toBeGreaterThan(0);
    const clipped = await symbols.evaluateAll(elements => elements.flatMap(element => {
      if (!(element instanceof SVGSVGElement)) return ['não é SVG'];
      const view = element.viewBox.baseVal;
      return [...element.querySelectorAll('path')].flatMap(path => {
        const bounds = path.getBBox();
        const padding = Number(path.getAttribute('stroke-width')) / 2;
        const svgMatrix = element.getScreenCTM();
        const pathMatrix = path.getScreenCTM();
        if (!svgMatrix || !pathMatrix) return ['sem matriz de transformação'];
        const matrix = svgMatrix.inverse().multiply(pathMatrix);
        const corners = [
          [bounds.x - padding, bounds.y - padding],
          [bounds.x + bounds.width + padding, bounds.y - padding],
          [bounds.x - padding, bounds.y + bounds.height + padding],
          [bounds.x + bounds.width + padding, bounds.y + bounds.height + padding],
        ];
        const outside = corners.some(([x, y]) => {
          const point = new DOMPoint(x, y).matrixTransform(matrix);
          return point.x < view.x || point.y < view.y ||
            point.x > view.x + view.width || point.y > view.y + view.height;
        });
        return outside ? [path.getAttribute('d')] : [];
      });
    }));
    expect(clipped).toEqual([]);
    await page.emulateMedia({ media: 'screen' });
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  }
});
