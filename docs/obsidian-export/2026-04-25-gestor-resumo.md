# Gestor - Resumo das Alteracoes

Data: 2026-04-25

## Entregas principais

- Estruturacao de `Demandas SAC` com setores fixos, coordenadoria fixa por setor e kanban proprio.
- Criacao de `Demandas das Coordenadorias` com acesso rapido no sidebar e dashboard.
- Unificacao visual e funcional dos kanbans de SAC e coordenadorias.
- Inclusao da coluna `Finalizado` em todos os kanbans.
- Integracao de alertas diretamente nas demandas, com destaque nos cards e no sino do topo.
- Remocao do campo `Categoria` dos formularios e automatizacao pelo contexto.
- Especializacao do setor `Saude` com tipos de atendimento e prazos sugeridos.
- Expansao do `WebChat` com canais gerais, coordenadorias, equipe, gestores, conversas diretas e anexos.
- Gestao de usuarios com exclusao completa, criacao reforcada e status de disponibilidade.
- Ajustes amplos de responsividade para celular e tablet.
- Correcoes de loop no mobile na tela do setor `TEA`.
- Padronizacao de textos dos kanbans para portugues do Brasil.

## Arquivos-base adicionados

- `src/data/sacSetores.ts`
- `src/data/coordenadoriaDemandas.ts`
- `src/data/demandasKanban.ts`
- `src/data/saudeAtendimentos.ts`
- `src/lib/demandaAlertas.ts`
- `src/lib/userAvailability.ts`

## Paginas e componentes mais afetados

- `src/components/AppHeader.tsx`
- `src/components/AppLayout.tsx`
- `src/components/AppSidebar.tsx`
- `src/components/NotificationPanel.tsx`
- `src/components/ui/dialog.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Movimentos.tsx`
- `src/pages/MovimentoDetalhes.tsx`
- `src/pages/CoordenacaoPage.tsx`
- `src/pages/GerenciarUsuarios.tsx`
- `src/pages/WebChat.tsx`
- `src/pages/Calendario.tsx`

## Migracoes relevantes

- `20260423150000_sac_setores_kanban.sql`
- `20260424010000_demandas_sac_rich_fields.sql`
- `20260424120000_demanda_alertas.sql`
- `20260424150000_webchat_expansao.sql`
- `20260424180000_saude_atendimento_campos.sql`
- `20260424200000_profiles_disponibilidade.sql`

## Specs incluidas neste pacote

- `2026-04-23-sac-setores-kanban-design.md`
- `2026-04-23-demandas-sac-sidebar-dashboard-design.md`
- `2026-04-24-demandas-sac-unificacao-design.md`
- `2026-04-24-alertas-integrados-demandas-design.md`
- `2026-04-24-webchat-expansao-design.md`
- `2026-04-24-saude-atendimento-formulario-design.md`
- `2026-04-24-usuarios-disponibilidade-design.md`
- `2026-04-24-sistema-responsivo-design.md`

## Observacoes

- As alteracoes ja estao salvas localmente na pasta do projeto.
- O material exportado para o Obsidian serve como registro funcional e documental desta rodada.
