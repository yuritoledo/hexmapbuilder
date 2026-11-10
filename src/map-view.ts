import { dangerNames, type HexCell, type Terrain } from './grid';
import { terrainNames, type GeneratedRegion, type GenerationOptions } from './generation';

import forest from './assets/kenney/pine.svg?raw';
import village from './assets/kenney/village.svg?raw';
import desert from './assets/kenney/desert.svg?raw';
import jungle from './assets/kenney/jungle.svg?raw';
import river from './assets/kenney/river.svg?raw';
import ocean from './assets/kenney/wave.svg?raw';

// Kenney Cartography Pack (CC0). Os outros cinco símbolos são originais.
const terrainSymbols: Record<Terrain, string> = {
  Pradaria: '<path d="M0 3Q-0.5 0-1-3M0 3Q-2-0.5-4-1M0 3Q1-1 3-3M0 3Q2 0 4 0M0 3Q-2 1-4 2" />',
  Pântano: '<path d="M0 3Q-0.5 0-1-3M0 3Q-2-0.5-4-1M0 3Q1-1 3-3M0 3Q2 0 4 0M0 3Q-2 1-4 2M-4 4q2-1 4 0t4 0" />',
  Floresta: forest,
  Montanha: '<path d="M-4 3 0-4 4 3M-1.5-1 0 0 1.5-1" />',
  Deserto: desert,
  Rio: river,
  Oceano: ocean,
  Ártico: '<path d="M-4 3 0-4 4 3M-1.5-1 0 0 1.5-1M0-3v3m-1-2 2 1m-2 0 2-1" />',
  Selva: jungle,
  Litoral: '<path d="M-3-4q5 4 0 8M0 1q2-2 4 0" />',
};

export function terrainSymbol(terrain: Terrain, x: number, y: number, scale = 1): string {
  const symbol = terrainSymbols[terrain];
  const source = symbol.startsWith('<svg') ? 'kenney' : 'original';
  return `<g class="terrain-symbol" data-source="${source}" transform="translate(${x} ${y}) scale(${scale})">${symbol}</g>`;
}

function escapeAttribute(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
}

export function cellSymbol(cell: HexCell, x: number, y: number): string {
  const positions = cell.expeditionBase ? [[-6, -2.5], [6, -2.5], [-6, 2.5], [6, 2.5]] :
    cell.danger === 1 ? [[0, 0]] : cell.danger === 2 ? [[-3, 0], [3, 0]] :
      cell.danger === 3 ? [[0, -2.5], [-3, 2.5], [3, 2.5]] :
        [[-3, -2.5], [3, -2.5], [-3, 2.5], [3, 2.5]];
  const symbols = positions.slice(0, cell.danger).map(([dx, dy]) =>
    `<g data-biome-unit="${cell.terrain}">${terrainSymbol(cell.terrain, dx!, dy!, cell.expeditionBase ? 0.32 : 0.5)}</g>`).join('');
  const local = cell.local ? '<path class="terrain-symbol" data-local="true" d="M0-8.2 1.2-7 0-5.8-1.2-7Z" />' : '';
  return `<g transform="translate(${x} ${y})">${symbols}${local}${cell.expeditionBase ? `<g class="terrain-symbol" data-expedition-base="vilarejo">${village}</g>` : ''}</g>`;
}
function hexMarkup(cell: HexCell, index: number): string {
  const points = cell.corners.map(point => `${point.x},${point.y}`).join(' ');
  return `<g class="hex" role="button" tabindex="${index === 0 ? 0 : -1}" aria-pressed="false"
      aria-label="Hexágono ${cell.coordinate} · ${cell.terrain} · ${dangerNames[cell.danger]} (${cell.danger})${cell.expeditionBase ? ` · Vilarejo, ${escapeAttribute(cell.expeditionBase.name)}` : ''} · ${escapeAttribute(cell.local ? `${cell.local.category} · ${cell.local.name}` : 'Sem local')}" data-index="${index}" data-danger="${cell.danger}">
    <polygon class="hex-boundary" points="${points}" />
    ${cellSymbol(cell, cell.center.x, cell.center.y - 1)}
    <text class="coordinate" x="${cell.center.x}" y="${cell.center.y + 6}">${cell.coordinate}</text>
  </g>`;
}

export function generationOptionsLabel(options: GenerationOptions): string {
  const names = terrainNames(options);
  const initial = options.initialTerrain === 'random' ? '2d6' : names[options.initialTerrain];
  return `Inicial: ${initial} · ${options.arid} / ${options.forest} / ${options.water}`;
}

