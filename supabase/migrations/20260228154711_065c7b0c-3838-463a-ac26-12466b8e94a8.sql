ALTER TABLE public.integracao_agente_config 
ADD COLUMN auth_header_type text NOT NULL DEFAULT 'apikey';

COMMENT ON COLUMN public.integracao_agente_config.auth_header_type IS 'Tipo de header: bearer, apikey, x-api-key, custom';