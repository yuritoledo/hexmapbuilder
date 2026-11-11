# Hexmap Builder

- Gerador de mapas hexagonais OSR para preparar e imprimir aventuras.
- Preto e branco, traço artesanal e interface em português brasileiro.
- Estado atual: terrenos, perigo e locais por semente, chave na tela e impressão A4 com sigilo independente no mapa.
- A grade B foi aprovada: 108 hexágonos, ponta para cima e margens mínimas de 12 mm.
- Perigo real aparece como 1–4 símbolos de terreno. O centro contém um vilarejo, a Base das Expedições.
- Edição independente, histórico da sessão, salvamento local e transferência por arquivo JSON.

## Executar

- Use Node.js 22.13 ou posterior da linha 22, ou Node.js 24 ou posterior.
- Instale as dependências: `npm ci`.
- Inicie o aplicativo: `npm run dev`.
- Abra o endereço que o Vite mostra no terminal. O padrão é `http://127.0.0.1:5173`.
- Gere a versão estática: `npm run build`.
- Consulte a versão estática: `npm run preview`.
- O diretório `dist/` não exige servidor de aplicação nem API.

## Gerar uma região

- Informe uma semente de 1 a 80 caracteres. Maiúsculas, acentos e espaços fazem parte dela.
- Escolha o terreno central ou **Sortear com 2d6**.
- Escolha as variantes do mapa: Deserto/Ártico, Floresta/Selva e Rio/Litoral.
- Selecione **Gerar região** e confirme a substituição do mapa atual.
- Cancelar conserva o mapa, os metadados e a seleção. Os campos continuam com os valores digitados.
- Os campos são opções para a próxima geração. O resumo e a folha mostram o mapa atual.
- A abertura recupera o mapa salvo neste navegador. Sem salvamento, gera `terras-01` com as opções padrão.
- A mesma semente, opções, grade e versão produzem a mesma região.
- A grade aprovada tem 9 colunas × 12 linhas, 108 hexágonos e 19 mm entre lados no papel.
- A folha usa A4 retrato, hexágonos regulares com ponta para cima e conteúdo a pelo menos 12 mm das bordas.
- As coordenadas usam coluna seguida de linha, com dois dígitos para cada uma: `0301` significa coluna 03, linha 01.
- As coordenadas são únicas dentro da região.
- **10 km é a distância entre lados opostos de um hexágono**, não entre vértices.
- Essa distância também corresponde à distância entre centros de hexágonos vizinhos.
- Clique em um hexágono para consultar coordenada, terreno, perigo, local opcional e base permanente.
- Abra **Chave de quem mestra** abaixo do mapa para consultar todos os hexágonos. No celular, a tabela permite rolagem horizontal.
- Tab entra em cada grade. As setas movem o foco por coluna ou linha, sem dar a volta nas bordas.
- Enter ou Espaço seleciona. Home e End movem para o início e fim da linha.
- Apenas um hexágono fica selecionado.
- No celular, a seleção traz o painel de consulta para a tela.

## Contrato de geração: region-v4

