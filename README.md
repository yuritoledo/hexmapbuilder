# Hexmap Builder

- Gerador de mapas hexagonais OSR para preparar e imprimir aventuras.
- Preto e branco, traço artesanal e interface em português brasileiro.
- Estado atual: comparação executável do [ticket #3](https://github.com/yuritoledo/hexmapbuilder/issues/3).
- Os terrenos são uma amostra fixa. Geração, edição e salvamento ainda não existem.
- O ticket #3 permanece aberto até o usuário escolher densidade, orientação e margens.

## Executar

- Use Node.js 22.13 ou posterior da linha 22, ou Node.js 24 ou posterior.
- Instale as dependências: `npm ci`.
- Inicie o aplicativo: `npm run dev`.
- Abra o endereço que o Vite mostra no terminal. O padrão é `http://127.0.0.1:5173`.
- Gere a versão estática: `npm run build`.
- Consulte a versão estática: `npm run preview`.
- O diretório `dist/` não exige servidor de aplicação nem API.

## Comparar as grades

| Alternativa | Colunas × linhas | Hexágonos | Distância entre lados no papel |
| --- | --- | --- | --- |
| A · Ampla | 7 × 9 | 63 | 24 mm |
| B · Compacta | 9 × 12 | 108 | 19 mm |

- As duas folhas usam A4 retrato, hexágonos regulares com ponta para cima e conteúdo a pelo menos 12 mm das bordas.
- As coordenadas usam coluna seguida de linha, com dois dígitos para cada uma: `0301` significa coluna 03, linha 01.
- Cada grade tem coordenadas únicas. As alternativas usam o mesmo sistema de coordenadas.
- **10 km é a distância entre lados opostos de um hexágono**, não entre vértices.
- Essa distância também corresponde à distância entre centros de hexágonos vizinhos.
- Clique em um hexágono para consultar terreno e coordenada.
- Tab entra em cada grade. As setas movem o foco por coluna ou linha, sem dar a volta nas bordas.
- Enter ou Espaço seleciona. Home e End movem para o início e fim da linha.
- Apenas um hexágono fica selecionado entre as duas grades.
- No celular, a seleção traz o painel de consulta para a tela.
- Não há escolha definitiva de grade nesta interface. Compare primeiro no papel.

## Imprimir ou salvar PDF

1. Selecione **Imprimir comparação**.
2. Use papel **A4**, orientação **retrato** e escala **100%**.
3. Desative margens adicionais, cabeçalhos e rodapés do navegador.
4. Imprima ou selecione **Salvar como PDF**.
5. Confira as duas páginas. A linha de conferência em cada página deve medir **50 mm**.
6. Compare a leitura das coordenadas, dos símbolos e da legenda no tamanho real.

- O CSS usa milímetros e uma página por alternativa. Não dimensiona a folha a partir de uma captura de tela.
- Controles, painel e destaque de seleção não aparecem na impressão.
- O teste automatizado verifica duas páginas A4 no PDF do Chromium.
- O teste não substitui a conferência física da impressora. Outros navegadores e impressoras precisam de conferência.
- **Decisão pendente:** registre no ticket #3 a densidade, a orientação dos hexágonos e as margens escolhidas antes de encerrá-lo.

## Arquitetura e ferramentas

- **TypeScript estrito:** define os dados e detecta erros de tipos.
- **Vite:** inicia o servidor local e gera os arquivos estáticos.
- **SVG:** conserva a geometria e o traço na tela e no PDF.
- **Sem framework de interface:** esta etapa tem uma página e estado de seleção local.
- `src/grid.ts`: define terrenos, alternativas e geometria em milímetros.
- `src/map-view.ts`: desenha as folhas, a legenda e os símbolos próprios.
- `src/main.ts`: monta a interface e controla foco e seleção. Mudar o foco não muda a seleção.
- `src/style.css`: define a apresentação responsiva e as regras de impressão.
- **Vitest:** verifica quantidade, coordenadas, geometria regular e limites das folhas.
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
- Os testes de navegador iniciam o servidor na porta 4173. Libere essa porta antes de executar em CI.
- O teste de impressão grava `comparacao-a4.pdf` em seu subdiretório de `test-results/`.

## Arte e dependências

- Os sete símbolos são desenhos originais em `src/map-view.ts`.
- Nenhum símbolo ou imagem vem das referências privadas ou do livro.
- A fonte Literata é servida pelo próprio aplicativo via Fontsource.
- A licença SIL Open Font License 1.1 acompanha a fonte em `public/OFL-Literata.txt`.
- `npm audit --omit=dev` não aponta vulnerabilidades na entrega inicial.
- A auditoria completa aponta avisos moderados na cadeia de lint por `minimatch` (GHSA-g3hv-75wg-m249).
- Esses pacotes são ferramentas de desenvolvimento. Eles não integram o aplicativo publicado.
- Não aplique `npm audit fix --force` sem verificar as mudanças de versão e os testes.

## Planejamento

- [PRD do MVP](https://github.com/yuritoledo/hexmapbuilder/issues/1)
- [Especificação](https://github.com/yuritoledo/hexmapbuilder/issues/2)
- [Todos os tickets](https://github.com/yuritoledo/hexmapbuilder/issues)

## Próximos tickets

- [Terrenos por semente](https://github.com/yuritoledo/hexmapbuilder/issues/4)
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
- Consulte as issues antes de tratar detalhes abertos como decisões.
