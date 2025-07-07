-- Remove the old presigned URL functions that don't work
DROP FUNCTION IF EXISTS public.get_client_file_download_url(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_agency_file_download_url(TEXT);