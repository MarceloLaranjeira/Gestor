ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS disponibilidade_status text NOT NULL DEFAULT 'disponivel',
ADD COLUMN IF NOT EXISTS disponibilidade_mensagem text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS disponibilidade_atualizada_em timestamptz;

UPDATE public.profiles
SET
  disponibilidade_status = COALESCE(NULLIF(disponibilidade_status, ''), 'disponivel'),
  disponibilidade_mensagem = COALESCE(disponibilidade_mensagem, ''),
  disponibilidade_atualizada_em = COALESCE(disponibilidade_atualizada_em, updated_at, created_at, now())
WHERE disponibilidade_status IS NULL
   OR disponibilidade_status = ''
   OR disponibilidade_mensagem IS NULL
   OR disponibilidade_atualizada_em IS NULL;

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_disponibilidade_status_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_disponibilidade_status_check
CHECK (disponibilidade_status IN ('disponivel', 'indisponivel'));
