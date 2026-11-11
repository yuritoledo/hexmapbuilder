import { expect, test, type Page } from '@playwright/test';
import { exportMap } from './helpers/export-map';

const labels = (page: Page) => page.locator('.hex').evaluateAll(elements => elements.map(element => element.getAttribute('aria-label')));
const center = (page: Page) => page.getByRole('button', { name: /^Hexágono 0506 ·/ });

async function importMap(page: Page, text: string) {
  await page.getByLabel('Importar mapa').setInputFiles({ name: 'mapa.json', mimeType: 'application/json', buffer: Buffer.from(text) });
}

test('autosaves exact edits and applied options, then reloads with empty session history and matching continuation', async ({ page }) => {
  await page.goto('/');
  await center(page).click();
  await page.getByLabel('Terreno do hexágono').selectOption('Oceano');
  await page.getByLabel('Nome do local').fill(' Torre "A" <img src=x> & abrigo ');
  await page.getByLabel('Categoria do local').selectOption('ruína');
  await page.getByRole('button', { name: 'Aplicar local', exact: true }).click();
  await page.getByLabel('Perigo do hexágono').selectOption('4');
  for (const component of ['terreno', 'local', 'perigo']) await page.getByRole('button', { name: `Gerar ${component} novamente`, exact: true }).click();
  const edited = await labels(page);
  const summary = await page.locator('#generation-summary').textContent();
  await page.getByLabel('Semente').fill('unapplied draft');
  await page.getByLabel('Floresta ou selva').selectOption('Selva');
  for (const component of ['terreno', 'local', 'perigo']) await page.getByRole('button', { name: `Gerar ${component} novamente`, exact: true }).click();
  const continuation = await labels(page);
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await expect(page.locator('#storage-status')).toContainText('Salvo neste navegador');
  await page.reload();
  expect(await labels(page)).toEqual(edited);
  await expect(page.locator('#generation-summary')).toHaveText(summary!);
  await expect(page.getByLabel('Semente')).toHaveValue('terras-01');
  await expect(page.getByRole('button', { name: 'Desfazer', exact: true })).toBeDisabled();
  await center(page).click();
  for (const component of ['terreno', 'local', 'perigo']) await page.getByRole('button', { name: `Gerar ${component} novamente`, exact: true }).click();
  expect(await labels(page)).toEqual(continuation);
  await expect(center(page)).toHaveAccessibleName(/Base das Expedições/);
  await expect(page.locator('img')).toHaveCount(0);
});

test('exports exact edited state and imports only after confirmation, with undo and redo', async ({ page }) => {
  await page.goto('/');
  await center(page).click();
  await page.getByLabel('Nome do local').fill(' Torre <img src=x onerror=alert(1)> & "A" ');
  await page.getByRole('button', { name: 'Aplicar local', exact: true }).click();
  await page.getByLabel('Terreno do hexágono').selectOption('Oceano');
  const edited = await labels(page);
  const original = await exportMap(page);
  await page.getByLabel('Terreno do hexágono').selectOption('Montanha');
  const current = await labels(page);
  page.once('dialog', dialog => dialog.dismiss());
  await importMap(page, original);
  await expect(page.locator('#file-status')).toContainText('cancelada');
  expect(await labels(page)).toEqual(current);
  page.once('dialog', dialog => dialog.accept());
  await importMap(page, original);
  await expect(page.locator('#file-status')).toContainText('Mapa importado');
  expect(await labels(page)).toEqual(edited);
  expect(JSON.parse(await exportMap(page))).toEqual(JSON.parse(original));
  await expect(center(page)).toHaveAccessibleName(/Base das Expedições/);
  await expect(page.locator('img')).toHaveCount(0);
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  expect(await labels(page)).toEqual(current);
  await page.getByRole('button', { name: 'Refazer', exact: true }).click();
  expect(await labels(page)).toEqual(edited);
  await page.reload();
  expect(await labels(page)).toEqual(edited);
});

test('rejects malformed, incompatible, oversized and unreadable imports without changing map, save or history', async ({ page }) => {
  await page.goto('/');
  const current = await labels(page);
  const original = await exportMap(page);
  const invalidVersion = JSON.parse(original);
  invalidVersion.schemaVersion = 99;
  for (const text of ['{"region":', JSON.stringify(invalidVersion), ' '.repeat(1_048_577)]) {
    await importMap(page, text);
    await expect(page.locator('#file-status')).toContainText('Não foi possível importar');
    expect(await labels(page)).toEqual(current);
    expect(await page.evaluate(() => localStorage.getItem('hexmapbuilder.current'))).toBe(original);
    await expect(page.getByRole('button', { name: 'Desfazer', exact: true })).toBeDisabled();
  }
  await page.evaluate(() => { File.prototype.text = () => Promise.reject(new Error('Falha de leitura')); });
  await importMap(page, original);
  await expect(page.locator('#file-status')).toContainText('Falha de leitura');
  expect(await labels(page)).toEqual(current);
});

