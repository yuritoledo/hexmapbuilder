import { expect, test } from '@playwright/test';

for (const width of [390, 768, 1440, 1920]) {
  test(`preenche a coluna com a prévia A4 em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const paper = await page.locator('#comparison .paper').boundingBox();
    const sheet = await page.locator('#comparison .map-sheet').boundingBox();
    expect(paper).not.toBeNull();
    expect(sheet).not.toBeNull();
    expect(Math.abs(sheet!.width - paper!.width)).toBeLessThan(1);
    expect(Math.abs(sheet!.x - paper!.x)).toBeLessThan(1);
    expect(sheet!.width / sheet!.height).toBeCloseTo(210 / 297, 2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    const hex = page.locator('#comparison .hex').first();
    await hex.focus();
    await page.keyboard.press('Enter');
    await expect(hex).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.selection-coordinate')).toHaveText('0101');
  });
}
