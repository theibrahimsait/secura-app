import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Plus, Users, User, Activity, LogOut, Mail, Bell, FileText, Send, MessageSquare, Check, LayoutDashboard, Settings, UserCheck } from 'lucide-react';
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import AgencyNotifications from '@/components/AgencyNotifications';
import { AgencyBuyersSection } from '@/components/AgencyBuyersSection';
import { SubmissionTimeline } from '@/components/SubmissionTimeline';
import { logAgencySubmissionAction } from '@/lib/audit-logger';

interface Agent {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  is_active: boolean;
  auth_user_id: string | null;
}

interface CreateAgentForm {
  fullName: string;
  email: string;
  phone: string;
}

interface ClientSubmission {
  id: string;
  client_id: string;
  property_id: string;
  agent_id: string;
  created_at: string;
  status: string;
  client: {
    full_name: string;
    phone: string;
    email: string;
  };
  property: {
    title: string;
    location: string;
    property_type: string;
  };
  agent: {
    full_name: string;
  };
}

interface BuyerSubmission {
  id: string;
  client_id: string;
  agent_id: string;
  created_at: string;
  status: string;
  client: {
    full_name: string;
    phone: string;
    email: string;
  };
  agent: {
    full_name: string;
  };
}

const AgencyDashboard = () => {
  const { signOut, userProfile, user } = useAuth();
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [submissions, setSubmissions] = useState<ClientSubmission[]>([]);
  const [buyers, setBuyers] = useState<BuyerSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [agencyName, setAgencyName] = useState<string>('');
  const [highlightedPropertyId, setHighlightedPropertyId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateAgentForm>({
    fullName: '',
    email: '',
    phone: '',
  });
  const [selectedSubmission, setSelectedSubmission] = useState<ClientSubmission | null>(null);
  const [showViewDetailsModal, setShowViewDetailsModal] = useState(false);
  const [showCommunicationModal, setShowCommunicationModal] = useState(false);
  const [submissionDocuments, setSubmissionDocuments] = useState<Array<{
    id: string;
    file_name: string;
    file_size: number;
    document_type: string;
    uploaded_at: string;
    file_path: string;
    source: string;
  }>>([]);
  const [viewingDocument, setViewingDocument] = useState<{url: string, name: string, error?: string} | null>(null);
  const [documentZoom, setDocumentZoom] = useState(100);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const handleViewDocument = async (document: any) => {
    try {
      const bucket = 'property-documents';
      
      // Check if file exists in storage by trying to create signed URL directly
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(document.file_path, 300); // 5 minutes

      if (error) {
        console.error('Error creating signed URL:', error);
        setViewingDocument({
          url: '',
          name: document.file_name,
          error: 'This document was not properly uploaded to storage. The client may need to re-upload this file.'
        });
        return;
      }
      
      // Reset zoom when viewing new document
      setDocumentZoom(100);
      
      // Set viewing document to show in iframe
      setViewingDocument({
        url: data.signedUrl,
        name: document.file_name
      });

      // Log audit event
      await supabase.rpc('log_audit_event', {
        p_user_id: userProfile?.id,
        p_client_id: selectedSubmission?.client_id,
        p_action: 'view',
        p_resource_type: 'document',
        p_resource_id: document.id,
        p_details: {
          document_name: document.file_name,
          document_type: document.document_type,
          action: 'view_document'
        }
      });

      // Log to submission audit trail
      if (userProfile?.id && selectedSubmission?.id) {
        await logAgencySubmissionAction({
          submissionId: selectedSubmission.id,
          actorType: 'agency_admin',
          actorId: userProfile.id,
          action: 'viewed_file',
          fileName: document.file_name
        });
      }

    } catch (error) {
      console.error('Error viewing document:', error);
      setViewingDocument({
        url: '',
        name: document.file_name,
        error: 'Failed to load document. Please try again or contact support if the issue persists.'
      });
      toast({
        title: "Error",
        description: "Failed to view document",
        variant: "destructive",
      });
    }
  };

  const handleDownloadDocument = async (document: any) => {
    try {
      const bucket = 'property-documents';
      
      // Get the folder and filename from the path
      const folder = document.file_path.substring(0, document.file_path.lastIndexOf('/'));
      const filename = document.file_path.substring(document.file_path.lastIndexOf('/') + 1);
      
      // Try to find the file with the exact name first
      let { data: fileData, error: fileError } = await supabase.storage
        .from(bucket)
        .list(folder, {
          search: filename
        });

      let actualFilePath = document.file_path;

      // If not found and filename contains underscore, try with hyphen
      if ((!fileData || fileData.length === 0) && filename.includes('_')) {
        const filenameWithHyphen = filename.replace('_', '-');
        const { data: altFileData, error: altFileError } = await supabase.storage
          .from(bucket)
          .list(folder, {
            search: filenameWithHyphen
          });
        
        if (altFileData && altFileData.length > 0) {
          fileData = altFileData;
          fileError = altFileError;
          // Update the file path to use the correct name
          actualFilePath = `${folder}/${filenameWithHyphen}`;
        }
      }

      if (fileError || !fileData || fileData.length === 0) {
        toast({
          title: "Error",
          description: "Document file not found in storage. The file may have been moved or deleted.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .download(actualFilePath);

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

      // Log audit event
      await supabase.rpc('log_audit_event', {
        p_user_id: userProfile?.id,
        p_client_id: selectedSubmission?.client_id,
        p_action: 'download',
        p_resource_type: 'document',
        p_resource_id: document.id,
        p_details: {
          document_name: document.file_name,
          document_type: document.document_type,
          action: 'download_document'
        }
      });

      // Log to submission audit trail
      if (userProfile?.id && selectedSubmission?.id) {
        await logAgencySubmissionAction({
          submissionId: selectedSubmission.id,
          actorType: 'agency_admin',
          actorId: userProfile.id,
          action: 'downloaded_file',
          fileName: document.file_name
        });
      }

      toast({
        title: "Success",
        description: "Document downloaded successfully",
      });

    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Error",
        description: "Failed to download document. Please try again or contact support if the issue persists.",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsProcessed = async (submissionId: string) => {
    try {
      const { error } = await supabase
        .from('property_agency_submissions')
        .update({ status: 'approved' })
        .eq('id', submissionId);

      if (error) throw error;

      // Refresh submissions to show updated status
      await fetchSubmissions();

      toast({
        title: "Success",
        description: "Property submission approved and marked as processed",
      });
    } catch (error) {
      console.error('Error updating submission status:', error);
      toast({
        title: "Error",
        description: "Failed to update submission status",
        variant: "destructive",
      });
    }
  };

  const fetchAgencyName = async () => {
    if (!userProfile?.agency_id) return;

    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('name')
        .eq('id', userProfile.agency_id)
        .single();

      if (error) throw error;
      setAgencyName(data.name || '');
    } catch (error: any) {
      console.error('Error fetching agency name:', error);
    }
  };

  const fetchUnreadNotificationCount = async () => {
    if (!userProfile?.agency_id) return;

    try {
      const { count, error } = await supabase
        .from('agency_notifications')
        .select('id', { count: 'exact' })
        .eq('agency_id', userProfile.agency_id)
        .eq('is_read', false);

      if (error) throw error;
      setUnreadNotificationCount(count || 0);
    } catch (error: any) {
      console.error('Error fetching unread notification count:', error);
    }
  };

  const fetchAgents = async () => {
    if (!userProfile?.agency_id) {
      console.log('No agency_id in userProfile:', userProfile);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('agency_id', userProfile.agency_id)
        .eq('role', 'agent')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching agents:', error);
        throw error;
      }
      
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: "Error",
        description: "Failed to load agents",
        variant: "destructive",
      });
    }
  };

  const fetchSubmissions = async () => {
    if (!userProfile?.agency_id) return;
    
    try {
      // Fetch property submissions (property_id is NOT null)
      const { data: propertySubmissions, error: propertyError } = await supabase
        .from('property_agency_submissions')
        .select(`
          id,
          client_id,
          property_id,
          agent_id,
          agency_id,
          status,
          created_at,
          clients (
            id,
            full_name,
            phone,
            email
          ),
          users!property_agency_submissions_agent_id_fkey (
            full_name
          ),
          client_properties (
            title,
            location,
            property_type
          )
        `)
        .eq('agency_id', userProfile.agency_id)
        .not('property_id', 'is', null)
        .order('created_at', { ascending: false });

      if (propertyError) throw propertyError;
      
      const formattedSubmissions = propertySubmissions?.map(submission => ({
        id: submission.id,
        client_id: submission.client_id,
        property_id: submission.property_id,
        agent_id: submission.agent_id,
        created_at: submission.created_at,
        status: submission.status,
        client: submission.clients,
        property: submission.client_properties,
        agent: submission.users || { full_name: 'No Agent' }
      }))
      // Filter out submissions with null properties or clients
      .filter(submission => submission.property && submission.client) || [];
      
      setSubmissions(formattedSubmissions);

      // Fetch buyer submissions (property_id IS null - ID document submissions)
      const { data: buyerSubmissions, error: buyerError } = await supabase
        .from('property_agency_submissions')
        .select(`
          id,
          client_id,
          agent_id,
          agency_id,
          status,
          created_at,
          clients (
            full_name,
            phone,
            email
          ),
          users!property_agency_submissions_agent_id_fkey (
            full_name
          )
        `)
        .eq('agency_id', userProfile.agency_id)
        .is('property_id', null)
        .order('created_at', { ascending: false });

      if (buyerError) throw buyerError;

      const formattedBuyers = buyerSubmissions?.map(submission => ({
        id: submission.id,
        client_id: submission.client_id,
        agent_id: submission.agent_id,
        created_at: submission.created_at,
        status: submission.status,
        client: submission.clients,
        agent: submission.users || { full_name: 'No Agent' }
      }))
      .filter(buyer => buyer.client) || [];

      setBuyers(formattedBuyers);

    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast({
        title: "Error",
        description: "Failed to load submissions",
        variant: "destructive",
      });
    }
  };

  const generateSecurePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const resendWelcomeEmail = async (agent: Agent) => {
    if (!agent.auth_user_id) {
      toast({
        title: "Error",
        description: "This agent cannot have their password reset as they have not logged in yet.",
        variant: "destructive",
      });
      return;
    }

    setResendLoading(agent.id);
    try {
      const newPassword = generateSecurePassword();
      const { data: emailData, error: emailError } = await supabase.functions.invoke('create-user', {
        body: {
          email: agent.email,
          password: newPassword,
          fullName: agent.full_name,
          isPasswordReset: true,
          userId: agent.auth_user_id,
          role: 'agent',
        },
      });

      if (emailError) throw emailError;

      if (!emailData.success) {
        throw new Error(emailData.error || 'Failed to send welcome email');
      }

      toast({
        title: "Email Sent Successfully",
        description: `New welcome email with updated credentials sent to ${agent.email}`,
        duration: 8000,
      });

    } catch (error: any) {
      console.error('Error resending welcome email:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to resend welcome email",
        variant: "destructive",
      });
    } finally {
      setResendLoading(null);
    }
  };

  const createAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);

    try {
      const tempPassword = generateSecurePassword();

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: form.email,
          password: tempPassword,
          role: 'agent',
          fullName: form.fullName,
          phone: form.phone,
          agencyId: userProfile?.agency_id,
          createdBy: userProfile?.id,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to create agent account');
      }

      toast({
        title: "Agent Created Successfully",
        description: `Welcome email with login credentials has been sent to ${form.email}`,
        duration: 8000,
      });

      setForm({ fullName: '', email: '', phone: '' });
      setCreateDialogOpen(false);
      fetchAgents();

    } catch (error: any) {
      console.error('Error creating agent:', error);
      toast({
        title: "Error Creating Agent",
        description: error.message || "Failed to create agent",
        variant: "destructive",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const refreshJwtMetadata = async () => {
    try {
      const { data, error } = await supabase.rpc('refresh_jwt_metadata' as any);
      if (error) {
        console.error('Error refreshing JWT metadata:', error);
        toast({
          title: "Error",
          description: "Failed to refresh JWT metadata",
          variant: "destructive",
        });
      } else {
        console.log('JWT metadata refreshed:', data);
        toast({
          title: "Success",
          description: "JWT metadata refreshed. Please refresh the page to see updated data.",
        });
        // Force a page refresh to get the new JWT
        window.location.reload();
      }
    } catch (error) {
      console.error('Error refreshing JWT metadata:', error);
      toast({
        title: "Error",
        description: "Failed to refresh JWT metadata",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if(userProfile) {
      fetchAgents();
      fetchSubmissions();
      fetchAgencyName();
      fetchUnreadNotificationCount();
    }
  }, [userProfile]);

  // Handle URL parameters for tab switching and highlighting
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    const highlight = urlParams.get('highlight');
    
    if (tab) {
      setActiveTab(tab);
    }
    
    if (highlight) {
      setHighlightedPropertyId(highlight);
      // Clear highlight after 2 seconds
      setTimeout(() => {
        setHighlightedPropertyId(null);
      }, 2000);
    }
  }, []);

  useEffect(() => {
    setLoading(false);
  }, [agents, submissions, buyers]);

  const links = [
    {
      label: "Overview",
      href: "#overview",
      icon: <LayoutDashboard className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Notifications",
      href: "#notifications",
      icon: <Bell className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Tasks",
      href: "#tasks",
      icon: <FileText className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Buyers",
      href: "#buyers",
      icon: <UserCheck className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Agents",
      href: "#agents",
      icon: <Users className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
        <SidebarBody className="justify-between">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {/* Logo/Header */}
            <div className="flex items-center space-x-3 mb-8 px-1">
              <div className="w-10 h-10 rounded-xl secura-gradient flex items-center justify-center flex-shrink-0">
                <img 
                  src="https://yugzvvgctlhfcdmmwaxj.supabase.co/storage/v1/object/public/images//secfav.png" 
                  alt="Secura" 
                  className="w-6 h-6"
                />
              </div>
              <motion.span 
                className="font-bold text-lg text-secura-black"
                animate={{
                  display: sidebarOpen ? "inline-block" : "none",
                  opacity: sidebarOpen ? 1 : 0,
                }}
              >
                Agency Dashboard
              </motion.span>
            </div>
            
            {/* Navigation Links */}
            <div className="flex flex-col gap-1">
              {links.map((link, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveTab(link.href.replace('#', ''))}
                  className={`cursor-pointer rounded-lg transition-all duration-200 ${
                    activeTab === link.href.replace('#', '')
                      ? 'bg-secura-lime/15 text-secura-teal shadow-sm'
                      : 'hover:bg-neutral-100/70 text-neutral-700'
                  }`}
                >
                  <SidebarLink 
                    link={{
                      ...link,
                      icon: React.cloneElement(link.icon as React.ReactElement, {
                        className: `w-5 h-5 ${
                          activeTab === link.href.replace('#', '')
                            ? 'text-secura-teal'
                            : 'text-neutral-600'
                        }`
                      })
                    }} 
                  />
                </div>
              ))}
            </div>
          </div>
          
          {/* User Profile Section */}
          <div className="border-t border-neutral-200 pt-4">
            <div className="flex items-center space-x-3 px-3 py-2">
              <div className="w-9 h-9 rounded-full bg-secura-teal flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
              <motion.div 
                className="flex-1 min-w-0"
                animate={{
                  display: sidebarOpen ? "block" : "none",
                  opacity: sidebarOpen ? 1 : 0,
                }}
              >
                <p className="text-sm font-semibold text-secura-black truncate">{userProfile?.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{agencyName || 'Agency Admin'}</p>
              </motion.div>
              <motion.div
                animate={{
                  display: sidebarOpen ? "block" : "none",
                  opacity: sidebarOpen ? 1 : 0,
                }}
              >
                <Button
                  onClick={signOut}
                  variant="ghost"
                  size="sm"
                  className="p-2 hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </motion.div>
            </div>
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-secura-lime/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-secura-teal" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Agents</p>
                      <p className="text-2xl font-bold">{agents.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-secura-lime/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-secura-teal" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Today's Submissions</p>
                      <p className="text-2xl font-bold">{submissions.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString()).length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pending Submissions</p>
                      <p className="text-2xl font-bold">{submissions.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                      <Bell className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Unread Notifications</p>
                      <p className="text-2xl font-bold">{unreadNotificationCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Submissions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Property Submissions</CardTitle>
                <CardDescription>Latest property submissions from clients</CardDescription>
              </CardHeader>
              <CardContent>
                {submissions.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-600">No pending submissions</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {submissions.slice(0, 5).map((submission) => (
                      <div key={submission.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h3 className="font-medium">{submission.property?.title || 'Property Details Unavailable'}</h3>
                          <p className="text-sm text-gray-600">{submission.client?.full_name || 'Unknown Client'} • {submission.property?.location || 'Location Unknown'}</p>
                          <p className="text-xs text-gray-500">Agent: {submission.agent?.full_name || 'No Agent'}</p>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={submission.status === 'approved' ? 'default' : 'secondary'}
                            className={submission.status === 'approved' ? 'bg-green-100 text-green-800' : ''}
                          >
                            {submission.status === 'approved' ? 'Approved' : 'Pending'}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(submission.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              {userProfile?.agency_id && (
                <AgencyNotifications agencyId={userProfile.agency_id} />
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Task Manager</CardTitle>
                  <CardDescription>Manage all unprocessed client submissions and documents</CardDescription>
                </CardHeader>
                <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission) => (
                      <TableRow 
                        key={submission.id}
                        className={`transition-all duration-500 ${
                          highlightedPropertyId === submission.property_id 
                            ? 'bg-secura-lime/20 border-2 border-secura-lime shadow-lg animate-pulse' 
                            : ''
                        }`}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{submission.client.full_name}</p>
                            <p className="text-sm text-gray-600">{submission.client.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{submission.property?.title || 'Property Details Unavailable'}</p>
                            <p className="text-sm text-gray-600">{submission.property?.location || 'Location Unknown'}</p>
                          </div>
                        </TableCell>
                        <TableCell>{submission.agent.full_name}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={submission.status === 'approved' ? 'default' : 'secondary'}
                            className={submission.status === 'approved' ? 'bg-green-100 text-green-800' : ''}
                          >
                            {submission.status === 'approved' ? 'Approved' : 'Pending Review'}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(submission.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {submission.status !== 'approved' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="bg-secura-lime hover:bg-secura-lime/90 text-secura-teal border-secura-lime p-2"
                                onClick={() => handleMarkAsProcessed(submission.id)}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedSubmission(submission);
                                setShowCommunicationModal(true);
                              }}
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Send Update
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={async () => {
                                setSelectedSubmission(submission);
                                console.log('Fetching docs for submission:', submission.property_id);
                                // Fetch both property documents and client documents
                                const [propertyDocs, clientDocs] = await Promise.all([
                                  supabase
                                    .from('property_documents')
                                    .select('*')
                                    .eq('property_id', submission.property_id),
                                  supabase
                                    .from('client_documents')
                                    .select('*')
                                    .eq('client_id', submission.client_id)
                                ]);
                                console.log('Property documents found:', propertyDocs.data?.length || 0);
                                console.log('Client documents found:', clientDocs.data?.length || 0);
                                
                                const allDocs = [
                                  ...(propertyDocs.data || []).map(doc => ({...doc, source: 'property'})),
                                  ...(clientDocs.data || []).map(doc => ({...doc, source: 'client'}))
                                ];
                                
                                setSubmissionDocuments(allDocs);
                                setShowViewDetailsModal(true);
                              }}
                            >
                              View Details
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            </div>
          )}

          {activeTab === 'buyers' && ( // Buyers section
            <div className="space-y-6">
              <AgencyBuyersSection
                buyers={buyers}
                onApproveBuyer={async (buyerId) => {
                  try {
                    await supabase
                      .from('property_agency_submissions')
                      .update({ status: 'approved' })
                      .eq('id', buyerId);
                    
                    // Refresh data
                    fetchSubmissions();
                    
                    toast({
                      title: "Success",
                      description: "Buyer approved successfully",
                    });
                  } catch (error) {
                    console.error('Error approving buyer:', error);
                    toast({
                      title: "Error",
                      description: "Failed to approve buyer",
                      variant: "destructive",
                    });
                  }
                }}
              />
            </div>
          )}

          {activeTab === 'agents' && (
            <div className="space-y-6">
            {/* Add Agent Button */}
            <div className="flex justify-end">
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-secura-teal hover:bg-secura-teal/90 text-white font-semibold">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Agent
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Agent</DialogTitle>
                    <DialogDescription>Create a new agent account for your agency</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={createAgent} className="space-y-4">
                    <div>
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input id="fullName" value={form.fullName} onChange={(e) => setForm({...form, fullName: e.target.value})} required />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} required />
                    </div>
                    <div className="flex justify-end space-x-2 pt-2">
                      <Button type="button" variant="ghost" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={createLoading}>
                        {createLoading ? 'Adding...' : 'Add Agent'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Agents Table */}
            <Card>
              <CardHeader>
                <CardTitle>Agents</CardTitle>
                <CardDescription>A list of all agents in your agency.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined On</th>
                        <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loading ? (
                        <tr><td colSpan={5} className="text-center py-8">Loading agents...</td></tr>
                      ) : agents.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-8">No agents found.</td></tr>
                      ) : (
                        agents.map((agent) => (
                          <tr key={agent.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <User className="w-5 h-5 mr-3 text-gray-500"/>
                                <span className="font-medium">{agent.full_name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{agent.email}</div>
                              <div className="text-sm text-gray-500">{agent.phone || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant={agent.is_active ? 'default' : 'destructive'}>
                                {agent.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(agent.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resendWelcomeEmail(agent)}
                                disabled={resendLoading === agent.id}
                              >
                                <Mail className="w-4 h-4 mr-2" />
                                {resendLoading === agent.id ? 'Sending...' : 'Resend Welcome'}
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            </div>
          )}
        </div>

        {/* Debug Section */}
        {showDebug && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Debug Information</CardTitle>
              <CardDescription>Current user profile and JWT metadata</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold">JWT Metadata Status:</h4>
                  <Button
                    onClick={refreshJwtMetadata}
                    variant="outline"
                    size="sm"
                  >
                    Refresh JWT Metadata
                  </Button>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">User Profile:</h4>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                    {JSON.stringify(userProfile, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">JWT Metadata:</h4>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                    {JSON.stringify(user?.app_metadata, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">User Claims:</h4>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                    {JSON.stringify(user?.user_metadata, null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* View Details Modal */}
        {showViewDetailsModal && selectedSubmission && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-6xl w-full h-[90vh] flex flex-col">
              <div className="p-6 border-b flex-shrink-0">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Property Submission Details</h2>
                  <Button variant="ghost" onClick={() => {
                    setShowViewDetailsModal(false);
                    setViewingDocument(null);
                  }}>✕</Button>
                </div>
              </div>
              <div className="flex-1 flex overflow-hidden">
                <div className="w-1/2 p-6 overflow-y-auto border-r">
                  <div className="grid grid-cols-1 gap-6 mb-6">
                    <div>
                      <h3 className="font-semibold mb-3">Client Information</h3>
                      <div className="space-y-2">
                        <p><span className="font-medium">Name:</span> {selectedSubmission.client.full_name}</p>
                        <p><span className="font-medium">Phone:</span> {selectedSubmission.client.phone}</p>
                        <p><span className="font-medium">Email:</span> {selectedSubmission.client.email}</p>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-3">Property Information</h3>
                      <div className="space-y-2">
                        <p><span className="font-medium">Title:</span> {selectedSubmission.property?.title || 'Property Details Unavailable'}</p>
                        <p><span className="font-medium">Location:</span> {selectedSubmission.property?.location || 'Location Unknown'}</p>
                        <p><span className="font-medium">Type:</span> {selectedSubmission.property?.property_type || 'Type Unknown'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-4">Submitted Documents</h3>
                    {submissionDocuments.length === 0 ? (
                      <p className="text-gray-500">No documents submitted yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(
                          submissionDocuments.reduce((acc, doc) => {
                            const category = doc.document_type;
                            if (!acc[category]) acc[category] = [];
                            acc[category].push(doc);
                            return acc;
                          }, {} as Record<string, any[]>)
                        ).map(([category, docs]) => (
                          <div key={category} className="border rounded-lg p-4">
                            <h4 className="font-medium mb-3 capitalize">
                              {category === 'national_id' ? 'Identity Documents' : category.replace(/_/g, ' ')}
                            </h4>
                            <div className="space-y-2">
                              {docs.map((doc) => (
                                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                  <div className="flex items-center space-x-3">
                                    <FileText className="w-5 h-5 text-gray-400" />
                                    <div>
                                      <p className="font-medium">{doc.file_name}</p>
                                      <p className="text-sm text-gray-500">
                                        {(doc.file_size / 1024 / 1024).toFixed(2)} MB • {new Date(doc.uploaded_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex space-x-2">
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleViewDocument(doc)}
                                    >
                                      View
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleDownloadDocument(doc)}
                                    >
                                      Download
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Document Viewer Panel */}
                <div className="w-1/2 p-6 overflow-hidden flex flex-col">
                  {viewingDocument ? (
                    <>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold">Viewing: {viewingDocument.name}</h3>
                        <div className="flex items-center space-x-2">
                          {/* Zoom Controls */}
                          {viewingDocument.url && !viewingDocument.error && (
                            <div className="flex items-center space-x-2 border rounded px-3 py-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setDocumentZoom(Math.max(25, documentZoom - 25))}
                                disabled={documentZoom <= 25}
                              >
                                -
                              </Button>
                              <span className="text-sm font-medium min-w-[60px] text-center">
                                {documentZoom}%
                              </span>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setDocumentZoom(Math.min(200, documentZoom + 25))}
                                disabled={documentZoom >= 200}
                              >
                                +
                              </Button>
                            </div>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setViewingDocument(null);
                              setDocumentZoom(100);
                            }}
                          >
                            Close Preview
                          </Button>
                        </div>
                      </div>
                      <div className="flex-1 border rounded-lg overflow-hidden">
                        {viewingDocument.error ? (
                          <div className="h-full flex items-center justify-center bg-red-50">
                            <div className="text-center p-6">
                              <FileText className="w-16 h-16 mx-auto mb-4 text-red-300" />
                              <h4 className="font-medium text-red-800 mb-2">Error</h4>
                              <p className="text-red-600 text-sm max-w-md">
                                {viewingDocument.error}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full overflow-auto">
                            <div 
                              style={{ 
                                transform: `scale(${documentZoom / 100})`,
                                transformOrigin: 'top left',
                                width: `${10000 / documentZoom}%`,
                                height: `${10000 / documentZoom}%`
                              }}
                            >
                              <iframe 
                                src={viewingDocument.url}
                                className="w-full h-full border-0"
                                title={viewingDocument.name}
                                style={{ minHeight: '100vh' }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p>Click "View" on any document to preview it here</p>
                        <p className="text-sm mt-2">Use zoom controls to adjust document size</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 border-t bg-gray-50 flex-shrink-0">
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => {
                    setShowViewDetailsModal(false);
                    setViewingDocument(null);
                  }}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Communication Modal */}
        {showCommunicationModal && selectedSubmission && (
          <Dialog open={showCommunicationModal} onOpenChange={setShowCommunicationModal}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Communication with {selectedSubmission.client.full_name}
                </DialogTitle>
                <DialogDescription>
                  {selectedSubmission.property?.title} - {selectedSubmission.property?.location}
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-hidden">
                <SubmissionTimeline 
                  submissionId={selectedSubmission.id}
                  className="h-full"
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
};

export default AgencyDashboard;
