
-- Update the hardcoded superadmin email to match your actual credentials
UPDATE public.users 
SET email = 'theibrahimsait@gmail.com'
WHERE id = '00000000-0000-0000-0000-000000000001' AND role = 'superadmin';
