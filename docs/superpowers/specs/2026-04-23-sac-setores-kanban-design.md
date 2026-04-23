# Design: Setores SAC com Kanban Isolado por Coordenadoria

## Objetivo

Corrigir o módulo de Movimentos para que os setores SAC exibidos no dashboard e no menu existam de forma canônica no sistema, abram corretamente ao clique e mostrem um kanban próprio por setor, com isolamento de dados entre coordenadorias.

## Problema Atual

- O dashboard e o menu lateral já expõem rotas como `/movimentos/tea` e `/movimentos/saude`.
- A página de detalhes de movimento depende de um registro existente na tabela `movimentos` com o mesmo `id` da rota.
- Quando o setor não existe no banco, a tela retorna "Movimento não encontrado".
- O detalhe atual usa `acoes_movimento`, mas o fluxo solicitado precisa exibir informações típicas de demanda, como solicitante, responsável, descrição e status.
- Não há hoje uma garantia explícita de isolamento entre setores SAC e suas coordenadorias fixas.

## Resultado Esperado

- Cada setor SAC passa a existir como entidade fixa do sistema.
- Cada setor SAC fica ligado a uma coordenadoria fixa.
- Um setor não pode exibir dados de outro.
- Ao abrir um setor como `TEA`, o usuário vê um kanban próprio daquele setor.
- Cada card do kanban é editável e contém dados completos da demanda, do solicitante e da coordenadoria vinculada.

## Escopo

Incluído:

- Canonização dos 8 setores SAC no frontend e no banco.
- Ajuste da navegação para abrir corretamente cada setor.
- Reaproveitamento de `movimentos` como catálogo de setores.
- Uso de `demandas` como base principal dos cards do kanban.
- Vínculo fixo entre setor SAC e coordenadoria.
- Tela de detalhe de setor com colunas por status e edição de cards.

Fora de escopo:

- Permissões avançadas por usuário dentro de cada setor.
- Histórico completo de auditoria por movimentação de card.
- Migração automática inteligente de demandas antigas sem classificação.

## Abordagens Consideradas

### 1. Correção mínima em `acoes_movimento`

Manter o detalhe atual e apenas criar os movimentos faltantes.

Vantagem:

- Menor impacto inicial.

Desvantagem:

- Não atende bem ao modelo pedido, porque os dados centrais vivem melhor em `demandas`.
- Mantém o módulo com semântica fraca entre setor, coordenadoria e solicitação.

### 2. Modelo híbrido guiado por setor

Manter `movimentos` como catálogo e navegação dos setores SAC, enquanto `demandas` passa a ser a fonte dos cards exibidos no kanban.

Vantagem:

- Reaproveita a navegação já existente.
- Entrega o comportamento desejado com menor retrabalho estrutural.
- Facilita edição de cards com dados completos da demanda.

Desvantagem:

- Exige ampliar o schema de `demandas` para suportar o contexto SAC.

### 3. Reestruturação total com tabelas novas

Criar tabelas próprias de setores SAC, colunas de kanban e relações dedicadas.

Vantagem:

- Modelo mais especializado.

Desvantagem:

- Mais tempo, mais risco e mais pontos de regressão para a necessidade atual.

## Decisão

Seguir com a abordagem híbrida guiada por setor.

- `movimentos` continua sendo o catálogo e a navegação dos setores SAC.
- `demandas` passa a ser a fonte dos cards do kanban.
- `acoes_movimento` deixa de ser a base primária da tela de setor SAC.

## Modelo Funcional

### Setores SAC Canônicos

Os setores suportados serão:

- `saude`
- `tea`
- `assistencia-social`
- `infraestrutura`
- `empreendedorismo`
- `habitacao`
- `esporte-lazer`
- `outros`

Cada setor terá:

- `slug`
- `nome`
- `icone`
- `cor`
- `coordenadoria_slug`
- `coordenadoria_nome`

### Regra de Isolamento

Cada setor pertence a uma coordenadoria fixa.

Consequência prática:

- cards do setor `tea` só aparecem em `tea`
- cards do setor `saude` só aparecem em `saude`
- um card não pode trocar de coordenadoria ao editar
- a coordenadoria do setor é informativa e persistida junto da demanda

## Modelo de Dados

### Tabela `movimentos`

Papel:

- catálogo dos setores SAC
- metadados visuais e de navegação

Uso previsto:

- garantir que todos os slugs do SAC existam
- permitir que `/movimentos/:id` resolva o setor corretamente

### Tabela `demandas`

Passa a receber colunas explícitas para o módulo SAC:

