import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CircleCheck, ArrowLeft, Plus, Upload, FileText, Shield, Home, FileCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { clientSupabase } from '@/lib/client-supabase';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FloatingPanelRoot,
  FloatingPanelTrigger,
  FloatingPanelContent,
  FloatingPanelHeader,
  FloatingPanelBody,
  FloatingPanelFooter,
} from '@/components/ui/floating-panel';

type PropertyType = 'apartment' | 'villa' | 'townhouse' | 'penthouse' | 'studio' | 'office' | 'retail' | 'warehouse' | 'land';

interface ClientData {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string;
  agent_id: string | null;
  agency_id: string | null;
  session_token?: string;
}

interface AddPropertyModalProps {
  clientData: ClientData;
  onSuccess: () => void;
}

const AddPropertyModal: React.FC<AddPropertyModalProps> = ({ clientData, onSuccess }) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isExpanded, setIsExpanded] = useState(true);
  const [loading, setLoading] = useState(false);

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
    const sanitizedFileName = file.name
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_\-.]/g, '')
      .toLowerCase();
    
    const fileName = `${propertyId}/${Date.now()}-${sanitizedFileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('property-documents')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError);
      return false;
    }

    const { error: docError } = await clientSupabase
      .from('property_documents')
      .insert({
        property_id: propertyId,
        client_property_id: propertyId,
        client_id: clientData.id,
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

    return true;
  };

  const handleContinue = () => {
    if (step === 1) {
      if (!title || !location || !propertyType) {
        toast({
          title: "Required Fields Missing",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }
    }

    if (step === 2) {
      if (!titleDeedFile) {
        toast({
          title: "Title Deed Required",
          description: "Please upload the title deed document",
          variant: "destructive",
        });
        return;
      }
    }

    if (step < 3) {
      setStep(step + 1);
      setIsExpanded(false);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setIsExpanded(true);
    }
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
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
        throw propertyError;
      }

      // Upload documents
      const documentUploads: Promise<boolean>[] = [];
      documentUploads.push(uploadDocument(titleDeedFile!, property.id, 'title_deed'));

      if (poaFile) documentUploads.push(uploadDocument(poaFile, property.id, 'power_of_attorney'));
      if (nocFile) documentUploads.push(uploadDocument(nocFile, property.id, 'noc'));
      if (ejariFile) documentUploads.push(uploadDocument(ejariFile, property.id, 'ejari'));
      if (dewaFile) documentUploads.push(uploadDocument(dewaFile, property.id, 'dewa_bill'));

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
      } else {
        toast({
          title: "Property Added Successfully",
          description: `${title} has been added to your portfolio`,
        });
      }

      onSuccess();
      
      // Reset form
      setStep(1);
      setIsExpanded(true);
      setTitle('');
      setLocation('');
      setPropertyType('');
      setBedrooms('');
      setBathrooms('');
      setAreaSqft('');
      setDescription('');
      setTitleDeedFile(null);
      setPoaFile(null);
      setNocFile(null);
      setEjariFile(null);
      setDewaFile(null);
      setOtherFiles([]);
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

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="title" className="text-sm font-medium text-foreground">Property Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Modern 3BR Apartment in Downtown"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="location" className="text-sm font-medium text-foreground">Location *</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Dubai Marina, Dubai"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="property-type" className="text-sm font-medium text-foreground">Property Type *</Label>
                <Select value={propertyType} onValueChange={(value: PropertyType) => setPropertyType(value)}>
                  <SelectTrigger className="mt-1">
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
                <Label htmlFor="area" className="text-sm font-medium text-foreground">Area (sqft)</Label>
                <Input
                  id="area"
                  type="number"
                  value={areaSqft}
                  onChange={(e) => setAreaSqft(e.target.value)}
                  placeholder="e.g., 1200"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bedrooms" className="text-sm font-medium text-foreground">Bedrooms</Label>
                <Select value={bedrooms} onValueChange={setBedrooms}>
                  <SelectTrigger className="mt-1">
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
                <Label htmlFor="bathrooms" className="text-sm font-medium text-foreground">Bathrooms</Label>
                <Select value={bathrooms} onValueChange={setBathrooms}>
                  <SelectTrigger className="mt-1">
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
              <Label htmlFor="description" className="text-sm font-medium text-foreground">Additional Details</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Any additional information about the property..."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <FileText className="w-8 h-8 mx-auto mb-2 text-secura-teal" />
              <h3 className="text-lg font-semibold text-foreground">Property Documents</h3>
              <p className="text-sm text-muted-foreground">Upload required and optional documents</p>
            </div>

            {/* Title Deed - Mandatory */}
            <div className="p-4 glass-card border-2 border-destructive/20">
              <div className="flex items-center mb-3">
                <FileCheck className="w-5 h-5 text-destructive mr-2" />
                <Label htmlFor="title-deed" className="text-destructive font-medium">
                  Title Deed * (Required)
                </Label>
              </div>
              <Input
                id="title-deed"
                type="file"
                onChange={(e) => handleFileChange(e, 'title_deed')}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="mb-2"
              />
              {titleDeedFile && (
                <div className="flex items-center text-sm text-secura-teal glass-light p-2 rounded">
                  <Upload className="w-4 h-4 mr-2" />
                  <span className="font-medium">{titleDeedFile.name}</span>
                  <span className="ml-2 text-muted-foreground">
                    ({(titleDeedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              )}
            </div>

            {/* Optional Documents */}
            <div className="grid grid-cols-1 gap-4">
              {/* Power of Attorney */}
              <div className="p-3 glass-light rounded-lg">
                <div className="flex items-center mb-2">
                  <Shield className="w-4 h-4 text-secura-teal mr-2" />
                  <Label htmlFor="poa" className="text-foreground text-sm">Power of Attorney</Label>
                </div>
                <Input
                  id="poa"
                  type="file"
                  onChange={(e) => handleFileChange(e, 'power_of_attorney')}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="text-xs"
                />
                {poaFile && (
                  <div className="flex items-center text-xs text-secura-teal mt-1">
                    <Upload className="w-3 h-3 mr-1" />
                    <span>{poaFile.name}</span>
                  </div>
                )}
              </div>

              {/* NOC */}
              <div className="p-3 glass-light rounded-lg">
                <div className="flex items-center mb-2">
                  <FileText className="w-4 h-4 text-secura-teal mr-2" />
                  <Label htmlFor="noc" className="text-foreground text-sm">NOC</Label>
                </div>
                <Input
                  id="noc"
                  type="file"
                  onChange={(e) => handleFileChange(e, 'noc')}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="text-xs"
                />
                {nocFile && (
                  <div className="flex items-center text-xs text-secura-teal mt-1">
                    <Upload className="w-3 h-3 mr-1" />
                    <span>{nocFile.name}</span>
                  </div>
                )}
              </div>

              {/* Ejari */}
              <div className="p-3 glass-light rounded-lg">
                <div className="flex items-center mb-2">
                  <Home className="w-4 h-4 text-secura-teal mr-2" />
                  <Label htmlFor="ejari" className="text-foreground text-sm">Ejari</Label>
                </div>
                <Input
                  id="ejari"
                  type="file"
                  onChange={(e) => handleFileChange(e, 'ejari')}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="text-xs"
                />
                {ejariFile && (
                  <div className="flex items-center text-xs text-secura-teal mt-1">
                    <Upload className="w-3 h-3 mr-1" />
                    <span>{ejariFile.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 text-center">
            <div className="mx-auto w-16 h-16 bg-secura-lime/20 rounded-full flex items-center justify-center mb-4">
              <CircleCheck className="w-8 h-8 text-secura-teal" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Review Your Property</h3>
              <p className="text-sm text-muted-foreground mb-6">Please review the details before submitting</p>
              
              <div className="glass-light p-4 rounded-lg text-left space-y-3">
                <div>
                  <span className="text-sm font-medium text-foreground">Property: </span>
                  <span className="text-sm text-muted-foreground">{title}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground">Location: </span>
                  <span className="text-sm text-muted-foreground">{location}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground">Type: </span>
                  <span className="text-sm text-muted-foreground">{propertyType}</span>
                </div>
                {bedrooms && (
                  <div>
                    <span className="text-sm font-medium text-foreground">Bedrooms: </span>
                    <span className="text-sm text-muted-foreground">{bedrooms}</span>
                  </div>
                )}
                {bathrooms && (
                  <div>
                    <span className="text-sm font-medium text-foreground">Bathrooms: </span>
                    <span className="text-sm text-muted-foreground">{bathrooms}</span>
                  </div>
                )}
                {areaSqft && (
                  <div>
                    <span className="text-sm font-medium text-foreground">Area: </span>
                    <span className="text-sm text-muted-foreground">{areaSqft} sqft</span>
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium text-foreground">Documents: </span>
                  <span className="text-sm text-muted-foreground">
                    {[titleDeedFile, poaFile, nocFile, ejariFile, dewaFile, ...otherFiles].filter(Boolean).length} files
                  </span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <FloatingPanelRoot>
      <FloatingPanelTrigger title="Add New Property" className="glass-card hover:glass-medium border-secura-teal/30 text-foreground w-full">
        <Plus className="w-4 h-4 mr-2" />
        Add New Property
      </FloatingPanelTrigger>
      
      <FloatingPanelContent className="w-full max-w-2xl glass-card border-secura-teal/20">
        <FloatingPanelHeader className="border-b border-border/30 pb-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground">Add New Property</h2>
            <p className="text-sm text-muted-foreground">Add a property to your portfolio</p>
          </div>
        </FloatingPanelHeader>

        <FloatingPanelBody className="px-6 py-6">
          {/* Progress Indicator */}
          <div className="flex flex-col items-center justify-center gap-8 mb-8">
            <div className="flex items-center gap-6 relative">
              {[1, 2, 3].map((dot) => (
                <div
                  key={dot}
                  className={cn(
                    "w-2 h-2 rounded-full relative z-10",
                    dot <= step ? "bg-secura-teal" : "bg-muted"
                  )}
                />
              ))}
              
              <motion.div
                initial={{ width: '12px', height: "24px", x: 0 }}
                animate={{
                  width: step === 1 ? '24px' : step === 2 ? '60px' : '96px',
                  x: 0
                }}
                className="absolute -left-[8px] -top-[8px] -translate-y-1/2 h-3 bg-secura-teal rounded-full"
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                  mass: 0.8,
                  bounce: 0.25,
                  duration: 0.6
                }}
              />
            </div>
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </FloatingPanelBody>

        <FloatingPanelFooter className="border-t border-border/30 pt-4">
          <div className="w-full">
            <motion.div
              className="flex items-center gap-3"
              animate={{
                justifyContent: isExpanded ? 'flex-end' : 'space-between'
              }}
            >
              {!isExpanded && (
                <motion.div
                  initial={{ opacity: 0, width: 0, scale: 0.8 }}
                  animate={{ opacity: 1, width: "auto", scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 15,
                    mass: 0.8,
                    bounce: 0.25,
                    duration: 0.6,
                    opacity: { duration: 0.2 }
                  }}
                >
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    size="sm"
                    className="border-border/30"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                </motion.div>
              )}
              <Button
                onClick={handleContinue}
                variant={step === 3 ? "lime" : "default"}
                disabled={loading}
                className="min-w-[120px]"
              >
                {loading ? (
                  "Processing..."
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    {step === 3 && <CircleCheck className="w-4 h-4" />}
                    {step === 3 ? 'Submit Property' : 'Continue'}
                  </div>
                )}
              </Button>
            </motion.div>
          </div>
        </FloatingPanelFooter>
      </FloatingPanelContent>
    </FloatingPanelRoot>
  );
};

export default AddPropertyModal;