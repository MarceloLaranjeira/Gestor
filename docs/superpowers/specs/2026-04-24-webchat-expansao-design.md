# Expansão do WebChat Interno

## Contexto

O `WebChat` atual já possui base funcional:

- tabela `chat_salas`
- tabela `chat_mensagens`
- realtime habilitado
- conversas diretas simples

Mas ainda faltam capacidades importantes para uso interno real do gabinete:

- canais por coordenadoria
- canais extras fixos
- ambiente para a equipe
- edição e exclusão de mensagens
- anexos por mensagem
- melhor organização visual das salas

O objetivo desta fase é ampliar o `WebChat` aproveitando a estrutura existente, sem reescrever o módulo do zero.

## Decisão

Foi aprovada a abordagem `3`:

- manter `chat_salas` e `chat_mensagens`
- adicionar tabelas auxiliares e metadados complementares
- expandir o comportamento da interface sem trocar a base atual

## Objetivos

- manter o canal `Geral`
- adicionar canal `Equipe`
- adicionar canais extras fixos, incluindo `Gestores`
- criar um canal para cada coordenadoria cadastrada
- manter e melhorar as conversas diretas por membro
- permitir editar e excluir mensagens conforme regra aprovada
- permitir anexos em mensagens usando `Supabase Storage`

## Regras de Acesso Aprovadas para Esta Fase

Por agora:

- todos os usuários veem todos os canais
- todos os usuários podem enviar mensagens
- cada usuário pode editar apenas as próprias mensagens
- cada usuário pode excluir apenas as próprias mensagens
- gestores podem excluir qualquer mensagem

O controle fino por permissões fica para uma fase posterior.

## Estrutura de Canais

O `WebChat` passará a ter quatro grupos principais:

### Canais gerais

- `Geral`
- `Equipe`
- canais extras fixos, como `Gestores`

### Canais de coordenadoria

Um canal por coordenadoria cadastrada no sistema.

Exemplos:

- `Comunicação`
- `Inteligência`
- `Gabinete`
- `Equipe Interna`

### Conversas diretas

Conversas privadas entre membros cadastrados.

### Mensagens de sistema

Continuam existindo como mensagens especiais no fluxo, sem se misturar ao comportamento de edição normal.

## Modelo de Dados

### Expansão de `chat_salas`

Adicionar ou padronizar campos como:

- `grupo`
- `slug`
- `coordenadoria_slug`
- `ordem`
- `ativo`

Uso esperado:

- `grupo`: `geral`, `extra`, `coordenadoria`, `privado`
- `slug`: identificador estável da sala
- `coordenadoria_slug`: vínculo opcional com a coordenadoria
- `ordem`: ordenação da sidebar do chat
- `ativo`: permite ocultar salas sem apagar histórico

### Expansão de `chat_mensagens`

Adicionar campos como:

- `updated_at`
- `editada`
- `editada_em`
- `excluida`
- `excluida_em`

Isso permite:

- editar o texto de uma mensagem
- excluir sem perder integridade do fluxo
- mostrar visualmente que a mensagem foi editada

### Nova tabela `chat_mensagem_anexos`

Criar tabela auxiliar para anexos de mensagem com estrutura equivalente a:

- `id`
- `mensagem_id`
- `user_id`
- `nome_arquivo`
- `tipo_arquivo`
- `storage_bucket`
- `storage_path`
- `tamanho_bytes`
- `created_at`

Os arquivos ficam em `Supabase Storage`.

## Storage

Os anexos do chat usarão um bucket próprio, por exemplo:

- `chat-anexos`

Estrutura sugerida:

- `chat/<sala-id>/<mensagem-id>/<arquivo>`

Capacidades esperadas:

- upload
- download
- remoção junto com exclusão da mensagem quando permitido

## Regras de Mensagem

### Envio

- mensagens de texto continuam como padrão
- anexos podem ser enviados junto com a mensagem
- mensagens sem texto podem existir se tiverem anexo

### Edição

- somente o autor pode editar a própria mensagem
- mensagens de sistema não são editáveis
- mensagens com anexo mantêm o anexo ao editar texto

### Exclusão

- autor exclui a própria mensagem
- gestor pode excluir qualquer mensagem
- exclusão deve ocultar a mensagem do fluxo principal
- se houver anexo, o sistema remove também o arquivo vinculado

## Interface do WebChat

### Sidebar do chat

A coluna lateral do `WebChat` passa a ser organizada por blocos:

- `Canais Gerais`
- `Canais Extras`
- `Coordenadorias`
- `Mensagens Diretas`

Cada item deve mostrar:

- nome da sala
- descrição quando houver
- indicador de mensagens não lidas
- ícone coerente com o tipo de canal

### Área da conversa

Cada mensagem poderá mostrar:

- autor
- horário
- conteúdo
- indicador de edição
- anexos vinculados
- ações de editar e excluir quando permitido

### Composer

O composer da conversa deve permitir:

- escrever mensagem
- quebrar linha com `Shift+Enter`
- enviar com `Enter`
- selecionar arquivo
- enviar anexo com a mensagem

## Conversas Diretas

As DMs continuam existindo, mas com o mesmo padrão de capacidades dos canais:

- envio de texto
- envio de anexo
- edição da própria mensagem
- exclusão conforme regra aprovada

## Seed e Estrutura Inicial

Ao carregar o sistema ou aplicar a migração, o chat deve garantir a existência de:

- `Geral`
- `Equipe`
- `Gestores`
- canais extras fixos aprovados
- um canal para cada coordenadoria existente

Se a coordenadoria já existir no sistema, o canal correspondente deve ser criado sem duplicação.

## Compatibilidade

- o chat atual não será descartado
- as DMs existentes permanecem válidas
- mensagens antigas continuam visíveis
- salas existentes podem ser reaproveitadas e normalizadas

## Critérios de Aceite

- existe canal `Geral`
- existe canal `Equipe`
- existe canal `Gestores`
- existem canais extras fixos
- existe um canal para cada coordenadoria
- existem conversas diretas por membro
- usuários podem editar apenas as próprias mensagens
- gestores podem excluir qualquer mensagem
- anexos podem ser enviados e baixados
- anexos são removidos ao apagar a mensagem quando aplicável
- a interface do chat mostra os grupos de salas de forma organizada

## Ordem Recomendada de Implementação

1. ampliar banco e storage do chat
2. garantir seed e normalização das salas obrigatórias
3. implementar anexos por mensagem
4. implementar edição e exclusão de mensagens
5. reorganizar a interface por grupos de canais
6. validar realtime, upload, edição, exclusão e DMs
