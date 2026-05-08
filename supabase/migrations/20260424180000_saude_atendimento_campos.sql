ALTER TABLE public.demandas
ADD COLUMN IF NOT EXISTS atendimento_grupo text,
ADD COLUMN IF NOT EXISTS atendimento_tipo text,
ADD COLUMN IF NOT EXISTS atendimento_prazo_dias integer;

CREATE INDEX IF NOT EXISTS demandas_atendimento_tipo_idx
ON public.demandas (atendimento_tipo);
