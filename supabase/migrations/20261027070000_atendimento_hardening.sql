-- Ajustes apontados pelo Security Advisor após a Fase 1 do Atendimento.
ALTER FUNCTION public.cpf_valido(text) SET search_path = '';

-- Usada só nas políticas RLS de usuários logados; anônimo não precisa consultar.
REVOKE ALL ON FUNCTION public.has_module_access(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_module_access(uuid, text) TO authenticated;
