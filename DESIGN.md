---
name: Hexmap Builder
description: Geração de mapas hexagonais monocromáticos para impressão.
colors:
  ink: "#252720"
  muted: "#5b5e53"
  line: "#d4d7cb"
  canvas: "#f2f3ee"
  paper: "#ffffff"
rounded:
  control: "3px"
---

## Overview

- A folha branca é o objeto principal da interface.
- A apresentação usa uma referência editorial: título serifado, legenda compacta e controles simples.
- O ticket #3 define o aspecto monocromático. O usuário aprova recortes Kenney CC0, capim aberto, perigo por contagem de unidades e vilarejo central.
- O usuário aprova a direção visual em 2026-11-09.
- Grade aprovada: B Compacta, 108 hexágonos, ponta para cima e margens mínimas de 12 mm.

## Colors

- Use ink para texto e símbolos.
- Use muted para instruções secundárias.
- Use line para separar grupos de controles.
- Use canvas apenas fora das folhas.
- Conserve o papel branco na tela e na impressão.
- A seleção usa preenchimento #e8ebdf e contorno sólido. O foco usa contorno tracejado mais espesso.
- Não dependa apenas da cor para distinguir seleção e foco.

## Typography

- Use Literata Variable, Georgia, serif nos títulos, coordenadas e números de seleção.
- Use Helvetica Neue, Helvetica, Arial, sans-serif nos controles e instruções.
- O título principal usa peso 450 e tamanho clamp(1.7rem, 3vw, 2.6rem).
- Os controles usam 14px. O texto secundário usa 12–15px conforme o contexto.
- As coordenadas da folha usam 2.5 unidades SVG, equivalentes a 2.5mm na impressão.
- Sirva a Literata localmente e mantenha sua licença.

## Layout

- A tela larga mostra uma folha de até 760px e um painel de consulta de 238px à direita, separados por 32px.
- O formulário acima do mapa agrupa semente, terreno inicial, três variantes e ação de gerar.
- Até 1100px, o formulário usa três colunas e o painel mede 210px.
- Até 650px, o formulário usa uma coluna. O painel vem antes da folha e deixa de ser fixo.
- A seleção móvel traz o painel para a área visível.
- O conteúdo principal tem largura máxima de 1800px.
- Cada folha tem viewBox 0 0 210 297 e usa milímetros na impressão.
- O mapa ocupa uma página A4 retrato. O conteúdo fica a pelo menos 12mm das bordas.
- A impressão remove os controles e os destaques interativos.

## Elevation & Depth

- Apenas o papel recebe sombra: 0 3px 12px #25272010.
- Remova a sombra na impressão.
- Não use superfícies elevadas para cada grupo do painel.

## Shapes

- Os hexágonos são regulares, com ponta para cima e linhas alternadas deslocadas.
- A grade usa contorno pontilhado de 0.3mm na impressão.
- Os símbolos usam vetores Kenney CC0 e cinco desenhos próprios, sem preenchimento e com extremidades arredondadas.
- As unidades de terreno usam caixa de 12 × 10 mm e escala 0,5 no mapa. Ao redor da base, usam escala 0,32. A legenda usa escala 0,62. O vilarejo central usa caixa de 9 × 7 mm.
- O botão principal tem raio de 3px. As folhas têm cantos retos.

## Components

- Botão de impressão: fundo escuro, texto branco, altura mínima de 48px e ícone SVG próprio.
- Formulário: rótulos visíveis, controles nativos com altura mínima de 44px e fonte de 16px no celular.
- Gerar região: pede confirmação nativa antes de substituir a folha e limpa a seleção ao confirmar.
- A folha inclui semente, versão, terreno inicial e variantes.
- Painel de consulta: estado vazio explícito; depois, coordenada, terreno, perigo, local opcional, base quando presente e escala.
- Hexágono: botão SVG com nome acessível que inclui terreno, perigo, local opcional e base; foco móvel por teclado e aria-pressed para seleção.
- Legenda: sete terrenos das opções aplicadas, mais as variantes presentes nas células editadas, até dez símbolos com nomes. A contagem indica perigo; um vilarejo indica a base central.
- Linha de conferência: 50mm somente na página do mapa. As páginas da chave usam A4, sem requisito de escala.
- Instruções de impressão: conteúdo recolhível, fora da folha.
- Local opcional: losango vazio acima das unidades de terreno, sem mudar a contagem de perigo nem ocultar a base.
- Chave de quem mestra: tabela recolhível abaixo da folha, com coordenada, terreno, local/base e perigo. A tabela permite rolagem horizontal no celular e imprime completa em páginas A4 separadas, mesmo recolhida na tela.
- Sigilo na impressão: locais/base e perigo começam ocultos no mapa, com controles independentes. Sem perigo, cada hexágono mostra exatamente uma unidade de terreno e não há legenda de perigo. A chave sempre contém os dados completos e fica com quem mestra.

## Do's and Don'ts

- Mantenha as coordenadas e a legenda legíveis no tamanho real.
- Diferencie terreno por símbolo, não por cor.
- Mantenha a navegação de foco separada da seleção.
- Preserve o estado vazio e as instruções de teclado.
- Não copie imagens ou símbolos das referências privadas.
- Não adicione efeitos decorativos, animação ou cores à folha.
- Mostre os metadados do mapa atual, não os valores ainda não aplicados do formulário.
