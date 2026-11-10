import { expect, test } from '@playwright/test';

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
