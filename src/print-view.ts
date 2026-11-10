import { dangerNames } from './grid';
import type { GeneratedRegion } from './generation';
import { mapSheet, regionKey, generationOptionsLabel } from './map-view';

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

/** Full key: independent of map visibility and of the screen disclosure. */
export function printKey(container: HTMLElement, region: GeneratedRegion): void {
  const source = document.createElement('div');
  regionKey(source, region);
  const section = document.createElement('section');
  section.className = 'print-key region-key';
  const heading = document.createElement('h1');
  heading.textContent = 'Chave de quem mestra';
  const metadata = document.createElement('p');
  metadata.textContent = `Semente: ${JSON.stringify(region.options.seed)} · ${region.version} · ${generationOptionsLabel(region.options)}`;
  section.append(heading, metadata, source.querySelector('table')!);
  container.append(section);
}
