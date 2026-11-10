import { GENERATION_VERSION, terrainPositions, type GeneratedRegion, type GenerationOptions } from './generation';
import { createGrid, densities, localCategories, terrains, type Danger, type Local, type Terrain } from './grid';
import { MAX_LOCAL_NAME_LENGTH } from './editing';

export const FILE_SCHEMA_VERSION = 1;
export const MAX_FILE_BYTES = 1_048_576;
export const STORAGE_KEY = 'hexmapbuilder.current';

function invalid(): never { throw new Error('Mapa inválido ou incompatível. Use um arquivo exportado por esta versão.'); }
function record(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  if (Object.keys(value).some(key => !keys.includes(key))) return invalid();
  return value as Record<string, unknown>;
}
function member<T extends string>(value: unknown, choices: readonly T[]): T {
  if (typeof value !== 'string' || !choices.includes(value as T)) return invalid();
  return value as T;
}
function name(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) return invalid();
  return value;
}
function counter(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return invalid();
  return value;
}
function local(value: unknown): Local {
  const data = record(value, ['name', 'category']);
  return { name: name(data.name, MAX_LOCAL_NAME_LENGTH), category: member(data.category, localCategories) };
}

/** Geometry is derived, never trusted from a file. All edited data is explicit. */
export function encodeRegion(region: GeneratedRegion): string {
  return JSON.stringify({ format: 'hexmapbuilder', schemaVersion: FILE_SCHEMA_VERSION, region: {
    version: region.version, options: region.options, density: region.density,
    centerCoordinate: region.centerCoordinate, rerolls: region.rerolls,
    river: region.river,
    cells: region.cells.map(({ coordinate, terrain, danger, local, expeditionBase }) => ({ coordinate, terrain, danger, local, expeditionBase })),
  } });
}

export function decodeRegion(text: string): GeneratedRegion {
  if (new TextEncoder().encode(text).byteLength > MAX_FILE_BYTES) throw new Error('Arquivo excede o limite de 1 MiB.');
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return invalid(); }
  const document = record(parsed, ['format', 'schemaVersion', 'region']);
  if (document.format !== 'hexmapbuilder' || document.schemaVersion !== FILE_SCHEMA_VERSION) return invalid();
  const data = record(document.region, ['version', 'options', 'density', 'centerCoordinate', 'rerolls', 'river', 'cells']);
  if (data.version !== GENERATION_VERSION || data.centerCoordinate !== '0506') return invalid();
  const fields = record(data.options, ['seed', 'initialTerrain', 'arid', 'forest', 'water']);
  const options: GenerationOptions = {
    // Seeds are literal text; unlike local names, whitespace-only seeds are valid.
    seed: typeof fields.seed === 'string' && fields.seed.length >= 1 && fields.seed.length <= 80 ? fields.seed : invalid(),
    initialTerrain: member(fields.initialTerrain, ['random', ...terrainPositions]),
    arid: member(fields.arid, ['Deserto', 'Ártico']), forest: member(fields.forest, ['Floresta', 'Selva']),
    water: member(fields.water, ['Rio', 'Litoral']),
  };
  const density = record(data.density, ['id', 'label', 'columns', 'rows', 'width']);
  if (Object.entries(densities.compacta).some(([key, value]) => density[key] !== value)) return invalid();
  const counts = record(data.rerolls, ['terrain', 'local', 'danger']);
  const rerolls = { terrain: counter(counts.terrain), local: counter(counts.local), danger: counter(counts.danger) };
  if (!Array.isArray(data.cells) || data.cells.length !== 108) return invalid();
  const cells = data.cells;
  const canonical = createGrid(densities.compacta);
  const overlay = record(data.river, ['enabled', 'path']);
  if (typeof overlay.enabled !== 'boolean' || !Array.isArray(overlay.path)) return invalid();
  const path: string[] = overlay.path.map(coordinate => member(coordinate, canonical.map(cell => cell.coordinate)));
  if (new Set(path).size !== path.length || (!overlay.enabled && path.length !== 0)) return invalid();
  if (overlay.enabled) {
    if (!path.length || !path[0]!.endsWith('01') || !path.at(-1)!.endsWith('12')) return invalid();
    for (let index = 1; index < path.length; index++) {
      const previous = canonical.find(cell => cell.coordinate === path[index - 1])!;
      const next = canonical.find(cell => cell.coordinate === path[index])!;
      const dr = Math.abs(previous.row - next.row);
      const dc = next.column - previous.column;
      if (!(dr === 0 && Math.abs(dc) === 1) &&
          !(dr === 1 && (dc === 0 || dc === (previous.row % 2 === 0 ? -1 : 1)))) return invalid();
    }
  }
  const river = { enabled: overlay.enabled, path };
  return {
    version: GENERATION_VERSION, options, density: { ...densities.compacta }, centerCoordinate: '0506', rerolls, river,
    cells: canonical.map((geometry, index) => {
      const cell = record(cells[index], ['coordinate', 'terrain', 'danger', 'local', 'expeditionBase']);
      if (cell.coordinate !== geometry.coordinate || ![1, 2, 3, 4].includes(cell.danger as number)) return invalid();
      const base = cell.expeditionBase;
      if (geometry.coordinate === '0506') {
        const permanent = record(base, ['name', 'category']);
        if (permanent.name !== 'Base das Expedições' || permanent.category !== 'povoado') return invalid();
      } else if (base !== undefined) return invalid();
      return {
        ...geometry, terrain: member<Terrain>(cell.terrain, terrains), danger: cell.danger as Danger,
        ...(cell.local !== undefined ? { local: local(cell.local) } : {}),
        ...(geometry.coordinate === '0506' ? { expeditionBase: { name: 'Base das Expedições', category: 'povoado' as const } } : {}),
      };
    }),
  };
}
