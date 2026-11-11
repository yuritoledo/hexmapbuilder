import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import {
  DownloadIcon,
  UploadIcon,
  PrinterIcon,
  Undo2Icon,
  Redo2Icon,
  DicesIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
  FieldDescription,
} from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  densities,
  dangerNames,
  terrains,
  localCategories,
  type HexCell,
  type Terrain,
  type Danger,
  type LocalCategory,
} from './grid';
import {
  defaultOptions,
  generateRegion,
  terrainNames,
  terrainPositions,
  type GenerationOptions,
  type GeneratedRegion,
} from './generation';
import {
  mapSheet,
  regionKey,
  cellSymbol,
  generationOptionsLabel,
} from './map-view';
import { printMap, printKey } from './print-view';
import {
  editCell,
  rerollComponent,
  MAX_LOCAL_NAME_LENGTH,
  type RerollComponent,
} from './editing';
import { RegionHistory } from './history';
import { setRiverEnabled } from './river';
import {
  decodeRegion,
  encodeRegion,
  STORAGE_KEY,
  MAX_FILE_BYTES,
} from './persistence';

function loadSession() {
  let region = generateRegion(densities.compacta, defaultOptions);
  let blocked = false;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) region = decodeRegion(saved);
  } catch {
    blocked = true;
  }
  return { history: new RegionHistory(region), blocked };
}

function MapCanvas(props: {
  region: GeneratedRegion;
  selected?: string;
  onSelect: (coordinate: string) => void;
}) {
  const { region, selected, onSelect } = props;
  const container = useRef<HTMLDivElement>(null);
  const keyContainer = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const sheet = container.current!;
    const key = keyContainer.current!;
    const active = document.activeElement;
    const previous = Array.from(sheet.querySelectorAll('.hex'));
    const focusedIndex = previous.indexOf(active as Element);
    const tabIndex = Math.max(
      0,
      previous.findIndex((hex) => hex.getAttribute('tabindex') === '0'),
    );
    const keyOpen = key.querySelector('details')?.open ?? false;
    mapSheet(sheet, region);
    regionKey(key, region);
    key.querySelector('details')!.open = keyOpen;
    const hexes = Array.from(sheet.querySelectorAll<SVGGElement>('.hex'));
    const selectedIndex = region.cells.findIndex(
      (cell) => cell.coordinate === selected,
    );
    if (selectedIndex >= 0)
      hexes[selectedIndex]!.setAttribute('aria-pressed', 'true');
    function moveFocus(index: number) {
      hexes.forEach((hex, position) =>
        hex.setAttribute('tabindex', position === index ? '0' : '-1'),
      );
    }
    moveFocus(tabIndex);
    if (focusedIndex >= 0) hexes[focusedIndex]?.focus();
    hexes.forEach((hex, index) => {
      const select = () => {
        onSelect(region.cells[index]!.coordinate);
      };
      hex.addEventListener('click', () => {
        moveFocus(index);
        hex.focus();
        select();
      });
      hex.addEventListener('keydown', (event) => {
        const { columns, rows } = region.density;
        const row = Math.floor(index / columns);
        const column = index % columns;
        let target = index;
        switch (event.key) {
          case 'Enter':
          case ' ':
            event.preventDefault();
            select();
            return;
          case 'ArrowLeft':
            target -= column > 0 ? 1 : 0;
            break;
          case 'ArrowRight':
            target += column < columns - 1 ? 1 : 0;
            break;
          case 'ArrowUp':
            target -= row > 0 ? columns : 0;
            break;
          case 'ArrowDown':
            target += row < rows - 1 ? columns : 0;
            break;
          case 'Home':
            target -= column;
            break;
          case 'End':
            target += columns - column - 1;
            break;
          default:
            return;
        }
        event.preventDefault();
        moveFocus(target);
        hexes[target]!.focus();
      });
    });
  }, [region, selected, onSelect]);
  return (
    <>
      <div id="comparison" className="sheets" tabIndex={-1} ref={container} />
      <div id="region-key" ref={keyContainer} />
    </>
  );
}

