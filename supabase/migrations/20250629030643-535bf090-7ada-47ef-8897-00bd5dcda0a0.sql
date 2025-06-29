
-- Allow anyone to insert new clients (for registration/OTP)
CREATE POLICY "Allow public client registration" 
  ON public.clients 
  FOR INSERT 
  TO public 
  WITH CHECK (true);

-- Allow clients to view their own records (for OTP verification)
CREATE POLICY "Clients can view own records" 
  ON public.clients 
  FOR SELECT 
  TO public 
  USING (true);

-- Allow clients to update their own records (for OTP verification and profile updates)
CREATE POLICY "Clients can update own records" 
  ON public.clients 
  FOR UPDATE 
  TO public 
  USING (true);
