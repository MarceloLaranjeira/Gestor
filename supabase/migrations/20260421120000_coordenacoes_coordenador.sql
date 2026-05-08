-- Adiciona campos de gestão à tabela coordenacoes
ALTER TABLE public.coordenacoes
  ADD COLUMN IF NOT EXISTS coordenador TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS coordenador_email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS coordenador_telefone TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS cor TEXT DEFAULT 'from-blue-500/20 to-cyan-500/10 border-blue-500/30',
  ADD COLUMN IF NOT EXISTS icone TEXT DEFAULT 'building2',
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS meta_tarefas INT DEFAULT 0;
