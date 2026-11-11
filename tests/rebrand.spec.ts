import { expect, test } from '@playwright/test';

for (const width of [1280, 1440]) {
  test(`mostra mapa e ferramentas lado a lado em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'A região ganha vida.' })).toBeVisible();
    const map = await page.locator('#comparison').boundingBox();
    const tools = await page.locator('#generation-form').boundingBox();
    const inspector = await page.locator('.inspector').boundingBox();
    expect(map!.y).toBeLessThan(300);
    expect(tools!.x + tools!.width).toBeLessThanOrEqual(map!.x);
    expect(map!.x + map!.width).toBeLessThanOrEqual(inspector!.x);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    const hex = page.locator('#comparison .hex').first();
    await hex.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.selection-coordinate')).toHaveText('0101');
    await expect(hex).toHaveAttribute('aria-pressed', 'true');
  });
}

for (const width of [390, 768]) {
  test(`coloca o mapa antes da preparação em ${width}px sem rolagem horizontal`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    const map = await page.locator('#comparison').boundingBox();
    const tools = await page.locator('#generation-form').boundingBox();
    expect(map!.y).toBeLessThan(330);
    expect(map!.y).toBeLessThan(tools!.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.locator('#comparison .hex').last().click();
    await expect(page.locator('#selection')).toContainText('0912');
    await expect(page.locator('#selection')).toBeInViewport();
    await page.getByRole('link', { name: 'Gerar', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Semente', exact: true })).toBeInViewport();
  });
}

test('mantém controles ocultos fora da tela até que sejam necessários', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#retry-save')).toBeHidden();
  await expect(page.locator('#cell-editor')).toBeHidden();
  await page.locator('#comparison .hex').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#cell-editor')).toBeVisible();
});

test('mantém as fontes e a tinta das folhas impressas fora da identidade da interface', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#print-output .map-sheet')).toHaveCSS('color', 'rgb(37, 39, 32)');
  await expect(page.locator('#print-output .map-title')).toHaveCSS('font-size', '6px');
  await expect(page.locator('#print-output .map-title')).toHaveCSS('font-family', '"Literata Variable", Georgia, serif');
  await expect(page.locator('#print-output .print-key')).toHaveCSS('font-family', '"Helvetica Neue", Helvetica, Arial, sans-serif');
  await expect(page.locator('#print-output .print-key tbody tr')).toHaveCount(108);
});
