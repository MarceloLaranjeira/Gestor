CREATE POLICY "profiles_update_gestor"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'gestor'::app_role));