import { dangerFromRoll, roll2d6, seededDie, terrainNames, terrainPositions, transitionTerrain, type GeneratedRegion } from './generation';
import type { Danger, Local, Terrain } from './grid';
import { generateLocal } from './locals';

export type CellEdit =
  | { component: 'terrain'; value: Terrain }
  | { component: 'danger'; value: Danger }
  | { component: 'local'; value: Local | undefined };
export const MAX_LOCAL_NAME_LENGTH = 120;

export function editCell(region: GeneratedRegion, coordinate: string, edit: CellEdit): GeneratedRegion {
  if (!region.cells.some(cell => cell.coordinate === coordinate)) throw new Error('Hexágono inexistente.');
  if (edit.component === 'local' && edit.value &&
      (!edit.value.name.trim() || edit.value.name.length > MAX_LOCAL_NAME_LENGTH)) {
    throw new Error(`Nome do local deve ter de 1 a ${MAX_LOCAL_NAME_LENGTH} caracteres, sem ser apenas espaços.`);
  }
  return {
    ...region,
    cells: region.cells.map(cell => cell.coordinate === coordinate ? { ...cell, [edit.component]: edit.value } : cell),
  };
}

export type RerollComponent = keyof GeneratedRegion['rerolls'];

export function rerollComponent(
  region: GeneratedRegion, coordinate: string, component: RerollComponent,
  rollDie: () => number = seededDie(`${region.options.seed}\0edit-v1\0${component}\0${region.rerolls[component]}`),
): GeneratedRegion {
  const cell = region.cells.find(cell => cell.coordinate === coordinate);
  if (!cell) throw new Error('Hexágono inexistente.');
  let edit: CellEdit;
  if (component === 'danger') {
    const roll = rollDie();
    edit = { component, value: dangerFromRoll(roll) };
  } else if (component === 'local') {
    edit = { component, value: generateLocal(rollDie) };
  } else {
    const names = terrainNames(region.options);
    const position = terrainPositions.find(position => names[position] === cell.terrain)
      ?? (cell.terrain === 'Deserto' || cell.terrain === 'Ártico' ? 'arid'
        : cell.terrain === 'Floresta' || cell.terrain === 'Selva' ? 'forest' : 'water');
    edit = { component: 'terrain', value: names[transitionTerrain(position, roll2d6(rollDie), () => roll2d6(rollDie))] };
  }
  const edited = editCell(region, coordinate, edit);
  return { ...edited, rerolls: { ...region.rerolls, [component]: region.rerolls[component] + 1 } };
}
