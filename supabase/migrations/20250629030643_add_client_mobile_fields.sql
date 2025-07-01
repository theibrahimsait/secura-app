DROP POLICY IF EXISTS "Allow public client registration" ON public.clients;
CREATE POLICY "Allow public client registration" 
  ON public.clients 
  FOR INSERT 
  TO public 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Clients can view own records" ON public.clients;
CREATE POLICY "Clients can view own records" 
  ON public.clients 
  FOR SELECT 
  TO public 
  USING (true);

DROP POLICY IF EXISTS "Clients can update own records" ON public.clients;
CREATE POLICY "Clients can update own records" 
  ON public.clients 
  FOR UPDATE 
  TO public 
  USING (true);
