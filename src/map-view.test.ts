import { describe, expect, it } from 'vitest';
import { terrains } from './grid';
import { terrainSymbol } from './map-view';

describe('símbolos cartográficos', () => {
  it.each(['Floresta', 'Deserto', 'Selva', 'Rio', 'Oceano'] as const)(
    'usa vetores Kenney locais para %s', terrain => {
      const symbol = terrainSymbol(terrain, 21, 259, 0.62);
      expect(symbol).toContain('data-source="kenney"');
      expect(symbol).toContain('translate(21 259) scale(0.62)');
      expect(symbol).toContain('<svg');
      expect(symbol).toContain('<path');
      expect(symbol).not.toMatch(/<(image|script)|(?:href|src)=/);
    },
  );

  it('gira o rio em 90 graus sem mudar a caixa do símbolo', () => {
    const symbol = terrainSymbol('Rio', 0, 0);
    expect(symbol).toContain('rotate(90)');
    expect(symbol).toContain('width="12" height="10"');
  });
  it.each(terrains)('mantém um símbolo para %s', terrain => {
    expect(terrainSymbol(terrain, 0, 0)).toContain('<path');
  });
});
