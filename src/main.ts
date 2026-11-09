import '@fontsource-variable/literata';
import './style.css';
import { densities, type Density, type HexCell } from './grid';
import { defaultOptions, generateRegion, terrainNames, terrainPositions, type GenerationOptions } from './generation';
import { mapSheet, terrainSymbol, generationOptionsLabel } from './map-view';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Elemento principal não encontrado.');

app.innerHTML = `
  <a class="skip-link" href="#comparison">Ir para os mapas</a>
  <header class="app-header">
    <a class="wordmark" href="./" aria-label="Hexmap Builder, início">
      <svg viewBox="0 0 30 34" aria-hidden="true"><path d="M15 1 29 9v16l-14 8L1 25V9ZM1 9l14 8 14-8M15 17v16" /></svg>
      Hexmap <span>Builder</span>
    </a>
    <span class="header-note">Um território. Muitas aventuras.</span>
  </header>
  <main>
    <div class="intro">
      <div>
        <h1>Gere seu próximo território.</h1>
        <p>Uma semente, uma região. Explore terrenos gerados com tabelas de 2d6 em uma folha A4.</p>
      </div>
      <button class="print-button" type="button">Imprimir mapa <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="M3 13 13 3M4 3h9v9" /></svg></button>
    </div>
    <form id="generation-form" class="generation-controls" aria-label="Opções de geração">
      <label>Semente<input name="seed" value="terras-01" required maxlength="80" autocomplete="off" /></label>
      <label>Terreno inicial<select name="initialTerrain">
        <option value="random">Sortear com 2d6</option>
        ${terrainPositions.map(position => `<option value="${position}">${terrainNames(defaultOptions)[position]}</option>`).join('')}
      </select></label>
      <label>Deserto ou ártico<select name="arid"><option>Deserto</option><option>Ártico</option></select></label>
      <label>Floresta ou selva<select name="forest"><option>Floresta</option><option>Selva</option></select></label>
      <label>Rio ou litoral<select name="water"><option>Rio</option><option>Litoral</option></select></label>
      <button class="generate-button" type="submit">Gerar região</button>
      <p id="generation-summary" class="generation-summary" aria-live="polite"></p>
    </form>
    <div class="workspace">
      <aside class="inspector" aria-label="Consulta e instruções">
        <section>
          <h2>Hexágono em foco</h2>
          <div id="selection" role="status" aria-live="polite" aria-atomic="true">
            <p class="empty-selection">Seu mapa começa com um olhar.</p>
            <p>Selecione um hexágono para consultar sua coordenada e seu terreno.</p>
          </div>
        </section>
        <section>
          <h2>Da mesa para o mapa</h2>
          <p>Geração em lote: cada terreno usa um vizinho já gerado como referência.</p>
          <p>As tabelas não garantem clima, costas ou rios contínuos. Não incluem cataclismos.</p>
          <p>Grade aprovada: 108 hexágonos, ponta para cima e margens mínimas de 12 mm.</p>
        </section>
        <details>
          <summary>Preparar a impressão</summary>
          <p>Uma página A4 retrato. Use escala de 100%, sem margens adicionais e sem cabeçalhos ou rodapés do navegador.</p>
          <p>Salve como PDF ou imprima. A linha de conferência deve medir 50 mm no papel.</p>
        </details>
        <p id="keyboard-help" class="keyboard-help">Teclado: Tab entra em cada grade. Use as setas para mover o foco e Enter ou Espaço para selecionar. Home e End vão ao início e ao fim da linha.</p>
      </aside>
      <div id="comparison" class="sheets" tabindex="-1">
      </div>
    </div>
    <footer class="app-footer">
      <p>Geração de terrenos · ainda sem locais, perigo, edição ou salvamento.</p>
      <p>Arte própria. Feito para histórias que começam pequenas.</p>
    </footer>
  </main>`;

