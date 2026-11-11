# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

- Delegado pelo usuário para esta base em 2026-11-09.
- TypeScript, Vite e SVG; sem framework de interface nesta etapa.
- Vitest testa geometria e geração. Playwright testa fluxos pelo navegador e PDF.
- Publicação na Vercel: https://hexmapbuilder.vercel.app.

## Users

- Pessoas que mestram aventuras OSR e preparam uma região imprimível.
- Computador para edição. Celular para consulta básica.

## Product Purpose

- Preparar, ajustar, guardar e imprimir uma região hexagonal sem conta.
- Gerar uma região por semente, ajustar seus hexágonos e preparar uma referência de mesa para quem mestra.

## Operating Context

- Geração e consulta na tela. Impressão em papel ou PDF A4 retrato, em tamanho real.
- Fluxo: gerar, editar, desfazer/refazer, guardar ou transferir um arquivo e imprimir.
- A impressão separa o mapa dos jogadores e a chave de quem mestra em A4 retrato. A região padrão ocupa duas folhas; conteúdo editado extenso pode exigir folhas adicionais.
- A chave reúne os 108 hexágonos em quatro colunas de 27, com terreno por extenso e perigo 1–4. Locais e Base ficam em uma lista com categoria e nome completos. Um bloco livre recebe anotações à mão, sem divisões por hexágono.
- Nomes longos recebem reticências somente na impressão. O aplicativo e o arquivo exportado preservam os nomes completos.

## Capabilities and Constraints

- Fonte de requisitos: issues #1 e #2 e decisões posteriores aprovadas pelo usuário em yuritoledo/hexmapbuilder. O MVP da spec #2 está entregue.
- A geração de terrenos usa tabelas 2d6. A mesma semente e opções reproduzem a geração na mesma versão.
- Perigo, locais e rio opcional usam fluxos aleatórios independentes.
- Cada hexágono permite editar ou sortear novamente terreno, perigo e local. Desfazer e refazer restauram as alterações da sessão.
- A Base das Expedições é permanente no hexágono 0506. Ela pode coexistir com um local opcional, inclusive em água.
- O rio começa desligado. Quando ligado, percorre hexágonos vizinhos de norte a sul. Editar ou sortear um hexágono preserva o percurso; gerar outra região recalcula o percurso.
- O rio é uma adaptação do aplicativo. O produto não promete clima, costas ou hidrografia coerentes.
- O salvamento automático usa o armazenamento local do navegador. Recarregar restaura o mapa atual; não restaura o histórico da sessão.
- Arquivos JSON permitem exportar e importar mapas com edições, contadores de sorteio e percurso do rio. A importação valida o arquivo antes de substituir o mapa.
- Locais/base e perigo começam ocultos no mapa impresso, com controles independentes. Sem perigo, cada hexágono mostra uma unidade de terreno. A chave mantém todos os hexágonos e independe desses controles.
- Grade aprovada: B Compacta, 9 × 12 hexágonos com ponta para cima, A4 retrato e margens mínimas de 12 mm.
- A escala de viagem é 10 km entre centros de hexágonos vizinhos.
- O produto não exige conta e não sincroniza mapas na nuvem. Os mapas ficam no navegador ou em arquivos do usuário.
- O produto não usa imagens privadas de referência.

## Product Principles

- Priorize preparar e usar uma região de jogo sem exigir conta.
- Preserve os dados completos ao oferecer versões resumidas para impressão.
- Separe o mapa dos jogadores da informação reservada a quem mestra.
- Permita guardar e transferir o trabalho em arquivos do usuário.

## Evidence on Hand

- `README.md` registra uso, regras de geração e limites técnicos.
- `docs/mvp-verification.md` registra a validação integrada do MVP.
- `tests/compact-key.spec.ts` verifica duas folhas A4 para a região padrão, nomes completos, espaço livre para anotações, paginação de nomes longos e preservação dos dados.
- Os PDFs passam na validação com Chromium. Outros navegadores e impressoras físicas ainda exigem conferência.

## Brand Commitments

- Português brasileiro, fundo branco, traço artesanal e grade pontilhada.
- Arte própria e recortes Kenney CC0, legíveis em preto e branco.

## Accessibility & Inclusion

- Seleção por mouse e teclado.
- Coordenadas, terrenos, perigo, locais e base têm nomes acessíveis.
- A seleção não depende somente de cor.