function riverMarkup(region: GeneratedRegion): string {
  if (!region.river.enabled) return '';
  const route = region.river.path.map(coordinate => region.cells.find(cell => cell.coordinate === coordinate)!);
  const points = [route[0]!.corners[0]!, ...route.map(cell => cell.center), route.at(-1)!.corners[3]!];
  const d = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ');
  return `<path class="river-overlay" role="img" aria-label="Rio contínuo de norte a sul · adaptação opcional" d="${d}" />`;
}
export function mapSheet(container: HTMLElement, region: GeneratedRegion): void {
  const { density, cells, options } = region;
  const legendTerrains = [...new Set([...Object.values(terrainNames(options)), ...cells.map(cell => cell.terrain)])];
  container.innerHTML = `<section class="comparison" aria-labelledby="heading-${density.id}" data-density="${density.id}">
    <header class="sheet-heading">
      <h2 id="heading-${density.id}">${density.label}</h2>
      <p>${cells.length} hexágonos <span aria-hidden="true">·</span> ${density.columns} × ${density.rows}</p>
    </header>
    <div class="paper">
      <svg class="map-sheet" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297"
        width="210mm" height="297mm" role="group" aria-label="Grade ${density.label}" aria-describedby="keyboard-help">
        <text class="map-title" x="12" y="20">Terras por descobrir</text>
        <text class="map-subtitle" x="12" y="28">GRADE ${density.label.toLocaleUpperCase('pt-BR')} · ${cells.length} HEXÁGONOS · A4</text>
        <path class="rule" d="M12 34H198" />
        <g class="cells">${cells.map(hexMarkup).join('')}</g>
        ${riverMarkup(region)}
        <g class="legend" aria-label="Legenda de terrenos">
          ${legendTerrains.map((terrain, index) => {
            const x = 21 + index * 168 / (legendTerrains.length - 1);
            return `${terrainSymbol(terrain, x, 259, 0.62)}<text x="${x}" y="267">${terrain}</text>`;
          }).join('')}
        </g>
        <text class="scale-note danger-legend" x="12" y="272">${Object.entries(dangerNames).map(([level, name]) => `${level}${level === '1' ? ' símbolo' : ''}: ${name}`).join(' · ')} · Vilarejo: base central</text>
        <text class="scale-note" x="12" y="276">10 km entre lados opostos de cada hexágono; também entre centros vizinhos.</text>
        ${region.river.enabled ? '<text class="scale-note river-legend" x="12" y="280">Linha contínua: rio opcional · adaptação do aplicativo.</text>' : ''}
        <path class="calibration" d="M12 281v3m0-1.5h50m0-1.5v3" />
        <text class="calibration-label" x="65" y="284">50 mm · confira após imprimir</text>
        <text class="folio" x="198" y="284">${density.id === 'ampla' ? 'A' : 'B'}</text>
      </svg>
    </div>
    <p class="sheet-caption">${density.width} mm entre lados · ponta para cima · margens mínimas de 12 mm</p>
  </section>`;
  const svg = container.querySelector('svg')!;
  const seedLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  seedLabel.setAttribute('x', '12');
  seedLabel.setAttribute('y', '38');
  seedLabel.setAttribute('class', 'map-generation');
  seedLabel.textContent = `Semente: ${JSON.stringify(options.seed)} · ${region.version}`;
  svg.append(seedLabel);
  if (seedLabel.getComputedTextLength() > 186) {
    seedLabel.setAttribute('textLength', '186');
    seedLabel.setAttribute('lengthAdjust', 'spacingAndGlyphs');
  }
  const optionsLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  optionsLabel.setAttribute('x', '12');
  optionsLabel.setAttribute('y', '43');
  optionsLabel.setAttribute('class', 'map-generation');
  optionsLabel.textContent = generationOptionsLabel(options);
  svg.append(optionsLabel);
}

export function regionKey(container: HTMLElement, region: GeneratedRegion): void {
  container.innerHTML = `<details class="region-key">
    <summary>Chave de quem mestra</summary>
    <p>Losango: local opcional. Vilarejo: Base das Expedições permanente.</p>
    <div class="key-scroll" role="region" aria-label="Tabela da chave" tabindex="0">
      <table aria-label="Hexágonos da região">
        <thead><tr><th scope="col">Coordenada</th><th scope="col">Terreno</th><th scope="col">Local / base</th><th scope="col">Perigo</th></tr></thead>
        <tbody></tbody>
      </table>
    </div>
  </details>`;
  const body = container.querySelector('tbody')!;
  for (const cell of region.cells) {
    const row = document.createElement('tr');
    const local = cell.local ? `${cell.local.category} · ${cell.local.name}` : 'Sem local';
    const values = [cell.coordinate, cell.terrain,
      `${local}${cell.expeditionBase ? `; ${cell.expeditionBase.name} (base permanente)` : ''}`,
      `${dangerNames[cell.danger]} (${cell.danger})`];
    values.forEach((value, index) => {
      const field = document.createElement(index === 0 ? 'th' : 'td');
      if (index === 0) field.setAttribute('scope', 'row');
      field.textContent = value;
      row.append(field);
    });
    body.append(row);
  }
}
