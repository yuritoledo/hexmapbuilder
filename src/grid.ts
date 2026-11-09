export const terrains = ['Pradaria', 'Floresta', 'Montanha', 'Pântano', 'Deserto', 'Rio', 'Oceano', 'Ártico', 'Selva', 'Litoral'] as const;
export type Terrain = (typeof terrains)[number];
export type DensityId = 'ampla' | 'compacta';
export interface Density {
  id: DensityId;
  label: string;
  columns: number;
  rows: number;
  width: number;
}
export const densities: Record<DensityId, Density> = {
  ampla: { id: 'ampla', label: 'A · Ampla', columns: 7, rows: 9, width: 24 },
  compacta: { id: 'compacta', label: 'B · Compacta', columns: 9, rows: 12, width: 19 },
};
export interface Point { x: number; y: number }
export interface HexGeometry {
  coordinate: string;
  row: number;
  column: number;
  center: Point;
  corners: Point[];
}
export type Danger = 1 | 2 | 3 | 4;
export const dangerNames: Record<Danger, string> = { 1: 'Seguro', 2: 'Inseguro', 3: 'Arriscado', 4: 'Mortal' };
export interface HexCell extends HexGeometry {
  terrain: Terrain;
  danger: Danger;
  expeditionBase?: { name: string; category: 'povoado' };
}
export function createGrid(density: Density): HexGeometry[] {
  const cells: HexGeometry[] = [];
  const radius = density.width / Math.sqrt(3);
  const gridWidth = (density.columns + 0.5) * density.width;
  const gridHeight = (1.5 * density.rows + 0.5) * radius;
  const left = (210 - gridWidth) / 2;
  const top = 45 + (211 - gridHeight) / 2;
  for (let row = 0; row < density.rows; row++) {
    for (let column = 0; column < density.columns; column++) {
      const center = {
        x: left + density.width / 2 + column * density.width + (row % 2) * density.width / 2,
        y: top + radius + row * radius * 1.5,
      };
      cells.push({
        coordinate: `${String(column + 1).padStart(2, '0')}${String(row + 1).padStart(2, '0')}`,
        row, column,
        center,
        corners: Array.from({ length: 6 }, (_, index) => {
          const angle = (index * 60 - 90) * Math.PI / 180;
          return { x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) };
        }),
      });
    }
  }
  return cells;
}
