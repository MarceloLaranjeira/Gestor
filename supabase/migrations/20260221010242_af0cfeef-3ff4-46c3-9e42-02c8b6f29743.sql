-- Fix handle_new_user to always assign 'assessor' role, preventing privilege escalation via client metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, nome)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)));
  
  -- Always default to 'assessor' role. Gestores must assign elevated roles manually.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'assessor');
  
  RETURN NEW;
END;
$function$;