- Esta é uma adaptação em lote das tabelas da spec. Não simula exploração progressiva.
- A tabela inicial usa dois d6: 2 Deserto/Ártico; 3 Pântano; 4–6 Pradaria; 7–8 Floresta/Selva; 9–10 Rio/Litoral; 11 Oceano; 12 Montanha.
- O ciclo tem **sete posições**, nesta ordem: Deserto/Ártico → Pântano → Pradaria → Floresta/Selva → Rio/Litoral → Oceano → Montanha → início.
- Cada transição rola dois d6: 2–3 avança uma posição; 4–8 conserva; 9–11 avança duas; 12 rola novamente a tabela inicial com dois d6 extras.
- A transição percorre posições do ciclo, não os onze resultados possíveis da soma.
- As variantes mudam nomes e símbolos da posição, não as probabilidades.
- Coordenadas internas começam em zero. Linhas ímpares ficam deslocadas meio hexágono à direita.
- O centro usa coluna `floor((colunas - 1) / 2)` e linha `floor((linhas - 1) / 2)`. Em dimensões pares, escolhe o centro superior/esquerdo. Em B, a coordenada é **0506**.
- A visita usa uma fila por camadas a partir do centro. Para cada referência, ordena seus seis vizinhos válidos por linha e depois por coluna.
- O primeiro vizinho gerado que descobre uma célula fornece a referência. A célula recebe terreno e entra na fila imediatamente. Outros vizinhos não a sorteiam novamente.
- A saída conserva a ordem por linha e coluna, independentemente da ordem de visita.
- Escolher o terreno inicial não consome dados no centro. Sortear consome dois. Cada célula seguinte consome dois, mais dois se o resultado for 12.
- A semente alimenta FNV-1a sobre unidades UTF-16: estado inicial 2166136261, XOR com cada unidade e multiplicação inteira de 32 bits por 16777619.
- O estado alimenta Mulberry32. Cada sorteio avança 0x6d2b79f5 e converte o valor sem sinal para d6 com `1 + floor(valor / 2^32 * 6)`. As operações completas ficam em `seededDie`.
- `region-v2` conserva os terrenos de `terrain-v1` e acrescenta perigo e base central. Mudanças no contrato exigem nova versão.
- O perigo usa um fluxo separado de FNV-1a + Mulberry32, com a semente original seguida de `\0danger-v1` (separador NUL, não texto digitado). Não consome dados de terreno.
- Cada hexágono recebe um d6 de perigo na ordem de linha e coluna: 1 seguro, 2–3 inseguro, 4–5 arriscado e 6 mortal.
- O mapa mostra respectivamente 1, 2, 3 ou 4 unidades do terreno. Essa escolha visual substitui círculo e caveiras da spec, por aprovação do usuário.
- O centro contém um único povoado chamado Base das Expedições, representado por um vilarejo. O terreno e o perigo do centro continuam gerados normalmente, inclusive em água. Essa base é uma convenção do aplicativo, não uma regra do livro.
- A consulta mostra o nome do perigo e a base. A impressão obedece aos controles independentes de sigilo do mapa.
- `region-v3` acrescenta locais opcionais por `local-v1`, sem mudar as sequências de terreno de `terrain-v1` nem de perigo de `danger-v1`.
- Locais usam FNV-1a + Mulberry32 com a semente original seguida de `\0local-v1` (separador NUL). Esse fluxo independente visita as células por linha e coluna.
- Cada célula consome um d6 de presença. **Somente 1 gera local**. Resultados 2–6 não consomem dados extras.
- Quando há local, outro d6 escolhe a categoria na ordem: 1 povoado, 2 masmorra, 3 ruína, 4 covil, 5 santuário, 6 marco. Um terceiro d6 escolhe um dos seis nomes da categoria em `src/locals.ts`.
- Esta é uma política específica do aplicativo, não uma tabela do livro. Os 36 nomes são conteúdo original em pt-BR, sem serviço externo. São lugares de exploração, não nomes de pessoas. Nomes podem se repetir.
- Todas as categorias podem ocorrer em qualquer terreno, inclusive água. Não há filtro, nova rolagem ou promessa de coerência geográfica.
- `local` guarda somente nome e categoria. `expeditionBase` continua separado e permanente; o centro pode conter ambos, inclusive em água.
- Um losango vazio indica local opcional, acima dos símbolos de terreno. Não substitui unidades de perigo nem o vilarejo da base. Nome e categoria aparecem na seleção, no nome acessível e na chave.
- A chave na tela, a chave impressa e o arquivo exportado conservam nomes completos. Os controles de sigilo afetam somente o mapa impresso.
- Não há cataclismos nem promessa de clima ou costas coerentes. O rio contínuo opcional é uma sobreposição independente dos terrenos.

## Rio contínuo opcional (#8)

