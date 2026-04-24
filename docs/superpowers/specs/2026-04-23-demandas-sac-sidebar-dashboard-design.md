# Design: Reorganização de Demandas SAC e Demandas das Coordenadorias

## Objetivo

Reorganizar o sidebar e o dashboard para eliminar a redundância entre "Movimentos" e "Demandas", preservando o fluxo atual dos setores SAC, mas apresentando-o como "Demandas SAC", além de introduzir um segundo bloco de acesso rápido e navegação para "Demandas das Coordenadorias".

## Contexto Atual

- O item `Movimentos` do sidebar já abre os setores SAC.
- O dashboard possui um bloco de acesso rápido chamado `Movimentos - Setores SAC`.
- Existe um bloco de coordenações com o título `Todas as Coordenações`.
- Ao clicar em menus e submenus, o sidebar volta ao topo, obrigando o usuário a rolar novamente.

## Problemas Identificados

- O nome `Movimentos` gera redundância com a noção de demandas.
- O fluxo dos setores SAC já representa demandas e não precisa coexistir semanticamente com outro menu paralelo de movimentos.
- O acesso às demandas das coordenadorias não está estruturado com o mesmo destaque visual dos setores SAC.
- O reset de scroll no sidebar piora a navegação em menus longos.

## Resultado Esperado

- `Movimentos` deixa de existir como rótulo visual.
- O mesmo fluxo atual de setores SAC continua existindo, mas com o nome `Demandas SAC`.
- `Demandas SAC` ocupa a posição atual do menu `Demandas`.
- Surge um bloco separado chamado `Demandas das Coordenadorias`.
- O submenu `Atendimento SAC` é removido do agrupamento de coordenadorias.
- O dashboard passa a exibir dois blocos de acesso rápido:
  - `Demandas SAC`
  - `Demandas das Coordenadorias`
- O sidebar mantém sua posição de scroll após navegação.

## Escopo

Incluído:

- renomear o item visual `Movimentos` para `Demandas SAC`
- mover esse item para a posição atual de `Demandas`
- remover o item visual redundante `Movimentos`
- renomear `Todas as Coordenações` para `Demandas das Coordenadorias`
- reposicionar esse agrupamento abaixo de `Demandas SAC`
- remover `Atendimento SAC` dos submenus de coordenadorias
- criar no dashboard um bloco de acesso rápido para `Demandas das Coordenadorias`
- preservar scroll do sidebar entre cliques

Fora de escopo:

- remodelagem completa das rotas internas
- mudança do fluxo funcional já existente dos setores SAC
- mudança de permissão por perfil

## Decisão de Produto

### Demandas SAC

`Demandas SAC` será apenas um novo nome e uma nova posição para o fluxo que hoje já existe como `Movimentos`.

Consequência:

- continua abrindo os setores SAC atuais
- continua usando a mesma rota e o mesmo comportamento atual
- muda apenas a apresentação visual e a organização da navegação

### Demandas das Coordenadorias

`Demandas das Coordenadorias` será um bloco paralelo ao de `Demandas SAC`.

Consequência:

- terá destaque visual equivalente no dashboard
- terá submenu dedicado no sidebar
- cada item abrirá a página própria de demandas da coordenadoria correspondente

## Abordagens Consideradas

### 1. Ajuste apenas de nomes

Trocar rótulos no sidebar e no dashboard, sem reorganizar estrutura.

Vantagem:

- baixo risco imediato

Desvantagem:

- não resolve a duplicidade de conceito
- não cria uma área clara para demandas das coordenadorias

### 2. Reorganização funcional de navegação

Manter o fluxo SAC existente, renomeando-o para `Demandas SAC`, e criar um novo agrupamento visual e navegacional para `Demandas das Coordenadorias`.

Vantagem:

- resolve a semântica da navegação
- preserva o que já funciona
- cria uma separação clara entre SAC e coordenadorias

Desvantagem:

- exige ajustes coordenados em sidebar, dashboard e persistência de scroll

### 3. Reestruturação completa de rotas

Renomear também rotas, páginas e componentes internos para remover toda referência a `movimentos`.

Vantagem:

- maior consistência semântica

Desvantagem:

- maior risco e custo
- desnecessário nesta fase

## Decisão

Seguir com a reorganização funcional de navegação.