test('preserves a corrupt saved snapshot until an explicit confirmed replacement', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hexmapbuilder.current', '{broken'));
  await page.goto('/');
  await expect(page.locator('#storage-status')).toContainText('não será sobrescrito');
  await expect(page.locator('#retry-save')).toBeVisible();
  await center(page).click();
  await page.getByLabel('Terreno do hexágono').selectOption('Oceano');
  expect(await page.evaluate(() => localStorage.getItem('hexmapbuilder.current'))).toBe('{broken');
  expect(JSON.parse(await exportMap(page)).region.cells.find((cell: { coordinate: string }) => cell.coordinate === '0506').terrain).toBe('Oceano');
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Tentar salvar novamente' }).click();
  expect(await page.evaluate(() => localStorage.getItem('hexmapbuilder.current'))).toBe('{broken');
  await expect(page.locator('#retry-save')).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Tentar salvar novamente' }).click();
  await expect(page.locator('#storage-status')).toContainText('Salvo neste navegador');
  await expect(page.locator('#retry-save')).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('hexmapbuilder.current'))).not.toBe('{broken');
});

test('reports write failure honestly, preserves last save and allows export and retry', async ({ page }) => {
  await page.goto('/');
  const original = await exportMap(page);
  await page.evaluate(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); };
    Object.assign(window, { restoreStorage: () => { Storage.prototype.setItem = setItem; } });
  });
  await center(page).click();
  await page.getByLabel('Terreno do hexágono').selectOption('Oceano');
  await expect(page.locator('#storage-status')).toContainText('apenas nesta sessão');
  await expect(page.locator('#retry-save')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('hexmapbuilder.current'))).toBe(original);
  const edited = await exportMap(page);
  expect(edited).not.toBe(original);
  await page.evaluate('window.restoreStorage()');
  await page.getByRole('button', { name: 'Tentar salvar novamente' }).click();
  await expect(page.locator('#storage-status')).toContainText('Salvo neste navegador');
  await expect(page.locator('#retry-save')).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('hexmapbuilder.current'))).toBe(edited);
});

test('keeps editor usable when browser storage access is denied', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Denied', 'SecurityError'); } }));
  await page.goto('/');
  await expect(page.locator('#storage-status')).toContainText('Não foi possível recuperar');
  await expect(page.locator('#retry-save')).toBeVisible();
  await center(page).click();
  await page.getByLabel('Terreno do hexágono').selectOption('Oceano');
  expect(JSON.parse(await exportMap(page)).region.cells.find((cell: { coordinate: string }) => cell.coordinate === '0506').terrain).toBe('Oceano');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Tentar salvar novamente' }).click();
  await expect(page.locator('#storage-status')).toContainText('apenas nesta sessão');
  await expect(page.locator('#retry-save')).toBeVisible();
});

test('reloads a generated whitespace-only seed and preserves generation undo and redo', async ({ page }) => {
  await page.goto('/');
  const original = await exportMap(page);
  await page.getByLabel('Semente').fill('   ');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Gerar região', exact: true }).click();
  const generated = await exportMap(page);
  expect(JSON.parse(generated).region.options.seed).toBe('   ');
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  expect(await exportMap(page)).toBe(original);
  await page.getByRole('button', { name: 'Refazer', exact: true }).click();
  expect(await exportMap(page)).toBe(generated);
  await page.reload();
  expect(await exportMap(page)).toBe(generated);
  await expect(page.getByLabel('Semente')).toHaveValue('   ');
});

test('imports an enabled river snapshot without changing cells or continuation', async ({ page }) => {
  await page.goto('/');
  const doc = JSON.parse(await exportMap(page));
  doc.region.river = { enabled: true, path: Array.from({ length: 12 }, (_, row) => `05${String(row + 1).padStart(2, '0')}`) };
  page.once('dialog', dialog => dialog.accept());
  await importMap(page, JSON.stringify(doc));
  await expect(page.locator('#file-status')).toContainText('Mapa importado');
  expect(JSON.parse(await exportMap(page))).toEqual(doc);
  await center(page).click();
  await page.getByRole('button', { name: 'Gerar terreno novamente', exact: true }).click();
  const continuation = await exportMap(page);
  expect(JSON.parse(continuation).region.river).toEqual(doc.region.river);
  await page.reload();
  expect(await exportMap(page)).toBe(continuation);
  page.once('dialog', dialog => dialog.accept());
  await importMap(page, JSON.stringify(doc));
  await expect(page.locator('#file-status')).toContainText('Mapa importado');
  await center(page).click();
  await page.getByRole('button', { name: 'Gerar terreno novamente', exact: true }).click();
  expect(await exportMap(page)).toBe(continuation);
});

test('storage controls fit a narrow screen and do not appear in print', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.screenshot({ path: testInfo.outputPath('storage-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByLabel('Importar mapa')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('storage-mobile.png'), fullPage: true });
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.storage-controls')).toBeHidden();
});