- Marque **Rio contínuo (adaptação opcional)** para acrescentar uma única linha de norte a sul. A opção começa desligada.
- Esta é uma adaptação do aplicativo, não uma regra atribuída ao livro. Não altera o terreno `Rio`/`Litoral`, nem tenta corrigir clima, costas ou hidrografia.
- O percurso pode cruzar qualquer terreno, inclusive Oceano e Litoral. Não cria lagos, afluentes, elevação ou novos tipos de terreno.
- `region-v4` acrescenta `river` ao snapshot. Desligado é exatamente `{ enabled: false, path: [] }`. Ligado contém coordenadas canônicas, únicas, adjacentes, da primeira à última linha.
- `setRiverEnabled(region, enabled)` em `src/river.ts` usa o fluxo independente FNV-1a UTF-16 + Mulberry32 com `region.options.seed` seguido de NUL e `river-v1`. Não consome dados de `terrain-v1`, `danger-v1`, `local-v1` ou `edit-v1`.
- O começo usa dois d6: coluna zero-based `((d1 - 1) * 6 + d2 - 1) % columns`. Em cada linha, os candidatos ao sul são a mesma coluna e a coluna anterior (linha par) ou seguinte (linha ímpar), dentro da grade e em ordem crescente. Um d6 escolhe o primeiro com 1–3 ou o segundo com 4–6. Mesmo com apenas um candidato, consome o dado. A última linha não consome dado de transição.
- A linha gráfica une os centros do percurso. Começa no vértice norte do primeiro hexágono e termina no vértice sul do último. A folha identifica a linha como adaptação opcional.
- A mesma semente, grade e versão repetem o percurso. Variantes de terreno, opções pendentes e rolagens de outros componentes não o alteram.
- Editar ou gerar novamente terreno, perigo ou local de um hexágono conserva o percurso, a base e os vizinhos.
- Alternar entra no histórico. Desfazer/refazer restaura o estado exato. Desligar remove toda a linha; ligar novamente calcula o mesmo percurso por semente. Ativar um mapa já ligado preserva seu percurso salvo.
- Gerar um mapa inteiro conserva a escolha ligado/desligado e recalcula o percurso pela nova semente. Cancelar conserva o mapa e o histórico. A base permanente em 0506 e o local opcional continuam separados.

## Imprimir ou salvar PDF

- Antes de imprimir, escolha **Mostrar locais no mapa impresso** e **Mostrar perigo no mapa impresso**. Ambos começam desmarcados e funcionam de forma independente.
- Ocultar locais também oculta a Base das Expedições. Ocultar perigo mostra exatamente uma unidade de terreno por hexágono e remove a legenda de perigo.
- O mapa usa a região atual, inclusive edições. Não usa valores ainda não aplicados no formulário.
- A chave contém os 108 hexágonos em quatro colunas de 27 linhas, com coordenada, terreno por extenso e perigo 1–4. Uma lista separada reúne categorias e nomes completos dos locais e da Base. O espaço livre de anotações serve para escrever à mão apenas os hexágonos relevantes. Não entregue a chave aos jogadores.
- Nomes longos recebem reticências somente na impressão. Consulte os nomes completos no aplicativo ou no arquivo exportado. Cada linha oferece cerca de 18 mm × 6,5 mm para observações à mão.
1. Selecione **Imprimir mapa**.
2. Use papel **A4**, orientação **retrato** e escala **100%**.
3. Desative margens adicionais, cabeçalhos e rodapés do navegador.
4. Imprima ou selecione **Salvar como PDF**.
5. Confira a página. A linha de conferência deve medir **50 mm**.

- O CSS usa milímetros. A região padrão ocupa duas páginas A4: o mapa na primeira e a chave na segunda, com margens de 12 mm na chave. Muitos locais ou nomes editados longos podem exigir páginas adicionais, sem cortar os textos.
- A folha inclui semente, versão, terreno inicial e variantes para repetir a geração.
- A semente aparece entre aspas no formato JSON, com espaços preservados e caracteres especiais escapados. As aspas externas não fazem parte da semente.
- Sementes largas recebem ajuste horizontal de texto para respeitar os 12 mm de margem.
- Controles, painel e destaque de seleção não aparecem na impressão.
- Os testes verificam as quatro combinações de sigilo, duas páginas A4 para a região padrão, nomes completos, anotações compartilhadas e páginas adicionais para 108 nomes longos.
- O teste não substitui a conferência física da impressora. Outros navegadores e impressoras precisam de conferência.

## Arquitetura e ferramentas

