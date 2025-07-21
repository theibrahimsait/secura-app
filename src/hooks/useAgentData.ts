import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Client, Property } from '@/types/agent';

interface Buyer {
  id: string;
  client_id: string;
  created_at: string;
  status: string;
  client: {
    full_name: string;
    phone: string;
    email: string;
  };
}

export const useAgentData = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchClientsAndProperties = async () => {
    if (!userProfile?.id) return;

    setLoading(true);
    try {
      console.log('Fetching data for agent:', userProfile.id);
      
      // Query with LEFT JOINs to preserve all submissions
      const { data: submissions, error: submissionsError } = await supabase
        .from('property_agency_submissions')
        .select(`
          *,
          client_properties (
            id,
            title,
            location,
            property_type,
            created_at,
            client_id,
            status
          ),
          clients (
            id,
            full_name,
            phone,
            email,
            created_at
          )
        `)
        .eq('agent_id', userProfile.id);

      console.log('Submissions with LEFT joins result:', { submissions, submissionsError });

      if (submissionsError) {
        console.error('Submissions error:', submissionsError);
        throw submissionsError;
      }

      if (!submissions || submissions.length === 0) {
        console.log('No submissions found for agent');
        setClients([]);
        setProperties([]);
        return;
      }

      // DIAGNOSTIC LOGGING
      console.log('=== DIAGNOSTIC INFO ===');
      submissions.forEach((submission, index) => {
        console.log(`Submission ${index + 1}:`, {
          id: submission.id,
          property_id: submission.property_id,
          client_id: submission.client_id,
          client_properties_exists: !!submission.client_properties,
          client_properties_id: submission.client_properties?.id,
          clients_exists: !!submission.clients,
          clients_id: submission.clients?.id
        });
      });

      // Check if we can fetch properties directly using property_id
      console.log('Attempting direct property fetch for missing properties...');
      const missingPropertyIds = submissions
        .filter(s => !s.client_properties && s.property_id)
        .map(s => s.property_id);
      
      let directProperties = [];
      if (missingPropertyIds.length > 0) {
        console.log('Fetching missing properties directly:', missingPropertyIds);
        const { data: directProps, error: directError } = await supabase
          .from('client_properties')
          .select('*')
          .in('id', missingPropertyIds);
        
        if (!directError && directProps) {
          directProperties = directProps;
          console.log('Direct property fetch results:', directProperties);
        }
      }

      // Extract unique clients (filter out null clients)
      const clientsMap = new Map();
      submissions.forEach(submission => {
        if (submission.clients && submission.clients.id) {
          clientsMap.set(submission.clients.id, submission.clients);
        }
      });
      const uniqueClients = Array.from(clientsMap.values());
      
      // Extract properties with client names - include both joined and directly fetched
      const propertiesWithClients: Property[] = [];
      
      // Track source for debugging
      const propertySourceMap = new Map();
      
      // Add properties from successful joins
      submissions
        .filter(submission => submission.client_properties && submission.client_properties.id)
        .forEach(submission => {
          const propertyData = {
            id: submission.client_properties.id,
            location: submission.client_properties.location,
            property_type: submission.client_properties.property_type,
            client_id: submission.client_properties.client_id,
            created_at: submission.client_properties.created_at,
            client_name: submission.clients?.full_name || 'N/A',
            source: 'joined' as const
          };
          propertiesWithClients.push(propertyData);
          propertySourceMap.set(propertyData.id, 'joined');
        });

      // Add properties from direct fetch (avoid duplicates)
      directProperties.forEach(prop => {
        // Check if property already exists from joined data
        const existsInJoined = propertiesWithClients.some(p => p.id === prop.id);
        if (!existsInJoined) {
          const matchingSubmission = submissions.find(s => s.property_id === prop.id);
          const propertyData = {
            id: prop.id,
            location: prop.location,
            property_type: prop.property_type,
            client_id: prop.client_id,
            created_at: prop.created_at,
            client_name: matchingSubmission?.clients?.full_name || 'N/A',
            source: 'direct' as const
          };
          propertiesWithClients.push(propertyData);
          propertySourceMap.set(propertyData.id, 'direct');
        }
      });
      
      console.log('Property source mapping:', Object.fromEntries(propertySourceMap));

      console.log('Final processed data:', { 
        clients: uniqueClients, 
        properties: propertiesWithClients,
        submissionsCount: submissions.length,
        validSubmissions: submissions.filter(s => s.client_properties && s.clients),
        directlyFetchedProperties: directProperties.length
      });

      setClients(uniqueClients);
      setProperties(propertiesWithClients);

      // Fetch buyers (ID document submissions - property_id is null)
      await fetchBuyers();

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBuyers = async () => {
    if (!userProfile?.id) return;

    try {
      const { data, error } = await supabase
        .from('property_agency_submissions')
        .select(`
          id,
          client_id,
          created_at,
          status,
          clients (
            full_name,
            phone,
            email
          )
        `)
        .eq('agent_id', userProfile.id)
        .is('property_id', null); // ID document submissions have null property_id

      if (error) throw error;

      const buyersData = data?.map(submission => ({
        id: submission.id,
        client_id: submission.client_id,
        created_at: submission.created_at,
        status: submission.status,
        client: submission.clients
      })).filter(buyer => buyer.client) || [];

      setBuyers(buyersData);
      console.log('Buyers fetched:', buyersData);
    } catch (error) {
      console.error('Error fetching buyers:', error);
    }
  };

  useEffect(() => {
    if (userProfile) {
      fetchClientsAndProperties();
    }
  }, [userProfile]);

  return {
    clients,
    properties,
    buyers,
    loading,
    refetch: fetchClientsAndProperties
  };
};