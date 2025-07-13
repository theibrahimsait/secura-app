import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { clientSupabase } from '@/lib/client-supabase';
import { logSubmissionAction } from '@/lib/audit-logger';
import { type AgencyContext } from '@/hooks/useAgencyContext';
import { Send, Building2, X, Plus } from 'lucide-react';
import {
  FloatingPanelRoot,
  FloatingPanelTrigger,
  FloatingPanelContent,
  FloatingPanelBody,
  FloatingPanelFooter,
  FloatingPanelCloseButton,
} from '@/components/ui/floating-panel';

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

interface PropertySubmissionFloatingPanelProps {
  properties: Property[];
  clientData: ClientData;
  agentAgencyInfo: AgencyContext;
  onSubmissionComplete: () => void;
  onAddProperty: () => void;
  triggerClassName?: string;
  children: React.ReactNode;
}

const PropertySubmissionFloatingPanel = ({
  properties,
  clientData,
  agentAgencyInfo,
  onSubmissionComplete,
  onAddProperty,
  triggerClassName,
  children
}: PropertySubmissionFloatingPanelProps) => {
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingSubmissions, setExistingSubmissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Load existing submissions for this agency when needed
  useEffect(() => {
    if (agentAgencyInfo.agencyId && existingSubmissions.length === 0) {
      loadExistingSubmissions();
    }
  }, [agentAgencyInfo.agencyId]);

  // Load existing submissions for this agency
  const loadExistingSubmissions = async () => {
    setLoading(true);
    try {
      const { data: submissions, error } = await clientSupabase
        .from('property_agency_submissions')
        .select('property_id')
        .eq('agency_id', agentAgencyInfo.agencyId);

      if (error) {
        console.error('Error loading existing submissions:', error);
        return;
      }

      const submittedPropertyIds = submissions?.map(s => s.property_id) || [];
      setExistingSubmissions(submittedPropertyIds);
    } catch (error) {
      console.error('Error loading existing submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter properties that haven't been submitted to this agency yet
  const availableProperties = properties.filter(property => 
    !existingSubmissions.includes(property.id)
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

      const { data: submissionData, error: submissionError } = await clientSupabase
        .from('property_agency_submissions')
        .insert(submissionRecords)
        .select('id, property_id');

      if (submissionError) throw submissionError;

      // Update property statuses to indicate they've been submitted
      const { error: updateError } = await clientSupabase
        .from('client_properties')
        .update({ 
          status: 'submitted'
        })
        .in('id', selectedProperties);

      if (updateError) throw updateError;

      // Log audit events for each submitted property
      if (submissionData) {
        for (const submission of submissionData) {
          await logSubmissionAction({
            submissionId: submission.id,
            actorType: 'client',
            actorId: clientData.id,
            action: 'submitted'
          });
        }
      }

      toast({
        title: "Properties Submitted Successfully",
        description: `${selectedProperties.length} ${selectedProperties.length === 1 ? 'property' : 'properties'} submitted to ${agentAgencyInfo.agencyName}.`,
      });

      setSelectedProperties([]);
      onSubmissionComplete();

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

  return (
    <FloatingPanelRoot>
      <FloatingPanelTrigger
        title={`Submit to ${agentAgencyInfo.agencyName}`}
        className={`${triggerClassName} flex items-center justify-center gap-2`}
      >
        {children}
      </FloatingPanelTrigger>
      <FloatingPanelContent className="max-w-md">
        <FloatingPanelBody className="max-h-96 overflow-y-auto">
          <div className="space-y-4">
            <div className="text-center pb-2">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-secura-teal" />
                <h3 className="font-semibold text-foreground">Submit to {agentAgencyInfo.agencyName}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Select properties to submit{agentAgencyInfo.agentName && ` via ${agentAgencyInfo.agentName}`}
              </p>
            </div>

            {loading ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-secura-teal mx-auto mb-3"></div>
                <p className="text-sm text-muted-foreground">Loading properties...</p>
              </div>
            ) : availableProperties.length === 0 ? (
              <div className="text-center py-6">
                <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <h3 className="font-medium text-foreground mb-2">No Properties Available</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {properties.length === 0 
                    ? "Add properties to your portfolio first."
                    : "All properties already submitted to this agency."
                  }
                </p>
                <Button
                  onClick={onAddProperty}
                  size="sm"
                  className="bg-secura-teal hover:bg-secura-moss text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Property
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {availableProperties.map((property) => (
                    <Card key={property.id} className="cursor-pointer hover:shadow-sm transition-shadow">
                      <CardContent className="p-3">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id={`property-${property.id}`}
                            checked={selectedProperties.includes(property.id)}
                            onCheckedChange={() => handlePropertyToggle(property.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm text-foreground truncate">{property.title}</h4>
                                <p className="text-xs text-muted-foreground truncate">{property.location}</p>
                              </div>
                              <Badge variant="outline" className="ml-2 text-xs">
                                {property.property_type}
                              </Badge>
                            </div>
                            
                            {(property.bedrooms || property.bathrooms || property.area_sqft) && (
                              <div className="flex gap-3 text-xs text-muted-foreground">
                                {property.bedrooms && <span>{property.bedrooms} bed</span>}
                                {property.bathrooms && <span>{property.bathrooms} bath</span>}
                                {property.area_sqft && <span>{property.area_sqft} sqft</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="text-center text-xs text-muted-foreground pt-2 border-t">
                  {selectedProperties.length} of {availableProperties.length} properties selected
                </div>
              </>
            )}
          </div>
        </FloatingPanelBody>
        
        {availableProperties.length > 0 && (
          <FloatingPanelFooter className="justify-between">
            <FloatingPanelCloseButton />
            <Button
              onClick={handleSubmit}
              disabled={selectedProperties.length === 0 || isSubmitting}
              size="sm"
              className="bg-secura-lime hover:bg-secura-lime/90 text-secura-teal"
            >
              <Send className="w-3 h-3 mr-2" />
              {isSubmitting ? 'Submitting...' : `Submit ${selectedProperties.length || ''}`}
            </Button>
          </FloatingPanelFooter>
        )}
      </FloatingPanelContent>
    </FloatingPanelRoot>
  );
};

export default PropertySubmissionFloatingPanel;