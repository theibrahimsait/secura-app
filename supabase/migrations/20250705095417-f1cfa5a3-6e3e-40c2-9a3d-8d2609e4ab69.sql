-- Fix property_documents linking to client_properties
-- The data is already correctly linked, but missing proper foreign key constraint

-- Add foreign key constraint for property_id -> client_properties(id)
ALTER TABLE public.property_documents
ADD CONSTRAINT fk_property_documents_client_property
  FOREIGN KEY (property_id) REFERENCES public.client_properties(id) ON DELETE CASCADE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_property_documents_property_id 
ON public.property_documents(property_id);