- **TypeScript estrito:** define os dados e detecta erros de tipos.
- **Vite:** inicia o servidor local e gera os arquivos estáticos.
- **SVG:** conserva a geometria e o traço na tela e no PDF.
- **Sem framework de interface:** uma página com estado local, sem API.
- `src/grid.ts`: tipos de terreno e geometria em milímetros. A alternativa A fica para regressão geométrica; só B aparece na interface.
- `src/generation.ts`: tabelas, dados com semente, visita da grade e metadados da região.
- `src/locals.ts`: política de presença, categoria e nomes originais dos locais.
- `src/river.ts`: percurso opcional por semente e alternância sem alterar os hexágonos.
- `src/map-view.ts`: desenha a folha, a legenda ativa e os símbolos locais.
- `src/print-view.ts`: `printMap(container: HTMLElement, region: GeneratedRegion, visibility: PrintVisibility): void` cria a projeção sem alterar a região. `PrintVisibility` contém `showLocations` e `showDanger`.
- `printKey(container: HTMLElement, region: GeneratedRegion): void` acrescenta a chave compacta, sem parâmetros de sigilo. Funciona com o painel da tela fechado e não altera nomes ou dados da região.
- `beforeprint` recria `#print-output` a partir da região atual. `afterprint` remove essa cópia. O botão e a impressão nativa do navegador usam o mesmo caminho.
- Os controles de impressão são preferências da sessão, fora de `GeneratedRegion`. Importar substitui a região atual, não a projeção descartável.
- `printMap` conserva o percurso do rio e chama `mapSheet`. O rio é uma sobreposição separada do terreno. O sigilo de local/perigo não remove o rio. A impressão não consome dados aleatórios.
- `src/main.ts`: controla formulário, confirmação, geração, foco e seleção. Mudar o foco não muda a seleção.
- `src/persistence.ts`: formato de arquivo versionado, validação externa e restauração canônica do mapa editado.
- `src/style.css`: define a apresentação responsiva e as regras de impressão.
- **Vitest:** verifica geometria, tabelas, probabilidades de 2d6, vizinhança, variantes e repetição por semente.
- **Playwright + Chromium:** verifica abertura, mouse, teclado, consulta móvel e PDF.
- **pdf-lib:** lê as dimensões e a quantidade de páginas do PDF nos testes. Não integra o aplicativo.
- **ESLint:** verifica os arquivos JavaScript e TypeScript.

## Verificar

- Instale o navegador de testes uma vez: `npx playwright install chromium`.
- Tipos: `npm run typecheck`.
- Lint: `npm run lint`.
- Testes unitários dos arquivos alterados: `npm test`.
- Um arquivo unitário: `npm exec vitest run src/grid.test.ts`.
- Todos os testes unitários: `npm run test:all`.
- Testes de navegador: `npm run test:e2e`.
- Build de produção: `npm run build`.
- Por padrão, os testes de navegador usam a porta 4173. Use `PLAYWRIGHT_PORT=4185 npm run test:e2e` para iniciar um servidor próprio em outra porta. Com essa variável, Playwright não reutiliza servidores existentes.
- O teste de impressão grava `comparacao-a4.pdf` em seu subdiretório de `test-results/`.

## Arte e dependências

