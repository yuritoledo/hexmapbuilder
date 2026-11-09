import { expect, test } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

test('abre duas grades e consulta um hexágono pelo mouse', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Hexmap Builder — comparação de grades');
  await expect(page.getByRole('heading', { name: 'Compare seu próximo território.' })).toBeVisible();
  const ampla = page.getByRole('group', { name: 'Grade A · Ampla' });
  const compacta = page.getByRole('group', { name: 'Grade B · Compacta' });
  await expect(ampla.getByRole('button')).toHaveCount(63);
  await expect(compacta.getByRole('button')).toHaveCount(108);
  const hex = ampla.getByRole('button', { name: 'Hexágono 0301 · Floresta', exact: true });
  await hex.click();
  await expect(hex).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status')).toContainText('0301');
  await expect(page.getByRole('status')).toContainText('Floresta');
});


test('navega e seleciona pelo teclado sem sair dos limites da grade', async ({ page }) => {
  await page.goto('/');
  const ampla = page.getByRole('group', { name: 'Grade A · Ampla' });
  const hexes = ampla.getByRole('button');
  await hexes.first().focus();
  await page.keyboard.press('ArrowLeft');
  await expect(hexes.first()).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await expect(hexes.nth(8)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(hexes.nth(8)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status')).toContainText('0202');
  await page.keyboard.press('End');
  await expect(hexes.nth(13)).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(hexes.nth(13)).toBeFocused();
  await page.keyboard.press('Home');
  await expect(hexes.nth(7)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(hexes.nth(7)).toHaveAttribute('aria-pressed', 'true');
  await expect(hexes.nth(8)).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('group', { name: 'Grade B · Compacta' }).getByRole('button').first()).toBeFocused();
});


test('consulta o terreno no celular sem rolagem horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#keyboard-help')).toBeVisible();
  const hex = page.getByRole('group', { name: 'Grade B · Compacta' }).getByRole('button').last();
  await hex.click();
  await expect(page.getByRole('status')).toContainText('0912');
  await expect(page.getByRole('status')).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('imprime duas páginas A4 em tamanho real e sem destaque da seleção', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole('group', { name: 'Grade A · Ampla' }).getByRole('button').first().click();
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('heading', { name: 'Compare seu próximo território.' })).toBeHidden();
  const polygon = page.locator('[aria-pressed="true"] polygon');
  await expect(polygon).toHaveCSS('fill', 'rgb(255, 255, 255)');
  await expect(polygon).toHaveCSS('stroke-width', '0.3px');
  const pdf = await page.pdf({ path: testInfo.outputPath('comparacao-a4.pdf'), preferCSSPageSize: true });
  const pdfDocument = await PDFDocument.load(pdf);
  expect(pdfDocument.getPageCount()).toBe(2);
  for (const sheet of pdfDocument.getPages()) {
    expect(sheet.getWidth() * 25.4 / 72).toBeCloseTo(210, 0);
    expect(sheet.getHeight() * 25.4 / 72).toBeCloseTo(297, 0);
  }
  const dimensions = await page.locator('.map-sheet').first().evaluate(element => {
    const { width, height } = element.getBoundingClientRect();
    return { width, height };
  });
  expect(dimensions.width * 25.4 / 96).toBeCloseTo(210, 1);
  expect(dimensions.height * 25.4 / 96).toBeCloseTo(297, 1);
});