- `setor_sac`
- `coordenadoria_slug`
- `coordenadoria_nome`

Campos já existentes e reaproveitados:

- `titulo`
- `descricao`
- `status`
- `prioridade`
- `responsavel`
- `solicitante`
- `data_prazo`

Observação:

- demandas antigas sem `setor_sac` continuarão válidas no módulo geral de Demandas, mas não aparecerão em um kanban SAC até serem classificadas.

## Fluxo de Navegação

### Dashboard

- O card "Movimentos - Setores SAC" continua exibindo atalhos rápidos.
- Cada atalho abre a rota do setor correspondente.

### Sidebar e Busca

- Os links já existentes em sidebar e header passam a depender do catálogo canônico dos setores.
- Não haverá diferença entre o slug usado na navegação e o slug salvo em banco.

### Tela `/movimentos`

Passa a representar a visão de setores SAC, não de eixos temáticos genéricos.

Deve:

- listar os 8 setores SAC
- mostrar resumo de cards por setor
- permitir abrir o detalhe de cada setor sempre que o catálogo estiver sincronizado

### Tela `/movimentos/:id`

Passa a ser a página do setor SAC.

Deve:

- validar o slug recebido
- buscar os metadados do setor
- carregar apenas demandas daquele setor
- exibir a coordenadoria fixa do setor
- mostrar cards organizados por status

## Experiência do Kanban

### Colunas

As colunas iniciais serão baseadas em status existente em `demandas`:

- `pendente`
- `andamento`
- `concluida`
- `atrasada`

### Card

Cada card deve exibir, no mínimo:

- título da demanda
- descrição
- status
- prioridade
- responsável
- solicitante
- prazo
- setor SAC
- coordenadoria fixa

### Criação e Edição

Ao criar ou editar um card na tela do setor:

- `setor_sac` é preenchido automaticamente com o slug da rota
- `coordenadoria_slug` e `coordenadoria_nome` são preenchidos automaticamente com base no setor
- esses campos não podem ser trocados para apontar para outro setor

## Tratamento de Erros

- Se o slug não existir, a tela mostra "Setor não encontrado".
- Se o catálogo existir mas ainda não houver cards, a tela mostra estado vazio com CTA para criar a primeira demanda.
- Se houver falha de leitura no banco, a tela mostra mensagem de erro amigável e preserva a navegação.

## Compatibilidade

- A página geral `Demandas` continua funcionando.
- O módulo SAC passa a filtrar apenas demandas classificadas com `setor_sac`.
- O catálogo `movimentos` continua sendo útil para dashboard, sidebar, header e cards-resumo.

## Plano de Implementação

### Banco

- criar migração para adicionar colunas SAC em `demandas`
- popular ou garantir os 8 registros canônicos em `movimentos`

### Frontend

- ajustar `Movimentos.tsx` para listar setores SAC canônicos
- ajustar `MovimentoDetalhes.tsx` para usar `demandas` em vez de `acoes_movimento` como fonte principal
- exibir coordenadoria fixa do setor na página
- adaptar o formulário de criação/edição para salvar os novos campos
- preservar os links atuais do dashboard, sidebar e header

### Tipagem

- atualizar `src/integrations/supabase/types.ts` para refletir os novos campos em `demandas`

## Testes

### Casos principais

- abrir cada setor SAC a partir do dashboard
- abrir cada setor SAC a partir do sidebar
- abrir um setor válido e ver apenas os cards dele
- criar card em `TEA` e confirmar persistência com `setor_sac = tea`
- editar card em `TEA` sem permitir troca para outro setor
- mudar status do card e confirmar reposicionamento no kanban
- garantir que uma demanda de `saude` não apareça em `tea`

### Regressão

- página geral `Demandas` continua listando as demandas normalmente
- tela `/movimentos` continua navegável
- busca global continua encontrando os setores SAC

## Riscos

- Se o banco não tiver os registros canônicos em `movimentos`, os links continuarão quebrando.
- Se as colunas novas de `demandas` não forem tipadas no client, o frontend ficará inconsistente.
- Misturar demandas antigas sem setor com o novo fluxo pode confundir usuários, então o estado vazio precisa ser claro.

## Critérios de Aceite

- Clicar em qualquer setor SAC no dashboard ou sidebar abre uma página funcional.
- Cada setor mostra apenas suas próprias demandas.
- Cada setor mostra sua coordenadoria fixa.
- Os cards do setor são editáveis.
- Os cards exibem dados de demanda, solicitante, responsável e status.
- Um setor não recebe informações de outro.
