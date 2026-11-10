import { expect, test } from '@playwright/test';
import { defaultOptions, generateRegion } from '../src/generation';
import { densities, dangerNames } from '../src/grid';

test('consulta locais e ausência pela chave e seleção acessível, com repetição após gerar', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Chave de quem mestra', { exact: true }).click();
  const table = page.getByRole('table', { name: 'Hexágonos da região' });
  await expect(table.getByRole('row')).toHaveCount(109);
  const region = generateRegion(densities.compacta, defaultOptions);
  for (const cell of region.cells) {
    const row = table.getByRole('row').filter({ has: page.getByRole('rowheader', { name: cell.coordinate, exact: true }) });
    await expect(row).toContainText(cell.terrain);
    await expect(row).toContainText(dangerNames[cell.danger]);
    await expect(row).toContainText(cell.local ? `${cell.local.category} · ${cell.local.name}` : 'Sem local');
    if (cell.expeditionBase) await expect(row).toContainText('Base das Expedições');
  }
  const local = region.cells.find(cell => cell.local)!;
  const hex = page.locator('.hex').nth(region.cells.indexOf(local));
  await expect(hex).toHaveAccessibleName(new RegExp(`${local.local!.category} · ${local.local!.name}`));
  await hex.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#selection')).toContainText(`${local.local!.category} · ${local.local!.name}`);
  await expect(hex.locator('[data-local]')).toHaveCount(1);
  const absent = region.cells.find(cell => !cell.local)!;
  await page.locator('.hex').nth(region.cells.indexOf(absent)).click();
  await expect(page.locator('#selection')).toContainText('Sem local');
  const before = await table.textContent();
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Gerar região', exact: true }).click();
  await page.getByText('Chave de quem mestra', { exact: true }).click();
  await expect(table).toHaveText(before!);
});


test('consulta a chave no celular sem alargar a página e não a imprime nesta etapa', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.getByText('Chave de quem mestra', { exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const scroll = page.getByRole('region', { name: 'Tabela da chave' });
  await scroll.focus();
  await expect(scroll).toBeFocused();
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByText('Chave de quem mestra', { exact: true })).toBeHidden();
});


test('mantém local, quatro unidades e base separados, contidos e com nomes literais', async ({ page }) => {
  await page.goto('/');
  const results = await page.evaluate(async () => {
    const generationPath = '/src/generation.ts';
    const gridPath = '/src/grid.ts';
    const viewPath = '/src/map-view.ts';
    const { generateRegion, defaultOptions } = await import(generationPath);
    const { densities, terrains } = await import(gridPath);
    const { mapSheet, regionKey } = await import(viewPath);
    const region = generateRegion(densities.compacta, defaultOptions, undefined, () => 6, () => 1);
    const name = 'Torre "A" <img src=x> & abrigo';
    const fixture = document.createElement('div');
    const key = document.createElement('div');
    document.body.append(fixture, key);
    const results = terrains.map((terrain: string) => {
      region.cells.forEach((cell: { terrain: string; local: { name: string } }) => {
        cell.terrain = terrain;
        cell.local.name = name;
      });
      mapSheet(fixture, region);
      regionKey(key, region);
      const hex = fixture.querySelector<SVGGElement>('.hex:has([data-expedition-base])')!;
      const marker = hex.querySelector<SVGPathElement>('[data-local]')!;
      const bounds = marker.getBoundingClientRect();
      const overlaps = [...hex.querySelectorAll('[data-biome-unit], [data-expedition-base], .coordinate')].some(unit => {
        const other = unit.getBoundingClientRect();
        return bounds.left < other.right && bounds.right > other.left && bounds.top < other.bottom && bounds.bottom > other.top;
      });
      const polygon = hex.querySelector<SVGPolygonElement>('polygon')!;
      const corners = [...polygon.points].map(point => new DOMPoint(point.x, point.y).matrixTransform(polygon.getScreenCTM()!));
      // A point is inside a convex polygon when all edge cross products have the same sign.
      const contained = [bounds.left - 1, bounds.right + 1].every(x => [bounds.top - 1, bounds.bottom + 1].every(y => {
        const signs = corners.map((a, i) => {
          const b = corners[(i + 1) % corners.length]!;
          return Math.sign((b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x));
        });
        return signs.every(sign => sign >= 0) || signs.every(sign => sign <= 0);
      }));
      return { terrain, overlaps, contained, units: hex.querySelectorAll('[data-biome-unit]').length,
        literal: hex.getAttribute('aria-label')!.includes(name) && key.textContent!.includes(name),
        images: fixture.querySelectorAll('img').length + key.querySelectorAll('img').length };
    });
    fixture.remove();
    key.remove();
    return results;
  });
  for (const result of results) {
    expect(result, result.terrain).toMatchObject({ overlaps: false, contained: true, units: 4, literal: true, images: 0 });
  }
});
