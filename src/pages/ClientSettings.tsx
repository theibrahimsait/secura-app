import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { clientSupabase } from '@/lib/client-supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, User, Phone, Mail, Upload, FileText, Trash2, Eye, Download } from 'lucide-react';

interface ClientData {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string;
  mobile_number: string;
}

interface ClientDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  document_type: string;
  uploaded_at: string;
  mime_type: string;
}

const ClientSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    loadClientData();
  }, []);

  const loadClientData = async () => {
    try {
      const storedData = localStorage.getItem('client_data');
      if (!storedData) {
        navigate('/client/login');
        return;
      }

      const client = JSON.parse(storedData);
      setClientData(client);
      setFormData({
        fullName: client.full_name || '',
        email: client.email || '',
        phone: client.phone || '',
      });

      // Load client documents
      const { data: documentsData } = await clientSupabase
        .from('client_documents')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (documentsData) {
        setDocuments(documentsData);
      }
    } catch (error) {
      console.error('Error loading client data:', error);
      toast({
        title: "Error",
        description: "Failed to load settings data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientData) return;

    setSaving(true);
    try {
      const { error } = await clientSupabase
        .from('clients')
        .update({
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientData.id);

      if (error) throw error;

      // Update localStorage
      const updatedClientData = {
        ...clientData,
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
      };
      localStorage.setItem('client_data', JSON.stringify(updatedClientData));
      setClientData(updatedClientData);

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !clientData) return;

    setUploading(true);
    try {
      for (const file of files) {
        const fileName = `${clientData.id}/${Date.now()}_${file.name}`;
        
        // Upload file to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('property-documents')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
        }

        // Store document record in database
        const { error: dbError } = await clientSupabase
          .from('client_documents')
          .insert({
            client_id: clientData.id,
            document_type: 'national_id',
            file_name: file.name,
            file_path: fileName,
            file_size: file.size,
            mime_type: file.type,
          });

        if (dbError) {
          console.error('Database error:', dbError);
          // Try to clean up the uploaded file
          await supabase.storage.from('property-documents').remove([fileName]);
          throw new Error(`Failed to save document record for ${file.name}`);
        }
      }

      toast({
        title: "Success",
        description: `${files.length} document(s) uploaded successfully`,
      });

      // Reload documents with a small delay to ensure database is updated
      setTimeout(() => {
        loadClientData();
      }, 500);
    } catch (error: any) {
      console.error('Error uploading documents:', error);
      toast({
        title: "Upload Error",
        description: error.message || "Failed to upload documents",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleViewDocument = async (document: ClientDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('property-documents')
        .createSignedUrl(document.file_path, 300); // 5 minutes

      if (error) throw error;

      // Open in new tab
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error viewing document:', error);
      toast({
        title: "Error",
        description: "Failed to view document",
        variant: "destructive",
      });
    }
  };

  const handleDownloadDocument = async (document: ClientDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('property-documents')
        .download(document.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.file_name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Document downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDocument = async (document: ClientDocument) => {
    if (!confirm(`Are you sure you want to delete ${document.file_name}?`)) {
      return;
    }

    try {
      // Delete from database first
      const { error: dbError } = await clientSupabase
        .from('client_documents')
        .delete()
        .eq('id', document.id);

      if (dbError) throw dbError;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('property-documents')
        .remove([document.file_path]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
        // Don't throw here - database record is already deleted
      }

      toast({
        title: "Success",
        description: "Document deleted successfully",
      });

      // Reload documents
      loadClientData();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!clientData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/client/dashboard')}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Settings</h1>
              <p className="text-sm text-muted-foreground">
                Manage your profile and documents
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter your email"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter your phone number"
                  />
                </div>
                <Button type="submit" disabled={saving} className="bg-secura-teal hover:bg-secura-moss text-white">
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Separator />

          {/* Identity Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Identity Documents
              </CardTitle>
              <CardDescription>
                Upload and manage your identification documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload Section */}
              <div>
                <Label htmlFor="documents">Upload New Documents</Label>
                <Input
                  id="documents"
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleDocumentUpload}
                  disabled={uploading}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Upload images (JPG, PNG) or PDF files. You can select multiple files.
                </p>
                {uploading && (
                  <div className="flex items-center mt-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-secura-teal mr-2"></div>
                    <span className="text-sm text-muted-foreground">Uploading...</span>
                  </div>
                )}
              </div>

              {/* Documents List */}
              <div>
                <Label>Current Documents</Label>
                {documents.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No documents uploaded yet</p>
                    <p className="text-sm text-muted-foreground">Upload your ID documents to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{doc.file_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(doc.file_size / 1024 / 1024).toFixed(2)} MB • 
                              {new Date(doc.uploaded_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDocument(doc)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadDocument(doc)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteDocument(doc)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ClientSettings;