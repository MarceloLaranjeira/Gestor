# Padronização Responsiva do Sistema

## Contexto

O sistema já possui alguns pontos com comportamento responsivo parcial, como sidebar recolhível em telas menores e uso pontual de classes `sm`, `md`, `lg`, mas a experiência ainda não está consistente entre celular, tablet e desktop.

Os principais problemas esperados neste cenário são:

- grids que ficam apertados em telas menores
- tabelas largas sem adaptação suficiente
- modais com largura inadequada no mobile
- kanbans e dashboards com excesso de colunas em telas pequenas
- toolbars, filtros e ações que não empilham bem
- páginas altas com áreas de rolagem difíceis de usar no celular

O usuário quer que o sistema inteiro funcione de forma responsiva em:

- celular
- tablet
- desktop

Mantendo o `sidebar` como recolhível em telas menores.

## Objetivo

- padronizar o comportamento responsivo do sistema inteiro
- manter a experiência desktop estável
- melhorar usabilidade em celular e tablet sem mudar a navegação principal
- criar regras consistentes de layout para páginas, modais, tabelas, kanbans, cards e formulários

## Abordagem escolhida

Padronização responsiva do sistema, com base comum reutilizável e aplicação nas áreas principais e secundárias.

## Princípios de layout

### 1. Sidebar

- permanece recolhível no celular e no tablet
- não será substituído por outro padrão de navegação
- o conteúdo principal deve aproveitar melhor a largura quando o menu estiver fechado

### 2. Header

- comportamento mais compacto em telas pequenas
- controles secundários devem evitar excesso de largura
- busca, notificações e perfil devem continuar acessíveis sem sobrecarga visual

### 3. Main content

- reduzir paddings no mobile
- manter larguras máximas razoáveis no desktop
- evitar que seções importantes fiquem “espremidas” em telas médias

## Padrões responsivos a serem padronizados

## 1. Grids de cards

Regras gerais:

- celular: `1 coluna`
- tablet: `2 colunas` quando couber
- desktop: manter `3` ou `4 colunas` conforme o contexto

Aplicável a:

- dashboard
- cards de coordenadorias
- cards de setores SAC
- resumos e KPIs

## 2. Toolbars e filtros

Regras gerais:

- celular: filtros e ações empilhados
- tablet: agrupamento em duas linhas quando necessário
- desktop: manter linha única quando houver espaço

Aplicável a:

- buscas
- selects
- botões de ação
- cabeçalhos de páginas

## 3. Formulários

Regras gerais:

- celular: `1 coluna`
- tablet: `1 ou 2 colunas`, conforme o peso dos campos
- desktop: manter `2+ colunas` quando útil

Além disso:

- campos longos devem ocupar largura total
- blocos de anexos, notas e alertas devem quebrar verticalmente no mobile
- formulários grandes devem ter rolagem confortável sem estourar o viewport

## 4. Modais e dialogs

Regras gerais:

- celular: largura quase total da tela
- altura controlada com `max-height` e scroll interno
- tablet: largura intermediária
- desktop: manter larguras atuais, ajustando só quando necessário

## 5. Tabelas

Regras gerais:

- quando a tabela for naturalmente larga, usar `overflow-x-auto`
- quando o conteúdo for crítico no mobile, esconder colunas secundárias ou migrar para um layout compacto

Aplicável a:

- usuários
- prontuário
- campanha
- relatórios e módulos parlamentares com tabelas extensas

## 6. Kanbans

Regras gerais:

- celular: colunas empilhadas verticalmente
- tablet: empilhamento ou rolagem horizontal controlada, conforme a tela
- desktop: manter múltiplas colunas

Aplicável a:

- `Demandas SAC`
- `Demandas das Coordenadorias`

## 7. Áreas com altura fixa

Páginas com containers altos devem ser revisadas para não quebrar no mobile.

Aplicável principalmente a:

- `WebChat`
- `Assessor IA`
- calendários e módulos com painéis fixos

## Áreas prioritárias

### Primeira onda

- `Dashboard`
- `Demandas`
- `Demandas SAC`
- `Demandas das Coordenadorias`
- `Usuários`
- `WebChat`
- `Calendário`
- `Coordenadorias`

### Segunda onda

- `Analytics`
- módulos parlamentares
- módulo campanha
- prontuário
- páginas com tabelas extensas e dialogs complexos

## Estratégia de implementação

## 1. Base global

Revisar componentes estruturais:

- `AppLayout`
- `AppHeader`
- `AppSidebar`
- wrappers de tabelas, dialogs e páginas

## 2. Componentes compartilhados

Padronizar classes e padrões reutilizáveis para:

- grids
- toolbars
- dialogs
- containers com scroll
- tabelas com rolagem horizontal

## 3. Páginas principais

Aplicar a base nas telas prioritárias, garantindo que o uso real fique bom nos três contextos:

- celular
- tablet
- desktop

## 4. Páginas secundárias

Expandir a mesma regra para módulos auxiliares e especializados

## Critérios de aceite

- o sidebar continua recolhível no celular e tablet
- páginas principais funcionam sem corte horizontal relevante
- modais ficam utilizáveis em celular
- tabelas críticas podem ser lidas em mobile
- formulários podem ser preenchidos sem zoom lateral
- kanbans continuam operáveis em telas pequenas
- header e ações principais continuam acessíveis

## Riscos conhecidos

- algumas páginas antigas podem depender de tabelas largas e precisar solução híbrida
- telas com muitos KPIs podem exigir compactação visual maior no tablet
- componentes com altura fixa podem precisar revisão específica para não gerar áreas “presas”

## Notas de implementação

- seguir abordagem `mobile-first` sempre que possível nas telas revisadas
- preservar a identidade visual atual; o objetivo é adaptação, não redesign
- priorizar padrões reaproveitáveis em vez de correções isoladas por página
