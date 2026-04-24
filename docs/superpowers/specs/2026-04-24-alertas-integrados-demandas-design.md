# Alertas Integrados às Demandas

## Contexto

Hoje o sistema possui um módulo separado de `Alertas`, baseado na tabela `alertas_sistema`, enquanto as demandas já começaram a receber campos locais de atenção dentro do próprio card.

Isso criou dois problemas:

- a atenção operacional das demandas ficou dividida entre a demanda e um módulo separado
- o usuário não enxerga de forma consistente os alertas em `Demandas SAC` e `Demandas das Coordenadorias`

O objetivo desta fase é transformar alertas em um recurso nativo do fluxo de demandas, válido para os dois contextos:

- `Demandas SAC`
- `Demandas das Coordenadorias`

## Decisão

Foi aprovada a abordagem `2`:

- criar uma camada própria para alertas de demanda
- não reaproveitar `alertas_sistema` como estrutura principal dos alertas operacionais
- manter `alertas_sistema` apenas para avisos sistêmicos ou fluxos globais fora das demandas

## Objetivos

- criar alertas próprios para demandas SAC e demandas de coordenadorias
- exibir alertas no sino do topo
- exibir alertas no card e na tela da demanda
- permitir tratar alertas sem alterar automaticamente o status da demanda
- fazer com que alertas tratados saiam da visão principal
- manter coerência entre alerta manual e alerta automático por prazo

## Fora de Escopo Desta Fase

- reestruturação completa do `WebChat`
- automações avançadas que mudam o status da demanda ao tratar alerta
- workflow completo de histórico analítico de alertas tratados
- substituição total da página antiga `Alertas` por uma central nova

Esses itens ficam para fases posteriores.

## Experiência do Usuário

Os alertas de demanda passam a existir em três pontos:

- no sino do topo, como caixa de entrada geral
- dentro do card da demanda, com destaque visual
- dentro das telas de `Demandas SAC` e `Demandas das Coordenadorias`, com visão filtrada

Fluxo esperado:

1. o usuário cria ou recebe uma demanda
2. a demanda pode ganhar um alerta manual ou automático
3. esse alerta aparece no sino do topo e no próprio card
4. o usuário trata o alerta
5. o alerta sai da fila principal e deixa de poluir a visão operacional
6. a demanda continua existindo normalmente

## Tipos de Alerta

Os alertas de demanda terão dois caminhos de origem:

### Alerta manual

Criado pelo usuário dentro da demanda, com:

- nível `info`
- nível `warning`
- nível `danger`
- observação do alerta

### Alerta automático

Gerado por regra de prazo:

- prazo próximo gera `warning`
- prazo vencido gera `danger`

Regras:

- alertas automáticos não se aplicam a demandas `Concluídas`
- alertas automáticos não se aplicam a demandas `Canceladas`
- o sistema não deve duplicar alertas ativos da mesma causa para a mesma demanda

## Tratamento de Alerta

O usuário poderá marcar o alerta como tratado.

Comportamento aprovado:

- tratar o alerta não muda automaticamente o status da demanda
- tratar o alerta remove esse alerta da visão principal
- alertas tratados somem do sino e das listagens padrão
- a demanda continua acessível e editável normalmente

Se uma nova condição crítica surgir depois, o sistema poderá criar outro alerta ativo para a mesma demanda.

## Modelo de Dados

### Nova tabela `demanda_alertas`

Criar uma tabela própria para alertas de demanda com estrutura equivalente a:

- `id`
- `demanda_id`
- `user_id`
- `contexto`
- `tipo`
- `origem`
- `titulo`
- `mensagem`
- `causa`
- `ativo`
- `tratado_em`
- `created_at`
- `updated_at`

### Significado dos campos

