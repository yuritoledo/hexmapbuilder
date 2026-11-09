import { expect, test } from '@playwright/test';

test('gera a grade aprovada com semente, variantes e terreno inicial escolhido', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Semente').fill('campanha-42');
  await page.getByLabel('Terreno inicial').selectOption('forest');
  await page.getByLabel('Floresta ou selva').selectOption('Selva');
  await page.getByLabel('Deserto ou ártico').selectOption('Ártico');
  await page.getByLabel('Rio ou litoral').selectOption('Litoral');
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Gerar região', exact: true }).click();
  const map = page.getByRole('group', { name: 'Grade B · Compacta' });
  await expect(map.getByRole('button')).toHaveCount(108);
  const center = map.getByRole('button', { name: 'Hexágono 0506 · Selva', exact: true });
  await center.click();
  await expect(page.getByRole('status')).toContainText('Selva');
  await expect(page.locator('#generation-summary')).toContainText('campanha-42');
  await expect(page.locator('#generation-summary')).toContainText('Inicial: Selva · Ártico / Selva / Litoral');
  await page.getByLabel('Floresta ou selva').selectOption('Floresta');
  await expect(page.locator('#generation-summary')).toContainText('Inicial: Selva · Ártico / Selva / Litoral');
  await page.getByLabel('Floresta ou selva').selectOption('Selva');
  await expect(page.locator('.legend')).toContainText('Ártico');
  await expect(page.locator('.legend')).toContainText('Selva');
  await expect(page.locator('.legend')).toContainText('Litoral');
  const first = await map.getByRole('button').evaluateAll(elements => elements.map(el => el.getAttribute('aria-label')));
  await page.getByRole('button', { name: 'Gerar região', exact: true }).click();
  expect(await map.getByRole('button').evaluateAll(elements => elements.map(el => el.getAttribute('aria-label')))).toEqual(first);
  await expect(page.locator('[aria-pressed="true"]')).toHaveCount(0);
});

test('cancelar a substituição preserva o mapa, os metadados e a seleção', async ({ page }) => {
  await page.goto('/');
  const hexes = page.locator('.hex');
  await hexes.first().click();
  const before = await hexes.evaluateAll(elements => elements.map(el => el.getAttribute('aria-label')));
  const summary = await page.locator('#generation-summary').textContent();
  await page.getByLabel('Semente').fill('outra-regiao');
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Gerar região', exact: true }).click();
  expect(await hexes.evaluateAll(elements => elements.map(el => el.getAttribute('aria-label')))).toEqual(before);
  await expect(hexes.first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#generation-summary')).toHaveText(summary!);
});

test('semente é texto literal e o teclado funciona depois de substituir o mapa', async ({ page }) => {
  await page.goto('/');
  const seed = '<img src=x onerror=alert(1)> & campanha';
  await page.getByLabel('Semente').fill(seed);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Gerar região', exact: true }).click();
  await expect(page.locator('#generation-summary')).toContainText(seed);
  await expect(page.locator('.map-generation').first()).toContainText(seed);
  await expect(page.locator('img')).toHaveCount(0);
  await page.locator('.hex').first().focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText('0201');
});

test('imprime sementes longas e espaços sem perder a versão nem as margens', async ({ page }) => {
  await page.goto('/');
  page.on('dialog', dialog => dialog.accept());
  for (const seed of ['漢'.repeat(80), ' a  b ']) {
    await page.getByLabel('Semente').fill(seed);
    await page.getByRole('button', { name: 'Gerar região', exact: true }).click();
    await page.emulateMedia({ media: 'print' });
    const label = page.locator('.map-generation').first();
    await expect(label).toHaveText(`Semente: ${JSON.stringify(seed)} · terrain-v1`);
    const bounds = await label.evaluate(element => {
      const text = element as SVGTextElement;
      const box = text.getBBox();
      return { right: box.x + box.width, whiteSpace: getComputedStyle(text).whiteSpace };
    });
    expect(bounds.right).toBeLessThanOrEqual(198.01);
    expect(bounds.whiteSpace).toBe('pre');
    await page.emulateMedia({ media: 'screen' });
  }
});
