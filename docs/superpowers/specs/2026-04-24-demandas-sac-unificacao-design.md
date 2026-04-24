# Demandas SAC Unificadas com Coordenadorias

## Contexto

Hoje `Demandas SAC` e `Demandas das Coordenadorias` têm comportamentos diferentes.

As coordenadorias já possuem:
- kanban completo
- formulário rico
- campos de solicitante
- status por coluna
- melhor fluxo de edição

Os setores SAC ainda usam uma versão simplificada:
- layout diferente
- formulário reduzido
- sem notas internas
- sem anexos
- sem alerta integrado por demanda

O objetivo desta etapa é fazer com que `Demandas SAC` use o mesmo modo de trabalho das coordenadorias, preservando o isolamento por setor e a coordenadoria fixa de cada setor SAC.

## Decisão

Foi aprovada a abordagem `2`:

- reaproveitar o modelo de uso das coordenadorias para SAC
- manter a regra de negócio própria do SAC
- não criar um fluxo visual paralelo

## Objetivos

- tornar a tela de cada setor SAC equivalente à tela de coordenadoria
- ampliar o formulário SAC com todos os campos necessários
- embutir alertas dentro da própria demanda SAC
- permitir notas internas por demanda
- permitir upload e gestão de anexos por demanda
- manter o vínculo fixo `setor SAC -> coordenadoria fixa`

## Fora de Escopo Desta Fase

- reformulação completa do módulo `WebChat`
- reestruturação do menu geral de chat
- implementação dos novos canais internos por coordenadoria e por membro
- unificação completa de páginas em um único componente genérico para todo o sistema

Esses itens ficam para uma fase separada.

## Experiência da Tela SAC

Cada rota de setor SAC, como `/movimentos/saude` ou `/movimentos/tea`, passará a seguir o mesmo padrão visual e funcional da página de coordenadoria:

- mesmos cards-resumo no topo
- mesma barra de busca
- mesmo filtro de prioridade
- mesmo layout de colunas do kanban
- mesmo padrão de criação de demanda
- mesmo padrão de edição e exclusão
- mesmo comportamento de mover demanda entre colunas

Diferenças que continuam obrigatórias no SAC:

- o setor é fixo pela rota
- a coordenadoria é fixa pelo setor
- a demanda SAC não pode ser movida para outro setor
- a demanda SAC não pode trocar de coordenadoria

## Formulário da Demanda SAC

O modal de criação e edição de demanda SAC passará a seguir o mesmo modo de uso das coordenadorias e terá os campos:

- setor SAC
- coordenadoria fixa
- título da demanda
- descrição detalhada
- nome do solicitante
- CPF do solicitante
- telefone do solicitante
- responsável
- categoria
- prioridade
- status / coluna
- prazo
- notas internas
- nível de atenção do alerta
- observação do alerta
- anexos

Campos travados:

- setor SAC
- coordenadoria fixa

Campos editáveis:

- todos os demais

## Alertas Dentro da Demanda

O alerta deixa de ser tratado como menu principal deste fluxo e passa a viver dentro da demanda SAC.

Cada demanda SAC poderá ter:

- nível de atenção manual: `informação`, `atenção`, `urgente`
- observação de alerta
- monitoramento por prazo

Regras:

- alerta manual destaca visualmente o card
- prazo próximo ativa atenção automática
- prazo vencido ativa urgência automática
- o card deve comunicar visualmente o nível mais crítico entre alerta manual e vencimento

Resultado esperado:

- o usuário entende a urgência sem sair do kanban
- a leitura de prioridades fica integrada ao trabalho diário

## Notas Internas

Cada demanda SAC terá um campo de notas internas, editável no modal.

Uso esperado:

- registrar contexto interno
- observações não exibidas como descrição pública da demanda
- anotações operacionais de acompanhamento

As notas fazem parte da demanda e ficam disponíveis sempre que ela for reaberta.

## Anexos

