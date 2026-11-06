# Hexmap Builder

- Gerador de mapas hexagonais OSR para preparar e imprimir aventuras.
- Preto e branco, traço artesanal e interface em português brasileiro.
- Estado atual: planejamento publicado. O aplicativo ainda não existe.

## Planejamento

- [PRD do MVP](https://github.com/yuritoledo/hexmapbuilder/issues/1)
- [Especificação](https://github.com/yuritoledo/hexmapbuilder/issues/2)
- [Todos os tickets](https://github.com/yuritoledo/hexmapbuilder/issues)

## Tickets de implementação

1. [Grade A4 e comparação visual](https://github.com/yuritoledo/hexmapbuilder/issues/3)
2. [Terrenos por semente](https://github.com/yuritoledo/hexmapbuilder/issues/4)
3. [Locais e perigo](https://github.com/yuritoledo/hexmapbuilder/issues/5)
4. [Edição e histórico](https://github.com/yuritoledo/hexmapbuilder/issues/6)
5. [Salvar e importar](https://github.com/yuritoledo/hexmapbuilder/issues/7)
6. [Rio opcional](https://github.com/yuritoledo/hexmapbuilder/issues/8)
7. [Impressão e sigilo](https://github.com/yuritoledo/hexmapbuilder/issues/9)
8. [Validação integrada](https://github.com/yuritoledo/hexmapbuilder/issues/10)

## MVP aprovado

- Gerar uma região a partir do centro, com terreno inicial e semente.
- Usar as tabelas discutidas de Shadowdark e identificar adaptações.
- Gerar locais simples: nome e categoria, sem aventura pronta.
- Representar perigo com círculo ou caveirinhas e legenda textual.
- Editar terreno, local e perigo separadamente, com desfazer e refazer.
- Salvar neste navegador e exportar/importar o mapa editado.
- Oferecer um rio contínuo opcional como linha sobre os terrenos.
- Imprimir mapa e chave separados, em A4 retrato.
- Usar escala de 10 km por hexágono.
- Escolher se locais e perigo aparecem na impressão, ocultos por padrão.
- Salvar PDF pela impressão do navegador.
- Priorizar computador e permitir consulta básica no celular.

## Decisões pendentes

- Comparar duas densidades em A4 e confirmar grade e margens.
- Definir percurso do rio e comportamento durante a edição.
- Escolher arquitetura e ferramentas na implementação.
- Consultar as issues antes de tratar detalhes abertos como decisões.

## Limites

- Inglês fica para uma versão posterior.
- Sem contas, nuvem, colaboração ou editor manual completo.
- Sem cataclismos automáticos, estradas, lagos ou afluentes.
- Sem cálculo de viagem, fichas ou masmorras prontas.
- As imagens de referência e a página do livro não integram este repo.
- Usar arte e conteúdo próprios ou com licença compatível.

## Desenvolvimento

- Ainda não há código, dependências ou comandos de execução.
- O primeiro ticket define a base técnica, os testes e o lint.
- Trabalhar nos tickets cujas dependências estão concluídas.
- Resolver as decisões indicadas antes de concluir cada entrega.
