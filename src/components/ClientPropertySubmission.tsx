
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Send, User, Building } from 'lucide-react';

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
  agent_id: string | null;
  agency_id: string | null;
}

interface AgentInfo {
  full_name: string;
  agency: {
    name: string;
  };
}

interface ClientPropertySubmissionProps {
  clientData: ClientData;
  properties: Property[];
  onSubmissionComplete: () => void;
}

const ClientPropertySubmission = ({ clientData, properties, onSubmissionComplete }: ClientPropertySubmissionProps) => {
  const { toast } = useToast();
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (clientData.agent_id) {
      loadAgentInfo();
    }
  }, [clientData.agent_id]);

  const loadAgentInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          full_name,
          agencies!inner (
            name
          )
        `)
        .eq('id', clientData.agent_id)
        .single();

      if (error) throw error;
      
      setAgentInfo({
        full_name: data.full_name,
        agency: data.agencies
      });
    } catch (error) {
      console.error('Error loading agent info:', error);
    }
  };

  const handlePropertySelect = (propertyId: string, checked: boolean) => {
    if (checked) {
      setSelectedProperties([...selectedProperties, propertyId]);
    } else {
      setSelectedProperties(selectedProperties.filter(id => id !== propertyId));
    }
  };

  const handleSubmitToAgency = async () => {
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
      // Update selected properties to submitted status
      const { error } = await supabase
        .from('client_properties')
        .update({ 
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .in('id', selectedProperties);

      if (error) throw error;

      toast({
        title: "Properties Submitted Successfully",
        description: `${selectedProperties.length} properties have been submitted to ${agentInfo?.agency.name}`,
      });

      onSubmissionComplete();
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

  // Only show properties that are in draft status
  const draftProperties = properties.filter(p => p.status === 'draft');

  if (!clientData.agent_id || !agentInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Submit to Agency</CardTitle>
          <CardDescription>No agent assigned</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">You don't have an agent assigned. Please contact support.</p>
        </CardContent>
      </Card>
    );
  }

  if (draftProperties.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Submit to Agency</CardTitle>
          <CardDescription>No properties available for submission</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Add some properties to your portfolio first before submitting to the agency.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Send className="w-5 h-5 mr-2" />
          Submit to Agency
        </CardTitle>
        <CardDescription>
          Submit selected properties to your assigned agent and agency
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Agent and Agency Info */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center space-x-3 mb-2">
            <User className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">Agent: {agentInfo.full_name}</p>
              <p className="text-sm text-blue-700 flex items-center">
                <Building className="w-4 h-4 mr-1" />
                Agency: {agentInfo.agency.name}
              </p>
            </div>
          </div>
        </div>

        {/* Property Selection */}
        <div>
          <h3 className="font-medium mb-3">Select Properties to Submit:</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {draftProperties.map((property) => (
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
                      <Badge variant="secondary">Draft</Badge>
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

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmitToAgency}
            disabled={selectedProperties.length === 0 || submitting}
            className="bg-secura-lime hover:bg-secura-lime/90 text-secura-teal"
          >
            <Send className="w-4 h-4 mr-2" />
            {submitting ? 'Submitting...' : `Submit ${selectedProperties.length} Properties`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientPropertySubmission;
