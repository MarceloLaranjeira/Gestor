ALTER TABLE public.movimentos
ADD COLUMN IF NOT EXISTS slug TEXT;

UPDATE public.movimentos
SET slug = COALESCE(slug, 'movimento-' || substr(id::text, 1, 8))
WHERE slug IS NULL;

ALTER TABLE public.movimentos
ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS movimentos_slug_key
ON public.movimentos (slug);

ALTER TABLE public.demandas
ADD COLUMN IF NOT EXISTS setor_sac TEXT,
ADD COLUMN IF NOT EXISTS coordenadoria_slug TEXT,
ADD COLUMN IF NOT EXISTS coordenadoria_nome TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'demandas_setor_sac_check'
  ) THEN
    ALTER TABLE public.demandas
    ADD CONSTRAINT demandas_setor_sac_check CHECK (
      setor_sac IS NULL OR setor_sac IN (
        'saude',
        'tea',
        'assistencia-social',
        'infraestrutura',
        'empreendedorismo',
        'habitacao',
        'esporte-lazer',
        'outros'
      )
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS demandas_setor_sac_idx
ON public.demandas (setor_sac);

INSERT INTO public.coordenacoes (slug, nome, descricao)
VALUES
  ('sac-saude', 'Coordenadoria SAC - Saúde', 'Coordenadoria fixa do setor SAC de Saúde.'),
  ('sac-tea', 'Coordenadoria SAC - TEA', 'Coordenadoria fixa do setor SAC de TEA.'),
  ('sac-assistencia-social', 'Coordenadoria SAC - Assistência Social', 'Coordenadoria fixa do setor SAC de Assistência Social.'),
  ('sac-infraestrutura', 'Coordenadoria SAC - Infraestrutura', 'Coordenadoria fixa do setor SAC de Infraestrutura.'),
  ('sac-empreendedorismo', 'Coordenadoria SAC - Empreendedorismo', 'Coordenadoria fixa do setor SAC de Empreendedorismo.'),
  ('sac-habitacao', 'Coordenadoria SAC - Habitação', 'Coordenadoria fixa do setor SAC de Habitação.'),
  ('sac-esporte-lazer', 'Coordenadoria SAC - Esporte e Lazer', 'Coordenadoria fixa do setor SAC de Esporte e Lazer.'),
  ('sac-outros', 'Coordenadoria SAC - Outros', 'Coordenadoria fixa do setor SAC de Outros.')
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao;

INSERT INTO public.movimentos (slug, nome, descricao, icone, cor)
VALUES
  ('saude', 'Saúde', 'Demandas de saúde pública, atendimento, exames, consultas e apoio assistencial.', 'Heart', 'bg-rose-500/10 text-rose-500'),
  ('tea', 'TEA', 'Demandas de atendimento, acompanhamento e encaminhamento relacionadas ao TEA.', 'Activity', 'bg-blue-500/10 text-blue-500'),
  ('assistencia-social', 'Assistência Social', 'Solicitações de apoio social, benefícios, vulnerabilidade e encaminhamentos do SAC.', 'HandHeart', 'bg-purple-500/10 text-purple-500'),
  ('infraestrutura', 'Infraestrutura', 'Demandas de obras, saneamento, pavimentação, iluminação e serviços urbanos.', 'Building2', 'bg-slate-500/10 text-slate-500'),
  ('empreendedorismo', 'Empreendedorismo', 'Apoio a pequenos negócios, geração de renda e orientações para empreendedores.', 'Briefcase', 'bg-amber-500/10 text-amber-500'),
  ('habitacao', 'Habitação', 'Demandas de moradia, regularização, programas habitacionais e melhorias residenciais.', 'Home', 'bg-emerald-500/10 text-emerald-500'),
  ('esporte-lazer', 'Esporte e Lazer', 'Solicitações de esporte comunitário, atividades, projetos e lazer para a população.', 'Trophy', 'bg-orange-500/10 text-orange-500'),
  ('outros', 'Outros', 'Demandas gerais do SAC que ainda não se encaixam em um setor específico.', 'HelpCircle', 'bg-gray-500/10 text-gray-500')
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  icone = EXCLUDED.icone,
  cor = EXCLUDED.cor;
