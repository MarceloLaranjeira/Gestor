# NPS nos Cards Finalizados

## Objetivo

Exibir nos cards da coluna `Finalizado` todas as pesquisas NPS salvas para a demanda, permitindo que usuarios com acesso ao card consultem o retorno registrado sem sair do kanban.

## Escopo

- Carregar registros `logbook_entradas` com `origem = 'demanda'` e `acao = 'nps'` para as demandas SAC visiveis.
- Agrupar todos os NPS por `origem_id`, sem descartar registros anteriores.
- Mostrar no card finalizado um indicador com a quantidade de avaliacoes salvas.
- Exibir, em `Ver detalhes`, cada NPS com nota, respostas Sim/Nao, comentario quando houver e data/hora do registro.
- Manter o botao de registrar NPS no fluxo existente sem mudar as regras de salvamento.

## Fora Do Escopo

- Alterar o calculo ou layout do relatorio geral NPS.
- Criar nova tabela ou mudar a politica de acesso do logbook.
- Exibir dados NPS nos cards que ainda nao estejam em `Finalizado`.

## Arquitetura E Dados

O frontend reutilizara `public.logbook_entradas`, cuja relacao com a demanda e `origem = 'demanda'` e `origem_id = demandas.id`. A carga do kanban ja consulta historico por demanda; a mesma etapa passara a consultar entradas `acao = 'nps'`, converter o JSON de `descricao` para o formato `NPSRespostas` e manter uma lista por card.

O componente `SacCard` recebera a lista `npsEntries`. Quando a coluna normalizada for `Finalizado`, renderizara o indicador `NPS (N)` e, se o card estiver expandido, a secao `Pesquisas de satisfacao` com todos os itens.

## Acesso E Erros

Nenhum acesso adicional sera concedido. A consulta usa a tabela com RLS ja ativa, portanto o usuario visualizara apenas registros autorizados pela sessao atual. Se um registro contiver JSON invalido, ele sera ignorado na apresentacao ou exibido sem respostas estruturadas, sem interromper o carregamento do kanban.

## Validacao

- Um card `Finalizado` sem NPS nao mostra indicador nem secao de respostas.
- Um card `Finalizado` com um ou varios NPS mostra a quantidade correta e lista todos ao expandir.
- Cards em outras colunas nao mostram dados NPS.
- Um NPS novo aparece no card apos o registro e recarregamento dos dados.
- `npm run test` e `npm run build` continuam passando.
