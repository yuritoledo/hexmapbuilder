import '@fontsource-variable/literata';
import './style.css';
import { createGrid, densities, type Density, type HexCell } from './grid';
import { mapSheet, terrainSymbol } from './map-view';

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
        <h1>Compare seu próximo território.</h1>
        <p>Duas grades, a mesma folha A4. Explore os símbolos e imprima antes de escolher.</p>
      </div>
      <button class="print-button" type="button">Imprimir comparação <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="M3 13 13 3M4 3h9v9" /></svg></button>
    </div>
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
          <h2>Como comparar</h2>
          <p>A grade ampla dá mais espaço aos símbolos. A compacta inclui uma região maior na mesma página.</p>
          <p>As duas usam hexágonos com ponta para cima e margens mínimas de 12 mm.</p>
          <p class="decision-note">Comparação provisória. Densidade, orientação e margens aguardam sua escolha.</p>
        </section>
        <details>
          <summary>Preparar a impressão</summary>
          <p>São duas páginas A4 retrato. Use escala de 100%, sem margens adicionais e sem cabeçalhos ou rodapés do navegador.</p>
          <p>Salve como PDF ou imprima. A linha de conferência deve medir 50 mm no papel.</p>
        </details>
        <p id="keyboard-help" class="keyboard-help">Teclado: Tab entra em cada grade. Use as setas para mover o foco e Enter ou Espaço para selecionar. Home e End vão ao início e ao fim da linha.</p>
      </aside>
      <div id="comparison" class="sheets" tabindex="-1">
        ${Object.values(densities).map(mapSheet).join('')}
      </div>
    </div>
    <footer class="app-footer">
      <p>Amostra fixa de terrenos · ainda sem geração, edição ou salvamento.</p>
      <p>Arte própria. Feito para histórias que começam pequenas.</p>
    </footer>
  </main>`;

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

for (const density of Object.values(densities)) {
  const sheet = app.querySelector<HTMLElement>(`[data-density="${density.id}"]`)!;
  const cells = createGrid(density);
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