Os anexos serão armazenados em `Supabase Storage`.

Arquivos aceitos:

- imagens
- `pdf`
- `xlsx`
- `xls`
- `csv`
- `xml`
- `slx`
- `html`

Capacidades esperadas:

- enviar arquivo
- listar anexos já enviados
- baixar anexo
- remover anexo

Estrutura sugerida:

- bucket dedicado para anexos de demandas
- caminho por contexto e demanda

Exemplo:

- `demandas/sac/<demanda-id>/<arquivo>`

## Modelo de Dados

### Expansão de `demandas`

Novos campos necessários em `demandas`:

- `solicitante_cpf`
- `solicitante_telefone`
- `coluna_kanban`
- `notas_internas`
- `nivel_alerta`
- `alerta_observacao`
- `alerta_manual`
- `alerta_vencimento_em`

Campos já usados e que seguem obrigatórios no SAC:

- `setor_sac`
- `coordenadoria_slug`
- `coordenadoria_nome`
- `status`
- `prioridade`
- `data_prazo`

### Nova tabela de anexos

Criar uma tabela específica para anexos de demanda, com estrutura equivalente a:

- `id`
- `demanda_id`
- `nome_arquivo`
- `tipo_arquivo`
- `storage_path`
- `created_at`
- `user_id`

## Regras de Negócio

- uma demanda SAC sempre pertence a um único setor SAC
- uma demanda SAC sempre herda a coordenadoria fixa do setor
- editar a demanda não pode quebrar esse vínculo
- o formulário SAC deve preencher automaticamente os dados fixos
- o kanban SAC deve buscar apenas demandas do setor atual
- anexos devem ser vinculados ao `id` da demanda
- alertas devem ser exibidos no card e no modal da demanda

## Impacto na Interface

### Sidebar

- o menu `Alertas` será removido do sidebar quando a fase de alertas embutidos estiver concluída no fluxo SAC

Nesta fase, a implementação deve preparar o sistema para essa remoção sem depender mais do menu de alertas para o uso das demandas SAC.

### Cards do Kanban SAC

Cada card SAC deve passar a exibir, no mesmo padrão das coordenadorias:

- título
- solicitante
- responsável
- prazo
- badges de prioridade
- status da coluna
- destaque visual de alerta
- contador ou indicação de anexos quando existir

## Compatibilidade e Migração

- demandas SAC antigas continuam válidas
- demandas antigas sem os novos campos devem abrir sem quebrar a tela
- campos novos devem aceitar valor nulo inicialmente para compatibilidade
- anexos só existirão para demandas criadas ou editadas após a nova estrutura

## Testes Esperados

### Fluxo principal

- abrir um setor SAC
- criar uma demanda
- editar a demanda
- mover a demanda entre colunas
- cadastrar notas internas
- adicionar anexos
- baixar anexos
- remover anexos

### Alertas

- marcar alerta manual como `informação`
- marcar alerta manual como `atenção`
- marcar alerta manual como `urgente`
- validar destaque automático por vencimento

### Isolamento

- confirmar que uma demanda criada em `TEA` não aparece em `Saúde`
- confirmar que a coordenadoria do setor não pode ser trocada

## Critérios de Aceite

- a tela SAC passa a usar o mesmo modo de uso das coordenadorias
- o formulário SAC contém todos os campos aprovados
- notas internas podem ser salvas e editadas
- anexos podem ser enviados, listados, baixados e removidos
- alertas passam a existir dentro da demanda SAC
- o destaque visual de atenção aparece nos cards
- o setor continua isolado dos demais
- a coordenadoria fixa do setor continua preservada

## Ordem Recomendada de Implementação

1. ampliar o banco de dados e o storage para suportar campos novos e anexos
2. unificar o layout e o formulário de `Demandas SAC` com o padrão das coordenadorias
3. embutir alertas no card e no modal da demanda
4. validar o fluxo completo de criação, edição, movimentação e anexos
