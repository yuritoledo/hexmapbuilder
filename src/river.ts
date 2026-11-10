import { seededDie, type GeneratedRegion } from './generation';

/** river-v1: independent seed stream; one southward neighbor per row. */
export function setRiverEnabled(region: GeneratedRegion, enabled: boolean): GeneratedRegion {
  if (!enabled) return { ...region, river: { enabled: false, path: [] } };
  if (region.river.enabled) return region;
  const die = seededDie(`${region.options.seed}\0river-v1`);
  const { columns, rows } = region.density;
  let column = ((die() - 1) * 6 + die() - 1) % columns;
  const path: string[] = [];
  for (let row = 0; row < rows; row++) {
    path.push(region.cells[row * columns + column]!.coordinate);
    if (row === rows - 1) break;
    const candidates = [column, column + (row % 2 === 0 ? -1 : 1)]
      .filter(candidate => candidate >= 0 && candidate < columns).sort((a, b) => a - b);
    const roll = die();
    column = candidates.length === 1 ? candidates[0]! : candidates[roll <= 3 ? 0 : 1]!;
  }
  return { ...region, river: { enabled: true, path } };
}
