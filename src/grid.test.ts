import { describe, expect, it } from 'vitest';
import { createGrid, densities } from './grid';

describe('grades para comparação A4', () => {
  it.each([['ampla', 63], ['compacta', 108]] as const)('oferece uma região %s com %i coordenadas únicas', (id, count) => {
    const cells = createGrid(densities[id]);
    expect(cells).toHaveLength(count);
    expect(new Set(cells.map(cell => cell.coordinate)).size).toBe(count);
    expect(cells[0]?.coordinate).toBe('0101');
    expect(cells.at(-1)?.coordinate).toBe(id === 'ampla' ? '0709' : '0912');
  });

  it.each(['ampla', 'compacta'] as const)('desenha hexágonos regulares em %s dentro da área útil A4', id => {
    const density = densities[id];
    const cells = createGrid(density);
    for (const cell of cells) {
      expect(cell.corners).toHaveLength(6);
      for (let index = 0; index < 6; index++) {
        const a = cell.corners[index]!;
        const b = cell.corners[(index + 1) % 6]!;
        expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeCloseTo(density.width / Math.sqrt(3), 8);
        expect(a.x).toBeGreaterThanOrEqual(12);
        expect(a.x).toBeLessThanOrEqual(198);
        expect(a.y).toBeGreaterThanOrEqual(45);
        expect(a.y).toBeLessThanOrEqual(256);
      }
    }
    expect(cells[1]!.center.x - cells[0]!.center.x).toBeCloseTo(density.width);
    expect(cells[density.columns]!.center.x - cells[0]!.center.x).toBeCloseTo(density.width / 2);
  });
});
