import { expect, test } from '@playwright/test';
import { exportMap } from './helpers/export-map';
import { PDFDocument } from 'pdf-lib';

test('toggles one optional river with keyboard and exact undo/redo without changing hexes', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByRole('checkbox', { name: 'Rio contínuo (adaptação opcional)', exact: true });
  await expect(toggle).not.toBeChecked();
  await expect(page.locator('.river-overlay')).toHaveCount(0);
  const before = await page.locator('.hex').evaluateAll(hexes => hexes.map(hex => hex.getAttribute('aria-label')));
  await toggle.focus();
  await page.keyboard.press('Space');
  await expect(toggle).toBeChecked();
  await expect(page.locator('.river-overlay')).toHaveCount(1);
  const river = page.locator('.river-overlay');
  await expect(river).toHaveAccessibleName('Rio contínuo de norte a sul · adaptação opcional');
  const path = await river.getAttribute('d');
  expect(path?.match(/M/g)).toHaveLength(1);
  expect(path?.match(/L/g)).toHaveLength(13);
  expect(await page.locator('.hex').evaluateAll(hexes => hexes.map(hex => hex.getAttribute('aria-label')))).toEqual(before);
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await expect(toggle).not.toBeChecked();
  await expect(river).toHaveCount(0);
  await page.getByRole('button', { name: 'Refazer', exact: true }).click();
  await expect(toggle).toBeChecked();
  await expect(river).toHaveAttribute('d', path!);
  await toggle.uncheck();
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await expect(toggle).toBeChecked();
  await expect(river).toHaveAttribute('d', path!);
});

test('preserves river and edits on cancelled generation, recomputes on acceptance, and restores exact state', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByRole('checkbox', { name: 'Rio contínuo (adaptação opcional)', exact: true });
  await toggle.check();
  const river = page.locator('.river-overlay');
  const originalPath = await river.getAttribute('d');
  const center = page.getByRole('button', { name: /^Hexágono 0506 ·/ });
  await center.click();
  await page.getByLabel('Nome do local').fill('Porto editado');
  await page.getByRole('button', { name: 'Aplicar local', exact: true }).click();
  const before = await page.locator('.hex').evaluateAll(hexes => hexes.map(hex => hex.getAttribute('aria-label')));
  const summary = await page.locator('#generation-summary').textContent();
  await page.getByLabel('Semente', { exact: true }).fill('other-river');
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Gerar região', exact: true }).click();
  await expect(river).toHaveAttribute('d', originalPath!);
  await expect(toggle).toBeChecked();
  expect(await page.locator('.hex').evaluateAll(hexes => hexes.map(hex => hex.getAttribute('aria-label')))).toEqual(before);
  await expect(page.locator('#generation-summary')).toHaveText(summary!);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Gerar região', exact: true }).click();
  await expect(toggle).toBeChecked();
  await expect(river).toHaveCount(1);
  const replacement = await river.getAttribute('d');
  expect(replacement).not.toBe(originalPath);
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await expect(river).toHaveAttribute('d', originalPath!);
  await expect(center).toHaveAccessibleName(/Base das Expedições.*Porto editado/);
  expect(await page.locator('.hex').evaluateAll(hexes => hexes.map(hex => hex.getAttribute('aria-label')))).toEqual(before);
  await page.getByRole('button', { name: 'Refazer', exact: true }).click();
  await expect(river).toHaveAttribute('d', replacement!);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Gerar região', exact: true }).click();
  await expect(river).toHaveAttribute('d', replacement!);
});

