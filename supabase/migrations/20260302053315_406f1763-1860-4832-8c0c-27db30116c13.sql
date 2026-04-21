
-- Fix campanha_calhas SELECT
DROP POLICY IF EXISTS "campanha_calhas_select" ON public.campanha_calhas;
CREATE POLICY "campanha_calhas_select" ON public.campanha_calhas FOR SELECT USING (auth.uid() IS NOT NULL);

-- Fix campanha_municipios SELECT
DROP POLICY IF EXISTS "municipios_select" ON public.campanha_municipios;
CREATE POLICY "municipios_select" ON public.campanha_municipios FOR SELECT USING (auth.uid() IS NOT NULL);

-- Fix movimentos SELECT
DROP POLICY IF EXISTS "movimentos_select" ON public.movimentos;
CREATE POLICY "movimentos_select" ON public.movimentos FOR SELECT USING (auth.uid() IS NOT NULL);

-- Fix role_permissions SELECT
DROP POLICY IF EXISTS "role_permissions_select" ON public.role_permissions;
CREATE POLICY "role_permissions_select" ON public.role_permissions FOR SELECT USING (auth.uid() IS NOT NULL);
