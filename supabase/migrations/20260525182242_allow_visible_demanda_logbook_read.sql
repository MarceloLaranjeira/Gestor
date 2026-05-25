CREATE POLICY "Authenticated users can read logbook for visible demandas"
  ON public.logbook_entradas
  FOR SELECT
  TO authenticated
  USING (
    origem = 'demanda'
    AND EXISTS (
      SELECT 1
      FROM public.demandas
      WHERE demandas.id = logbook_entradas.origem_id
    )
  );
