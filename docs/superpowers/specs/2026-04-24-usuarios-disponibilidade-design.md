# Gestão Completa de Usuários e Disponibilidade

## Contexto

O menu `Usuários` hoje lista os membros a partir de `profiles`, `user_roles` e `user_coordenacoes`, com criação e exclusão delegadas às edge functions `create-user` e `delete-user`.

O comportamento atual apresenta duas dores:

- exclusão de membros não está confiável para remoção total do sistema
- o sistema não possui um status operacional de disponibilidade do membro visível nos pontos em que ele é citado

Além disso, o usuário quer manter o membro logado e ativo no sistema mesmo quando ele se marcar como indisponível, usando esse estado apenas como informação operacional para os demais.

## Objetivo

- garantir inclusão confiável de membros no menu `Usuários`
- garantir exclusão total do membro do sistema
- adicionar status de `disponível` e `indisponível`
- permitir mensagem de ausência preenchida pelo próprio usuário
- propagar o status e a mensagem para todos os pontos em que o membro é citado

## Escopo

### Incluído

- tela `Gerenciar Usuários`
- edge functions `create-user` e `delete-user`
- estrutura de dados do perfil do usuário
- exibição de disponibilidade em menus, listas, chats e seletores relevantes
- edição do próprio status de disponibilidade

### Não incluído

- controle avançado de permissões por disponibilidade
- logout automático
- presença em tempo real
- agenda automática de ausência

## Abordagem escolhida

Gestão completa de membros, com correção de inclusão e exclusão total, somada a um novo estado de disponibilidade reutilizado no sistema inteiro.

## Modelo de dados

Os dados de disponibilidade serão acoplados ao `profile` do usuário, para que fiquem facilmente consultáveis em qualquer área que já usa `profiles`.

### Novos campos em `profiles`

- `disponibilidade_status text`
  - valores: `disponivel`, `indisponivel`
- `disponibilidade_mensagem text`
  - mensagem livre de ausência
- `disponibilidade_atualizada_em timestamptz`

### Regras

- novos usuários nascem com `disponivel`
- a mensagem de ausência é opcional
- se o usuário voltar para `disponivel`, a mensagem pode ser mantida ou limpa na interface
- para esta fase, a recomendação é limpar a mensagem ao voltar para `disponivel`, para evitar texto desatualizado

## Inclusão de membros

O fluxo de inclusão deve garantir as quatro etapas abaixo como transação lógica:

1. criar o usuário de autenticação
2. criar ou atualizar o `profile`
3. atribuir a `role`
4. vincular coordenações em `user_coordenacoes`

### Resultado esperado

- ao criar, o usuário aparece imediatamente na listagem
- o perfil já nasce com os campos mínimos corretos
- a função e as coordenações ficam consistentes
- mensagens de erro mostram qual etapa falhou

## Exclusão total de membros

A exclusão deve remover completamente o membro.

### Ordem lógica

1. apagar vínculos em `user_coordenacoes`
2. apagar `user_roles`
3. apagar `profiles`
4. apagar a conta em `auth.users`

### Regras

- não permitir que o gestor exclua a si mesmo na interface
- a edge function deve validar permissão de gestor antes de executar
- erros de exclusão parcial devem retornar mensagem clara

## Disponibilidade do membro

Cada usuário poderá definir:

- `Disponível`
- `Indisponível`
- mensagem de ausência

### Regra de uso

- o usuário continua usando o sistema normalmente
- o status não bloqueia acesso
- o status é informativo para os demais

## Onde a disponibilidade aparece

O status e a mensagem de ausência devem aparecer em todos os pontos relevantes onde o usuário é citado.

### Áreas prioritárias

- menu `Usuários`
- `WebChat`
- cabeçalho ou perfil do usuário atual, se houver área apropriada para isso
- seletores de responsável
- listas e cartões que mostram nome de membro do sistema

### Exibição visual sugerida

- badge `Disponível` em verde
- badge `Indisponível` em âmbar ou vermelho suave
- mensagem curta logo abaixo do nome, quando houver

## Mudanças na tela de Usuários

### 1. Lista

Adicionar colunas ou badges para:

- disponibilidade atual
- mensagem de ausência resumida

### 2. Criação

Manter:

- nome
- email
- senha
- função
- coordenações

Novo usuário entra como:

- `disponivel`
- mensagem vazia

### 3. Edição administrativa

Gestores continuam podendo editar:

- nome
- cargo
- função
- coordenações

Não é necessário que o gestor edite a disponibilidade do outro usuário nesta fase; o status é principalmente autodeclarado pelo próprio membro.

### 4. Exclusão

O botão de exclusão continua no menu `Usuários`, mas deve acionar a remoção total real do membro.

## Mudanças para o próprio usuário

O sistema precisa oferecer um ponto simples para o próprio membro alternar seu estado.

### Campos

- botão ou seletor `Disponível / Indisponível`
- campo de mensagem de ausência

### Comportamento

- atualização imediata no `profile`
- refletir no restante do sistema sem exigir logout

## Integração com WebChat

No `WebChat`, a disponibilidade deve aparecer em:

- lista de membros para DM
- cabeçalho da conversa direta
- participantes citados em mensagens, quando houver contexto para isso

Se o usuário estiver indisponível:

- mostrar badge de indisponível
- mostrar mensagem de ausência quando existir

## Tratamento de erros

### Criação

- se a criação do usuário auth funcionar e o restante falhar, a edge function deve responder erro explícito
- quando possível, deve haver rollback ou correção defensiva

### Exclusão

- se a conta auth não puder ser removida, a função deve falhar com mensagem clara
- a UI deve manter o usuário na lista até a remoção total ter sido confirmada

## Critérios de aceite

- criar usuário volta a funcionar corretamente
- excluir usuário remove o membro de forma completa do sistema
- gestor não pode excluir a si mesmo
- existe status `disponível / indisponível`
- existe mensagem de ausência
- o próprio usuário pode alterar seu status sem deslogar
- status e mensagem aparecem em todos os contextos principais onde o membro é citado

## Notas de implementação

- preferir adicionar os campos de disponibilidade em `profiles`, evitando uma tabela extra nesta fase
- revisar `create-user` e `delete-user` para garantir consistência entre `auth.users` e tabelas públicas
- centralizar a leitura de disponibilidade em helper compartilhado ou tipagem comum, para não duplicar lógica em `Usuários`, `WebChat` e seletores
