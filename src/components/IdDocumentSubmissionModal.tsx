import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { clientSupabase } from '@/lib/client-supabase';
import { logSubmissionAction } from '@/lib/audit-logger';
import { type AgencyContext } from '@/hooks/useAgencyContext';
import { UserCheck, FileCheck, AlertCircle, Upload, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ClientData {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string;
}

interface IdDocumentSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientData: ClientData;
  agentAgencyInfo: AgencyContext;
  onSubmissionComplete: () => void;
}

const IdDocumentSubmissionModal = ({
  isOpen,
  onClose,
  clientData,
  agentAgencyInfo,
  onSubmissionComplete
}: IdDocumentSubmissionModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/') || file.type === 'application/pdf';
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      toast({
        title: "Invalid Files",
        description: "Only images and PDF files under 10MB are allowed.",
        variant: "destructive",
      });
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadDocuments = async (submissionId: string) => {
    const uploadPromises = selectedFiles.map(async (file, index) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${submissionId}_${Date.now()}_${index}.${fileExt}`;
      const filePath = `clients/${clientData.id}/id-documents/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await clientSupabase.storage
        .from('property-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save document record to database
      const { error: dbError } = await clientSupabase
        .from('client_documents')
        .insert({
          client_id: clientData.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          document_type: 'identity'
        });

      if (dbError) throw dbError;
    });

    await Promise.all(uploadPromises);
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No Documents Selected",
        description: "Please select at least one ID document to submit.",
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
      // Create a special property_agency_submission record for ID documents only
      const submissionRecord = {
        client_id: clientData.id,
        property_id: null, // No property for ID document submission
        agent_id: agentAgencyInfo.agentId,
        agency_id: agentAgencyInfo.agencyId,
        status: 'submitted',
        notes: 'ID Documents Submission - Buyer Registration'
      };

      const { data: submissionData, error: submissionError } = await clientSupabase
        .from('property_agency_submissions')
        .insert([submissionRecord])
        .select('id')
        .single();

      if (submissionError) throw submissionError;

      // Upload ID documents
      if (submissionData) {
        await uploadDocuments(submissionData.id);
      }

      // Log audit event for ID document submission
      if (submissionData) {
        await logSubmissionAction({
          submissionId: submissionData.id,
          actorType: 'client',
          actorId: clientData.id,
          action: 'id_documents_submitted'
        });
      }

      // Create agency notification for ID document submission
      await clientSupabase
        .from('agency_notifications')
        .insert({
          agency_id: agentAgencyInfo.agencyId,
          agent_id: agentAgencyInfo.agentId,
          client_id: clientData.id,
          type: 'id_documents_submitted',
          title: 'ID Documents Submitted',
          message: `${clientData.full_name || 'A client'} has submitted their ID documents for buyer registration`,
          metadata: {
            client_name: clientData.full_name,
            client_phone: clientData.phone,
            agent_name: agentAgencyInfo.agentName,
            submission_type: 'id_documents'
          }
        });

      toast({
        title: "ID Documents Submitted Successfully",
        description: `Your identity documents have been submitted to ${agentAgencyInfo.agencyName} for buyer registration.`,
      });

      onSubmissionComplete();
      onClose();

    } catch (error: any) {
      console.error('ID document submission error:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit ID documents. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <UserCheck className="w-5 h-5 mr-2 text-secura-teal" />
            Submit ID Documents to {agentAgencyInfo.agencyName}
          </DialogTitle>
          <DialogDescription>
            Register as a buyer by submitting your identity documents
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload Section */}
          <div className="space-y-3">
            <Label htmlFor="id-documents">Upload ID Documents</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <Label htmlFor="id-documents" className="cursor-pointer">
                  <span className="text-sm font-medium text-secura-teal hover:text-secura-moss">
                    Click to upload files
                  </span>
                  <span className="text-sm text-gray-500 block">
                    or drag and drop your ID documents
                  </span>
                </Label>
                <Input
                  id="id-documents"
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Supported formats: Images (JPG, PNG) and PDF. Max 10MB per file.
                </p>
              </div>
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Documents ({selectedFiles.length})</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        <FileCheck className="w-4 h-4 text-secura-teal" />
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          ({(file.size / 1024 / 1024).toFixed(1)} MB)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              By submitting your ID documents, you're registering as a potential buyer with{' '}
              <strong>{agentAgencyInfo.agencyName}</strong>. This allows them to:
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <FileCheck className="w-5 h-5 text-secura-teal mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Verify your identity</p>
                <p className="text-sm text-gray-600">Ensure secure and compliant transactions</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <UserCheck className="w-5 h-5 text-secura-teal mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Register you as a buyer</p>
                <p className="text-sm text-gray-600">Access property listings and buying services</p>
              </div>
            </div>
          </div>

          <div className="bg-secura-mint/20 p-4 rounded-lg">
            <h4 className="font-medium text-secura-teal mb-2">What happens next?</h4>
            <p className="text-sm text-gray-700">
              {agentAgencyInfo.agencyName} will receive your submission and may contact you to:
            </p>
            <ul className="text-sm text-gray-700 mt-2 space-y-1 list-disc list-inside">
              <li>Request additional documentation</li>
              <li>Schedule a buyer consultation</li>
              <li>Provide access to exclusive property listings</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-secura-teal hover:bg-secura-moss text-white"
          >
            {isSubmitting ? 'Submitting...' : 'Submit ID Documents'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IdDocumentSubmissionModal;