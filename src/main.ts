import '@fontsource-variable/literata';
import './style.css';
import { densities, dangerNames, terrains, localCategories, type Density, type HexCell, type Terrain, type Danger, type LocalCategory } from './grid';
import { defaultOptions, generateRegion, terrainNames, terrainPositions, type GenerationOptions } from './generation';
import { mapSheet, regionKey, cellSymbol, generationOptionsLabel } from './map-view';
import { printMap, printKey } from './print-view';
import { editCell, rerollComponent, MAX_LOCAL_NAME_LENGTH, type RerollComponent } from './editing';
import { RegionHistory } from './history';
import type { GeneratedRegion } from './generation';
import { decodeRegion, encodeRegion, STORAGE_KEY, MAX_FILE_BYTES } from './persistence';

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
    <fieldset class="print-controls">
      <legend>Informações no mapa impresso</legend>
      <label><input id="print-locations" type="checkbox" /> Mostrar locais no mapa impresso</label>
      <label><input id="print-danger" type="checkbox" /> Mostrar perigo no mapa impresso</label>
      <p>A chave sempre inclui todos os locais, a base e o perigo. Ela imprime em páginas separadas; não entregue essas páginas aos jogadores.</p>
    </fieldset>
    <div class="history-controls" aria-label="Histórico da sessão">
      <button id="undo" type="button" disabled>Desfazer</button>
      <button id="redo" type="button" disabled>Refazer</button>
      <span>Histórico desta sessão · inclui a substituição do mapa.</span>
    </div>
    <section class="storage-controls" aria-label="Salvar e transferir mapa">
      <div class="storage-actions">
        <button id="export-map" type="button">Exportar mapa</button>
        <label>Importar mapa <input id="import-map" type="file" accept=".json,application/json"></label>
        <button id="retry-save" type="button">Tentar salvar novamente</button>
      </div>
      <p id="storage-status" role="status"></p>
      <p id="file-status" role="status"></p>
      <p>Salvamento automático neste navegador. Exporte uma cópia para guardar ou transferir o mapa. O histórico não é salvo.</p>
    </section>
    <div class="workspace">
      <aside class="inspector" aria-label="Consulta e instruções">
        <section>
          <h2>Hexágono em foco</h2>
          <div id="selection" role="status" aria-live="polite" aria-atomic="true">
            <p class="empty-selection">Seu mapa começa com um olhar.</p>
            <p>Selecione um hexágono para consultar terreno, perigo, local e base central.</p>
          </div>
          <div id="cell-editor" class="cell-editor" hidden>
            <label>Terreno do hexágono<select id="edit-terrain">${terrains.map(terrain => `<option>${terrain}</option>`).join('')}</select></label>
            <button type="button" data-reroll="terrain">Gerar terreno novamente</button>
            <label>Perigo do hexágono<select id="edit-danger">${([1, 2, 3, 4] as const).map(danger => `<option value="${danger}">${dangerNames[danger]}</option>`).join('')}</select></label>
            <button type="button" data-reroll="danger">Gerar perigo novamente</button>
            <form id="local-form" aria-label="Editar local">
              <label>Nome do local<input id="local-name" required maxlength="${MAX_LOCAL_NAME_LENGTH}" autocomplete="off" aria-describedby="local-help" /></label>
              <label>Categoria do local<select id="local-category">${localCategories.map(category => `<option>${category}</option>`).join('')}</select></label>
              <button type="submit">Aplicar local</button>
              <button id="remove-local" type="button">Remover local</button>
            </form>
            <button type="button" data-reroll="local">Gerar local novamente</button>
            <p id="local-help">Adicione ou altere o local opcional. A base central é permanente e separada.</p>
            <p>Gerar terreno usa o terreno atual deste hexágono como referência. Os vizinhos não mudam.</p>
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
    <div id="region-key"></div>
    <footer class="app-footer">
      <p>Edição independente com desfazer e refazer · salvamento automático local.</p>
      <p>Vetores Kenney (CC0) e desenhos próprios. Feito para histórias que começam pequenas.</p>
    </footer>
  </main>`;

let region = generateRegion(densities.compacta, defaultOptions);
const storageStatus = app.querySelector<HTMLParagraphElement>('#storage-status')!;
let storageBlocked = false;
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved !== null) region = decodeRegion(saved);
} catch {
  storageBlocked = true;
  storageStatus.textContent = 'Não foi possível recuperar o mapa salvo. Ele não será sobrescrito. Exporte o mapa atual ou tente salvar novamente para substituir o salvo.';
}

function saveRegion() {
  if (storageBlocked) return;
  try {
    localStorage.setItem(STORAGE_KEY, encodeRegion(region));
    storageStatus.textContent = 'Salvo neste navegador. Mantenha também uma cópia exportada.';
  } catch {
    storageStatus.textContent = 'Não foi possível salvar neste navegador. As alterações estão apenas nesta sessão. Exporte o mapa ou tente salvar novamente.';
  }
}
app.querySelector('#retry-save')!.addEventListener('click', () => {
  if (storageBlocked && !window.confirm('Substituir o salvamento que não pôde ser recuperado pelo mapa atual?')) return;
  storageBlocked = false;
  saveRegion();
});
const fileStatus = app.querySelector<HTMLParagraphElement>('#file-status')!;
app.querySelector('#export-map')!.addEventListener('click', () => {
  try {
    const url = URL.createObjectURL(new Blob([encodeRegion(region)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hexmapbuilder-mapa.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    fileStatus.textContent = 'Arquivo exportado. Guarde esta cópia do mapa.';
  } catch {
    fileStatus.textContent = 'Não foi possível exportar o mapa. Tente novamente.';
  }
});
const importInput = app.querySelector<HTMLInputElement>('#import-map')!;
importInput.addEventListener('change', async () => {
  const file = importInput.files?.[0];
  if (!file) return;
  importInput.value = '';
  importInput.disabled = true;
  try {
    if (file.size > MAX_FILE_BYTES) throw new Error('Arquivo muito grande. O limite é 1 MiB.');
    const imported = decodeRegion(await file.text());
    if (!window.confirm('Substituir o mapa atual pelo mapa importado? Você pode desfazer nesta sessão.')) {
      fileStatus.textContent = 'Importação cancelada. O mapa atual não mudou.';
      return;
    }
    selectedCoordinate = undefined;
    commitRegion(imported);
    fileStatus.textContent = 'Mapa importado. O histórico anterior continua disponível nesta sessão.';
  } catch (error) {
    fileStatus.textContent = error instanceof Error ? `Não foi possível importar. ${error.message}` : 'Não foi possível ler o arquivo. O mapa atual não mudou.';
  } finally {
    importInput.disabled = false;
  }
});
const history = new RegionHistory(region);
let selectedCoordinate: string | undefined;
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
  selectedCoordinate = undefined;
  const key = app.querySelector<HTMLDetailsElement>('.region-key');
  if (key) key.open = false;
  commitRegion(generateRegion(densities.compacta, options));
});
const selection = app.querySelector<HTMLDivElement>('#selection')!;
const editor = app.querySelector<HTMLDivElement>('#cell-editor')!;
const terrainSelect = app.querySelector<HTMLSelectElement>('#edit-terrain')!;
const dangerSelect = app.querySelector<HTMLSelectElement>('#edit-danger')!;
const localName = app.querySelector<HTMLInputElement>('#local-name')!;
const localCategory = app.querySelector<HTMLSelectElement>('#local-category')!;
const removeLocal = app.querySelector<HTMLButtonElement>('#remove-local')!;
const undoButton = app.querySelector<HTMLButtonElement>('#undo')!;
const redoButton = app.querySelector<HTMLButtonElement>('#redo')!;

function commitRegion(next: GeneratedRegion) {
  history.apply(next);
  region = history.current;
  renderRegion();
  saveRegion();
}
terrainSelect.addEventListener('change', () => {
  if (selectedCoordinate) commitRegion(editCell(region, selectedCoordinate, { component: 'terrain', value: terrainSelect.value as Terrain }));
});
dangerSelect.addEventListener('change', () => {
  if (selectedCoordinate) commitRegion(editCell(region, selectedCoordinate, { component: 'danger', value: Number(dangerSelect.value) as Danger }));
});
localName.addEventListener('input', () => localName.setCustomValidity(''));
app.querySelector('#local-form')!.addEventListener('submit', event => {
  event.preventDefault();
  if (!selectedCoordinate) return;
  if (!localName.value.trim()) {
    localName.setCustomValidity('Informe um nome que não seja apenas espaços.');
    localName.reportValidity();
    return;
  }
  commitRegion(editCell(region, selectedCoordinate, {
    component: 'local', value: { name: localName.value, category: localCategory.value as LocalCategory },
  }));
});
removeLocal.addEventListener('click', () => {
  if (selectedCoordinate) commitRegion(editCell(region, selectedCoordinate, { component: 'local', value: undefined }));
});
app.querySelectorAll<HTMLButtonElement>('[data-reroll]').forEach(button => button.addEventListener('click', () => {
  if (selectedCoordinate) commitRegion(rerollComponent(region, selectedCoordinate, button.dataset.reroll as RerollComponent));
}));
undoButton.addEventListener('click', () => {
  if (history.undo()) { region = history.current; renderRegion(); saveRegion(); }
});
redoButton.addEventListener('click', () => {
  if (history.redo()) { region = history.current; renderRegion(); saveRegion(); }
});
app.querySelector<HTMLButtonElement>('.print-button')!.addEventListener('click', () => window.print());
window.addEventListener('beforeprint', () => {
  document.querySelector('#print-output')?.remove();
  const output = document.createElement('div');
  output.id = 'print-output';
  document.body.append(output);
  printMap(output, region, {
    showLocations: app.querySelector<HTMLInputElement>('#print-locations')!.checked,
    showDanger: app.querySelector<HTMLInputElement>('#print-danger')!.checked,
  });
  printKey(output, region);
});
window.addEventListener('afterprint', () => document.querySelector('#print-output')?.remove());

function selectHex(element: SVGGElement, density: Density, cell: HexCell) {
  selectedCoordinate = cell.coordinate;
  editor.hidden = false;
  terrainSelect.value = cell.terrain;
  dangerSelect.value = String(cell.danger);
  localName.value = cell.local?.name ?? '';
  localName.setCustomValidity('');
  localCategory.value = cell.local?.category ?? 'povoado';
  removeLocal.disabled = !cell.local;
  app!.querySelectorAll('[aria-pressed="true"]').forEach(previous => previous.setAttribute('aria-pressed', 'false'));
  element.setAttribute('aria-pressed', 'true');
  selection.innerHTML = `<p class="selection-density">${density.label}</p>
    <p class="selection-coordinate">${cell.coordinate}</p>
    <p class="selection-terrain"><svg viewBox="-9 -10 18 18" aria-hidden="true">${cellSymbol(cell, 0, 0)}</svg>${cell.terrain}</p>
    <dl><div><dt>Coluna</dt><dd>${String(cell.column + 1).padStart(2, '0')}</dd></div>
    <div><dt>Linha</dt><dd>${String(cell.row + 1).padStart(2, '0')}</dd></div>
    <div><dt>Escala</dt><dd>10 km / hexágono</dd></div>
    <div><dt>Perigo</dt><dd>${dangerNames[cell.danger]} (${cell.danger})</dd></div></dl>
    ${cell.expeditionBase ? '<p class="selection-base"></p>' : ''}<p class="selection-local"></p>`;
  if (cell.expeditionBase) {
    selection.querySelector('.selection-base')!.textContent = `Vilarejo · ${cell.expeditionBase.name}`;
  }
  selection.querySelector('.selection-local')!.textContent = cell.local
    ? `Local: ${cell.local.category} · ${cell.local.name}` : 'Sem local';
  if (window.matchMedia('(max-width: 650px)').matches) {
    selection.scrollIntoView({ block: 'nearest' });
  }
}

function renderRegion() {
  const active = document.activeElement as HTMLElement | SVGElement | null;
  const focusedIndex = Array.from(app!.querySelectorAll('.hex')).indexOf(active!);
  const tabIndex = Array.from(app!.querySelectorAll('.hex')).findIndex(hex => hex.getAttribute('tabindex') === '0');
  const keyOpen = app!.querySelector<HTMLDetailsElement>('.region-key')?.open ?? false;
  const { density, cells } = region;
  const sheet = app!.querySelector<HTMLElement>('#comparison')!;
  mapSheet(sheet, region);
  regionKey(app!.querySelector<HTMLElement>('#region-key')!, region);
  const key = app!.querySelector<HTMLDetailsElement>('.region-key');
  if (key) key.open = keyOpen;
  undoButton.disabled = !history.canUndo;
  redoButton.disabled = !history.canRedo;
  editor.hidden = true;
  selection.innerHTML = '<p>Selecione um hexágono para consultar terreno, perigo, local e base central.</p>';
  app!.querySelector('#generation-summary')!.textContent =
    `Mapa atual · Semente: ${JSON.stringify(region.options.seed)} · ${region.version} · Centro: ${region.centerCoordinate} · ${generationOptionsLabel(region.options)}`;
  const hexes = Array.from(sheet.querySelectorAll<SVGGElement>('.hex'));
  const selectedIndex = cells.findIndex(cell => cell.coordinate === selectedCoordinate);
  if (selectedIndex >= 0) selectHex(hexes[selectedIndex]!, density, cells[selectedIndex]!);
  hexes.forEach((hex, index) => hex.setAttribute('tabindex', index === Math.max(0, tabIndex) ? '0' : '-1'));
  if (focusedIndex >= 0) hexes[focusedIndex]?.focus();
  else if (active instanceof HTMLButtonElement && active.disabled && selectedIndex >= 0) hexes[selectedIndex]!.focus();
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
saveRegion();
