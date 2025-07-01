-- Enable RLS on referral_links table
ALTER TABLE public.referral_links ENABLE ROW LEVEL SECURITY;

-- Policy: Agents can manage their own referral links
CREATE POLICY "Agents can manage own referral links" ON public.referral_links
FOR ALL USING (
  agent_id = (
    SELECT id FROM public.users 
    WHERE auth_user_id = auth.uid() AND role = 'agent'
  )
)
WITH CHECK (
  agent_id = (
    SELECT id FROM public.users 
    WHERE auth_user_id = auth.uid() AND role = 'agent'
  )
);

-- Policy: Agency admins can view agency referral links
CREATE POLICY "Agency admins can view agency referral links" ON public.referral_links
FOR SELECT USING (
  agency_id = (
    SELECT agency_id FROM public.users 
    WHERE auth_user_id = auth.uid() AND role = 'agency_admin'
  )
);

-- Policy: Superadmins can manage all referral links
CREATE POLICY "Superadmins can manage all referral links" ON public.referral_links
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid() AND role = 'superadmin'
  )
);