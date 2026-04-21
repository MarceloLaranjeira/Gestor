
-- Table to store module permissions per role
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  module text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, module)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_permissions_select" ON public.role_permissions FOR SELECT USING (true);
CREATE POLICY "role_permissions_insert" ON public.role_permissions FOR INSERT WITH CHECK (has_role(auth.uid(), 'gestor'));
CREATE POLICY "role_permissions_update" ON public.role_permissions FOR UPDATE USING (has_role(auth.uid(), 'gestor'));
CREATE POLICY "role_permissions_delete" ON public.role_permissions FOR DELETE USING (has_role(auth.uid(), 'gestor'));

-- Seed default permissions: gestor gets everything, others get nothing
INSERT INTO public.role_permissions (role, module, enabled) VALUES
  ('gestor', 'dashboard', true),
  ('gestor', 'agente-ia', true),
  ('gestor', 'pessoas', true),
  ('gestor', 'demandas', true),
  ('gestor', 'eventos', true),
  ('gestor', 'financas', true),
  ('gestor', 'movimentos', true),
  ('gestor', 'coordenacoes', true),
  ('gestor', 'relatorios', true),
  ('gestor', 'relatorio-coordenacao', true),
  ('gestor', 'usuarios', true),
  ('gestor', 'configuracoes', true),
  ('coordenador', 'dashboard', true),
  ('coordenador', 'agente-ia', false),
  ('coordenador', 'pessoas', false),
  ('coordenador', 'demandas', false),
  ('coordenador', 'eventos', false),
  ('coordenador', 'financas', false),
  ('coordenador', 'movimentos', false),
  ('coordenador', 'coordenacoes', true),
  ('coordenador', 'relatorios', false),
  ('coordenador', 'relatorio-coordenacao', false),
  ('coordenador', 'usuarios', false),
  ('coordenador', 'configuracoes', true),
  ('assessor', 'dashboard', true),
  ('assessor', 'agente-ia', false),
  ('assessor', 'pessoas', false),
  ('assessor', 'demandas', false),
  ('assessor', 'eventos', false),
  ('assessor', 'financas', false),
  ('assessor', 'movimentos', false),
  ('assessor', 'coordenacoes', false),
  ('assessor', 'relatorios', false),
  ('assessor', 'relatorio-coordenacao', false),
  ('assessor', 'usuarios', false),
  ('assessor', 'configuracoes', true);

CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
