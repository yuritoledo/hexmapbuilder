import { expect, test } from '@playwright/test';

test('aplica o preset shadcn aos controles sem alterar o papel', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Gerar região', exact: true })).toHaveAttribute('data-slot', 'button');
  await expect(page.getByLabel('Semente', { exact: true })).toHaveAttribute('data-slot', 'input');
  await expect(page.getByLabel('Terreno inicial')).toHaveAttribute('data-slot', 'native-select');
  await expect(page.getByRole('checkbox', { name: 'Rio contínuo (adaptação opcional)', exact: true })).toHaveAttribute('data-slot', 'checkbox');
  await expect(page.locator('#app')).toHaveCSS('font-family', '"Roboto Slab Variable", serif');
  await expect(page.locator('#comparison .map-sheet')).toHaveCSS('color', 'rgb(37, 39, 32)');
  await page.getByRole('checkbox', { name: 'Rio contínuo (adaptação opcional)', exact: true }).check();
  await expect(page.locator('.river-overlay')).toHaveCount(1);
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Rio contínuo (adaptação opcional)', exact: true })).not.toBeChecked();
});


test('preserva o foco do teclado ao esgotar desfazer e refazer', async ({ page }) => {
  await page.goto('/');
  const hex = page.getByRole('button', { name: /^Hexágono 0101 ·/ });
  await hex.focus();
  await page.keyboard.press('Enter');
  const danger = page.getByLabel('Perigo do hexágono');
  await danger.selectOption(await danger.inputValue() === '1' ? '4' : '1');
  for (const name of ['Desfazer', 'Refazer']) {
    const action = page.getByRole('button', { name, exact: true });
    await action.focus();
    await page.keyboard.press('Enter');
    await expect(action).toBeDisabled();
    await expect(hex).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('button', { name: /^Hexágono 0201 ·/ })).toBeFocused();
  }
});

test('preserva o foco do teclado quando remover local fica desativado', async ({ page }) => {
  await page.goto('/');
  const hex = page.getByRole('button', { name: /^Hexágono 0101 ·/ });
  await hex.focus();
  await page.keyboard.press('Enter');
  await page.getByLabel('Nome do local').fill('Local de teste');
  await page.getByRole('button', { name: 'Aplicar local', exact: true }).click();
  const remove = page.getByRole('button', { name: 'Remover local', exact: true });
  await remove.focus();
  await page.keyboard.press('Enter');
  await expect(remove).toBeDisabled();
  await expect(hex).toBeFocused();
});
