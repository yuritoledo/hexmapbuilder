import { describe, expect, it } from 'vitest';
import { defaultOptions, generateRegion } from './generation';
import { densities } from './grid';
import { setRiverEnabled } from './river';
import { editCell, rerollComponent } from './editing';
import { RegionHistory } from './history';

describe('rio opcional', () => {
  it('começa desligado com estado serializável separado dos terrenos', () => {
    const region = generateRegion(densities.compacta, defaultOptions);
    expect(region.river).toEqual({ enabled: false, path: [] });
    expect(JSON.parse(JSON.stringify(region)).river).toEqual(region.river);
  });
  it.each([
    [9, 12], [7, 9], [1, 12], [9, 1], [1, 1], [2, 2],
  ])('gera uma rota norte–sul única e adjacente em %i × %i', (columns, rows) => {
    for (const seed of ['terras-01', 'rio-2', '', 'águas <>&']) {
      const original = generateRegion({ ...densities.compacta, columns, rows }, { ...defaultOptions, seed });
      const enabled = setRiverEnabled(original, true);
      expect(enabled.river.enabled).toBe(true);
      const route = enabled.river.path.map(coordinate => enabled.cells.find(cell => cell.coordinate === coordinate)!);
      expect(route).toHaveLength(rows);
      expect(new Set(enabled.river.path).size).toBe(rows);
      expect(route[0]!.row).toBe(0);
      expect(route.at(-1)!.row).toBe(rows - 1);
      route.slice(1).forEach((cell, index) => {
        const previous = route[index]!;
        expect(cell.row - previous.row).toBe(1);
        expect(Math.hypot(cell.center.x - previous.center.x, cell.center.y - previous.center.y))
          .toBeCloseTo(original.density.width);
      });
      expect(enabled.cells).toEqual(original.cells);
      expect(enabled.options).toEqual(original.options);
      expect(enabled.rerolls).toEqual(original.rerolls);
      expect(original.river).toEqual({ enabled: false, path: [] });
      expect(setRiverEnabled(original, true)).toEqual(enabled);
      expect(setRiverEnabled(enabled, false)).toEqual(original);
    }
  });
  it('preserva o rio em edições e rolagens de qualquer componente, inclusive na água', () => {
    let region = setRiverEnabled(generateRegion(densities.compacta, defaultOptions), true);
    const river = structuredClone(region.river);
    const coordinate = river.path[0]!;
    const base = region.cells.find(cell => cell.coordinate === '0506')!.expeditionBase;
    for (const terrain of ['Oceano', 'Rio', 'Litoral'] as const) {
      region = editCell(region, coordinate, { component: 'terrain', value: terrain });
      expect(region.river).toEqual(river);
      for (const component of ['terrain', 'local', 'danger'] as const) {
        const next = rerollComponent(region, coordinate, component);
        expect(next.river).toEqual(river);
        expect(next.cells.filter(cell => cell.coordinate !== coordinate))
          .toEqual(region.cells.filter(cell => cell.coordinate !== coordinate));
        expect(next.cells.find(cell => cell.coordinate === '0506')!.expeditionBase).toEqual(base);
        region = next;
      }
    }
  });

  it('desfaz/refaz o estado completo e não consome rolagens ao alternar o rio', () => {
    const initial = generateRegion(densities.compacta, defaultOptions);
    const history = new RegionHistory(initial);
    const enabled = setRiverEnabled(initial, true);
    history.apply(enabled);
    const edited = rerollComponent(history.current, enabled.river.path[0]!, 'terrain');
    history.apply(edited);
    history.apply(setRiverEnabled(history.current, false));
    expect(history.undo()).toBe(true);
    expect(history.current).toEqual(edited);
    expect(history.undo()).toBe(true);
    expect(history.current).toEqual(enabled);
    expect(history.undo()).toBe(true);
    expect(history.current).toEqual(initial);
    history.redo(); history.redo(); history.redo();
    expect(history.current).toEqual(setRiverEnabled(edited, false));
    const continuation = rerollComponent(history.current, '0506', 'local');
    expect(continuation.cells).toEqual(rerollComponent(edited, '0506', 'local').cells);
    history.undo();
    history.apply(setRiverEnabled(history.current, false));
    expect(history.canRedo).toBe(false);
  });

  it('usa uma sequência independente da geração e das variantes', () => {
    const region = generateRegion(densities.compacta, defaultOptions);
    const path = setRiverEnabled(region, true).river.path;
    expect(setRiverEnabled(generateRegion(densities.compacta, {
      ...defaultOptions, initialTerrain: 'ocean', arid: 'Ártico', forest: 'Selva', water: 'Litoral',
    }, () => 3, () => 6, () => 1), true).river.path).toEqual(path);
    expect(setRiverEnabled(generateRegion(densities.compacta, { ...defaultOptions, seed: 'other-river' }), true).river.path)
      .not.toEqual(path);
    expect(setRiverEnabled(JSON.parse(JSON.stringify(region)), true).river.path).toEqual(path);
  });
});