- `Movimentos` será exibido como `Demandas SAC`
- o destino funcional atual será preservado
- será criado o agrupamento `Demandas das Coordenadorias`

## Sidebar

### Ordem desejada

Na seção de atividade:

- `Demandas SAC`
- `Compromissos`
- `Eventos`
- `Calendário`
- `Alertas`

Na seção relacionada a coordenadorias:

- `Demandas das Coordenadorias`
- submenus das coordenadorias existentes, exceto `Atendimento SAC`

### Regras específicas

- o menu visual `Demandas` atual deixa de ser o ponto principal para setores SAC
- o menu visual `Movimentos` deixa de existir
- o novo rótulo principal passa a ser `Demandas SAC`
- `Demandas das Coordenadorias` fica logo abaixo de `Demandas SAC` como bloco separado
- o submenu `Atendimento SAC` é removido
- os demais submenus permanecem

## Dashboard

### Bloco Demandas SAC

O bloco atual `Movimentos - Setores SAC` será renomeado para `Demandas SAC`.

Mantém:

- mesmo formato visual
- mesmos setores SAC
- mesma ideia de acesso rápido

### Bloco Demandas das Coordenadorias

Será criado logo abaixo do bloco `Demandas SAC`.

Características:

- mesmo padrão visual de acesso rápido
- um botão por coordenadoria
- sem o item `Atendimento SAC`
- cada botão abre a demanda própria da coordenadoria

## Comportamento do Scroll do Sidebar

### Problema

Ao clicar em qualquer menu, o container do sidebar volta para o topo.

### Solução

Persistir a posição do scroll do container navegável do sidebar.

Comportamento esperado:

- ao clicar em um menu ou submenu, a posição atual do scroll é salva
- após a navegação e rerender, o scroll é restaurado
- o usuário continua no último ponto em que estava

### Escopo técnico

- persistência local em estado ou `sessionStorage`
- restauração no mesmo container de navegação do sidebar
- sem afetar a navegação mobile em sheet

## Demandas das Coordenadorias

### Navegação

Cada coordenadoria do bloco novo deve abrir uma tela própria de demandas por coordenadoria.

### Estrutura

Esse bloco deve seguir o mesmo princípio de isolamento:

- cada coordenadoria mostra apenas suas próprias demandas
- cada coordenadoria é acessada individualmente

## Compatibilidade

- o fluxo atual dos setores SAC continua funcionando
- o nome muda para `Demandas SAC`
- não há alteração funcional obrigatória nas rotas dos setores SAC nesta etapa
- a página atual de setores SAC continua sendo reutilizada

## Impactos Técnicos

### Arquivos prováveis

- `src/components/AppSidebar.tsx`
- `src/pages/Dashboard.tsx`
- dados auxiliares de setores/coordenadorias
- possível ajuste em componentes de navegação para persistência de scroll

### Reaproveitamento

- catálogo de setores SAC já criado
- estrutura visual do bloco de acesso rápido atual
- links atuais das páginas de coordenadoria

## Testes

### Sidebar

- `Demandas SAC` aparece na posição correta
- `Movimentos` não aparece mais
- `Demandas das Coordenadorias` aparece abaixo de `Demandas SAC`
- `Atendimento SAC` não aparece nos submenus
- demais coordenadorias continuam acessíveis

### Dashboard

- o bloco `Demandas SAC` aparece com os setores SAC
- o bloco `Demandas das Coordenadorias` aparece abaixo
- os links de ambos funcionam

### Scroll

- rolar o sidebar para baixo
- clicar em um submenu
- confirmar que o sidebar permanece na posição anterior

## Riscos

- renomear apenas visualmente sem alinhar todos os pontos pode causar inconsistência entre sidebar, busca e dashboard
- persistência de scroll mal implementada pode conflitar com o estado mobile do sidebar
- coordenadorias removidas parcialmente podem continuar aparecendo em algum acesso rápido se o catálogo não for centralizado

## Critérios de Aceite

- `Movimentos` não aparece mais como menu visual
- `Demandas SAC` ocupa o lugar do antigo menu de demandas e abre os setores SAC atuais
- `Demandas das Coordenadorias` aparece abaixo e sem `Atendimento SAC`
- o dashboard mostra `Demandas SAC` e `Demandas das Coordenadorias` em blocos separados
- o sidebar não volta ao topo após clique em menu ou submenu