- Floresta, deserto, selva, rio e oceano usam recortes do [Kenney Cartography Pack 1.0](https://kenney.nl/assets/cartography-pack), sob CC0.
- Os SVG locais ficam em `src/assets/kenney/`. Usam `currentColor`, caixa de 12 × 10 mm e proporções preservadas. O vilarejo usa três casas Kenney em uma caixa de 9 × 7 mm.
- A licença original acompanha o app em `public/CC0-Kenney-Cartography.txt`. O crédito é voluntário.
- Pradaria usa capim aberto. Pântano acrescenta água ao capim. Montanha, ártico e litoral também usam desenhos próprios em `src/map-view.ts`.
- Floresta usa um pinheiro por unidade. Oceano usa uma onda. Rio usa rotação de 90°.
- A proveniência dos recortes e das transformações está em `src/assets/kenney/README.md`.
- Nenhum símbolo ou imagem vem das referências privadas ou do livro.
- Eczar identifica a interface. Source Sans 3 mantém os controles legíveis. Literata permanece nas folhas A4.
- O aplicativo serve as três fontes localmente via Fontsource. Não consulta serviços externos de fontes.
- As licenças SIL Open Font License 1.1 acompanham as fontes em `public/OFL-eczar.txt`, `public/OFL-source-sans-3.txt` e `public/OFL-Literata.txt`.
- `npm audit --omit=dev` não aponta vulnerabilidades na entrega inicial.
- A auditoria completa aponta avisos moderados na cadeia de lint por `minimatch` (GHSA-g3hv-75wg-m249).
- Esses pacotes são ferramentas de desenvolvimento. Eles não integram o aplicativo publicado.
- Não aplique `npm audit fix --force` sem verificar as mudanças de versão e os testes.

## Edição e histórico da sessão (#6)

- Selecione um hexágono com clique ou Enter/Espaço. Use os campos do painel para editar terreno, perigo e local opcional.
- O formulário de local adiciona, renomeia ou troca a categoria. Remover local não remove a Base das Expedições em 0506.
- Nomes aceitam de 1 a 120 unidades UTF-16, exceto texto composto apenas de espaços. O aplicativo preserva o texto aceito, inclusive espaços e caracteres de marcação, como texto literal.
- Cada botão de geração altera somente seu componente no hexágono selecionado. Os demais componentes, vizinhos, base e metadados aplicados permanecem iguais.
- **Política da aplicação, não regra atribuída à fonte:** gerar terreno individual usa a posição do terreno ATUAL do próprio hexágono como referência na tabela de transição 2d6. Não usa vizinho e não propaga a alteração.
- As variantes equivalentes (Deserto/Ártico, Floresta/Selva, Rio/Litoral) compartilham a posição da tabela. O resultado usa as variantes aplicadas ao mapa, não os valores ainda não aplicados no formulário de geração.
- Terreno consome 2d6; resultado 12 consome mais 2d6 na tabela inicial. Perigo consome 1d6 (1 → Seguro, 2–3 → Inseguro, 4–5 → Arriscado, 6 → Mortal).
- Local consome 1d6 para presença. Apenas 1 cria local e consome mais dois d6, para categoria e nome. Os outros resultados removem o local opcional.
- A geração inicial `region-v4` preserva os fluxos de terreno, perigo e locais. A edição usa fluxos separados `edit-v1` com FNV-1a UTF-16 + Mulberry32.
- A semente de cada ação é a concatenação de `region.options.seed`, NUL, `edit-v1`, NUL, componente (`terrain`, `danger`, `local`), NUL e contador decimal desse componente ANTES da ação.
- `GeneratedRegion.rerolls` contém `{ terrain: number, local: number, danger: number }`, inicialmente zero. Cada geração individual incrementa só seu contador uma vez, mesmo quando o resultado visível é igual. A contagem é por componente e mapa, não por hexágono; ações de outros componentes não consomem sua sequência.
- Edições manuais não consomem sorteios. Gerar um mapa inteiro reinicia os contadores. Cancelar a confirmação não altera mapa nem histórico.
- Desfazer/refazer restaura snapshots completos, inclusive opções aplicadas e contadores. Uma nova alteração após desfazer elimina refazer; uma edição sem mudança não cria entrada nem elimina refazer. Sorteio com resultado igual cria entrada, pois muda o contador.
- O histórico mantém todas as ações da sessão, sem limite artificial; usa memória proporcional ao número de snapshots. Recarregar encerra esse histórico. O mapa atual persiste, mas o histórico não.
- A seleção, foco, abertura da chave e campos de geração ainda não aplicados são estado da interface, não snapshots do mapa. Edição preserva a seleção. Gerar mapa inteiro limpa a seleção e fecha a chave.

### Contratos de salvar/importar (#7) e rio (#8)

- `editCell(region: GeneratedRegion, coordinate: string, edit: CellEdit): GeneratedRegion` e `rerollComponent(region: GeneratedRegion, coordinate: string, component: RerollComponent, rollDie?: () => number): GeneratedRegion` ficam em `src/editing.ts`. Coordenada desconhecida lança erro antes de consumir dados. O dado opcional é uma função que retorna inteiros de 1 a 6 para testes controlados.
- `CellEdit` discrimina `terrain`, `danger` e `local` pelo campo `component`; `value` usa os tipos de `src/grid.ts`. `local: undefined` significa ausência. A API recebe dados internos tipados; `decodeRegion` valida dados externos antes de chamar essa API.
- `RegionHistory` em `src/history.ts` recebe o mapa inicial. Expõe `current`, `canUndo`, `canRedo`, `apply(region): void`, `undo(): boolean`, `redo(): boolean`. `current` devolve cópia independente; a classe copia os dados recebidos. O estado do mapa é dado simples compatível com JSON e `structuredClone`.
- `commitRegion(next: GeneratedRegion)` em `src/main.ts` aplica uma ação ao histórico, obtém `history.current`, renderiza e salva o mapa. Ações de importação ou alternância de rio entram por esse ponto para participar do histórico.
- A persistência salva o mapa editado completo, `region.options` aplicadas e todos os contadores. Não reconstrói o mapa apenas pela semente nem lê opções pendentes do formulário. Uma versão do arquivo é separada de `region.version`.
- `GeneratedRegion.river` contém `{ enabled: boolean; path: string[] }`. Edição e sorteios individuais preservam o percurso; o histórico copia o objeto inteiro. Alternar o rio aplica um snapshot pelo mesmo histórico. O arquivo guarda o percurso completo, não o reconstrói pela semente.

## Salvamento e arquivos (#7)

- O aplicativo salva automaticamente cada alteração confirmada, geração, importação, desfazer e refazer em `localStorage`, na chave `hexmapbuilder.current`.
- Recarregar restaura os dados editados exatos, as opções aplicadas, os contadores de sorteio e o caminho do rio. Não gera novamente pela semente.
- O histórico, a seleção e os campos ainda não aplicados não persistem. O histórico começa vazio após recarregar.
- **Exportar mapa** baixa `hexmapbuilder-mapa.json`. Guarde cópias: o navegador pode apagar seus dados locais; não há conta nem nuvem.
- **Importar mapa** valida o arquivo inteiro antes de pedir confirmação. Cancelar ou rejeitar conserva mapa, histórico e salvamento. Importação aceita pode ser desfeita e refeita na sessão.
- Falhas de leitura ou escrita aparecem na tela. Falha de escrita conserva a última cópia salva; o mapa atual continua editável e exportável. **Tentar salvar novamente** permite repetir a escrita.
- Um salvamento inválido ou inacessível não é sobrescrito automaticamente. A substituição exige confirmação no botão de nova tentativa.
- `src/persistence.ts` define `encodeRegion(region: GeneratedRegion): string` e `decodeRegion(text: string): GeneratedRegion`.
- O documento tem `format: "hexmapbuilder"`, `schemaVersion: 1` e `region`. A versão do arquivo é separada da versão de geração atual. Não há migração de versões antigas.
- O arquivo guarda versão, opções, densidade, centro, contadores, rio e todas as células editadas. Geometria é reconstruída pela grade canônica, nunca aceita do arquivo.
- A validação rejeita campos desconhecidos, valores inválidos, células ausentes/repetidas/desordenadas, coordenadas não canônicas, base ausente/deslocada, contadores não inteiros seguros, nomes inválidos e caminhos de rio inválidos.
- O limite é 1 MiB em UTF-8. Nomes e sementes preservam exatamente o texto aceito, inclusive espaços e caracteres de marcação. A base permanece separada do local opcional em 0506.
- Rio desativado exige caminho vazio; ativado exige caminho sem repetição, com células adjacentes, da borda norte à borda sul.

## Planejamento

- [PRD do MVP](https://github.com/yuritoledo/hexmapbuilder/issues/1)
- [Especificação](https://github.com/yuritoledo/hexmapbuilder/issues/2)
- [Todos os tickets](https://github.com/yuritoledo/hexmapbuilder/issues)

## Entregas do MVP

- [Locais e perigo](https://github.com/yuritoledo/hexmapbuilder/issues/5)
- [Edição e histórico](https://github.com/yuritoledo/hexmapbuilder/issues/6)
- [Salvar e importar](https://github.com/yuritoledo/hexmapbuilder/issues/7)
- [Rio opcional](https://github.com/yuritoledo/hexmapbuilder/issues/8)
- [Impressão e sigilo](https://github.com/yuritoledo/hexmapbuilder/issues/9)
- [Validação integrada](https://github.com/yuritoledo/hexmapbuilder/issues/10)

## Limites do MVP

- Sem contas, nuvem, colaboração ou editor manual completo.
- Sem cataclismos automáticos, estradas, lagos ou afluentes.
- Sem cálculo de viagem, fichas ou masmorras prontas.
- Inglês fica para uma versão posterior.
- As decisões do MVP estão registradas acima e na spec. Não há decisão de produto pendente para esta entrega.
- Confira as evidências e os limites de validação em [Validação integrada do MVP](docs/mvp-verification.md).
