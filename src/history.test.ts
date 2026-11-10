import { expect, it } from 'vitest';
import { defaultOptions, generateRegion } from './generation';
import { densities } from './grid';
import { editCell, rerollComponent } from './editing';
import { RegionHistory } from './history';

it('restores complete snapshots including metadata and continuation through undo and redo', () => {
  const original = generateRegion(densities.compacta, defaultOptions);
  const history = new RegionHistory(original);
  expect(history.canUndo).toBe(false);
  expect(history.canRedo).toBe(false);
  const rolled = rerollComponent(history.current, '0506', 'local');
  history.apply(rolled);
  const replacement = generateRegion(densities.compacta, { ...defaultOptions, seed: 'new', forest: 'Selva' });
  history.apply(replacement);
  expect(history.undo()).toBe(true);
  expect(history.current).toEqual(rolled);
  expect(history.undo()).toBe(true);
  expect(history.current).toEqual(original);
  expect(history.undo()).toBe(false);
  expect(history.redo()).toBe(true);
  expect(history.current).toEqual(rolled);
  expect(rerollComponent(history.current, '0506', 'local')).toEqual(rerollComponent(rolled, '0506', 'local'));
  expect(history.redo()).toBe(true);
  expect(history.current).toEqual(replacement);
  expect(history.redo()).toBe(false);
});

it('keeps redo for no-op edits and clears it only after a new accepted change', () => {
  const original = generateRegion(densities.compacta, defaultOptions);
  const history = new RegionHistory(original);
  history.apply(editCell(original, '0101', { component: 'terrain', value: 'Oceano' }));
  history.undo();
  history.apply(history.current);
  expect(history.canRedo).toBe(true);
  history.apply(editCell(history.current, '0101', { component: 'danger', value: 4 }));
  expect(history.canRedo).toBe(false);
  expect(history.redo()).toBe(false);
});

it('owns nested snapshots independently of callers and retains many session actions', () => {
  const original = generateRegion(densities.compacta, defaultOptions);
  const history = new RegionHistory(original);
  original.options.seed = 'mutated';
  original.cells[0]!.center.x = -1;
  const detached = history.current;
  detached.cells[0]!.terrain = 'Oceano';
  expect(history.current.options.seed).toBe('terras-01');
  expect(history.current.cells[0]!.center.x).not.toBe(-1);
  expect(history.current.cells[0]!.terrain).not.toBe('Oceano');
  const initial = history.current;
  for (let i = 0; i < 120; i++) history.apply(rerollComponent(history.current, '0101', 'danger'));
  for (let i = 0; i < 120; i++) expect(history.undo()).toBe(true);
  expect(history.current).toEqual(initial);
  expect(history.canUndo).toBe(false);
});