let region = generateRegion(densities.compacta, defaultOptions);
const form = app.querySelector<HTMLFormElement>('#generation-form')!;
function readOptions(): GenerationOptions {
  const fields = new FormData(form);
  return {
    seed: String(fields.get('seed')),
    initialTerrain: fields.get('initialTerrain') as GenerationOptions['initialTerrain'],
    arid: fields.get('arid') as GenerationOptions['arid'],
    forest: fields.get('forest') as GenerationOptions['forest'],
    water: fields.get('water') as GenerationOptions['water'],
  };
}
form.addEventListener('change', () => {
  const names = terrainNames(readOptions());
  const initialSelect = form.querySelector<HTMLSelectElement>('[name="initialTerrain"]')!;
  for (const position of terrainPositions) {
    initialSelect.querySelector<HTMLOptionElement>(`[value="${position}"]`)!.textContent = names[position];
  }
});
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!window.confirm('Substituir todo o mapa por uma nova região? A seleção atual será descartada.')) return;
  const options = readOptions();
  region = generateRegion(densities.compacta, options);
  renderRegion();
});
const selection = app.querySelector<HTMLDivElement>('#selection')!;
app.querySelector<HTMLButtonElement>('.print-button')!.addEventListener('click', () => window.print());

function selectHex(element: SVGGElement, density: Density, cell: HexCell) {
  app!.querySelectorAll('[aria-pressed="true"]').forEach(previous => previous.setAttribute('aria-pressed', 'false'));
  element.setAttribute('aria-pressed', 'true');
  selection.innerHTML = `<p class="selection-density">${density.label}</p>
    <p class="selection-coordinate">${cell.coordinate}</p>
    <p class="selection-terrain"><svg viewBox="-7 -7 14 14" aria-hidden="true">${terrainSymbol(cell.terrain, 0, 0)}</svg>${cell.terrain}</p>
    <dl><div><dt>Coluna</dt><dd>${String(cell.column + 1).padStart(2, '0')}</dd></div>
    <div><dt>Linha</dt><dd>${String(cell.row + 1).padStart(2, '0')}</dd></div>
    <div><dt>Escala</dt><dd>10 km / hexágono</dd></div></dl>`;
  if (window.matchMedia('(max-width: 650px)').matches) {
    selection.scrollIntoView({ block: 'nearest' });
  }
}

function renderRegion() {
  const { density, cells } = region;
  const sheet = app!.querySelector<HTMLElement>('#comparison')!;
  mapSheet(sheet, region);
  selection.innerHTML = '<p>Selecione um hexágono para consultar sua coordenada e seu terreno.</p>';
  app!.querySelector('#generation-summary')!.textContent =
    `Mapa atual · Semente: ${JSON.stringify(region.options.seed)} · ${region.version} · Centro: ${region.centerCoordinate} · ${generationOptionsLabel(region.options)}`;
  const hexes = Array.from(sheet.querySelectorAll<SVGGElement>('.hex'));
  function moveFocus(index: number) {
    hexes.forEach((hex, position) => hex.setAttribute('tabindex', position === index ? '0' : '-1'));
  }
  hexes.forEach((hex, index) => {
    hex.addEventListener('click', () => {
      moveFocus(index);
      hex.focus();
      selectHex(hex, density, cells[index]!);
    });
    hex.addEventListener('keydown', event => {
      const row = Math.floor(index / density.columns);
      const column = index % density.columns;
      let target = index;
      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault();
          selectHex(hex, density, cells[index]!);
          return;
        case 'ArrowLeft': target -= column > 0 ? 1 : 0; break;
        case 'ArrowRight': target += column < density.columns - 1 ? 1 : 0; break;
        case 'ArrowUp': target -= row > 0 ? density.columns : 0; break;
        case 'ArrowDown': target += row < density.rows - 1 ? density.columns : 0; break;
        case 'Home': target -= column; break;
        case 'End': target += density.columns - column - 1; break;
        default: return;
      }
      event.preventDefault();
      moveFocus(target);
      hexes[target]!.focus();
    });
  });
}

renderRegion();
