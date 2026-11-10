import { expect, test } from '@playwright/test';

test('edits each component, preserves the base and neighbors, and restores full history by keyboard', async ({ page }) => {
  await page.goto('/');
  const center = page.getByRole('button', { name: /^Hexágono 0506 ·/ });
  const neighbors = await page.locator('.hex').evaluateAll(elements => elements.filter(el => !el.getAttribute('aria-label')!.startsWith('Hexágono 0506 ·')).map(el => el.getAttribute('aria-label')));
  await center.focus();
  await page.keyboard.press('Enter');
  const initial = await center.getAttribute('aria-label');
  await expect(page.getByRole('button', { name: 'Desfazer', exact: true })).toBeDisabled();
  await page.getByLabel('Terreno do hexágono').focus();
  await page.getByLabel('Terreno do hexágono').selectOption('Oceano');
  await expect(center).toHaveAccessibleName(/0506 · Oceano/);
  await expect(center).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Terreno do hexágono')).toBeFocused();
  const name = ' Torre "A" <img src=x> & abrigo ';
  await page.getByLabel('Nome do local').fill(name);
  await page.getByLabel('Categoria do local').selectOption('ruína');
  await page.getByRole('button', { name: 'Aplicar local', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(center).toHaveAccessibleName(new RegExp('ruína · .*Torre'));
  const danger = initial!.includes('Seguro (1)') ? '4' : '1';
  await page.getByLabel('Perigo do hexágono').selectOption(danger);
  await expect(center).toHaveAccessibleName(danger === '4' ? /Mortal/ : /Seguro/);
  await expect(page.locator('#selection')).toContainText(name);
  await expect(page.locator('img')).toHaveCount(0);
  await page.getByRole('button', { name: 'Remover local', exact: true }).click();
  await expect(center).toHaveAccessibleName(/Sem local/);
  await expect(center).toHaveAccessibleName(/Base das Expedições/);
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'Desfazer', exact: true }).focus();
    await page.keyboard.press('Enter');
  }
  await expect(center).toHaveAccessibleName(initial!);
  await expect(center).toHaveAttribute('aria-pressed', 'true');
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Refazer', exact: true }).click();
  await expect(center).toHaveAccessibleName(/0506 · Oceano · (Mortal|Seguro).*Base das Expedições.*Sem local/);
  expect(await page.locator('.hex').evaluateAll(elements => elements.filter(el => !el.getAttribute('aria-label')!.startsWith('Hexágono 0506 ·')).map(el => el.getAttribute('aria-label')))).toEqual(neighbors);

});

test('independent rerolls replay after undo and ignore draft generation options', async ({ page }) => {
  await page.goto('/');
  const center = page.getByRole('button', { name: /^Hexágono 0506 ·/ });
  await center.click();
  const summary = await page.locator('#generation-summary').textContent();
  await page.getByLabel('Semente').fill('draft-not-applied');
  await page.getByLabel('Floresta ou selva').selectOption('Selva');
  for (const component of ['terreno', 'perigo', 'local']) {
    const before = await page.locator('.hex').evaluateAll(elements => elements.map(el => el.getAttribute('aria-label')));
    await page.getByRole('button', { name: `Gerar ${component} novamente`, exact: true }).click();
    const result = await center.getAttribute('aria-label');
    const after = await page.locator('.hex').evaluateAll(elements => elements.map(el => el.getAttribute('aria-label')));
    expect(after.filter((_, i) => i !== 49)).toEqual(before.filter((_, i) => i !== 49));
    await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
    expect(await page.locator('.hex').evaluateAll(elements => elements.map(el => el.getAttribute('aria-label')))).toEqual(before);
    await expect(page.getByRole('button', { name: 'Refazer', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: `Gerar ${component} novamente`, exact: true }).click();
    await expect(center).toHaveAccessibleName(result!);
    await expect(page.getByRole('button', { name: 'Refazer', exact: true })).toBeDisabled();
  }
  await expect(page.locator('#generation-summary')).toHaveText(summary!);
});

test('cancel preserves edited history; accepted replacement restores complete applied map on undo', async ({ page }) => {
  await page.goto('/');
  const center = page.getByRole('button', { name: /^Hexágono 0506 ·/ });
  await center.click();
  await page.getByLabel('Nome do local').fill('Local editado');
  await page.getByRole('button', { name: 'Aplicar local', exact: true }).click();
  const edited = await page.locator('.hex').evaluateAll(elements => elements.map(el => el.getAttribute('aria-label')));
  const summary = await page.locator('#generation-summary').textContent();
  await page.getByLabel('Semente').fill('replacement');
  await page.getByLabel('Floresta ou selva').selectOption('Selva');
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Gerar região', exact: true }).click();
  expect(await page.locator('.hex').evaluateAll(elements => elements.map(el => el.getAttribute('aria-label')))).toEqual(edited);
  await expect(center).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Desfazer', exact: true })).toBeEnabled();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Gerar região', exact: true }).click();
  const replacement = await page.locator('.hex').evaluateAll(elements => elements.map(el => el.getAttribute('aria-label')));
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  expect(await page.locator('.hex').evaluateAll(elements => elements.map(el => el.getAttribute('aria-label')))).toEqual(edited);
  await expect(page.locator('#generation-summary')).toHaveText(summary!);
  await page.getByRole('button', { name: 'Refazer', exact: true }).click();
  expect(await page.locator('.hex').evaluateAll(elements => elements.map(el => el.getAttribute('aria-label')))).toEqual(replacement);
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await center.click();
  await page.getByLabel('Nome do local').fill('Nova edição');
  await page.getByLabel('Categoria do local').selectOption('covil');
  await page.getByRole('button', { name: 'Aplicar local', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Refazer', exact: true })).toBeDisabled();
  await expect(center).toHaveAccessibleName(/covil · Nova edição/);
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await expect(center).toHaveAccessibleName(/povoado · Local editado/);
  await page.getByRole('button', { name: 'Refazer', exact: true }).click();
  await expect(center).toHaveAccessibleName(/covil · Nova edição/);
});

test('rejects blank local names without changing history and fits a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.getByRole('button', { name: /^Hexágono 0506 ·/ }).click();
  await page.getByLabel('Nome do local').fill('   ');
  await page.getByRole('button', { name: 'Aplicar local', exact: true }).click();
  expect(await page.getByLabel('Nome do local').evaluate(input => (input as HTMLInputElement).validity.valid)).toBe(false);
  await expect(page.getByRole('button', { name: 'Desfazer', exact: true })).toBeDisabled();
  await page.getByLabel('Nome do local').fill('Abrigo');
  await page.getByRole('button', { name: 'Aplicar local', exact: true }).click();
  await expect(page.locator('#selection')).toContainText('Abrigo');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});