function CellEditor(props: {
  cell?: HexCell;
  region: GeneratedRegion;
  onCommit: (region: GeneratedRegion) => void;
}) {
  const { cell, region, onCommit } = props;
  const nameInput = useRef<HTMLInputElement>(null);
  const categoryInput = useRef<HTMLSelectElement>(null);
  useLayoutEffect(() => {
    if (!cell) return;
    nameInput.current!.value = cell.local?.name ?? '';
    nameInput.current!.setCustomValidity('');
    categoryInput.current!.value = cell.local?.category ?? 'povoado';
  }, [cell]);
  const reroll = (component: RerollComponent) => {
    if (cell) onCommit(rerollComponent(region, cell.coordinate, component));
  };
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cell) return;
    const input = nameInput.current!;
    if (!input.value.trim()) {
      input.setCustomValidity('Informe um nome que não seja apenas espaços.');
      input.reportValidity();
      return;
    }
    onCommit(
      editCell(region, cell.coordinate, {
        component: 'local',
        value: {
          name: input.value,
          category: categoryInput.current!.value as LocalCategory,
        },
      }),
    );
  }
  return (
    <div id="cell-editor" hidden={!cell} className="cell-editor">
      <FieldGroup className="gap-5">
        <Field>
          <FieldLabel htmlFor="edit-terrain">Terreno do hexágono</FieldLabel>
          <NativeSelect
            id="edit-terrain"
            value={cell?.terrain ?? terrains[0]}
            onChange={(event) =>
              cell &&
              onCommit(
                editCell(region, cell.coordinate, {
                  component: 'terrain',
                  value: event.target.value as Terrain,
                }),
              )
            }
          >
            {terrains.map((terrain) => (
              <NativeSelectOption key={terrain}>{terrain}</NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Button
          variant="outline"
          type="button"
          data-reroll="terrain"
          onClick={() => reroll('terrain')}
        >
          Gerar terreno novamente
        </Button>
        <Field>
          <FieldLabel htmlFor="edit-danger">Perigo do hexágono</FieldLabel>
          <NativeSelect
            id="edit-danger"
            value={cell?.danger ?? 1}
            onChange={(event) =>
              cell &&
              onCommit(
                editCell(region, cell.coordinate, {
                  component: 'danger',
                  value: Number(event.target.value) as Danger,
                }),
              )
            }
          >
            {([1, 2, 3, 4] as const).map((danger) => (
              <NativeSelectOption key={danger} value={danger}>
                {dangerNames[danger]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Button
          variant="outline"
          type="button"
          data-reroll="danger"
          onClick={() => reroll('danger')}
        >
          Gerar perigo novamente
        </Button>
      </FieldGroup>
      <Separator />
      <form id="local-form" aria-label="Editar local" onSubmit={submit}>
        <FieldGroup className="gap-5">
          <Field>
            <FieldLabel htmlFor="local-name">Nome do local</FieldLabel>
            <Input
              ref={nameInput}
              id="local-name"
              required
              maxLength={MAX_LOCAL_NAME_LENGTH}
              autoComplete="off"
              aria-describedby="local-help"
              onInput={(event) => event.currentTarget.setCustomValidity('')}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="local-category">Categoria do local</FieldLabel>
            <NativeSelect ref={categoryInput} id="local-category">
              {localCategories.map((category) => (
                <NativeSelectOption key={category}>
                  {category}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Button type="submit">Aplicar local</Button>
          <Button
            variant="outline"
            id="remove-local"
            type="button"
            disabled={!cell?.local}
            onClick={() =>
              cell &&
              onCommit(
                editCell(region, cell.coordinate, {
                  component: 'local',
                  value: undefined,
                }),
              )
            }
          >
            Remover local
          </Button>
        </FieldGroup>
      </form>
      <Button
        variant="outline"
        type="button"
        data-reroll="local"
        onClick={() => reroll('local')}
      >
        Gerar local novamente
      </Button>
      <p id="local-help">
        Adicione ou altere o local opcional. A base central é permanente e
        separada.
      </p>
      <p>
        Gerar terreno usa o terreno atual deste hexágono como referência. Os
        vizinhos não mudam.
      </p>
    </div>
  );
}

export function App() {
  const [session] = useState(loadSession);
  const [region, setRegion] = useState(session.history.current);
  const [options, setOptions] = useState(region.options);
  const [selected, setSelected] = useState<string>();
  const focusBeforeUpdate = useRef<Element | null>(null);
  useLayoutEffect(() => {
    const active = focusBeforeUpdate.current;
    focusBeforeUpdate.current = null;
    if (active instanceof HTMLButtonElement && active.disabled && selected) {
      document.querySelector<SVGGElement>('.hex[aria-pressed="true"]')?.focus();
    }
  }, [region, selected]);
  const [showLocations, setShowLocations] = useState(false);
  const [showDanger, setShowDanger] = useState(false);
  const [storageStatus, setStorageStatus] = useState(
    session.blocked
      ? 'Não foi possível recuperar o mapa salvo. Ele não será sobrescrito. Exporte o mapa atual ou tente salvar novamente para substituir o salvo.'
      : '',
  );
  const [retrySave, setRetrySave] = useState(session.blocked);
  const [fileStatus, setFileStatus] = useState('');
  const [importing, setImporting] = useState(false);
  const blocked = useRef(session.blocked);
  const selectionRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const cell = region.cells.find((cell) => cell.coordinate === selected);
  const names = terrainNames(options);
  const selectHex = useCallback(
    (coordinate: string) => setSelected(coordinate),
    [],
  );

  const saveRegion = useCallback((next: GeneratedRegion) => {
    if (blocked.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, encodeRegion(next));
      setRetrySave(false);
      setStorageStatus(
        'Salvo neste navegador. Mantenha também uma cópia exportada.',
      );
    } catch {
      setRetrySave(true);
      setStorageStatus(
        'Não foi possível salvar neste navegador. As alterações estão apenas nesta sessão. Exporte o mapa ou tente salvar novamente.',
      );
    }
  }, []);
  useEffect(() => {
    saveRegion(session.history.current);
  }, [session, saveRegion]);
  useLayoutEffect(() => {
    if (cell && window.matchMedia('(max-width: 900px)').matches)
      selectionRef.current?.scrollIntoView({ block: 'nearest' });
  }, [cell]);
  useEffect(() => {
    function beforePrint() {
      document.querySelector('#print-output')?.remove();
      const output = document.createElement('div');
      output.id = 'print-output';
      document.body.append(output);
      printMap(output, region, { showLocations, showDanger });
      printKey(output, region);
    }
    const afterPrint = () => document.querySelector('#print-output')?.remove();
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    return () => {
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
      afterPrint();
    };
  }, [region, showLocations, showDanger]);
  function commit(next: GeneratedRegion) {
    focusBeforeUpdate.current = document.activeElement;
    session.history.apply(next);
    setRegion(session.history.current);
    saveRegion(session.history.current);
  }
  function travel(direction: 'undo' | 'redo') {
    if (session.history[direction]()) {
      focusBeforeUpdate.current = document.activeElement;
      setRegion(session.history.current);
      saveRegion(session.history.current);
    }
  }
  function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !window.confirm(
        'Substituir todo o mapa por uma nova região? A seleção atual será descartada.',
      )
    )
      return;
    setSelected(undefined);
    const key = document.querySelector<HTMLDetailsElement>('.region-key');
    if (key) key.open = false;
    commit(
      setRiverEnabled(
        generateRegion(densities.compacta, options),
        region.river.enabled,
      ),
    );
  }
  function exportMap() {
    try {
      const url = URL.createObjectURL(
        new Blob([encodeRegion(region)], { type: 'application/json' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = 'hexmapbuilder-mapa.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      setFileStatus('Arquivo exportado. Guarde esta cópia do mapa.');
    } catch {
      setFileStatus('Não foi possível exportar o mapa. Tente novamente.');
    }
  }
  async function importMap(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    event.currentTarget.value = '';
    setImporting(true);
    try {
      if (file.size > MAX_FILE_BYTES)
        throw new Error('Arquivo muito grande. O limite é 1 MiB.');
      const imported = decodeRegion(await file.text());
      if (
        !window.confirm(
          'Substituir o mapa atual pelo mapa importado? Você pode desfazer nesta sessão.',
        )
      ) {
        setFileStatus('Importação cancelada. O mapa atual não mudou.');
        return;
      }
      setSelected(undefined);
      commit(imported);
      setFileStatus(
        'Mapa importado. O histórico anterior continua disponível nesta sessão.',
      );
    } catch (error) {
      setFileStatus(
        error instanceof Error
          ? `Não foi possível importar. ${error.message}`
          : 'Não foi possível ler o arquivo. O mapa atual não mudou.',
      );
    } finally {
      setImporting(false);
    }
  }
  return (
    <>
      <a className="skip-link" href="#comparison">
        Ir para os mapas
      </a>
      <header className="app-header">
        <a className="wordmark" href="./" aria-label="Hexmap Builder, início">
          Hexmap Builder
        </a>
        <div className="header-actions">
          <div className="history-controls" aria-label="Histórico da sessão">
            <Button
              variant="outline"
              id="undo"
              disabled={!session.history.canUndo}
              onClick={() => travel('undo')}
            >
              <Undo2Icon data-icon="inline-start" />
              Desfazer
            </Button>
            <Button
              variant="outline"
              id="redo"
              disabled={!session.history.canRedo}
              onClick={() => travel('redo')}
            >
              <Redo2Icon data-icon="inline-start" />
              Refazer
            </Button>
          </div>
          <Button variant="outline" id="export-map" onClick={exportMap}>
            <DownloadIcon data-icon="inline-start" />
            Exportar mapa
          </Button>
          <Button
            variant="outline"
            disabled={importing}
            onClick={() => importRef.current?.click()}
          >
            <UploadIcon data-icon="inline-start" />
            Importar mapa
          </Button>
          <input
            ref={importRef}
            id="import-map"
            type="file"
            accept=".json,application/json"
            aria-label="Importar mapa"
            className="sr-only"
            tabIndex={-1}
            disabled={importing}
            onChange={importMap}
          />
          <Button className="print-button" onClick={() => window.print()}>
            <PrinterIcon data-icon="inline-start" />
            Imprimir mapa e chave
          </Button>
        </div>
      </header>
      <main>
        <div className="intro">
          <h1>A região ganha vida.</h1>
          <p>
            Uma semente, uma região. Explore terrenos gerados com tabelas de 2d6
            em uma folha A4.
          </p>
        </div>
        <nav className="workspace-links" aria-label="Áreas da região">
          <a href="#comparison">Mapa</a>
          <a href="#consultation">Consultar</a>
          <a href="#preparation">Gerar</a>
        </nav>
        <div className="workspace">
          <aside
            id="preparation"
            className="preparation"
            aria-label="Preparação da região"
            tabIndex={-1}
          >
            <h2>Gerar região</h2>
            <form
              id="generation-form"
              className="generation-controls"
              aria-label="Opções de geração"
              onSubmit={generate}
            >
              <FieldGroup className="gap-5">
                <Field>
                  <FieldLabel htmlFor="seed">Semente</FieldLabel>
                  <Input
                    id="seed"
                    name="seed"
                    value={options.seed}
                    required
                    maxLength={80}
                    autoComplete="off"
                    onChange={(event) =>
                      setOptions({ ...options, seed: event.target.value })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="initialTerrain">
                    Terreno inicial
                  </FieldLabel>
                  <NativeSelect
                    id="initialTerrain"
                    name="initialTerrain"
                    value={options.initialTerrain}
                    onChange={(event) =>
                      setOptions({
                        ...options,
                        initialTerrain: event.target
                          .value as GenerationOptions['initialTerrain'],
                      })
                    }
                  >
                    <NativeSelectOption value="random">
                      Sortear com 2d6
                    </NativeSelectOption>
                    {terrainPositions.map((position) => (
                      <NativeSelectOption key={position} value={position}>
                        {names[position]}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor="arid">Deserto ou ártico</FieldLabel>
                  <NativeSelect
                    id="arid"
                    name="arid"
                    value={options.arid}
                    onChange={(event) =>
                      setOptions({
                        ...options,
                        arid: event.target.value as GenerationOptions['arid'],
                      })
                    }
                  >
                    <NativeSelectOption>Deserto</NativeSelectOption>
                    <NativeSelectOption>Ártico</NativeSelectOption>
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor="forest">Floresta ou selva</FieldLabel>
                  <NativeSelect
                    id="forest"
                    name="forest"
                    value={options.forest}
                    onChange={(event) =>
                      setOptions({
                        ...options,
                        forest: event.target
                          .value as GenerationOptions['forest'],
                      })
                    }
                  >
                    <NativeSelectOption>Floresta</NativeSelectOption>
                    <NativeSelectOption>Selva</NativeSelectOption>
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor="water">Rio ou litoral</FieldLabel>
                  <NativeSelect
                    id="water"
                    name="water"
                    value={options.water}
                    onChange={(event) =>
                      setOptions({
                        ...options,
                        water: event.target.value as GenerationOptions['water'],
                      })
                    }
                  >
                    <NativeSelectOption>Rio</NativeSelectOption>
                    <NativeSelectOption>Litoral</NativeSelectOption>
                  </NativeSelect>
                </Field>
                <Button type="submit" className="generate-button">
                  <DicesIcon data-icon="inline-start" />
                  Gerar região
                </Button>
              </FieldGroup>
              <p
                id="generation-summary"
                className="generation-summary"
                aria-live="polite"
              >
                Mapa atual · Semente: {JSON.stringify(region.options.seed)} ·{' '}
                {region.version} · Centro: {region.centerCoordinate} ·{' '}
                {generationOptionsLabel(region.options)}
              </p>
            </form>
            <FieldGroup className="gap-6">
              <Field>
                <div className="river-controls">
                  <Field orientation="horizontal">
                    <Checkbox
                      id="river-enabled"
                      checked={region.river.enabled}
                      onCheckedChange={(enabled) =>
                        commit(setRiverEnabled(region, enabled))
                      }
                      aria-describedby="river-help"
                    />
                    <FieldLabel htmlFor="river-enabled">
                      Rio contínuo (adaptação opcional)
                    </FieldLabel>
                  </Field>
                  <FieldDescription id="river-help">
                    Uma linha de norte a sul, por semente. Cruza qualquer
                    terreno, inclusive oceano, sem mudar seus tipos. Editar um
                    hexágono preserva o percurso.
                  </FieldDescription>
                </div>
              </Field>
              <FieldSet className="print-controls">
                <FieldLegend>No mapa impresso</FieldLegend>
                <FieldGroup className="gap-4">
                  <Field orientation="horizontal">
                    <Checkbox
                      id="print-locations"
                      checked={showLocations}
                      onCheckedChange={setShowLocations}
                    />
                    <FieldLabel htmlFor="print-locations">
                      Mostrar locais no mapa impresso
                    </FieldLabel>
                  </Field>
                  <Field orientation="horizontal">
                    <Checkbox
                      id="print-danger"
                      checked={showDanger}
                      onCheckedChange={setShowDanger}
                    />
                    <FieldLabel htmlFor="print-danger">
                      Mostrar perigo no mapa impresso
                    </FieldLabel>
                  </Field>
                </FieldGroup>
                <FieldDescription>
                  A chave mostra terrenos por extenso, locais com nomes
                  completos e espaço livre para anotações. A região padrão ocupa
                  duas folhas A4; nomes longos podem exigir folhas adicionais.
                  Não entregue a chave aos jogadores.
                </FieldDescription>
              </FieldSet>
            </FieldGroup>
            <Separator />
            <section
              className="storage-controls"
              aria-label="Salvar e transferir mapa"
            >
              <p id="storage-status" role="status">
                {storageStatus}
              </p>
              <p id="file-status" role="status">
                {fileStatus}
              </p>
              <Button
                variant="outline"
                id="retry-save"
                type="button"
                hidden={!retrySave}
                onClick={() => {
                  if (
                    blocked.current &&
                    !window.confirm(
                      'Substituir o salvamento que não pôde ser recuperado pelo mapa atual?',
                    )
                  )
                    return;
                  blocked.current = false;
                  saveRegion(region);
                }}
              >
                Tentar salvar novamente
              </Button>
              <p>
                Salvamento automático neste navegador. Exporte uma cópia para
                guardar ou transferir o mapa. O histórico não é salvo.
              </p>
            </section>
          </aside>
          <MapCanvas region={region} selected={selected} onSelect={selectHex} />
          <aside
            id="consultation"
            className="inspector"
            aria-label="Consulta e instruções"
            tabIndex={-1}
          >
            <section>
              <h2>Hexágono em foco</h2>
              <div
                id="selection"
                ref={selectionRef}
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                {cell ? (
                  <>
                    <Badge variant="secondary">{region.density.label}</Badge>
                    <p className="selection-coordinate">{cell.coordinate}</p>
                    <p className="selection-terrain">
                      <svg
                        viewBox="-9 -10 18 18"
                        aria-hidden="true"
                        dangerouslySetInnerHTML={{
                          __html: cellSymbol(cell, 0, 0),
                        }}
                      />
                      {cell.terrain}
                    </p>
                    <dl>
                      <div>
                        <dt>Coluna</dt>
                        <dd>{String(cell.column + 1).padStart(2, '0')}</dd>
                      </div>
                      <div>
                        <dt>Linha</dt>
                        <dd>{String(cell.row + 1).padStart(2, '0')}</dd>
                      </div>
                      <div>
                        <dt>Escala</dt>
                        <dd>10 km / hexágono</dd>
                      </div>
                      <div>
                        <dt>Perigo</dt>
                        <dd>
                          {dangerNames[cell.danger]} ({cell.danger})
                        </dd>
                      </div>
                    </dl>
                    {cell.expeditionBase && (
                      <p className="selection-base">
                        Vilarejo · {cell.expeditionBase.name}
                      </p>
                    )}
                    <p className="selection-local">
                      {cell.local
                        ? `Local: ${cell.local.category} · ${cell.local.name}`
                        : 'Sem local'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="empty-selection">
                      Seu mapa começa com um olhar.
                    </p>
                    <p>
                      Selecione um hexágono para consultar terreno, perigo,
                      local e base central.
                    </p>
                  </>
                )}
              </div>
              <CellEditor cell={cell} region={region} onCommit={commit} />
            </section>
            <details>
              <summary>Da mesa para o mapa</summary>
              <p>
                Geração em lote: cada terreno usa um vizinho já gerado como
                referência.
              </p>
              <p>
                As tabelas não garantem clima, costas ou rios contínuos. Não
                incluem cataclismos.
              </p>
              <p>
                Grade aprovada: 108 hexágonos, ponta para cima e margens mínimas
                de 12 mm.
              </p>
            </details>
            <details>
              <summary>Preparar a impressão</summary>
              <p>
                Duas páginas A4 retrato para a região padrão: mapa e chave. Use
                escala de 100%, sem margens adicionais e sem cabeçalhos ou
                rodapés do navegador.
              </p>
              <p>
                Salve como PDF ou imprima. A linha de conferência deve medir 50
                mm no papel.
              </p>
            </details>
            <p id="keyboard-help" className="keyboard-help">
              Teclado: Tab entra em cada grade. Use as setas para mover o foco e
              Enter ou Espaço para selecionar. Home e End vão ao início e ao fim
              da linha.
            </p>
            <p className="history-help">
              Histórico desta sessão · inclui a substituição do mapa.
            </p>
          </aside>
        </div>
        <footer className="app-footer">
          <p>
            Edição independente com desfazer e refazer · salvamento automático
            local.
          </p>
          <p>
            Vetores Kenney (CC0) e desenhos próprios. Feito para histórias que
            começam pequenas.
          </p>
        </footer>
      </main>
    </>
  );
}
