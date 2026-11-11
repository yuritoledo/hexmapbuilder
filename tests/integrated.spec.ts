import { expect, test, type Page } from '@playwright/test';
import { exportMap } from './helpers/export-map';
import { PDFDocument } from 'pdf-lib';

async function importMap(page: Page, text: string) {
  await page.getByLabel('Importar mapa').setInputFiles({
    name: 'integrado.json', mimeType: 'application/json', buffer: Buffer.from(text),
  });
}

const center = (page: Page) => page.getByRole('button', { name: /^Hexágono 0506 ·/ });
const action = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
async function rerollAll(page: Page) {
  for (const component of ['terreno', 'local', 'perigo']) {
    await action(page, `Gerar ${component} novamente`).click();
  }
}

test('complete enabled-river journey preserves exact edits and all random continuations through print', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByLabel('Semente', { exact: true }).fill(' integração <&> 01 ');
  await page.getByRole('combobox', { name: 'Terreno inicial', exact: true }).selectOption('ocean');
  await page.getByLabel('Deserto ou ártico').selectOption('Ártico');
  await page.getByLabel('Floresta ou selva').selectOption('Selva');
  await page.getByLabel('Rio ou litoral').selectOption('Litoral');
  await page.getByLabel('Rio contínuo (adaptação opcional)', { exact: true }).check();
  page.once('dialog', dialog => dialog.accept());
  await action(page, 'Gerar região').click();
  await center(page).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#selection')).toContainText('0506');
  await page.getByLabel('Terreno do hexágono').selectOption('Oceano');
  await page.getByLabel('Perigo do hexágono').selectOption('4');
  await page.getByLabel('Nome do local').fill(' Porto <seguro> & "abrigo" ');
  await page.getByLabel('Categoria do local').selectOption('santuário');
  await action(page, 'Aplicar local').click();
  const edited = await exportMap(page);
  const path = await page.locator('#comparison .river-overlay').getAttribute('d');
  await action(page, 'Desfazer').click();
  expect(await exportMap(page)).not.toBe(edited);
  await action(page, 'Refazer').click();
  expect(await exportMap(page)).toBe(edited);

  // Record the next complete action sequence, then restore its exact starting snapshot.
  await rerollAll(page);
  const continued = await exportMap(page);
  for (let i = 0; i < 3; i++) await action(page, 'Desfazer').click();
  expect(await exportMap(page)).toBe(edited);
  await page.reload();
  expect(await exportMap(page)).toBe(edited);
  await expect(action(page, 'Desfazer')).toBeDisabled();
  await center(page).click();
  await rerollAll(page);
  expect(await exportMap(page)).toBe(continued);

  // Both invalid input and a rejected valid replacement preserve the redo branch.
  await action(page, 'Desfazer').click();
  const beforeFailure = await exportMap(page);
  await importMap(page, '{"region":');
  await expect(page.locator('#file-status')).toContainText('Não foi possível importar');
  expect(await exportMap(page)).toBe(beforeFailure);
  page.once('dialog', dialog => dialog.dismiss());
  await importMap(page, edited);
  await expect(page.locator('#file-status')).toContainText('cancelada');
  expect(await exportMap(page)).toBe(beforeFailure);
  await action(page, 'Refazer').click();
  expect(await exportMap(page)).toBe(continued);
  page.once('dialog', dialog => dialog.accept());
  await importMap(page, edited);
  expect(await exportMap(page)).toBe(edited);
  await center(page).click();
  await rerollAll(page);
  expect(await exportMap(page)).toBe(continued);
  for (let i = 0; i < 3; i++) await action(page, 'Desfazer').click();

  await expect(page.getByLabel('Mostrar locais no mapa impresso')).not.toBeChecked();
  await expect(page.getByLabel('Mostrar perigo no mapa impresso')).not.toBeChecked();
  await page.emulateMedia({ media: 'print' });
  const bytes = await page.pdf({ path: testInfo.outputPath('integrated-a4.pdf'), preferCSSPageSize: true });
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBeGreaterThan(1);
  for (const sheet of pdf.getPages()) {
    expect(sheet.getWidth() * 25.4 / 72).toBeCloseTo(210, 0);
    expect(sheet.getHeight() * 25.4 / 72).toBeCloseTo(297, 0);
  }
  // Native PDF printing fires beforeprint; inspect its disposable projection as well.
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  const map = page.locator('#print-output .map-sheet');
  await expect(map.locator('.river-overlay')).toHaveAttribute('d', path!);
  await expect(map.locator('[data-local], [data-expedition-base], .danger-legend')).toHaveCount(0);
  expect(await map.locator('.hex').evaluateAll(hexes =>
    hexes.every(hex => hex.querySelectorAll('[data-biome-unit]').length === 1))).toBe(true);
  const key = page.locator('#print-output .print-key');
  await expect(key.locator('tbody tr')).toHaveCount(108);
  await expect(key).toContainText('Porto <seguro>');
  await expect(key).toContainText('Base das Expedições');
  await expect(key.locator('tbody tr').filter({ hasText: '0506' }).locator('td').nth(1)).toHaveText('4');
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect(page.locator('#print-output')).toHaveCount(0);
  await page.emulateMedia({ media: 'screen' });
  expect(await exportMap(page)).toBe(edited);
  await action(page, 'Refazer').click();
  await action(page, 'Refazer').click();
  await action(page, 'Refazer').click();
  expect(await exportMap(page)).toBe(continued);
});

