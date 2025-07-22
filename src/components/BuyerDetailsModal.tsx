import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserCheck, Phone, Mail, User, Calendar, Download, Eye, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logAgencySubmissionAction } from '@/lib/audit-logger';

interface Buyer {
  id: string;
  client_id: string;
  created_at: string;
  status: string;
  client: {
    full_name: string;
    phone: string;
    email: string;
  };
  agent?: {
    full_name: string;
  };
}

interface BuyerDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  document_type: string;
  uploaded_at: string;
}

interface BuyerDetailsModalProps {
  buyer: Buyer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BuyerDetailsModal = ({ buyer, open, onOpenChange }: BuyerDetailsModalProps) => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<BuyerDocument[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBuyerDocuments = async (clientId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_documents')
        .select('*')
        .eq('client_id', clientId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching buyer documents:', error);
      toast({
        title: "Error",
        description: "Failed to load buyer documents.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (document: BuyerDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('property-documents')
        .download(document.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.file_name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: `Downloading ${document.file_name}`,
      });

      // Log audit action for downloading document
      await logAgencySubmissionAction({
        submissionId: buyer.id,
        actorType: 'agency_admin',
        action: 'downloaded_id_document',
        fileName: document.file_name
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Download Failed",
        description: "Could not download the document.",
        variant: "destructive",
      });
    }
  };

  const viewDocument = async (document: BuyerDocument) => {
    try {
      const { data } = await supabase.storage
        .from('property-documents')
        .getPublicUrl(document.file_path);

      if (data?.publicUrl) {
        // Create an iframe modal to view the document
        const modal = window.document.createElement('div');
        modal.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
        `;
        
        const iframe = window.document.createElement('iframe');
        iframe.src = data.publicUrl;
        iframe.style.cssText = `
          width: 90%;
          height: 90%;
          border: none;
          border-radius: 8px;
        `;
        
        const closeButton = window.document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.style.cssText = `
          position: absolute;
          top: 20px;
          right: 20px;
          background: white;
          border: none;
          font-size: 24px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          cursor: pointer;
          z-index: 10000;
        `;
        
        closeButton.onclick = () => window.document.body.removeChild(modal);
        modal.onclick = (e) => e.target === modal && window.document.body.removeChild(modal);
        
        modal.appendChild(iframe);
        modal.appendChild(closeButton);
        window.document.body.appendChild(modal);

        // Log audit action for viewing document
        await logAgencySubmissionAction({
          submissionId: buyer.id,
          actorType: 'agency_admin',
          action: 'viewed_id_document',
          fileName: document.file_name
        });
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      toast({
        title: "View Failed",
        description: "Could not open the document.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    if (buyer && open) {
      fetchBuyerDocuments(buyer.client_id);
    }
  }, [buyer, open]);

  if (!buyer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-secura-teal" />
            Buyer Details
          </DialogTitle>
          <DialogDescription>
            Complete information about this registered buyer
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 max-w-3xl mx-auto p-4">
            {/* Buyer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Buyer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{buyer.client.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={getStatusColor(buyer.status)}>
                      {buyer.status === 'submitted' ? 'Pending Review' : buyer.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <p className="font-medium">{buyer.client.phone}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <p className="font-medium">{buyer.client.email}</p>
                    </div>
                  </div>
                  {buyer.agent && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Assigned Agent</p>
                      <p className="font-medium">{buyer.agent.full_name}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Registration Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Registration Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <p className="text-muted-foreground">
                    Registered on {new Date(buyer.created_at).toLocaleDateString()} at{' '}
                    {new Date(buyer.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* ID Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  ID Documents ({documents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="py-8 text-center">Loading documents...</div>
                ) : documents.length > 0 ? (
                  <div className="space-y-3">
                    {documents.map((document) => (
                      <div
                        key={document.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-blue-500" />
                          <div>
                            <p className="font-medium text-sm">{document.file_name}</p>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <span className="capitalize">{document.document_type}</span>
                              <span>•</span>
                              <span>{formatFileSize(document.file_size)}</span>
                              <span>•</span>
                              <span>{new Date(document.uploaded_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewDocument(document)}
                            className="flex items-center space-x-1"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadDocument(document)}
                            className="flex items-center space-x-1"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No ID documents found</p>
                    <p className="text-sm">Documents will appear here once uploaded by the client</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};