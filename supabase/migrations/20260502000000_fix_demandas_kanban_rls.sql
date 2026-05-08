-- Fix: Allow any authenticated user to update/delete demandas in the Kanban.
-- Previously only the creator (user_id) or 'gestor' role could update/delete,
-- which blocked coordinators from operating cards.

DROP POLICY IF EXISTS "demandas_update" ON public.demandas;
DROP POLICY IF EXISTS "demandas_delete" ON public.demandas;

CREATE POLICY "demandas_update"
ON public.demandas
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "demandas_delete"
ON public.demandas
FOR DELETE
USING (auth.uid() IS NOT NULL);
