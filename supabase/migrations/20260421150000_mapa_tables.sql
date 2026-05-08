-- Pontos no mapa (pins)
CREATE TABLE IF NOT EXISTS public.mapa_pontos (
  id          uuid              DEFAULT gen_random_uuid() PRIMARY KEY,
  nome        text              NOT NULL,
  tipo        text              NOT NULL DEFAULT 'outro',
  descricao   text              DEFAULT '',
  latitude    double precision  NOT NULL,
  longitude   double precision  NOT NULL,
  cor         text              NOT NULL DEFAULT '#3b82f6',
  user_id     uuid,
  created_at  timestamptz       DEFAULT now()
);

-- Círculos de raio
CREATE TABLE IF NOT EXISTS public.mapa_raios (
  id          uuid              DEFAULT gen_random_uuid() PRIMARY KEY,
  nome        text              NOT NULL,
  latitude    double precision  NOT NULL,
  longitude   double precision  NOT NULL,
  raio_km     double precision  NOT NULL DEFAULT 5,
  cor         text              NOT NULL DEFAULT '#3b82f6',
  descricao   text              DEFAULT '',
  user_id     uuid,
  created_at  timestamptz       DEFAULT now()
);

-- Territórios (polígonos)
CREATE TABLE IF NOT EXISTS public.mapa_territorios (
  id          uuid              DEFAULT gen_random_uuid() PRIMARY KEY,
  nome        text              NOT NULL,
  tipo        text              NOT NULL DEFAULT 'regiao',
  descricao   text              DEFAULT '',
  cor         text              NOT NULL DEFAULT '#6366f1',
  coordenadas jsonb             NOT NULL DEFAULT '[]'::jsonb,
  user_id     uuid,
  created_at  timestamptz       DEFAULT now()
);

ALTER TABLE public.mapa_pontos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mapa_raios      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mapa_territorios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mapa_pontos_all"      ON public.mapa_pontos      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "mapa_raios_all"       ON public.mapa_raios       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "mapa_territorios_all" ON public.mapa_territorios FOR ALL USING (true) WITH CHECK (true);
