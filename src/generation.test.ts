import { describe, expect, it } from 'vitest';
import { initialTerrain, transitionTerrain, roll2d6, generateRegion, defaultOptions } from './generation';
import { densities } from './grid';

describe('tabela inicial de 2d6', () => {
  it.each([
    [2, 'arid'], [3, 'swamp'], [4, 'grassland'], [5, 'grassland'], [6, 'grassland'],
    [7, 'forest'], [8, 'forest'], [9, 'water'], [10, 'water'], [11, 'ocean'], [12, 'mountain'],
  ] as const)('converte %i em %s', (total, terrain) => {
    expect(initialTerrain(total)).toBe(terrain);
  });
});

describe('transição no ciclo de sete terrenos', () => {
  it.each([
    [2, 'swamp'], [3, 'swamp'], [4, 'arid'], [8, 'arid'], [9, 'grassland'], [11, 'grassland'],
  ] as const)('aplica a fronteira %i ao deserto', (total, terrain) => {
    expect(transitionTerrain('arid', total, () => 12)).toBe(terrain);
  });
  it('fecha o ciclo e rola a tabela inicial somente no resultado 12', () => {
    expect(transitionTerrain('mountain', 2, () => { throw Error('rolagem indevida'); })).toBe('arid');
    expect(transitionTerrain('ocean', 9, () => { throw Error('rolagem indevida'); })).toBe('arid');
    expect(transitionTerrain('arid', 12, () => 11)).toBe('ocean');
  });
});

it('soma dois d6 reais e conserva as 36 combinações, sem sortear totais uniformes', () => {
  const counts = Array<number>(11).fill(0);
  for (let first = 1; first <= 6; first++) {
    for (let second = 1; second <= 6; second++) {
      const dice = [first, second];
      const total = roll2d6(() => dice.shift()!);
      expect(dice).toHaveLength(0);
      counts[total - 2]!++;
    }
  }
  expect(counts).toEqual([1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1]);
});

describe('expansão a partir de um vizinho já gerado', () => {
  it('visita camadas e desempata por linha e coluna em uma grade deslocada', () => {
    const region = generateRegion({ ...densities.compacta, columns: 3, rows: 3 }, {
      ...defaultOptions, initialTerrain: 'arid',
    }, () => 1);
    expect(region.centerCoordinate).toBe('0202');
    expect(region.cells.map(cell => cell.terrain)).toEqual([
      'Pradaria', 'Pântano', 'Pântano',
      'Pântano', 'Deserto', 'Pântano',
      'Pradaria', 'Pântano', 'Pântano',
    ]);
  });
  it('usa o centro superior/esquerdo em dimensões pares e a variante escolhida', () => {
    const region = generateRegion(densities.compacta, {
      ...defaultOptions, initialTerrain: 'forest', forest: 'Selva',
    }, () => 3);
    expect(region.centerCoordinate).toBe('0506');
    expect(region.cells).toHaveLength(108);
    expect(region.cells.every(cell => cell.terrain === 'Selva')).toBe(true);
  });

  it('conserva o resultado conhecido de terrain-v1 para terras-01', () => {
    const region = generateRegion({ ...densities.compacta, columns: 3, rows: 3 }, defaultOptions);
    expect(region.version).toBe('terrain-v1');
    expect(region.cells.map(cell => cell.terrain)).toEqual([
      'Floresta', 'Floresta', 'Rio',
      'Rio', 'Rio', 'Rio',
      'Rio', 'Rio', 'Rio',
    ]);
  });
  it('repete uma semente e preserva os metadados, mas muda ao trocar a semente', () => {
    const options = { ...defaultOptions, seed: 'campanha-á-42' };
    const first = generateRegion(densities.compacta, options);
    expect(generateRegion(densities.compacta, options)).toEqual(first);
    expect(first.version).toBe('terrain-v1');
    expect(first.options).toEqual(options);
    expect(generateRegion(densities.compacta, { ...options, seed: 'campanha-b-42' }).cells)
      .not.toEqual(first.cells);
  });

  it.each([
    ['arid', 'Ártico'], ['forest', 'Selva'], ['water', 'Litoral'],
  ] as const)('aplica a variante de %s sem alterar as posições', (initialTerrain, terrain) => {
    const region = generateRegion(densities.compacta, {
      ...defaultOptions, initialTerrain, arid: 'Ártico', forest: 'Selva', water: 'Litoral',
    }, () => 3);
    expect(region.cells.every(cell => cell.terrain === terrain)).toBe(true);
  });
  it('consome dois dados extras na nova rolagem e usa seu resultado como referência', () => {
    // Center rolls ocean (5+6), first transition rolls 12 (6+6), reroll yields arid (1+1).
    const dice = [5, 6, 6, 6, 1, 1];
    const region = generateRegion({ ...densities.compacta, columns: 3, rows: 1 }, defaultOptions,
      () => dice.shift() ?? 3);
    expect(region.centerCoordinate).toBe('0201');
    expect(region.cells.map(cell => cell.terrain)).toEqual(['Deserto', 'Oceano', 'Oceano']);
    expect(dice).toHaveLength(0);
  });
});
