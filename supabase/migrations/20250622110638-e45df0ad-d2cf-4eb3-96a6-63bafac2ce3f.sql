
-- Enable Row Level Security on the test table
ALTER TABLE public.test ENABLE ROW LEVEL SECURITY;

-- Create a restrictive policy that blocks all access by default
-- You can modify this policy later based on your specific access requirements
CREATE POLICY "Restrict access to test table" ON public.test
  FOR ALL USING (false);
