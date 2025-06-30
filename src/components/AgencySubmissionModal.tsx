
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Send, Building, CheckCircle } from 'lucide-react';

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

interface Agency {
  id: string;
  name: string;
  logo_url?: string;
}

interface AgencySubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientData: {
    id: string;
    agency_id: string | null;
    agent_id: string | null;
  };
  onSubmissionComplete: () => void;
}

const AgencySubmissionModal = ({ isOpen, onClose, clientData, onSubmissionComplete }: AgencySubmissionModalProps) => {
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && clientData.agency_id) {
      loadData();
    }
  }, [isOpen, clientData.agency_id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load agency info
      const { data: agencyData, error: agencyError } = await supabase
        .from('agencies')
        .select('id, name, logo_url')
        .eq('id', clientData.agency_id)
        .single();

      if (agencyError) throw agencyError;
      setAgency(agencyData);

      // Load properties in portfolio that haven't been submitted to this agency
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('client_properties')
        .select('*')
        .eq('client_id', clientData.id)
        .eq('status', 'in_portfolio')
        .order('created_at', { ascending: false });

      if (propertiesError) throw propertiesError;

      // Filter out properties already submitted to this agency
      const { data: existingSubmissions } = await supabase
        .from('property_agency_submissions')
        .select('property_id')
        .eq('client_id', clientData.id)
        .eq('agency_id', clientData.agency_id);

      const submittedPropertyIds = existingSubmissions?.map(sub => sub.property_id) || [];
      const availableProperties = propertiesData?.filter(
        prop => !submittedPropertyIds.includes(prop.id)
      ) || [];

      setProperties(availableProperties);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePropertySelect = (propertyId: string, checked: boolean) => {
    if (checked) {
      setSelectedProperties([...selectedProperties, propertyId]);
    } else {
      setSelectedProperties(selectedProperties.filter(id => id !== propertyId));
    }
  };

  const handleSubmit = async () => {
    if (selectedProperties.length === 0) {
      toast({
        title: "No Properties Selected",
        description: "Please select at least one property to submit",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Create submissions for each selected property
      const submissions = selectedProperties.map(propertyId => ({
        property_id: propertyId,
        client_id: clientData.id,
        agency_id: clientData.agency_id,
        agent_id: clientData.agent_id,
        status: 'submitted'
      }));

      const { error: submissionError } = await supabase
        .from('property_agency_submissions')
        .insert(submissions);

      if (submissionError) throw submissionError;

      // Create agency notifications
      for (const propertyId of selectedProperties) {
        const property = properties.find(p => p.id === propertyId);
        if (property) {
          await supabase
            .from('agency_notifications')
            .insert({
              agency_id: clientData.agency_id,
              agent_id: clientData.agent_id,
              client_id: clientData.id,
              property_id: propertyId,
              type: 'property_submitted',
              title: 'New Property Submitted',
              message: `A client has submitted a new property: ${property.title}`,
              metadata: {
                property_title: property.title,
                property_location: property.location,
                property_type: property.property_type
              }
            });
        }
      }

      toast({
        title: "Properties Submitted Successfully",
        description: `${selectedProperties.length} properties have been submitted to ${agency?.name}`,
      });

      onSubmissionComplete();
      onClose();
    } catch (error) {
      console.error('Error submitting properties:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit properties. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!clientData.agency_id) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Send className="w-5 h-5 mr-2" />
            Submit to Agency
          </DialogTitle>
          <DialogDescription>
            Select properties from your portfolio to submit to the agency
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secura-lime"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Agency Info */}
            {agency && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Building className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">Submitting to: {agency.name}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Property Selection */}
            {properties.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Properties Available</h3>
                <p className="text-gray-600">
                  You don't have any properties in your portfolio available for submission.
                </p>
              </div>
            ) : (
              <div>
                <h3 className="font-medium mb-3">Select Properties to Submit:</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {properties.map((property) => (
                    <div key={property.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id={property.id}
                        checked={selectedProperties.includes(property.id)}
                        onCheckedChange={(checked) => handlePropertySelect(property.id, checked as boolean)}
                      />
                      <div className="flex-1 min-w-0">
                        <label htmlFor={property.id} className="cursor-pointer">
                          <h4 className="font-medium text-gray-900">{property.title}</h4>
                          <p className="text-sm text-gray-600">{property.location}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm text-gray-500 capitalize">{property.property_type}</span>
                            <Badge variant="secondary">In Portfolio</Badge>
                          </div>
                          {(property.bedrooms || property.bathrooms || property.area_sqft) && (
                            <div className="flex gap-4 mt-1 text-sm text-gray-600">
                              {property.bedrooms && <span>{property.bedrooms} bed</span>}
                              {property.bathrooms && <span>{property.bathrooms} bath</span>}
                              {property.area_sqft && <span>{property.area_sqft} sqft</span>}
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            {properties.length > 0 && (
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={selectedProperties.length === 0 || submitting}
                  className="bg-secura-lime hover:bg-secura-lime/90 text-secura-teal"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submitting ? 'Submitting...' : `Submit ${selectedProperties.length} Properties`}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AgencySubmissionModal;
