-- Allow public read access to referral_links for referral resolution
CREATE POLICY "Public can read referral links for referral resolution"
ON public.referral_links
FOR SELECT
USING (true);

-- Allow public read access to agencies for referral context
CREATE POLICY "Public can read agency names for referral context"
ON public.agencies  
FOR SELECT
USING (true);

-- Allow public read access to users for referral context
CREATE POLICY "Public can read user names for referral context"
ON public.users
FOR SELECT  
USING (true);