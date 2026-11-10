# Validação integrada do MVP — ticket #10

- Data: 10-11-2026.
- Base integrada: `a83fd6f0b4136c25666b5649f539d45d972c94f0`.
- Ambiente: Node.js `v26.10.0`, Playwright com Chromium, servidor local na porta 4191.
- Esta entrega acrescenta testes e documentação. Não altera código de aplicação nem o desenho aprovado.
- O [README](../README.md) descreve instalação, uso local, edição, arquivos, impressão e contratos de geração.

## Critérios e evidências

| Critério de #10 | Evidência executada |
| --- | --- |
| Gerar → editar → desfazer/refazer → recarregar → exportar/importar → imprimir | `tests/integrated.spec.ts`: fluxo completo compara o arquivo exato após cada restauração e os próximos sorteios dos três componentes após recarga e importação. |
| Rio recuperado, transferido e impresso | O mesmo fluxo conserva o percurso ligado e compara a linha impressa. `tests/river.spec.ts` cobre alternância, cancelamento, vizinhos e quatro combinações de sigilo. |
| Reprodução com todas as opções | 64 casos novos: oito opções iniciais × duas variantes áridas × duas florestais × duas aquáticas. Cada caso gera duas vezes e compara o arquivo completo, com rio ligado, opções, 108 células e contadores iniciais. |
| Consulta estreita | Teste em 390 × 844 verifica coordenada 0506, local, perigo, base, rio, painel visível, chave acessível e largura da página sem transbordamento. A tabela conserva rolagem horizontal interna, conforme o README. |
| Teclado e nomes acessíveis | `tests/app.spec.ts`, `tests/editing.spec.ts` e `tests/river.spec.ts` cobrem navegação, seleção, foco após edição e indicadores. O fluxo integrado seleciona por Enter; o teste estreito foca a região da chave. Inspeção adicional usa Enter na seleção e no resumo da chave. |
| A4 e símbolos | `tests/app.spec.ts`, `tests/danger.spec.ts` e `tests/print.spec.ts` verificam geometria, limites dos símbolos com traço, unidades de perigo e páginas separadas. O novo fluxo mede todas as páginas do PDF em 210 × 297 mm e verifica as 108 linhas da chave completa. Inspeção visual confirma o mapa monocromático e o rio. A medida física ainda exige impressora. |
| Sigilo padrão | O fluxo integrado confirma ambos os controles desligados, nenhuma base/local/legenda de perigo no mapa, exatamente uma unidade de terreno por hexágono e dados completos na chave. `tests/print.spec.ts` cobre as quatro combinações. |
| Falhas sem perda | O fluxo integrado verifica importação inválida e cancelada sem perder estado nem refazer. Outro caso força quota excedida e conserva a última cópia salva, o mapa exportável, desfazer/refazer e a nova tentativa de escrita. `tests/persistence.spec.ts` e `src/persistence.test.ts` cobrem versões, dados inválidos e indisponibilidade. |
| Testes e lint | Comandos e resultados abaixo. |
| Uso, limites, decisões e pendências | README atualizado e seções abaixo. |
| Arte autorizada | Inspeção dos arquivos rastreados, `src/assets/kenney/README.md` e licenças públicas. Seis recortes Kenney CC0, desenhos próprios e fonte Literata sob OFL. Nenhuma imagem privada ou símbolo extraído do livro integra a entrega. |
| Decisões necessárias resolvidas | Os contratos aprovados abaixo estão implementados. Não há nova decisão de produto necessária para esta entrega. |

## Comandos executados

