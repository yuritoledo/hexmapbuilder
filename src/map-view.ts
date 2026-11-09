import { createGrid, terrains, type Density, type HexCell, type Terrain } from './grid';

// Desenhos originais deste projeto. Nenhum símbolo vem da referência privada.
const terrainPaths: Record<Terrain, string> = {
  Pradaria: 'M-4 2l1-2 1 2m1-1 1-3 1 3m1 1 1-2 1 2M-5 4h3m2 0h4',
  Floresta: 'M-4 2l2-4 2 4h-4m2 0v2m1-3 2-4 3 5H0m2 0v2',
  Montanha: 'M-5 3l4-7 3 5 2-3 3 5M-3 0l2-1 1 1m2 1 2-1',
  Pântano: 'M-5 3q2-1 4 0t5 0M-2 1v-5m0 2-2-1m2 2 2-2M3 1v-3m0 1 2-1',
  Deserto: 'M-5 3q3-5 6-1t4 0M-3 4q3-2 6 0M-3-3h.1m6 2h.1',
  Rio: 'M-4-4q6 1 3 4t3 4M-1-4q6 1 3 4t3 4',
  Oceano: 'M-5-2q1-2 3 0t3 0 3 0M-5 1q1-2 3 0t3 0 3 0M-5 4q1-2 3 0t3 0 3 0',
};

export function terrainSymbol(terrain: Terrain, x: number, y: number, scale = 1): string {
  return `<path class="terrain-symbol" transform="translate(${x} ${y}) scale(${scale})" d="${terrainPaths[terrain]}" />`;
}

function hexMarkup(cell: HexCell, index: number): string {
  const points = cell.corners.map(point => `${point.x},${point.y}`).join(' ');
  return `<g class="hex" role="button" tabindex="${index === 0 ? 0 : -1}" aria-pressed="false"
      aria-label="Hexágono ${cell.coordinate} · ${cell.terrain}" data-index="${index}">
    <polygon class="hex-boundary" points="${points}" />
    ${terrainSymbol(cell.terrain, cell.center.x, cell.center.y - 1)}
    <text class="coordinate" x="${cell.center.x}" y="${cell.center.y + 6}">${cell.coordinate}</text>
  </g>`;
}

export function mapSheet(density: Density): string {
  const cells = createGrid(density);
  return `<section class="comparison" aria-labelledby="heading-${density.id}" data-density="${density.id}">
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
        <g class="legend" aria-label="Legenda de terrenos">
          ${terrains.map((terrain, index) => {
            const x = 21 + index * 28;
            return `${terrainSymbol(terrain, x, 259, 0.62)}<text x="${x}" y="267">${terrain}</text>`;
          }).join('')}
        </g>
        <text class="scale-note" x="12" y="276">10 km entre lados opostos de cada hexágono; também entre centros vizinhos.</text>
        <path class="calibration" d="M12 281v3m0-1.5h50m0-1.5v3" />
        <text class="calibration-label" x="65" y="284">50 mm · confira após imprimir</text>
        <text class="folio" x="198" y="284">${density.id === 'ampla' ? 'A' : 'B'}</text>
      </svg>
    </div>
    <p class="sheet-caption">${density.width} mm entre lados · ponta para cima · margens mínimas de 12 mm</p>
  </section>`;
}
