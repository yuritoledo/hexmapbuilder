import { expect, it } from 'vitest';
import { defaultOptions, generateRegion } from './generation';
import { densities } from './grid';

it('gera local somente no resultado 1 do d6, sem substituir a base', () => {
  // First cell: presence 1, category 6 (marco), name 1. Others: absence 2–6.
  const dice = [1, 6, 1, 2, 3, 4, 5, 6];
  const region = generateRegion({ ...densities.compacta, columns: 3, rows: 2 },
    defaultOptions, () => 3, () => 6, () => dice.shift()!);
  expect(region.cells.map(cell => cell.local)).toEqual([
    { name: 'Velha árvore negra', category: 'marco' }, undefined, undefined, undefined, undefined, undefined,
  ]);
  expect(dice).toHaveLength(0);
  expect(region.cells[1]!.expeditionBase).toEqual({ name: 'Base das Expedições', category: 'povoado' });
});

it('versiona locais e conserva terreno/perigo ao mudar somente o fluxo local', () => {
  const first = generateRegion(densities.compacta, defaultOptions);
  expect(first.version).toBe('region-v3');
  expect(generateRegion(densities.compacta, defaultOptions)).toEqual(first);
  const absent = generateRegion(densities.compacta, defaultOptions, undefined, undefined, () => 6);
  expect(absent.cells.every(cell => !cell.local)).toBe(true);
  expect(first.cells.some(cell => cell.local)).toBe(true);
  const withoutLocals = (region: typeof first) => region.cells.map(cell => ({ ...cell, local: undefined }));
  expect(withoutLocals(first)).toEqual(withoutLocals(absent));
  const water = generateRegion(densities.compacta, { ...defaultOptions, initialTerrain: 'ocean' },
    () => 3, undefined, () => 1);
  expect(water.cells.every(cell => cell.terrain === 'Oceano' && cell.local?.category === 'povoado')).toBe(true);
  expect(water.cells.find(cell => cell.coordinate === '0506')).toMatchObject({
    local: { name: 'Vila da ponte velha', category: 'povoado' },
    expeditionBase: { name: 'Base das Expedições', category: 'povoado' },
  });
});

it.each([
  [1, 'povoado', 'Porto da pedra branca'], [2, 'masmorra', 'Cripta das seis portas'],
  [3, 'ruína', 'Farol apagado'], [4, 'covil', 'Buraco das presas'],
  [5, 'santuário', 'Jardim do silêncio'], [6, 'marco', 'Arco de raízes'],
] as const)('escolhe a categoria %i e o último nome sem novos campos', (roll, category, name) => {
  const dice = [1, roll, 6];
  const region = generateRegion({ ...densities.compacta, columns: 1, rows: 1 },
    defaultOptions, () => 3, () => 1, () => dice.shift()!);
  expect(region.cells[0]!.local).toEqual({ name, category });
  expect(dice).toHaveLength(0);
});

it('conserva o resultado conhecido de local-v1, independente das opções de terreno e perigo', () => {
  const density = { ...densities.compacta, columns: 3, rows: 3 };
  const locals = (options = defaultOptions) => generateRegion(density, options).cells.map(cell => cell.local);
  const expected = [undefined, undefined, undefined, { name: 'Poço dos ecos', category: 'masmorra' },
    undefined, undefined, { name: 'Gruta dos arranhões', category: 'covil' }, undefined, undefined];
  expect(locals()).toEqual(expected);
  expect(locals({ ...defaultOptions, initialTerrain: 'ocean', arid: 'Ártico', forest: 'Selva', water: 'Litoral' })).toEqual(expected);
  expect(generateRegion(density, defaultOptions, undefined, () => 1).cells.map(cell => cell.local)).toEqual(expected);
  expect(locals({ ...defaultOptions, seed: 'outra-semente' })).not.toEqual(expected);
});
