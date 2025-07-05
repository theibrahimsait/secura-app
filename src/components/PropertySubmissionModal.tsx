import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { clientSupabase } from '@/lib/client-supabase';
import { Send, Building2 } from 'lucide-react';

interface Property {
  id: string;
  title: string;
  location: string;
  property_type: string;
  status: string;
  created_at: string;
  bedrooms?: number;
  bathrooms?: number;
  area_sqft?: number;
}

interface ClientData {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string;
}

interface AgentAgencyInfo {
  agencyId: string;
  agencyName: string;
  agentId: string | null;
  agentName: string | null;
}

interface PropertySubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  clientData: ClientData;
  agentAgencyInfo: AgentAgencyInfo;
  onSubmissionComplete: () => void;
}

const PropertySubmissionModal = ({
  isOpen,
  onClose,
  properties,
  clientData,
  agentAgencyInfo,
  onSubmissionComplete
}: PropertySubmissionModalProps) => {
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Filter properties that are in portfolio and not already submitted to this agency
  const availableProperties = properties.filter(property => 
    property.status === 'draft' || property.status === 'in_portfolio'
  );

  const handlePropertyToggle = (propertyId: string) => {
    setSelectedProperties(prev => 
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const handleSubmit = async () => {
    if (selectedProperties.length === 0) {
      toast({
        title: "No Properties Selected",
        description: "Please select at least one property to submit.",
        variant: "destructive",
      });
      return;
    }

    if (!agentAgencyInfo.agentId) {
      toast({
        title: "Missing Agent Information",
        description: "Unable to submit without agent information.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create property_agency_submissions records directly
      const submissionRecords = selectedProperties.map(propertyId => ({
        client_id: clientData.id,
        property_id: propertyId,
        agent_id: agentAgencyInfo.agentId,
        agency_id: agentAgencyInfo.agencyId,
        status: 'submitted'
      }));

      const { error: submissionError } = await clientSupabase
        .from('property_agency_submissions')
        .insert(submissionRecords);

      if (submissionError) throw submissionError;

      // Update property statuses to indicate they've been submitted
      const { error: updateError } = await clientSupabase
        .from('client_properties')
        .update({ 
          status: 'submitted'
        })
        .in('id', selectedProperties);

      if (updateError) throw updateError;

      toast({
        title: "Properties Submitted Successfully",
        description: `${selectedProperties.length} ${selectedProperties.length === 1 ? 'property' : 'properties'} submitted to ${agentAgencyInfo.agencyName}.`,
      });

      setSelectedProperties([]);
      onSubmissionComplete();
      onClose();

    } catch (error: any) {
      console.error('Submission error:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit properties. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedProperties([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-secura-teal" />
            Submit to {agentAgencyInfo.agencyName}
          </DialogTitle>
          <DialogDescription>
            Select properties from your portfolio to submit to {agentAgencyInfo.agencyName}
            {agentAgencyInfo.agentName && ` via ${agentAgencyInfo.agentName}`}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {availableProperties.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Properties Available</h3>
              <p className="text-gray-600">
                You don't have any properties in your portfolio to submit.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {availableProperties.map((property) => (
                  <Card key={property.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id={`property-${property.id}`}
                          checked={selectedProperties.includes(property.id)}
                          onCheckedChange={() => handlePropertyToggle(property.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-medium text-gray-900 truncate">{property.title}</h3>
                              <p className="text-gray-500 truncate">{property.location}</p>
                            </div>
                            <Badge variant="outline" className="ml-2">
                              {property.property_type}
                            </Badge>
                          </div>
                          
                          {(property.bedrooms || property.bathrooms || property.area_sqft) && (
                            <div className="flex gap-4 text-sm text-gray-600">
                              {property.bedrooms && <span>{property.bedrooms} bed</span>}
                              {property.bathrooms && <span>{property.bathrooms} bath</span>}
                              {property.area_sqft && <span>{property.area_sqft} sqft</span>}
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-500 mt-2">
                            Added: {new Date(property.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-gray-600">
                  {selectedProperties.length} of {availableProperties.length} properties selected
                </div>
                <div className="space-x-2">
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={selectedProperties.length === 0 || isSubmitting}
                    className="bg-secura-lime hover:bg-secura-lime/90 text-secura-teal"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Submitting...' : `Submit ${selectedProperties.length} ${selectedProperties.length === 1 ? 'Property' : 'Properties'}`}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PropertySubmissionModal;