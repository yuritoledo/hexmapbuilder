import { createGrid, type Density, type HexCell, type Terrain } from './grid';
export const terrainPositions = ['arid', 'swamp', 'grassland', 'forest', 'water', 'ocean', 'mountain'] as const;
export type TerrainPosition = (typeof terrainPositions)[number];

export function initialTerrain(total: number): TerrainPosition {
  if (total === 2) return 'arid';
  if (total === 3) return 'swamp';
  if (total <= 6) return 'grassland';
  if (total <= 8) return 'forest';
  if (total <= 10) return 'water';
  if (total === 11) return 'ocean';
  return 'mountain';
}

export function transitionTerrain(reference: TerrainPosition, total: number, reroll: () => number): TerrainPosition {
  if (total === 12) return initialTerrain(reroll());
  const advance = total <= 3 ? 1 : total <= 8 ? 0 : 2;
  return terrainPositions[(terrainPositions.indexOf(reference) + advance) % terrainPositions.length]!;
}

export function roll2d6(rollDie: () => number): number {
  return rollDie() + rollDie();
}

export const GENERATION_VERSION = 'region-v2';
export interface GenerationOptions {
  seed: string;
  initialTerrain: TerrainPosition | 'random';
  arid: 'Deserto' | 'Ártico';
  forest: 'Floresta' | 'Selva';
  water: 'Rio' | 'Litoral';
}
export const defaultOptions: GenerationOptions = {
  seed: 'terras-01', initialTerrain: 'random', arid: 'Deserto', forest: 'Floresta', water: 'Rio',
};
export function terrainNames(options: GenerationOptions): Record<TerrainPosition, Terrain> {
  return {
    arid: options.arid, swamp: 'Pântano', grassland: 'Pradaria', forest: options.forest,
    water: options.water, ocean: 'Oceano', mountain: 'Montanha',
  };
}
export interface GeneratedRegion {
  version: string;
  options: GenerationOptions;
  density: Density;
  centerCoordinate: string;
  cells: HexCell[];
}

// FNV-1a over UTF-16 code units, followed by Mulberry32. This sequence belongs to terrain-v1.
function seededDie(seed: string): () => number {
  let state = 2166136261;
  for (let index = 0; index < seed.length; index++) {
    state = Math.imul(state ^ seed.charCodeAt(index), 16777619);
  }
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return 1 + Math.floor(((value ^ (value >>> 14)) >>> 0) / 4294967296 * 6);
  };
}

export function generateRegion(
  density: Density, options: GenerationOptions, rollDie: () => number = seededDie(options.seed),
  rollDanger: () => number = seededDie(`${options.seed}\0danger-v1`),
): GeneratedRegion {
  const cells = createGrid(density);
  const centerIndex = Math.floor((density.rows - 1) / 2) * density.columns + Math.floor((density.columns - 1) / 2);
  const positions = new Map<number, TerrainPosition>();
  positions.set(centerIndex, options.initialTerrain === 'random' ? initialTerrain(roll2d6(rollDie)) : options.initialTerrain);
  const queue = [centerIndex];
  for (let head = 0; head < queue.length; head++) {
    const referenceIndex = queue[head]!;
    const cell = cells[referenceIndex]!;
    // Odd-row offset: row/column coordinates match the pointy-top SVG geometry.
    const diagonal = cell.row % 2 === 0 ? -1 : 1;
    const neighbors = [
      [cell.row - 1, cell.column], [cell.row - 1, cell.column + diagonal],
      [cell.row, cell.column - 1], [cell.row, cell.column + 1],
      [cell.row + 1, cell.column], [cell.row + 1, cell.column + diagonal],
    ].filter(([row, column]) => row! >= 0 && row! < density.rows && column! >= 0 && column! < density.columns)
      .map(([row, column]) => row! * density.columns + column!).sort((a, b) => a - b);
    for (const index of neighbors) {
      if (positions.has(index)) continue;
      positions.set(index, transitionTerrain(positions.get(referenceIndex)!, roll2d6(rollDie), () => roll2d6(rollDie)));
      queue.push(index);
    }
  }
  const names = terrainNames(options);
  return {
    version: GENERATION_VERSION, options: { ...options }, density: { ...density },
    centerCoordinate: cells[centerIndex]!.coordinate,
    cells: cells.map((cell, index) => {
      const roll = rollDanger();
      const danger = roll === 1 ? 1 : roll <= 3 ? 2 : roll <= 5 ? 3 : 4;
      return {
        ...cell, terrain: names[positions.get(index)!], danger,
        ...(index === centerIndex ? { expeditionBase: { name: 'Base das Expedições', category: 'povoado' as const } } : {}),
      };
    }),
  };
}
