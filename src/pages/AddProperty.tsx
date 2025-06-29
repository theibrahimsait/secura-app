
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, X, Home, FileText } from 'lucide-react';

interface PropertyForm {
  title: string;
  property_type: string;
  location: string;
  bedrooms: number;
  bathrooms: number;
  area_sqft: number;
  details: string;
}

interface PropertyDocument {
  file: File;
  type: string;
}

const AddProperty = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<PropertyForm>({
    title: '',
    property_type: '',
    location: '',
    bedrooms: 0,
    bathrooms: 0,
    area_sqft: 0,
    details: '',
  });
  
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [clientData, setClientData] = useState<any>(null);

  useEffect(() => {
    // Get client data from localStorage
    const storedClientData = localStorage.getItem('client_data');
    if (!storedClientData) {
      navigate('/client/login');
      return;
    }
    
    const client = JSON.parse(storedClientData);
    setClientData(client);

    // Check if onboarding is completed
    if (!client.onboarding_completed) {
      navigate('/client/onboarding');
      return;
    }
  }, [navigate]);

  const handleInputChange = (field: keyof PropertyForm, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const files = Array.from(e.target.files || []);
    const newDocs = files.map(file => ({ file, type }));
    setDocuments(prev => [...prev, ...newDocs]);
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientData) {
      toast({
        title: "Session Error",
        description: "Please log in again.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.title || !formData.property_type || !formData.location) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create property record
      const { data: property, error: propertyError } = await supabase
        .from('client_properties')
        .insert({
          client_id: clientData.id,
          title: formData.title,
          property_type: formData.property_type as any,
          location: formData.location,
          bedrooms: formData.bedrooms || null,
          bathrooms: formData.bathrooms || null,
          area_sqft: formData.area_sqft || null,
          details: formData.details ? { description: formData.details } : null,
          status: 'draft',
        })
        .select()
        .single();

      if (propertyError) throw propertyError;

      // Upload property documents
      if (documents.length > 0) {
        for (const doc of documents) {
          const fileName = `${property.id}/${Date.now()}_${doc.file.name}`;
          
          // For demo purposes, store document info without actual file upload
          const { error: docError } = await supabase
            .from('property_documents')
            .insert({
              property_id: property.id,
              client_id: clientData.id,
              document_type: doc.type as any,
              file_name: doc.file.name,
              file_path: fileName,
              file_size: doc.file.size,
              mime_type: doc.file.type,
            });

          if (docError) throw docError;
        }
      }

      toast({
        title: "Property Added Successfully!",
        description: "Your property has been saved as a draft. You can submit it to an agency from your dashboard.",
      });

      navigate('/client/dashboard');

    } catch (error: any) {
      console.error('Error adding property:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add property. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!clientData) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/client/dashboard')}
                className="p-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-secura-black">Add New Property</h1>
                <p className="text-sm text-muted-foreground">Fill in your property details and upload documents</p>
              </div>
            </div>
            <img 
              src="https://ngmwdebxyofxudrbesqs.supabase.co/storage/v1/object/public/nullstack//securaa.svg" 
              alt="Secura" 
              className="h-8 w-auto"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Property Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Home className="w-5 h-5 mr-2" />
                Property Details
              </CardTitle>
              <CardDescription>
                Provide basic information about your property
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Label htmlFor="title">Property Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="e.g., Modern 2BR Apartment in Downtown"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="property_type">Property Type *</Label>
                  <Select onValueChange={(value) => handleInputChange('property_type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select property type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="villa">Villa</SelectItem>
                      <SelectItem value="townhouse">Townhouse</SelectItem>
                      <SelectItem value="penthouse">Penthouse</SelectItem>
                      <SelectItem value="studio">Studio</SelectItem>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="warehouse">Warehouse</SelectItem>
                      <SelectItem value="land">Land</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="e.g., Dubai Marina, Dubai"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="bedrooms">Bedrooms</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    min="0"
                    value={formData.bedrooms || ''}
                    onChange={(e) => handleInputChange('bedrooms', parseInt(e.target.value) || 0)}
                    placeholder="Number of bedrooms"
                  />
                </div>

                <div>
                  <Label htmlFor="bathrooms">Bathrooms</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    min="0"
                    value={formData.bathrooms || ''}
                    onChange={(e) => handleInputChange('bathrooms', parseInt(e.target.value) || 0)}
                    placeholder="Number of bathrooms"
                  />
                </div>

                <div>
                  <Label htmlFor="area_sqft">Area (sq ft)</Label>
                  <Input
                    id="area_sqft"
                    type="number"
                    min="0"
                    value={formData.area_sqft || ''}
                    onChange={(e) => handleInputChange('area_sqft', parseInt(e.target.value) || 0)}
                    placeholder="Property area in square feet"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="details">Additional Details</Label>
                <Textarea
                  id="details"
                  value={formData.details}
                  onChange={(e) => handleInputChange('details', e.target.value)}
                  placeholder="Describe your property, amenities, special features, etc."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Property Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Property Documents
              </CardTitle>
              <CardDescription>
                Upload relevant documents for your property
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="title_deed">Title Deed</Label>
                  <Input
                    id="title_deed"
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={(e) => handleDocumentUpload(e, 'title_deed')}
                    className="cursor-pointer"
                  />
                </div>

                <div>
                  <Label htmlFor="sale_agreement">Sale Agreement</Label>
                  <Input
                    id="sale_agreement"
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={(e) => handleDocumentUpload(e, 'sale_agreement')}
                    className="cursor-pointer"
                  />
                </div>

                <div>
                  <Label htmlFor="valuation_report">Valuation Report</Label>
                  <Input
                    id="valuation_report"
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={(e) => handleDocumentUpload(e, 'valuation_report')}
                    className="cursor-pointer"
                  />
                </div>

                <div>
                  <Label htmlFor="other_docs">Other Documents</Label>
                  <Input
                    id="other_docs"
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={(e) => handleDocumentUpload(e, 'other')}
                    className="cursor-pointer"
                  />
                </div>
              </div>

              {documents.length > 0 && (
                <div className="space-y-2">
                  <Label>Uploaded Documents:</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{doc.file.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {doc.type.replace('_', ' ')} • {(doc.file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocument(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/client/dashboard')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-secura-lime hover:bg-secura-lime/90 text-secura-teal"
            >
              {loading ? 'Saving...' : 'Save Property'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default AddProperty;
