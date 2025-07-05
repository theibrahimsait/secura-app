import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, Bed, Bath, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Property } from '@/types/agent';

interface PropertyDetails {
  id: string;
  title: string;
  location: string;
  property_type: string;
  bedrooms?: number;
  bathrooms?: number;
  area_sqft?: number;
  status?: string;
  details?: any;
  created_at: string;
  client_name?: string;
}

interface PropertyDetailsModalProps {
  property: Property | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PropertyDetailsModal = ({ property, open, onOpenChange }: PropertyDetailsModalProps) => {
  const { toast } = useToast();
  const [propertyDetails, setPropertyDetails] = useState<PropertyDetails | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPropertyDetails = async (propertyId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (error) throw error;

      setPropertyDetails({
        ...data,
        client_name: property?.client_name || 'N/A'
      });
    } catch (error) {
      console.error('Error fetching property details:', error);
      toast({
        title: "Error",
        description: "Failed to load property details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (property && open) {
      fetchPropertyDetails(property.id);
    }
  }, [property, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            Property Details
          </DialogTitle>
          <DialogDescription>
            Complete information about this property
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="py-8 text-center">Loading property details...</div>
        ) : propertyDetails ? (
          <div className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{propertyDetails.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{propertyDetails.location}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium capitalize">{propertyDetails.property_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Client</p>
                    <p className="font-medium">{propertyDetails.client_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="outline" className="capitalize">
                      {propertyDetails.status || 'submitted'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Property Features */}
            {(propertyDetails.bedrooms || propertyDetails.bathrooms || propertyDetails.area_sqft) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Property Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {propertyDetails.bedrooms && (
                      <div className="flex items-center gap-2">
                        <Bed className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Bedrooms</span>
                        <span className="font-medium">{propertyDetails.bedrooms}</span>
                      </div>
                    )}
                    {propertyDetails.bathrooms && (
                      <div className="flex items-center gap-2">
                        <Bath className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Bathrooms</span>
                        <span className="font-medium">{propertyDetails.bathrooms}</span>
                      </div>
                    )}
                    {propertyDetails.area_sqft && (
                      <div className="flex items-center gap-2">
                        <Square className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Area</span>
                        <span className="font-medium">{propertyDetails.area_sqft} sqft</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Additional Details */}
            {propertyDetails.details && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Additional Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {JSON.stringify(propertyDetails.details, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <p className="text-muted-foreground">
                    Submitted on {new Date(propertyDetails.created_at).toLocaleDateString()} at{' '}
                    {new Date(propertyDetails.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Property details not available
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};