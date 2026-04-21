
CREATE TABLE IF NOT EXISTS public.agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  conversation_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_conversations_select" ON public.agent_conversations FOR SELECT USING (true);
CREATE POLICY "agent_conversations_insert" ON public.agent_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "agent_conversations_update" ON public.agent_conversations FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "agent_conversations_delete" ON public.agent_conversations FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(), 'gestor'::app_role));
