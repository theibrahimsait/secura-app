import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface ClientData {
  id: string;
  agent_id: string | null;
  agency_id: string | null;
}

type PropertyType = 'apartment' | 'villa' | 'townhouse' | 'penthouse' | 'studio' | 'office' | 'retail' | 'warehouse' | 'land';

const AddProperty = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  
  // Property form data
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType | ''>('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [areaSqft, setAreaSqft] = useState('');
  const [description, setDescription] = useState('');

  // Document uploads
  const [titleDeed, setTitleDeed] = useState<File | null>(null);
  const [powerOfAttorney, setPowerOfAttorney] = useState<File | null>(null);
  const [emiratesId, setEmiratesId] = useState<File | null>(null);
  const [passport, setPassport] = useState<File | null>(null);
  const [visa, setVisa] = useState<File | null>(null);
  const [otherDocs, setOtherDocs] = useState<File[]>([]);

  useEffect(() => {
    const storedData = localStorage.getItem('client_data');
    if (!storedData) {
      navigate('/client/login');
      return;
    }
    setClientData(JSON.parse(storedData));
  }, [navigate]);

  const handleFileUpload = (file: File | null, setter: (file: File | null) => void) => {
    if (file && file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File too large",
        description: "Please select a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }
    setter(file);
  };

  const handleMultipleFileUpload = (files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => file.size <= 10 * 1024 * 1024);
    
    if (validFiles.length !== fileArray.length) {
      toast({
        title: "Some files too large",
        description: "Files larger than 10MB were skipped",
        variant: "destructive",
      });
    }
    
    setOtherDocs(prev => [...prev, ...validFiles]);
  };

  const removeOtherDoc = (index: number) => {
    setOtherDocs(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from('property-documents')
      .upload(path, file);

    if (error) throw error;
    return data.path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientData) return;
    
    // Validation
    if (!title.trim() || !location.trim() || !propertyType) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!titleDeed) {
      toast({
        title: "Title Deed Required",
        description: "Title deed document is mandatory for property submission",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Create property record first
      const propertyData = {
        client_id: clientData.id,
        agent_id: clientData.agent_id,
        agency_id: clientData.agency_id,
        title: title.trim(),
        location: location.trim(),
        property_type: propertyType as PropertyType,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseInt(bathrooms) : null,
        area_sqft: areaSqft ? parseInt(areaSqft) : null,
        details: {
          description: description.trim() || null,
        },
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      };

      const { data: property, error: propertyError } = await supabase
        .from('client_properties')
        .insert(propertyData)
        .select()
        .single();

      if (propertyError) throw propertyError;

      // Upload documents
      const documentUploads = [];
      const timestamp = Date.now();
      const propertyId = property.id;

      // Title Deed (mandatory)
      if (titleDeed) {
        const titleDeedPath = `${clientData.id}/${propertyId}/title_deed_${timestamp}.${titleDeed.name.split('.').pop()}`;
        const titleDeedUrl = await uploadFile(titleDeed, titleDeedPath);
        
        documentUploads.push({
          client_id: clientData.id,
          property_id: propertyId,
          document_type: 'title_deed',
          file_name: titleDeed.name,
          file_path: titleDeedUrl,
          file_size: titleDeed.size,
          mime_type: titleDeed.type,
        });
      }

      // Optional documents
      if (powerOfAttorney) {
        const poaPath = `${clientData.id}/${propertyId}/power_of_attorney_${timestamp}.${powerOfAttorney.name.split('.').pop()}`;
        const poaUrl = await uploadFile(powerOfAttorney, poaPath);
        
        documentUploads.push({
          client_id: clientData.id,
          property_id: propertyId,
          document_type: 'power_of_attorney',
          file_name: powerOfAttorney.name,
          file_path: poaUrl,
          file_size: powerOfAttorney.size,
          mime_type: powerOfAttorney.type,
        });
      }

      if (emiratesId) {
        const emiratesIdPath = `${clientData.id}/${propertyId}/emirates_id_${timestamp}.${emiratesId.name.split('.').pop()}`;
        const emiratesIdUrl = await uploadFile(emiratesId, emiratesIdPath);
        
        documentUploads.push({
          client_id: clientData.id,
          property_id: propertyId,
          document_type: 'emirates_id',
          file_name: emiratesId.name,
          file_path: emiratesIdUrl,
          file_size: emiratesId.size,
          mime_type: emiratesId.type,
        });
      }

      if (passport) {
        const passportPath = `${clientData.id}/${propertyId}/passport_${timestamp}.${passport.name.split('.').pop()}`;
        const passportUrl = await uploadFile(passport, passportPath);
        
        documentUploads.push({
          client_id: clientData.id,
          property_id: propertyId,
          document_type: 'passport',
          file_name: passport.name,
          file_path: passportUrl,
          file_size: passport.size,
          mime_type: passport.type,
        });
      }

      if (visa) {
        const visaPath = `${clientData.id}/${propertyId}/visa_${timestamp}.${visa.name.split('.').pop()}`;
        const visaUrl = await uploadFile(visa, visaPath);
        
        documentUploads.push({
          client_id: clientData.id,
          property_id: propertyId,
          document_type: 'visa',
          file_name: visa.name,
          file_path: visaUrl,
          file_size: visa.size,
          mime_type: visa.type,
        });
      }

      // Other documents
      for (let i = 0; i < otherDocs.length; i++) {
        const doc = otherDocs[i];
        const docPath = `${clientData.id}/${propertyId}/other_${timestamp}_${i}.${doc.name.split('.').pop()}`;
        const docUrl = await uploadFile(doc, docPath);
        
        documentUploads.push({
          client_id: clientData.id,
          property_id: propertyId,
          document_type: 'other',
          file_name: doc.name,
          file_path: docUrl,
          file_size: doc.size,
          mime_type: doc.type,
        });
      }

      // Insert all documents
      if (documentUploads.length > 0) {
        const { error: docsError } = await supabase
          .from('property_documents')
          .insert(documentUploads);

        if (docsError) throw docsError;
      }

      toast({
        title: "Property Submitted Successfully",
        description: "Your property has been submitted and is under review",
      });

      navigate('/client/dashboard');

    } catch (error: any) {
      console.error('Error submitting property:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit property. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const FileUploadCard = ({ 
    title, 
    description, 
    file, 
    onFileChange, 
    required = false 
  }: { 
    title: string; 
    description: string; 
    file: File | null; 
    onFileChange: (file: File | null) => void;
    required?: boolean;
  }) => (
    <Card className="border-dashed border-2">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-sm">
            {title} {required && <span className="text-red-500">*</span>}
          </h3>
          {file && <CheckCircle className="w-4 h-4 text-green-500" />}
        </div>
        <p className="text-xs text-gray-600 mb-3">{description}</p>
        
        <div className="space-y-2">
          <Input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={(e) => handleFileUpload(e.target.files?.[0] || null, onFileChange)}
            className="text-xs"
          />
          {file && (
            <div className="flex items-center justify-between p-2 bg-green-50 rounded border">
              <div className="flex items-center">
                <FileText className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-xs text-green-800 truncate">{file.name}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onFileChange(null)}
                className="text-red-600 hover:text-red-800 p-1 h-auto"
              >
                ×
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white shadow-sm border-b p-4 md:hidden">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/client/dashboard')}
            className="mr-3 p-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-secura-black">Add Property</h1>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/client/dashboard')}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-xl font-bold text-secura-black">Add New Property</h1>
              <p className="text-sm text-gray-600">Submit your property for review</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Property Information */}
          <Card>
            <CardHeader>
              <CardTitle>Property Information</CardTitle>
              <CardDescription>Basic details about your property</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Property Title <span className="text-red-500">*</span></Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., 2BR Apartment in Downtown"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="propertyType">Property Type <span className="text-red-500">*</span></Label>
                  <Select value={propertyType} onValueChange={(value: PropertyType) => setPropertyType(value)} required>
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
              </div>

              <div>
                <Label htmlFor="location">Location <span className="text-red-500">*</span></Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Dubai Marina, Dubai"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="bedrooms">Bedrooms</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                    placeholder="e.g., 2"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="bathrooms">Bathrooms</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    value={bathrooms}
                    onChange={(e) => setBathrooms(e.target.value)}
                    placeholder="e.g., 2"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="areaSqft">Area (sq ft)</Label>
                  <Input
                    id="areaSqft"
                    type="number"
                    value={areaSqft}
                    onChange={(e) => setAreaSqft(e.target.value)}
                    placeholder="e.g., 1200"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional details about your property..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Document Uploads */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                Required Documents
              </CardTitle>
              <CardDescription>
                Upload required and optional documents. Files must be under 10MB.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Required Documents */}
              <div>
                <h3 className="font-medium text-sm mb-3 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
                  Required Documents
                </h3>
                <FileUploadCard
                  title="Title Deed"
                  description="Official title deed document for the property"
                  file={titleDeed}
                  onFileChange={setTitleDeed}
                  required={true}
                />
              </div>

              {/* Optional Documents */}
              <div>
                <h3 className="font-medium text-sm mb-3 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-blue-500" />
                  Optional Documents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FileUploadCard
                    title="Power of Attorney"
                    description="If applicable, legal authorization document"
                    file={powerOfAttorney}
                    onFileChange={setPowerOfAttorney}
                  />
                  <FileUploadCard
                    title="Emirates ID"
                    description="Your Emirates ID copy"
                    file={emiratesId}
                    onFileChange={setEmiratesId}
                  />
                  <FileUploadCard
                    title="Passport"
                    description="Your passport copy"
                    file={passport}
                    onFileChange={setPassport}
                  />
                  <FileUploadCard
                    title="Visa"
                    description="Your visa copy"
                    file={visa}
                    onFileChange={setVisa}
                  />
                </div>
              </div>

              {/* Additional Documents */}
              <div>
                <h3 className="font-medium text-sm mb-3">Additional Documents</h3>
                <Card className="border-dashed border-2">
                  <CardContent className="p-4">
                    <Input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => handleMultipleFileUpload(e.target.files)}
                      className="mb-3"
                    />
                    {otherDocs.length > 0 && (
                      <div className="space-y-2">
                        {otherDocs.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded border">
                            <div className="flex items-center">
                              <FileText className="w-4 h-4 text-blue-600 mr-2" />
                              <span className="text-xs text-blue-800 truncate">{doc.name}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeOtherDoc(index)}
                              className="text-red-600 hover:text-red-800 p-1 h-auto"
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/client/dashboard')}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !titleDeed}
              className="bg-secura-lime hover:bg-secura-lime/90 text-secura-teal"
            >
              {loading ? 'Submitting...' : 'Submit Property'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProperty;
