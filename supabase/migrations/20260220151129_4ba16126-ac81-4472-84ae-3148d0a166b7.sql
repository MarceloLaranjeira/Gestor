
-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('gestor', 'assessor', 'coordenador');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  cargo TEXT DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table (separate from profiles per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'assessor',
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Coordenacoes table
CREATE TABLE public.coordenacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.coordenacoes ENABLE ROW LEVEL SECURITY;

-- User-coordenacao membership
CREATE TABLE public.user_coordenacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  coordenacao_id UUID REFERENCES public.coordenacoes(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(user_id, coordenacao_id)
);
ALTER TABLE public.user_coordenacoes ENABLE ROW LEVEL SECURITY;

-- Secoes table
CREATE TABLE public.secoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coordenacao_id UUID REFERENCES public.coordenacoes(id) ON DELETE CASCADE NOT NULL,
  titulo TEXT NOT NULL,
  ordem INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.secoes ENABLE ROW LEVEL SECURITY;

-- Tarefas table
CREATE TABLE public.tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secao_id UUID REFERENCES public.secoes(id) ON DELETE CASCADE NOT NULL,
  titulo TEXT NOT NULL,
  motivo TEXT DEFAULT '',
  responsavel TEXT DEFAULT '',
  canal TEXT DEFAULT 'Pessoal',
  data_inicio DATE,
  data_fim DATE,
  status BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_coordenacoes_updated_at BEFORE UPDATE ON public.coordenacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tarefas_updated_at BEFORE UPDATE ON public.tarefas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, nome)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'assessor'));
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Security definer helper: check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: check coordenacao access
CREATE OR REPLACE FUNCTION public.user_has_coordenacao_access(_user_id UUID, _coord_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_coordenacoes WHERE user_id = _user_id AND coordenacao_id = _coord_id
  )
$$;

-- RLS Policies

-- Profiles: everyone authenticated can read all, update own
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- User roles: only gestores can manage, all authenticated can read
CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles_insert" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "user_roles_update" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "user_roles_delete" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'gestor'));

-- Coordenacoes: all authenticated can read, gestores can CRUD
CREATE POLICY "coordenacoes_select" ON public.coordenacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "coordenacoes_insert" ON public.coordenacoes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "coordenacoes_update" ON public.coordenacoes FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'gestor') OR public.user_has_coordenacao_access(auth.uid(), id)
);
CREATE POLICY "coordenacoes_delete" ON public.coordenacoes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'gestor'));

-- User coordenacoes membership
CREATE POLICY "user_coordenacoes_select" ON public.user_coordenacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_coordenacoes_insert" ON public.user_coordenacoes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "user_coordenacoes_update" ON public.user_coordenacoes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "user_coordenacoes_delete" ON public.user_coordenacoes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'gestor'));

-- Secoes: all authenticated can read, gestores + assigned can manage
CREATE POLICY "secoes_select" ON public.secoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "secoes_insert" ON public.secoes FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'gestor') OR public.user_has_coordenacao_access(auth.uid(), coordenacao_id)
);
CREATE POLICY "secoes_update" ON public.secoes FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'gestor') OR public.user_has_coordenacao_access(auth.uid(), coordenacao_id)
);
CREATE POLICY "secoes_delete" ON public.secoes FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'gestor') OR public.user_has_coordenacao_access(auth.uid(), coordenacao_id)
);

-- Tarefas: all authenticated can read, gestores + assigned can manage
CREATE POLICY "tarefas_select" ON public.tarefas FOR SELECT TO authenticated USING (true);
CREATE POLICY "tarefas_insert" ON public.tarefas FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'gestor') OR EXISTS (
    SELECT 1 FROM public.secoes s WHERE s.id = secao_id AND public.user_has_coordenacao_access(auth.uid(), s.coordenacao_id)
  )
);
CREATE POLICY "tarefas_update" ON public.tarefas FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'gestor') OR EXISTS (
    SELECT 1 FROM public.secoes s WHERE s.id = secao_id AND public.user_has_coordenacao_access(auth.uid(), s.coordenacao_id)
  )
);
CREATE POLICY "tarefas_delete" ON public.tarefas FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'gestor') OR EXISTS (
    SELECT 1 FROM public.secoes s WHERE s.id = secao_id AND public.user_has_coordenacao_access(auth.uid(), s.coordenacao_id)
  )
);
