import type { Page } from '@playwright/test';

export async function exportMap(page: Page): Promise<string> {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar mapa', exact: true }).click();
  const stream = await (await pending).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}
