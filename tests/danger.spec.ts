import { expect, test } from '@playwright/test';

test('consulta perigo real e a base central no mapa normal, inclusive após gerar novamente', async ({ page }) => {
  await page.goto('/');
  const hexes = page.locator('.hex');
  await expect(hexes).toHaveCount(108);
  const state = async () => hexes.evaluateAll(elements => elements.map(hex => ({
    label: hex.getAttribute('aria-label'),
    danger: Number(hex.getAttribute('data-danger')),
    units: hex.querySelectorAll('[data-biome-unit]').length,
  })));
  const first = await state();
  expect(first.every(hex => hex.danger >= 1 && hex.danger <= 4 && hex.units === hex.danger)).toBe(true);
  await expect(page.locator('[data-expedition-base]')).toHaveCount(1);
  const base = hexes.filter({ has: page.locator('[data-expedition-base]') });
  await expect(base).toHaveAccessibleName(/Hexágono 0506.*Base das Expedições/);
  await base.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#selection')).toContainText('Perigo');
  await expect(page.locator('#selection')).toContainText('Vilarejo · Base das Expedições');
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Gerar região', exact: true }).click();
  expect(await state()).toEqual(first);
  await page.getByRole('checkbox', { name: 'Mostrar locais no mapa impresso' }).check();
  await page.getByRole('checkbox', { name: 'Mostrar perigo no mapa impresso' }).check();
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#print-output .danger-legend')).toBeVisible();
  await expect(page.locator('#print-output [data-expedition-base]')).toBeVisible();
});

test('não corta unidades ao consultar a base em nenhum terreno', async ({ page }) => {
  await page.goto('/');
  page.on('dialog', dialog => dialog.accept());
  const terrains = ['Deserto', 'Ártico', 'Pântano', 'Pradaria', 'Floresta', 'Selva', 'Rio', 'Litoral', 'Oceano', 'Montanha'];
  for (const terrain of terrains) {
    await page.getByLabel('Deserto ou ártico').selectOption(terrain === 'Ártico' ? 'Ártico' : 'Deserto');
    await page.getByLabel('Floresta ou selva').selectOption(terrain === 'Selva' ? 'Selva' : 'Floresta');
    await page.getByLabel('Rio ou litoral').selectOption(terrain === 'Litoral' ? 'Litoral' : 'Rio');
    await page.getByLabel('Terreno inicial').selectOption({ label: terrain });
    await page.getByRole('button', { name: 'Gerar região', exact: true }).click();
    await page.locator('.hex').filter({ has: page.locator('[data-expedition-base]') }).click();
    const clipped = await page.locator('.selection-terrain > svg').evaluate(svg => {
      const root = svg as SVGSVGElement;
      const viewport = root.viewBox.baseVal;
      return [...root.querySelectorAll('path')].some(path => {
        const bounds = path.getBBox();
        const padding = Number.parseFloat(getComputedStyle(path).strokeWidth) / 2;
        const matrix = root.getScreenCTM()!.inverse().multiply(path.getScreenCTM()!);
        return [bounds.x - padding, bounds.x + bounds.width + padding].some(x =>
          [bounds.y - padding, bounds.y + bounds.height + padding].some(y => {
            const point = new DOMPoint(x, y).matrixTransform(matrix);
            return point.x < viewport.x || point.x > viewport.x + viewport.width ||
              point.y < viewport.y || point.y > viewport.y + viewport.height;
          }));
      });
    });
    expect(clipped, terrain).toBe(false);
  }
});

test('usa o nome da base como texto literal e a legenda canônica de perigo', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const generationPath = '/src/generation.ts';
    const gridPath = '/src/grid.ts';
    const viewPath = '/src/map-view.ts';
    const { generateRegion, defaultOptions } = await import(generationPath);
    const { densities, dangerNames } = await import(gridPath);
    const { mapSheet } = await import(viewPath);
    const region = generateRegion(densities.compacta, defaultOptions);
    const base = region.cells.find((cell: { expeditionBase?: { name: string } }) => cell.expeditionBase);
    const name = 'Base "A" <img src=x> & abrigo';
    base.expeditionBase.name = name;
    const dangerLabels = Object.entries(dangerNames).map(([level, name]) =>
      `${level}${level === '1' ? ' símbolo' : ''}: ${name}`).join(' · ');
    const fixture = document.createElement('div');
    document.body.append(fixture);
    mapSheet(fixture, region);
    const label = fixture.querySelector('.hex:has([data-expedition-base])')!.getAttribute('aria-label');
    const legend = fixture.querySelector('.danger-legend')!.textContent;
    const images = fixture.querySelectorAll('img').length;
    fixture.remove();
    return { label, legend, images, name, dangerLabels };
  });
  expect(result.label).toContain(result.name);
  expect(result.legend).toContain(result.dangerLabels);
  expect(result.images).toBe(0);
});