test('edits and rerolls a crossed hex without rerouting or changing its neighbors', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('checkbox', { name: 'Rio contínuo (adaptação opcional)', exact: true }).check();
  const river = page.locator('.river-overlay');
  const path = await river.getAttribute('d');
  const coordinate = await river.evaluate(element => {
    const [x, y] = element.getAttribute('d')!.split('L')[1]!.trim().split(' ').map(Number);
    return [...document.querySelectorAll('.hex .coordinate')].find(text =>
      Number(text.getAttribute('x')) === x && Number(text.getAttribute('y')) === y! + 6)!.textContent!;
  });
  const cell = page.getByRole('button', { name: new RegExp(`^Hexágono ${coordinate} ·`) });
  const neighbors = () => page.locator('.hex').evaluateAll((hexes, coordinate) =>
    hexes.filter(hex => !hex.getAttribute('aria-label')!.startsWith(`Hexágono ${coordinate} ·`))
      .map(hex => hex.getAttribute('aria-label')), coordinate);
  const before = await neighbors();
  await cell.click();
  for (const terrain of ['Oceano', 'Rio', 'Litoral']) {
    await page.getByRole('combobox', { name: 'Terreno do hexágono', exact: true }).selectOption(terrain);
    await expect(cell).toHaveAccessibleName(new RegExp(` · ${terrain} ·`));
    await expect(river).toHaveAttribute('d', path!);
  }
  await page.getByRole('combobox', { name: 'Perigo do hexágono', exact: true }).selectOption('4');
  await page.getByLabel('Nome do local').fill('Ponte <segura> & porto');
  await page.getByRole('button', { name: 'Aplicar local', exact: true }).click();
  for (const name of ['Gerar terreno novamente', 'Gerar perigo novamente', 'Gerar local novamente']) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(river).toHaveAttribute('d', path!);
    await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
    await expect(river).toHaveAttribute('d', path!);
    await page.getByRole('button', { name: 'Refazer', exact: true }).click();
    await expect(river).toHaveAttribute('d', path!);
  }
  expect(await neighbors()).toEqual(before);
  await expect(page.locator('.hex [data-expedition-base]')).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('prints the same continuous river under every secrecy setting without changing the screen state', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('checkbox', { name: 'Rio contínuo (adaptação opcional)', exact: true }).check();
  const screen = page.locator('#comparison');
  const before = await screen.innerHTML();
  const path = await screen.locator('.river-overlay').getAttribute('d');
  for (const locations of [false, true]) {
    for (const danger of [false, true]) {
      await page.emulateMedia({ media: 'screen' });
      await page.getByRole('checkbox', { name: 'Mostrar locais no mapa impresso', exact: true }).setChecked(locations);
      await page.getByRole('checkbox', { name: 'Mostrar perigo no mapa impresso', exact: true }).setChecked(danger);
      await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
      await page.emulateMedia({ media: 'print' });
      const map = page.locator('#print-output .map-sheet');
      await expect(map.locator('.river-overlay')).toHaveAttribute('d', path!);
      await expect(map.locator('.river-legend')).toContainText('adaptação do aplicativo');
      await expect(map.locator('[data-expedition-base]')).toHaveCount(locations ? 1 : 0);
      await expect(map.locator('.danger-legend')).toHaveCount(danger ? 1 : 0);
      if (!danger) expect(await map.locator('.hex').evaluateAll(hexes =>
        hexes.every(hex => hex.querySelectorAll('[data-biome-unit]').length === 1))).toBe(true);
      await expect(page.locator('#print-output .print-key')).toContainText('Base das Expedições');
      expect(await screen.innerHTML()).toBe(before);
      const pdf = await PDFDocument.load(await page.pdf({ path: testInfo.outputPath(`river-${locations}-${danger}.pdf`), preferCSSPageSize: true }));
      expect(pdf.getPageCount()).toBeGreaterThan(1);
      for (const sheet of pdf.getPages()) {
        expect(sheet.getWidth() * 25.4 / 72).toBeCloseTo(210, 0);
        expect(sheet.getHeight() * 25.4 / 72).toBeCloseTo(297, 0);
      }
      await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
      await expect(page.locator('#print-output')).toHaveCount(0);
    }
  }
});

test('persists and transfers the exact river, applied edits and reroll continuation without regeneration', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByRole('checkbox', { name: 'Rio contínuo (adaptação opcional)', exact: true });
  await toggle.check();
  const center = page.getByRole('button', { name: /^Hexágono 0506 ·/ });
  await center.click();
  await page.getByLabel('Terreno do hexágono').selectOption('Oceano');
  await page.getByLabel('Nome do local').fill('Ponte <segura> & porto');
  await page.getByRole('button', { name: 'Aplicar local', exact: true }).click();
  for (const component of ['terreno', 'local', 'perigo']) await page.getByRole('button', { name: `Gerar ${component} novamente`, exact: true }).click();
  const originalPath = await page.locator('.river-overlay').getAttribute('d');
  const saved = await page.evaluate(() => localStorage.getItem('hexmapbuilder.current'));
  const exported = await exportMap(page);
  expect(exported).toBe(saved);
  await page.getByLabel('Semente', { exact: true }).fill('rascunho não aplicado');
  await page.getByRole('button', { name: 'Gerar terreno novamente', exact: true }).click();
  const continuation = await center.getAttribute('aria-label');
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await page.reload();
  await expect(toggle).toBeChecked();
  await expect(page.locator('.river-overlay')).toHaveAttribute('d', originalPath!);
  expect(await page.evaluate(() => localStorage.getItem('hexmapbuilder.current'))).toBe(saved);
  await center.click();
  await page.getByRole('button', { name: 'Gerar terreno novamente', exact: true }).click();
  await expect(center).toHaveAccessibleName(continuation!);
  await toggle.uncheck();
  const importFile = () => page.getByLabel('Importar mapa').setInputFiles({ name: 'rio.json', mimeType: 'application/json', buffer: Buffer.from(exported) });
  page.once('dialog', dialog => dialog.dismiss());
  await importFile();
  await expect(page.locator('#file-status')).toContainText('cancelada');
  await expect(toggle).not.toBeChecked();
  page.once('dialog', dialog => dialog.accept());
  await importFile();
  await expect(toggle).toBeChecked();
  await expect(page.locator('.river-overlay')).toHaveAttribute('d', originalPath!);
  expect(await page.evaluate(() => localStorage.getItem('hexmapbuilder.current'))).toBe(saved);
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await expect(toggle).not.toBeChecked();
  await page.getByRole('button', { name: 'Refazer', exact: true }).click();
  await expect(page.locator('.river-overlay')).toHaveAttribute('d', originalPath!);
  await page.reload();
  await expect(toggle).toBeChecked();
  await expect(page.locator('.river-overlay')).toHaveAttribute('d', originalPath!);
});
