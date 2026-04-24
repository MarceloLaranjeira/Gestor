# Remoção de Categoria e Atendimento Especial para SAC Saúde

## Contexto

Os formulários de demanda exibem o campo `Categoria` tanto em `Demandas SAC` quanto em `Demandas das Coordenadorias`. No fluxo atual, esse campo causa redundância e confusão, porque o contexto já deixa claro a origem da demanda:

- em `Demandas SAC`, o próprio setor já define a categoria funcional
- em `Demandas das Coordenadorias`, a própria coordenadoria já define o contexto da demanda

Além disso, o setor SAC `Saúde` precisa de um preenchimento mais específico, baseado em uma tabela de consultas e exames com prazos de atendimento.

## Objetivo

- remover o campo visível `Categoria` dos formulários de demanda
- manter compatibilidade com o banco e com trechos do sistema que ainda dependem do valor salvo
- adicionar no setor SAC `Saúde` um campo de `Tipo de Atendimento`
- preencher automaticamente `Prazo de Atendimento` e `Previsão de Resposta` ao escolher um atendimento de saúde
- manter esses dois campos editáveis após o preenchimento automático

## Escopo

### Incluído

- formulário de `Demandas SAC`
- formulário de `Demandas das Coordenadorias`
- comportamento especial do setor SAC `Saúde`
- catálogos internos de tipos de atendimento da saúde
- preenchimento automático de prazo e previsão de resposta para saúde

### Não incluído

- mudanças equivalentes para outros setores SAC
- mudanças equivalentes para coordenadorias
- reestruturação ampla dos relatórios
- alteração estrutural do banco para remover a coluna `categoria`

## Abordagem escolhida

Remover o campo `Categoria` da interface e automatizar o valor salvo conforme o contexto da demanda.

### Regras

- `Demandas SAC`: o valor persistido em `categoria` será derivado do setor
- `Demandas das Coordenadorias`: o valor persistido em `categoria` será derivado da coordenadoria ou mantido internamente sem edição manual
- o usuário não verá nem editará mais esse campo nos formulários

## Mudanças de interface

## 1. Demandas SAC

Remover o campo `Categoria` do modal de criação e edição.

### Comportamento geral

- o modal continua com os demais campos já existentes
- o valor de `categoria` continua sendo salvo internamente para compatibilidade
- para setores SAC diferentes de `Saúde`, nenhuma nova seção adicional será criada nesta fase

## 2. Demandas das Coordenadorias

Remover o campo `Categoria` do modal de criação e edição.

### Comportamento geral

- o formulário continua no mesmo layout atual
- o valor de `categoria` deixa de ser um campo preenchido pelo usuário
- o sistema mantém esse dado apenas como metadado interno, se ainda necessário

## 3. Regra especial para SAC Saúde

No setor `Saúde`, incluir um bloco especializado no formulário com:

- `Tipo de Atendimento`
- `Prazo de Atendimento`
- `Previsão de Resposta`

### Regras de preenchimento

- ao selecionar um `Tipo de Atendimento`, o sistema preenche automaticamente:
  - `Prazo de Atendimento`
  - `Previsão de Resposta`
- os campos preenchidos automaticamente continuam editáveis
- o preenchimento automático funciona tanto na criação quanto na edição, desde que o atendimento seja alterado

## Catálogo de atendimentos da Saúde

Os dados serão cadastrados no frontend como catálogo inicial, usando a tabela enviada pelo usuário.

### Consultas

- Consulta Cardiologista: 20 dias
- Consulta Cardiologista Pediatra: 15 dias
- Consulta Cabeça/Pescoço: 15 dias
- Consulta Cirurgião Geral: 15 dias
- Consulta Cirurgião Ginecológico: 10 dias
- Ortopedista Pediatra: 7 dias
- Ortopedista Adulto: 15 dias
- Ortopedista Pediátrico: 7 dias
- Consulta em Fisioterapia: 10 dias
- Consulta Hematologista: 7 dias
- Consulta Mastologista: 5 dias
- Consulta Neurologista Pediatra: 7 dias
- Consulta Oftalmologista: 20 dias
- Consulta em Otorrino Geral: 7 dias
- Consulta em Proctologista Cirúrgico: 7 dias
- Consulta em Reumatologista: 20 dias
- Consulta Urologia Cirúrgico: 7 dias
- Consulta Urologia Geral: 20 dias
- Consulta em Pequenas Cirurgias: 7 dias
- Consulta em Dermatologista: 7 dias
- Consulta Cardiologista (RC): 15 dias
- Consulta Proctologista Geral: 20 dias

### Exames

- Densitometria Óssea: 15 dias
- Ecocardiograma Adulto/Infantil: 7 dias
- Eletrocardiograma Adulto/Infantil: 15 dias
- Exames Ultrasson: 15 dias
- Ultrasson com Doplen: 7 dias
- Mamografia: 10 dias
- Cintilografia do Miocárdio: 7 dias
- Exames Laboratoriais: 5 dias
- Retossigmoidoscopia: 4 dias
- Ressonância sem Sedação: 15 dias
- Tomografia sem Sedação: 5 dias
- Teste Ergométrico: 3 dias
- Exames de Raio X: 10 dias
- Exames de PAFF: 4 dias
- Exame de Diagnose de Otorrino: 10 dias
- Exames de Laringoscopia: 10 dias

## Definição de prazo e previsão

Para esta fase:

- `Prazo de Atendimento` será preenchido com base direta no número de dias do catálogo
- `Previsão de Resposta` será calculada a partir da data atual, somando os dias do atendimento selecionado
- o usuário poderá editar ambos os campos manualmente depois do preenchimento inicial

## Persistência

Não é necessário remover `categoria` do banco nesta fase.

### Estratégia

- `categoria` continua existindo na tabela `demandas`
- o frontend deixa de expor o campo ao usuário
- o sistema persiste um valor interno coerente com o contexto atual

Para `Saúde`, novos campos poderão ser persistidos usando a estrutura já existente ou campos auxiliares já disponíveis no formulário, com prioridade para:

- novo campo explícito, se já houver espaço tipado para isso
- ou persistência temporária em estrutura de notas/metadados, caso a implementação incremental exija

Na implementação, a preferência deve ser por campos explícitos e claros no código.

## Impacto visual esperado

- formulários mais simples
- menos redundância na criação das demandas
- fluxo de `Saúde` mais guiado e menos sujeito a erro de prazo

## Critérios de aceite

- o campo `Categoria` não aparece mais nos formulários de SAC e coordenadorias
- o sistema continua salvando a demanda sem quebra de compatibilidade
- o setor SAC `Saúde` mostra o campo `Tipo de Atendimento`
- selecionar um atendimento preenche `Prazo de Atendimento`
- selecionar um atendimento preenche `Previsão de Resposta`
- `Prazo de Atendimento` e `Previsão de Resposta` permanecem editáveis
- a regra especial vale somente para SAC `Saúde`

## Notas de implementação

- extrair o catálogo de saúde para um arquivo de dados dedicado para evitar listas inline grandes nos componentes
- manter a lógica de autopreenchimento isolada, para facilitar expansão futura para outros setores
- remover também badges visuais de categoria onde o contexto já torna esse dado redundante, especialmente em SAC
