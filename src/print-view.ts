import { dangerNames } from './grid';
import type { GeneratedRegion } from './generation';
import { mapSheet } from './map-view';

export interface PrintVisibility {
  showLocations: boolean;
  showDanger: boolean;
}

/** Render a disposable print projection. Never modify the current region. */
export function printMap(container: HTMLElement, region: GeneratedRegion, visibility: PrintVisibility): void {
  const cells = region.cells.map(cell => {
    const projected = { ...cell };
    if (!visibility.showDanger) projected.danger = 1;
    if (!visibility.showLocations) {
      delete projected.local;
      delete projected.expeditionBase;
    }
    return projected;
  });
  mapSheet(container, { ...region, cells });
  const legend = container.querySelector('.danger-legend')!;
  if (visibility.showDanger) {
    legend.textContent = Object.entries(dangerNames).map(([level, name]) => `${level} ${level === '1' ? 'unidade' : 'unidades'}: ${name}`).join(' · ');
  } else {
    legend.remove();
  }
  if (visibility.showLocations) {
    const locations = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    locations.setAttribute('class', 'scale-note location-legend');
    locations.setAttribute('x', '12');
    locations.setAttribute('y', visibility.showDanger ? '31' : '272');
    locations.textContent = 'Losango: local opcional · Vilarejo: Base das Expedições permanente';
    container.querySelector('.map-sheet')!.append(locations);
  }
  // The printed map has no editing semantics or hidden accessible secrets.
  container.querySelectorAll('.hex').forEach(hex => {
    hex.removeAttribute('role');
    hex.removeAttribute('tabindex');
    hex.removeAttribute('aria-pressed');
    if (!visibility.showDanger) {
      hex.removeAttribute('data-danger');
      hex.setAttribute('aria-label', hex.getAttribute('aria-label')!.replace(' · Seguro (1)', ''));
    }
  });
}

const terrainCodes = {
  Pradaria: 'PR', Pântano: 'PA', Floresta: 'FL', Montanha: 'MO', Deserto: 'DE',
  Rio: 'RI', Oceano: 'OC', Ártico: 'AR', Selva: 'SE', Litoral: 'LI',
} as const;
const localCodes = { povoado: 'Pov', masmorra: 'Mas', ruína: 'Ruí', covil: 'Cov', santuário: 'San', marco: 'Mar' } as const;

/** One-page handwritten key. Full names remain in the screen key and exported state. */
export function printKey(container: HTMLElement, region: GeneratedRegion): void {
  const section = document.createElement('section');
  section.className = 'print-key';
  section.innerHTML = `<h1>Chave de quem mestra</h1>
    <p class="key-metadata"></p>
    <p class="key-legend">PR Pradaria · PA Pântano · FL Floresta · MO Montanha · DE Deserto · RI Rio · OC Oceano · AR Ártico · SE Selva · LI Litoral</p>
    <p class="key-legend">Perigo: 1 seguro · 2 inseguro · 3 arriscado · 4 mortal. Pov povoado · Mas masmorra · Ruí ruína · Cov covil · San santuário · Mar marco.</p>
    <p class="key-legend">Base = Base das Expedições. Nomes longos abreviados com …; completos no aplicativo. Obs.: anotações à mão.</p>
    <div class="key-columns"></div>`;
  section.querySelector('.key-metadata')!.textContent = `Semente: ${JSON.stringify(region.options.seed)} · ${region.version}`;
  const columns = section.querySelector('.key-columns')!;
  for (let start = 0; start < region.cells.length; start += 36) {
    const table = document.createElement('table');
    table.setAttribute('aria-label', `Chave ${region.cells[start]!.coordinate}–${region.cells[Math.min(start + 35, region.cells.length - 1)]!.coordinate}`);
    table.innerHTML = `<colgroup><col class="key-coordinate-col"><col class="key-terrain-col"><col class="key-local-col"><col class="key-obs-col"></colgroup>
      <thead><tr><th scope="col">Hex.</th><th scope="col">T/P</th><th scope="col">Local</th><th scope="col">Obs.</th></tr></thead><tbody></tbody>`;
    const body = table.querySelector('tbody')!;
    for (const cell of region.cells.slice(start, start + 36)) {
      const row = document.createElement('tr');
      row.innerHTML = '<th scope="row"></th><td></td><td class="key-local"></td><td class="key-observations"></td>';
      row.children[0]!.textContent = cell.coordinate;
      row.children[1]!.textContent = `${terrainCodes[cell.terrain]} ${cell.danger}`;
      const local = row.children[2]!;
      if (cell.local) {
        const name = Array.from(cell.local.name);
        const label = document.createElement('span');
        label.textContent = `${localCodes[cell.local.category]} ${name.length > 18 ? `${name.slice(0, 17).join('')}…` : cell.local.name}`;
        local.append(label);
      }
      if (cell.expeditionBase) {
        const base = document.createElement('span');
        base.textContent = 'Base';
        local.append(base);
      }
      body.append(row);
    }
    columns.append(table);
  }
  container.append(section);
}