- `demanda_id`: vínculo com a demanda
- `user_id`: usuário dono do alerta na caixa de entrada
- `contexto`: `sac` ou `coordenadoria`
- `tipo`: `info`, `warning`, `danger`, `success`
- `origem`: `manual` ou `automatico`
- `titulo`: resumo do alerta
- `mensagem`: explicação detalhada
- `causa`: identificador da regra, por exemplo `manual`, `prazo_proximo`, `prazo_vencido`
- `ativo`: define se o alerta está na fila principal
- `tratado_em`: data de tratamento

## Relação com `demandas`

Os campos já existentes em `demandas` continuam úteis para a interface:

- `nivel_alerta`
- `alerta_observacao`
- `alerta_manual`
- `alerta_vencimento_em`

Eles seguem sendo usados para destacar o card e simplificar o formulário, mas a fila operacional principal passa a viver em `demanda_alertas`.

Responsabilidades:

- `demandas`: estado resumido visível no card e no modal
- `demanda_alertas`: fila operacional tratável e integrada ao sino

## Integração com SAC e Coordenadorias

### Demandas SAC

Cada demanda SAC poderá gerar alertas próprios, respeitando:

- setor fixo
- coordenadoria fixa herdada do setor
- isolamento entre setores

### Demandas das Coordenadorias

Cada demanda de coordenadoria poderá gerar alertas próprios, respeitando:

- vínculo com a coordenadoria da rota atual
- isolamento entre coordenadorias

Em ambos os casos, o sino do topo deve consolidar os alertas ativos do usuário.

## Integração com o Sino do Topo

O sino deixa de depender apenas de `alertas_sistema` para o trabalho operacional de demandas.

Novo comportamento:

- alertas ativos de `demanda_alertas` entram na contagem principal
- o painel do sino passa a listar alertas de demanda com link direto para a demanda relacionada
- alertas tratados deixam de aparecer na lista padrão

`alertas_sistema` pode continuar existindo para usos sistêmicos, mas não será mais a fonte principal dos alertas de demanda.

## Interface das Telas de Demanda

As telas de `Demandas SAC` e `Demandas das Coordenadorias` passam a oferecer:

- badge visual no card conforme severidade
- destaque de prazo crítico
- ação para tratar alerta
- filtro por alerta

Filtros mínimos:

- todas
- com alerta
- urgentes
- atenção

## Comportamento Visual

Cada card de demanda deve exibir o nível mais crítico entre:

- alerta manual vigente
- alerta automático por prazo
- alerta ativo registrado na fila operacional

Isso mantém leitura rápida do kanban sem exigir abertura do modal.

## Compatibilidade

- a página antiga `Alertas` não será mais o fluxo principal
- o menu lateral já removido continua correto
- o sino do topo passa a ser o ponto central de alertas de demanda
- `alertas_sistema` não precisa ser removida nesta fase

## Regras de Negócio

- uma demanda pode ter mais de um alerta ao longo do tempo
- apenas alertas ativos aparecem na visão principal
- tratar um alerta apenas o encerra
- o sistema deve evitar duplicação de alerta ativo para a mesma causa e mesma demanda
- uma demanda concluída ou cancelada não deve manter alerta automático ativo de prazo
- alertas manuais continuam válidos até serem tratados ou removidos

## Critérios de Aceite

- alertas funcionam em `Demandas SAC`
- alertas funcionam em `Demandas das Coordenadorias`
- alertas aparecem no sino do topo
- alertas aparecem visualmente nos cards
- o usuário pode tratar alertas
- alertas tratados somem da visão principal
- tratar alerta não altera o status da demanda
- o sistema não cria alertas automáticos duplicados para a mesma demanda

## Ordem Recomendada de Implementação

1. criar a tabela `demanda_alertas` e políticas de acesso
2. integrar geração manual de alertas no modal de demanda
3. integrar geração automática por prazo
4. atualizar o sino do topo para consumir alertas de demanda
5. adicionar filtros e ações de tratamento nas telas de demanda
6. validar o fluxo completo em SAC e coordenadorias