- `npm run typecheck` — passa.
- `npm run lint` — passa.
- `npm test` — termina com código 0; nenhum arquivo unitário afetado, pois esta entrega altera testes de navegador e documentação.
- `npm exec vitest run src/generation.test.ts src/editing.test.ts src/history.test.ts src/persistence.test.ts src/river.test.ts` — 92 testes passam em cinco arquivos selecionados.
- `npm run build` — passa.
- `PLAYWRIGHT_PORT=4191 node node_modules/@playwright/test/cli.js test --reporter=line` — 109 testes passam: 42 existentes e 67 novos. Executa a configuração do script `test:e2e` diretamente.
- `git diff --check` — passa.
- `git merge integration/spec-2-mvp` — já atualizado na base indicada acima; ancestralidade confirmada com `git merge-base --is-ancestor integration/spec-2-mvp HEAD`.
- A suíte unitária completa não é executada aqui. O coordenador reserva essa execução para depois da revisão final.

## Teste primeiro: resultado real

- Os testes de integração foram escritos antes de considerar mudanças na aplicação.
- A primeira execução revela um seletor de teste incorreto para a opção inicial. O seletor passa a usar o papel acessível de combobox.
- A matriz inicial reutiliza a página e atinge o limite de downloads sucessivos do Chromium. Cada combinação passa a usar uma página isolada.
- Esses erros pertencem ao teste, não à aplicação. Não há ciclo RED/GREEN de correção de produto a declarar.
- Os casos finais passam com a aplicação integrada existente, sem alterações de produção.

## Inspeção visual com agent-browser

- Sessão isolada `ticket10`, endereço `http://127.0.0.1:4191`.
- Capturas locais de evidência; não são arquivos distribuídos pelo app.
- `/tmp/hexmap-ticket10-qa/desktop-full.png` — 1440 × 1000, página completa, rio ligado.
- `/tmp/hexmap-ticket10-qa/mobile-full.png` — 390 × 844, página completa, sem transbordamento horizontal.
- `/tmp/hexmap-ticket10-qa/mobile-selection.png` — consulta de 0506 com perigo Mortal, base permanente e local Porto de consulta.
- `/tmp/hexmap-ticket10-qa/mobile-key.png` — chave aberta com coordenada, terreno e local/base.
- `/tmp/hexmap-ticket10-qa/mobile-key-danger.png` — chave com rolagem interna até a coluna de perigo.
- A consulta mostra dados completos sem exigir um editor móvel novo. O mapa reduz para caber; o painel e a chave fornecem o texto de consulta.
- Os controles e o texto permanecem no desenho monocromático aprovado. Não há mudança visual nesta entrega.
- O fluxo integrado grava `integrated-a4.pdf` no diretório do seu teste em `test-results/`. Os demais testes de impressão também gravam PDFs nesse diretório temporário.

## Decisões fechadas e limites reais

- Grade B: 9 × 12, 108 hexágonos com ponta para cima, 19 mm entre lados, A4 retrato e margem mínima de 12 mm.
- Perigo usa uma a quatro unidades de terreno, não caveiras. A base permanente em 0506 é separada do local opcional e pode coexistir com ele, inclusive em água.
- Rio é uma adaptação opcional, começa desligado e pode cruzar qualquer terreno. Editar um hexágono não altera o percurso.
- O mapa impresso oculta locais/base e perigo por padrão. A chave sempre contém os dados completos e deve ficar com quem mestra.
- A mesma semente e opções reproduzem a geração na mesma versão. Arquivos guardam edições, contadores e percurso exatos; não há migração de versões antigas.
- O histórico existe somente na sessão. Recarregar conserva o mapa salvo, não o histórico. Arquivos exportados são a cópia de segurança; não há conta nem nuvem.
- Não há promessa de coerência climática, costeira ou hidrográfica, editor móvel completo ou recursos fora do escopo descrito no README.

## Pendências de validação, não decisões de produto

- Não foi usada impressora física. Confira a régua de 50 mm no papel, com A4, escala 100%, sem margens extras nem cabeçalhos/rodapés.
- Não foram testados Firefox, Safari, dispositivos móveis físicos ou leitores de tela reais. A evidência móvel usa viewport Chromium de 390 px.
- A validação automática e visual não substitui uma auditoria completa de acessibilidade.
- Revisão final e execução unitária completa pertencem ao coordenador da integração. Esta entrega não publica, não abre PR e não altera o tracker.
