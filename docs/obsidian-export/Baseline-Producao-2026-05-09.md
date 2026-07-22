# Baseline de Produção — 09/05/2026

## Objetivo
Deixar apenas **1 projeto oficial**, salvar o deploy correto e garantir que toda mudança futura parta deste ponto.

## Projeto oficial (único)
- `C:\Users\marce\Downloads\Gestor\Gestor-main`

## Limpeza realizada
- Removidos projetos antigos locais:
  - `Gabinete-Dan-Camara-main`
  - `Gabinete-Inteligente`
- Mantido somente:
  - `Gestor-main`
  - `.claude` (pasta de ferramenta)

## Dashboard/estrutura confirmada
- Sidebar com `Demandas SAC` por setor (Saúde, TEA, Assistência Social, Infraestrutura, etc.)
- `Demandas das Coordenadorias`
- Fluxo Kanban com NPS
- URL crítica validada: `https://gestor.automatikus.com.br/movimentos/tea`

## Correções aplicadas
- Correção do erro ao criar nova demanda em Saúde.
- Fallback de salvamento aplicado também nas outras categorias/kanbans.
- Permissão de editar/excluir demandas no kanban para usuários autenticados (RLS ajustado).

## Publicação e versionamento
- Produção oficial: `https://gestor.automatikus.com.br`
- Deploy baseline (Vercel): `https://gestor-automatikus-g7cijkut7-automatikus-automacoes-projects.vercel.app`
- Commit baseline atual:
  - `6937a0959c367a5c51ed59439b5e3288b05fab4a`
- Branches sincronizadas:
  - `main` = `master` = `6937a0959c367a5c51ed59439b5e3288b05fab4a`
- Tags criadas:
  - `baseline-producao-2026-05-09`
  - `baseline-producao-2026-05-09-final`

## Regra para próximas mudanças
1. Trabalhar **somente** em `Gestor-main`.
2. Fazer mudanças em cima do baseline atual.
3. Publicar em produção.
4. Manter `main` e `master` no mesmo commit após cada release.
