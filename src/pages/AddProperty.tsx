import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { clientSupabase } from '@/lib/client-supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Upload, FileText, Shield, Home, FileCheck, Zap } from 'lucide-react';
import ProgressIndicator from '@/components/ui/progress-indicator';

interface ClientData {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string;
  agent_id: string | null;
  agency_id: string | null;
  session_token?: string;
}

type PropertyType = 'apartment' | 'villa' | 'townhouse' | 'penthouse' | 'studio' | 'office' | 'retail' | 'warehouse' | 'land';

interface DocumentFile {
  file: File;
  type: 'title_deed' | 'power_of_attorney' | 'noc' | 'ejari' | 'dewa_bill' | 'other';
}

const AddProperty = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Form state
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType | ''>('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [areaSqft, setAreaSqft] = useState('');
  const [description, setDescription] = useState('');
  
  // Document upload state
  const [titleDeedFile, setTitleDeedFile] = useState<File | null>(null);
  const [poaFile, setPoaFile] = useState<File | null>(null);
  const [nocFile, setNocFile] = useState<File | null>(null);
  const [ejariFile, setEjariFile] = useState<File | null>(null);
  const [dewaFile, setDewaFile] = useState<File | null>(null);
  const [otherFiles, setOtherFiles] = useState<File[]>([]);

  React.useEffect(() => {
    const storedData = localStorage.getItem('client_data');
    if (!storedData) {
      navigate('/client/login');
      return;
    }
    setClientData(JSON.parse(storedData));
  }, [navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    switch (docType) {
      case 'title_deed':
        setTitleDeedFile(files[0]);
        break;
      case 'power_of_attorney':
        setPoaFile(files[0]);
        break;
      case 'noc':
        setNocFile(files[0]);
        break;
      case 'ejari':
        setEjariFile(files[0]);
        break;
      case 'dewa_bill':
        setDewaFile(files[0]);
        break;
      case 'other':
        setOtherFiles(Array.from(files));
        break;
    }
  };

  const uploadDocument = async (file: File, propertyId: string, docType: string) => {
    console.log(`Starting upload for ${docType} document. Property ID: ${propertyId}, File: ${file.name}`);
    
    // Sanitize file name to remove unsafe characters for storage
    const sanitizedFileName = file.name
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_\-.]/g, '')
      .toLowerCase();
    
    const fileName = `${propertyId}/${Date.now()}-${sanitizedFileName}`;
    console.log(`Sanitized file name: ${file.name} -> ${sanitizedFileName}`);
    
    const { error: uploadError } = await supabase.storage
      .from('property-documents')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError);
      return false;
    }

    console.log(`File uploaded to storage successfully: ${fileName}`);

    // Create document record
    const { error: docError } = await clientSupabase
      .from('property_documents')
      .insert({
        property_id: propertyId,
        client_property_id: propertyId,
        client_id: clientData!.id,
        document_type: docType as any,
        file_name: file.name,
        file_path: fileName,
        mime_type: file.type,
        file_size: file.size
      });

    if (docError) {
      console.error('Error creating document record in database:', docError);
      return false;
    }

    console.log(`Document record created successfully for ${docType}`);
    return true;
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(title && location && propertyType);
      case 2:
        return true; // Optional fields
      case 3:
        return !!titleDeedFile; // Title deed is required
      default:
        return false;
    }
  };

  const canContinue = validateStep(currentStep);

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!clientData) {
      toast({
        title: "Error",
        description: "Client data not found. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    if (!validateStep(3)) {
      toast({
        title: "Title Deed Required",
        description: "Please upload the title deed document",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const propertyData = {
        client_id: clientData.id,
        title,
        location,
        property_type: propertyType as PropertyType,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseInt(bathrooms) : null,
        area_sqft: areaSqft ? parseInt(areaSqft) : null,
        details: description ? { description } : null,
        status: 'in_portfolio'
      };

      const { data: property, error: propertyError } = await clientSupabase
        .from('client_properties')
        .insert(propertyData)
        .select()
        .single();

      if (propertyError) {
        console.error('Property creation error:', propertyError);
        throw propertyError;
      }

      // Upload documents
      const documentUploads: Promise<boolean>[] = [];

      documentUploads.push(uploadDocument(titleDeedFile!, property.id, 'title_deed'));

      if (poaFile) {
        documentUploads.push(uploadDocument(poaFile, property.id, 'power_of_attorney'));
      }
      if (nocFile) {
        documentUploads.push(uploadDocument(nocFile, property.id, 'noc'));
      }
      if (ejariFile) {
        documentUploads.push(uploadDocument(ejariFile, property.id, 'ejari'));
      }
      if (dewaFile) {
        documentUploads.push(uploadDocument(dewaFile, property.id, 'dewa_bill'));
      }

      for (const file of otherFiles) {
        documentUploads.push(uploadDocument(file, property.id, 'other'));
      }

      const uploadResults = await Promise.all(documentUploads);
      const failedUploads = uploadResults.filter(result => !result).length;

      if (failedUploads > 0) {
        toast({
          title: "Some Documents Failed to Upload",
          description: `${failedUploads} documents failed to upload, but the property was created successfully.`,
          variant: "destructive",
        });
      }

      toast({
        title: "Property Added Successfully",
        description: `${title} has been added to your portfolio`,
      });

      navigate('/client/dashboard');
    } catch (error) {
      console.error('Error adding property:', error);
      toast({
        title: "Error Adding Property",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/client/dashboard');
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "Basic Information";
      case 2: return "Property Details"; 
      case 3: return "Document Upload";
      default: return "Property Details";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1: return "Tell us about your property";
      case 2: return "Add additional details";
      case 3: return "Upload required documents";
      default: return "Add a property to your portfolio";
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Property Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Modern 3BR Apartment in Downtown"
                  required
                />
              </div>
              <div>
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Dubai Marina, Dubai"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="property-type">Property Type *</Label>
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
              <div>
                <Label htmlFor="area">Area (sqft)</Label>
                <Input
                  id="area"
                  type="number"
                  value={areaSqft}
                  onChange={(e) => setAreaSqft(e.target.value)}
                  placeholder="e.g., 1200"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Select value={bedrooms} onValueChange={setBedrooms}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bedrooms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Studio</SelectItem>
                    <SelectItem value="1">1 Bedroom</SelectItem>
                    <SelectItem value="2">2 Bedrooms</SelectItem>
                    <SelectItem value="3">3 Bedrooms</SelectItem>
                    <SelectItem value="4">4 Bedrooms</SelectItem>
                    <SelectItem value="5">5+ Bedrooms</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Select value={bathrooms} onValueChange={setBathrooms}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bathrooms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Bathroom</SelectItem>
                    <SelectItem value="2">2 Bathrooms</SelectItem>
                    <SelectItem value="3">3 Bathrooms</SelectItem>
                    <SelectItem value="4">4 Bathrooms</SelectItem>
                    <SelectItem value="5">5+ Bathrooms</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Additional Details</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Any additional information about the property..."
                rows={4}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {/* Title Deed - Mandatory */}
            <div className="p-4 border-2 border-red-200 rounded-lg bg-red-50">
              <div className="flex items-center mb-3">
                <FileCheck className="w-5 h-5 text-red-600 mr-2" />
                <Label htmlFor="title-deed" className="text-red-700 font-medium">
                  Title Deed * (Required)
                </Label>
              </div>
              <Input
                id="title-deed"
                type="file"
                onChange={(e) => handleFileChange(e, 'title_deed')}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                required
                className="mb-2"
              />
              {titleDeedFile && (
                <div className="flex items-center text-sm text-green-700 bg-green-50 p-2 rounded">
                  <Upload className="w-4 h-4 mr-2" />
                  <span className="font-medium">{titleDeedFile.name}</span>
                  <span className="ml-2 text-green-600">
                    ({(titleDeedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              )}
            </div>

            {/* Power of Attorney - Optional */}
            <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
              <div className="flex items-center mb-3">
                <Shield className="w-5 h-5 text-blue-600 mr-2" />
                <Label htmlFor="poa" className="text-blue-700 font-medium">
                  Power of Attorney
                </Label>
              </div>
              <Input
                id="poa"
                type="file"
                onChange={(e) => handleFileChange(e, 'power_of_attorney')}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="mb-2"
              />
              {poaFile && (
                <div className="flex items-center text-sm text-green-700 bg-green-50 p-2 rounded">
                  <Upload className="w-4 h-4 mr-2" />
                  <span className="font-medium">{poaFile.name}</span>
                  <span className="ml-2 text-green-600">
                    ({(poaFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              )}
            </div>

            {/* NOC - Optional */}
            <div className="p-4 border border-purple-200 rounded-lg bg-purple-50">
              <div className="flex items-center mb-3">
                <FileText className="w-5 h-5 text-purple-600 mr-2" />
                <Label htmlFor="noc" className="text-purple-700 font-medium">
                  No Objection Certificate (NOC)
                </Label>
              </div>
              <Input
                id="noc"
                type="file"
                onChange={(e) => handleFileChange(e, 'noc')}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="mb-2"
              />
              {nocFile && (
                <div className="flex items-center text-sm text-green-700 bg-green-50 p-2 rounded">
                  <Upload className="w-4 h-4 mr-2" />
                  <span className="font-medium">{nocFile.name}</span>
                  <span className="ml-2 text-green-600">
                    ({(nocFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              )}
            </div>

            {/* Ejari - Optional */}
            <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
              <div className="flex items-center mb-3">
                <Home className="w-5 h-5 text-orange-600 mr-2" />
                <Label htmlFor="ejari" className="text-orange-700 font-medium">
                  Ejari/Rental Agreement
                </Label>
              </div>
              <Input
                id="ejari"
                type="file"
                onChange={(e) => handleFileChange(e, 'ejari')}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="mb-2"
              />
              {ejariFile && (
                <div className="flex items-center text-sm text-green-700 bg-green-50 p-2 rounded">
                  <Upload className="w-4 h-4 mr-2" />
                  <span className="font-medium">{ejariFile.name}</span>
                  <span className="ml-2 text-green-600">
                    ({(ejariFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              )}
            </div>

            {/* DEWA Bill - Optional */}
            <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
              <div className="flex items-center mb-3">
                <Zap className="w-5 h-5 text-yellow-600 mr-2" />
                <Label htmlFor="dewa" className="text-yellow-700 font-medium">
                  DEWA Bill
                </Label>
              </div>
              <Input
                id="dewa"
                type="file"
                onChange={(e) => handleFileChange(e, 'dewa_bill')}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="mb-2"
              />
              {dewaFile && (
                <div className="flex items-center text-sm text-green-700 bg-green-50 p-2 rounded">
                  <Upload className="w-4 h-4 mr-2" />
                  <span className="font-medium">{dewaFile.name}</span>
                  <span className="ml-2 text-green-600">
                    ({(dewaFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              )}
            </div>

            {/* Other Documents - Optional */}
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex items-center mb-3">
                <Plus className="w-5 h-5 text-gray-600 mr-2" />
                <Label htmlFor="other-docs" className="text-gray-700 font-medium">
                  Other Supporting Documents
                </Label>
              </div>
              <Input
                id="other-docs"
                type="file"
                multiple
                onChange={(e) => handleFileChange(e, 'other')}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="mb-2"
              />
              <p className="text-sm text-gray-600 mb-2">
                Upload any additional documents (floor plans, photos, etc.)
              </p>
              {otherFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Selected files:</p>
                  {otherFiles.map((file, index) => (
                    <div key={index} className="flex items-center text-sm text-green-700 bg-green-50 p-2 rounded">
                      <Upload className="w-4 h-4 mr-2" />
                      <span className="font-medium">{file.name}</span>
                      <span className="ml-2 text-green-600">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Button
              variant="ghost"
              onClick={handleBackToDashboard}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-xl font-bold text-secura-black">Add New Property</h1>
              <p className="text-sm text-gray-600">Step {currentStep} of 3 - {getStepTitle()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              {getStepTitle()}
            </CardTitle>
            <CardDescription>
              {getStepDescription()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {renderStepContent()}
            
            {/* Progress Indicator */}
            <div className="flex justify-center pt-6">
              <ProgressIndicator
                step={currentStep}
                totalSteps={3}
                onNext={handleNext}
                onBack={handleBack}
                onSubmit={handleSubmit}
                isLoading={loading}
                canContinue={canContinue}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AddProperty;