test('enabled-river storage failure keeps the last save and current export, then retries without losing redo', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Rio contínuo (adaptação opcional)', { exact: true }).check();
  await center(page).click();
  await rerollAll(page);
  const saved = await exportMap(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); };
    Object.assign(window, { restoreStorage: () => { Storage.prototype.setItem = original; } });
  });
  await page.getByLabel('Nome do local').fill('Cópia somente nesta sessão');
  await action(page, 'Aplicar local').click();
  const unsaved = await exportMap(page);
  expect(unsaved).not.toBe(saved);
  await expect(page.locator('#storage-status')).toContainText('apenas nesta sessão');
  expect(await page.evaluate(() => localStorage.getItem('hexmapbuilder.current'))).toBe(saved);
  await action(page, 'Desfazer').click();
  expect(await exportMap(page)).toBe(saved);
  await action(page, 'Refazer').click();
  expect(await exportMap(page)).toBe(unsaved);
  await page.evaluate('window.restoreStorage()');
  await action(page, 'Tentar salvar novamente').click();
  await expect(page.locator('#storage-status')).toContainText('Salvo neste navegador');
  await page.reload();
  expect(await exportMap(page)).toBe(unsaved);
});

test('390px consultation exposes coordinates, local, danger, base and river without requiring editing', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Rio contínuo (adaptação opcional)', { exact: true }).check();
  await center(page).click();
  await page.getByLabel('Nome do local').fill('Porto de consulta');
  await action(page, 'Aplicar local').click();
  await page.getByLabel('Perigo do hexágono').selectOption('4');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator('#comparison .river-overlay')).toHaveAccessibleName('Rio contínuo de norte a sul · adaptação opcional');
  await center(page).click();
  const selection = page.locator('#selection');
  for (const text of ['0506', 'Mortal (4)', 'Base das Expedições', 'Porto de consulta']) {
    await expect(selection).toContainText(text);
  }
  await expect(selection).toBeInViewport();
  await page.getByText('Chave de quem mestra', { exact: true }).click();
  const row = page.getByRole('table', { name: 'Hexágonos da região' }).getByRole('row')
    .filter({ has: page.getByRole('rowheader', { name: '0506', exact: true }) });
  await expect(row).toContainText('Mortal (4)');
  await expect(row).toContainText('Porto de consulta');
  await expect(row).toContainText('Base das Expedições');
  const key = page.getByRole('region', { name: 'Tabela da chave' });
  await key.focus();
  await page.keyboard.press('End');
  await expect(key).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

for (const arid of ['Deserto', 'Ártico']) {
  for (const forest of ['Floresta', 'Selva']) {
    for (const water of ['Rio', 'Litoral']) {
      for (const initial of ['random', 'arid', 'swamp', 'grassland', 'forest', 'water', 'ocean', 'mountain']) {
        test(`reproduces complete initial snapshot: ${initial}/${arid}/${forest}/${water}`, async ({ page }) => {
          await page.goto('/');
          await page.getByLabel('Semente', { exact: true }).fill('repetição <&> ');
          await page.getByLabel('Deserto ou ártico').selectOption(arid);
          await page.getByLabel('Floresta ou selva').selectOption(forest);
          await page.getByLabel('Rio ou litoral').selectOption(water);
          await page.getByLabel('Rio contínuo (adaptação opcional)', { exact: true }).check();
          await page.getByRole('combobox', { name: 'Terreno inicial', exact: true }).selectOption(initial);
          page.once('dialog', dialog => dialog.accept());
          await action(page, 'Gerar região').click();
          const first = await exportMap(page);
          page.once('dialog', dialog => dialog.accept());
          await action(page, 'Gerar região').click();
          expect(await exportMap(page)).toBe(first);
          const snapshot = JSON.parse(first);
          expect(snapshot.region.rerolls).toEqual({ terrain: 0, local: 0, danger: 0 });
          expect(snapshot.region.river.enabled).toBe(true);
          expect(snapshot.region.cells).toHaveLength(108);
          expect(snapshot.region.options).toEqual({ seed: 'repetição <&> ', initialTerrain: initial, arid, forest, water });
        });
      }
    }
  }
}
