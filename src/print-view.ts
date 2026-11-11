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

/** Full-text key with a shared handwriting area. Long edited content may use extra pages. */
export function printKey(container: HTMLElement, region: GeneratedRegion): void {
  const section = document.createElement('section');
  section.className = 'print-key';
  section.innerHTML = `<h1>Chave de quem mestra</h1>
    <p class="key-metadata"></p>
    <section class="key-quick"><div class="key-section-heading"><h2>Consulta rápida</h2>
      <p class="key-legend">Perigo: 1 seguro · 2 inseguro · 3 arriscado · 4 mortal</p></div>
      <div class="key-columns"></div></section>
    <section class="key-locations"><div class="key-section-heading"><h2>Locais da região</h2>
      <p class="key-legend">Categorias e nomes completos</p></div><div class="key-local-columns"></div></section>
    <section class="key-notes"><div class="key-section-heading"><h2>Anotações</h2>
      <p class="key-legend">Escreva a coordenada e a descrição.</p></div>
      <div class="key-notes-space" aria-label="Espaço livre para escrever à mão"></div></section>`;
  section.querySelector('.key-metadata')!.textContent = `Semente: ${JSON.stringify(region.options.seed)} · ${region.version}`;
  const columns = section.querySelector('.key-columns')!;
  for (let start = 0; start < region.cells.length; start += 27) {
    const table = document.createElement('table');
    table.setAttribute('aria-label', `Chave ${region.cells[start]!.coordinate}–${region.cells[Math.min(start + 26, region.cells.length - 1)]!.coordinate}`);
    table.innerHTML = `<colgroup><col class="key-coordinate-col"><col><col class="key-danger-col"></colgroup>
      <thead><tr><th scope="col">Hexágono</th><th scope="col">Terreno</th><th scope="col">Perigo</th></tr></thead><tbody></tbody>`;
    const body = table.querySelector('tbody')!;
    for (const cell of region.cells.slice(start, start + 27)) {
      const row = document.createElement('tr');
      row.innerHTML = '<th scope="row"></th><td></td><td></td>';
      row.children[0]!.textContent = cell.coordinate;
      row.children[1]!.textContent = cell.terrain;
      row.children[2]!.textContent = String(cell.danger);
      body.append(row);
    }
    columns.append(table);
  }
  const locals = region.cells.flatMap(cell => [
    ...(cell.expeditionBase ? [{ coordinate: cell.coordinate, category: 'Base permanente', name: cell.expeditionBase.name }] : []),
    ...(cell.local ? [{ coordinate: cell.coordinate, category: cell.local.category, name: cell.local.name }] : []),
  ]);
  const localColumns = section.querySelector('.key-local-columns')!;
  const midpoint = Math.ceil(locals.length / 2);
  for (const entries of [locals.slice(0, midpoint), locals.slice(midpoint)]) {
    const list = document.createElement('ul');
    for (const local of entries) {
      const item = document.createElement('li');
      item.innerHTML = '<span class="key-local-coordinate"></span><span><span class="key-local-category"></span> · <span class="key-local-name"></span></span>';
      item.querySelector('.key-local-coordinate')!.textContent = local.coordinate;
      item.querySelector('.key-local-category')!.textContent = local.category.charAt(0).toUpperCase() + local.category.slice(1);
      item.querySelector('.key-local-name')!.textContent = local.name;
      list.append(item);
    }
    localColumns.append(list);
  }
  container.append(section);
}
