import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Home } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Client, Property } from '@/types/agent';

interface ClientPropertiesModalProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ClientPropertiesModal = ({ client, open, onOpenChange }: ClientPropertiesModalProps) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [clientProperties, setClientProperties] = useState<Property[]>([]);

  const fetchClientProperties = async (clientId: string) => {
    try {
      console.log('Fetching properties for client:', clientId);
      
      const { data: clientSubmissions, error } = await supabase
        .from('property_agency_submissions')
        .select('*')
        .eq('agent_id', userProfile?.id)
        .eq('client_id', clientId);

      console.log('Client submissions:', clientSubmissions);

      if (error) throw error;

      const clientPropsData = [];
      
      if (clientSubmissions && clientSubmissions.length > 0) {
        for (const submission of clientSubmissions) {
          if (submission.property_id) {
            const { data: propertyData, error: propError } = await supabase
              .from('client_properties')
              .select('*')
              .eq('id', submission.property_id)
              .single();

            if (!propError && propertyData) {
              clientPropsData.push({
                id: propertyData.id,
                location: propertyData.location,
                property_type: propertyData.property_type,
                client_id: clientId,
                created_at: propertyData.created_at,
                status: propertyData.status || 'submitted'
              });
            }
          }
        }
      }

      console.log('Client properties data:', clientPropsData);
      setClientProperties(clientPropsData);
    } catch (error) {
      console.error('Error fetching client properties:', error);
      toast({
        title: "Error",
        description: "Failed to load client properties.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (client && open) {
      fetchClientProperties(client.id);
    }
  }, [client, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {client?.full_name || 'Client'} - Properties
          </DialogTitle>
          <DialogDescription>
            All properties submitted by this client
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          {clientProperties.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted On</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientProperties.map((property: any) => (
                  <TableRow key={property.id}>
                    <TableCell>
                      <div className="font-medium">{property.location}</div>
                    </TableCell>
                    <TableCell className="capitalize">{property.property_type}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {property.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(property.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Home className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No properties found for this client</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};