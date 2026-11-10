import { expect, it } from 'vitest';
import { defaultOptions, generateRegion } from './generation';
import { densities } from './grid';
import { editCell, rerollComponent } from './editing';

it('starts a serializable independent continuation without changing initial generation', () => {
  const region = generateRegion(densities.compacta, defaultOptions);
  expect(region.rerolls).toEqual({ terrain: 0, local: 0, danger: 0 });
});

it('edits only the chosen component and preserves neighbors, applied metadata and the base', () => {
  const original = generateRegion(densities.compacta, defaultOptions);
  const before = structuredClone(original);
  const center = original.cells.find(cell => cell.coordinate === '0506')!;
  const terrain = editCell(original, '0506', { component: 'terrain', value: 'Oceano' });
  expect(terrain.cells.find(cell => cell.coordinate === '0506')).toEqual({ ...center, terrain: 'Oceano' });
  expect(terrain.cells.filter(cell => cell.coordinate !== '0506')).toEqual(original.cells.filter(cell => cell.coordinate !== '0506'));
  const local = editCell(terrain, '0506', { component: 'local', value: { name: ' <Torre> & "A" ', category: 'ruína' } });
  expect(local.cells.find(cell => cell.coordinate === '0506')?.local).toEqual({ name: ' <Torre> & "A" ', category: 'ruína' });
  const danger = editCell(local, '0506', { component: 'danger', value: 4 });
  expect(danger.cells.find(cell => cell.coordinate === '0506')).toEqual({ ...local.cells.find(cell => cell.coordinate === '0506'), danger: 4 });
  const removed = editCell(danger, '0506', { component: 'local', value: undefined });
  expect(removed.cells.find(cell => cell.coordinate === '0506')?.local).toBeUndefined();
  expect(removed.cells.find(cell => cell.coordinate === '0506')?.expeditionBase).toEqual(center.expeditionBase);
  expect(removed.options).toEqual(original.options);
  expect(removed.rerolls).toEqual(original.rerolls);
  expect(original).toEqual(before);
});

it('rerolls terrain from its own current position, not a neighbor, with the applied variants', () => {
  const region = generateRegion(densities.compacta, { ...defaultOptions, arid: 'Ártico' });
  const edited = editCell(region, '0101', { component: 'terrain', value: 'Montanha' });
  const next = rerollComponent(edited, '0101', 'terrain', () => 1);
  expect(next.cells[0]).toEqual({ ...edited.cells[0], terrain: 'Ártico' });
  expect(next.cells.slice(1)).toEqual(edited.cells.slice(1));
  expect(next.rerolls).toEqual({ terrain: 1, local: 0, danger: 0 });
  expect(edited.rerolls.terrain).toBe(0);
});

it('consumes the extra 2d6 only for twelve and applies current map variants', () => {
  const region = generateRegion(densities.compacta, { ...defaultOptions, forest: 'Selva' });
  const dice = [6, 6, 3, 4];
  const next = rerollComponent(region, '0506', 'terrain', () => dice.shift()!);
  expect(next.cells.find(cell => cell.coordinate === '0506')?.terrain).toBe('Selva');
  expect(dice).toEqual([]);
});

it.each([1, 2, 3, 4, 5, 6])('rerolls only danger using the d6 boundary %i', roll => {
  const region = generateRegion(densities.compacta, defaultOptions);
  const next = rerollComponent(region, '0101', 'danger', () => roll);
  expect(next.cells[0]).toEqual({ ...region.cells[0], danger: [1, 2, 2, 3, 3, 4][roll - 1] });
  expect(next.cells.slice(1)).toEqual(region.cells.slice(1));
  expect(next.rerolls).toEqual({ terrain: 0, local: 0, danger: 1 });
});

it('rerolls local presence, category and name without removing the permanent base', () => {
  const region = generateRegion(densities.compacta, defaultOptions);
  const dice = [1, 3, 1];
  const present = rerollComponent(region, '0506', 'local', () => dice.shift()!);
  const center = region.cells.find(cell => cell.coordinate === '0506')!;
  expect(present.cells.find(cell => cell.coordinate === '0506')).toEqual({ ...center, local: { name: 'Torre partida', category: 'ruína' } });
  expect(dice).toEqual([]);
  for (const roll of [2, 3, 4, 5, 6]) {
    const absent = rerollComponent(present, '0506', 'local', () => roll);
    expect(absent.cells.find(cell => cell.coordinate === '0506')).toEqual({ ...center, local: undefined });
    expect(absent.cells.filter(cell => cell.coordinate !== '0506')).toEqual(region.cells.filter(cell => cell.coordinate !== '0506'));
    expect(absent.rerolls).toEqual({ terrain: 0, local: 2, danger: 0 });
  }
});

it('rejects blank or oversized local names before changing state', () => {
  const region = generateRegion(densities.compacta, defaultOptions);
  for (const name of ['  ', 'x'.repeat(121)]) {
    expect(() => editCell(region, '0101', { component: 'local', value: { name, category: 'ruína' } })).toThrow('Nome');
  }
});

it('serializes continuation and keeps each component stream independent', () => {
  const region = generateRegion(densities.compacta, defaultOptions);
  const first = rerollComponent(region, '0101', 'local');
  const resumed = JSON.parse(JSON.stringify(first));
  expect(rerollComponent(resumed, '0506', 'local')).toEqual(rerollComponent(first, '0506', 'local'));
  const interleaved = rerollComponent(rerollComponent(first, '0101', 'terrain'), '0101', 'danger');
  expect(rerollComponent(interleaved, '0506', 'local').cells.find(cell => cell.coordinate === '0506')?.local)
    .toEqual(rerollComponent(first, '0506', 'local').cells.find(cell => cell.coordinate === '0506')?.local);
  expect(() => rerollComponent(region, '9999', 'terrain')).toThrow('Hexágono');
  expect(region.rerolls).toEqual({ terrain: 0, local: 0, danger: 0 });
});
