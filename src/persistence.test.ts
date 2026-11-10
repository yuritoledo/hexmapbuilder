import { expect, it } from 'vitest';
import { defaultOptions, generateRegion } from './generation';
import { densities } from './grid';
import { editCell, rerollComponent } from './editing';
import { decodeRegion, encodeRegion } from './persistence';

it('round trips exact edited state and continues each independent reroll stream', () => {
  let region = generateRegion(densities.compacta, { ...defaultOptions, seed: '  <svg> & "á"  ' });
  region = editCell(region, '0506', { component: 'terrain', value: 'Oceano' });
  region = editCell(region, '0506', { component: 'local', value: { name: ' <img src=x> & "Torre" ', category: 'ruína' } });
  for (const component of ['terrain', 'danger', 'local'] as const) region = rerollComponent(region, '0101', component);
  const restored = decodeRegion(encodeRegion(region));
  expect(restored).toEqual(region);
  expect(restored).not.toBe(region);
  for (const component of ['terrain', 'danger', 'local'] as const) {
    expect(rerollComponent(restored, '0506', component)).toEqual(rerollComponent(region, '0506', component));
  }
});

it.each([' ', '   ', '\t\n'])('preserves valid whitespace seed %j', seed => {
  const region = generateRegion(densities.compacta, { ...defaultOptions, seed });
  expect(decodeRegion(encodeRegion(region))).toEqual(region);
});
// Mutate serialized public documents, never private validator helpers.
it.each([
  ['format', 'other'], ['schemaVersion', 0], ['region.version', 'legacy'],
  ['region.options.seed', 'x'.repeat(81)], ['region.options.forest', 'unknown'],
  ['region.density.columns', 10], ['region.cells.length', 107],
  ['region.cells.0.coordinate', '0201'], ['region.cells.0.coordinate', '9999'],
  ['region.cells.0.terrain', '<svg>'], ['region.cells.0.danger', 0],
  ['region.cells.0.local', { name: ' ', category: 'ruína' }],
  ['region.cells.0.local', { name: 'x'.repeat(121), category: 'ruína' }],
  ['region.cells.0.local', { name: 'A', category: 'base' }],
  ['region.cells.49.expeditionBase', null],
  ['region.cells.0.expeditionBase', { name: 'Base das Expedições', category: 'povoado' }],
  ['region.cells.49.expeditionBase.name', 'Other'], ['region.centerCoordinate', '0101'],
  ['region.rerolls.local', -1], ['region.rerolls.terrain', 1e30],
  ['region.rerolls.danger', 0.5], ['region.rerolls', null], ['region.future', true],
])('rejects invalid %s before returning any state', (path, value) => {
  const doc = JSON.parse(encodeRegion(generateRegion(densities.compacta, defaultOptions)));
  const parts = String(path).split('.');
  let target: Record<string, unknown> = doc;
  for (const part of parts.slice(0, -1)) target = target[part] as Record<string, unknown>;
  target[parts.at(-1)!] = value;
  expect(() => decodeRegion(JSON.stringify(doc))).toThrow(/inválid|incompatível/i);
});

it('rejects malformed, truncated, nonfinite and oversized input', () => {
  for (const text of ['null', '{}', '[]', '{', '{"schemaVersion":1e999}', ' '.repeat(1_048_577)]) {
    expect(() => decodeRegion(text)).toThrow(/inválid|incompatível|limite/i);
  }
});

it('preserves disabled and enabled river snapshots with canonical north to south adjacency', () => {
  const region = generateRegion(densities.compacta, defaultOptions);
  expect(region.river).toEqual({ enabled: false, path: [] });
  const river = { enabled: true, path: Array.from({ length: 12 }, (_, row) => `05${String(row + 1).padStart(2, '0')}`) };
  expect(decodeRegion(encodeRegion({ ...region, river }))).toEqual({ ...region, river });
});

it.each([
  { enabled: false, path: ['0501'] }, { enabled: true, path: [] },
  { enabled: 'yes', path: [] }, { enabled: true, path: ['0501', '0512'] },
  { enabled: true, path: ['0501', '0501', '0512'] },
  { enabled: true, path: ['0502', '0512'] }, { enabled: true, path: ['0001', '0512'] },
  { enabled: true, path: ['0501', '0511'] },
])('rejects malformed river %j', river => {
  const doc = JSON.parse(encodeRegion(generateRegion(densities.compacta, defaultOptions)));
  doc.region.river = river;
  expect(() => decodeRegion(JSON.stringify(doc))).toThrow(/inválid|incompatível/i);
});
