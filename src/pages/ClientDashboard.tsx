import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { clientSupabase } from '@/lib/client-supabase';
import { useAgencyContext, type AgencyContext } from '@/hooks/useAgencyContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Plus, FileText, CheckCircle, Clock, AlertCircle, User, Send, Link, Home, Building, Trash2, ChevronLeft, ChevronRight, Settings, MessageSquare, Mail, History } from 'lucide-react';
import PropertySubmissionModal from '@/components/PropertySubmissionModal';
import { ClientSubmissionTimeline } from '@/components/ClientSubmissionTimeline';
import { SubmissionAuditTrail } from '@/components/SubmissionAuditTrail';
import { logSubmissionAction } from '@/lib/audit-logger';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useIsMobile } from '@/hooks/use-mobile';
import ClientDashboardMobile from '@/components/ClientDashboardMobile';

interface ClientData {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string;
  onboarding_completed: boolean;
  agent_id: string | null;
  agency_id: string | null;
}

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

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  due_date?: string;
  action_required?: string;
}

interface PropertySubmission {
  id: string;
  property_id: string;
  agency_id: string;
  agent_id: string | null;
  status: string;
  submitted_at: string;
  agencies: {
    name: string;
  };
  users?: {
    full_name: string;
  } | null;
  property_title?: string;
  property_location?: string;
}

// Using AgencyContext from the hook instead of local interface

const ClientDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allUpdates, setAllUpdates] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<PropertySubmission[]>([]);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [showSubmissionsView, setShowSubmissionsView] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<PropertySubmission | null>(null);
  const [selectedAuditSubmission, setSelectedAuditSubmission] = useState<PropertySubmission | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingPropertyId, setDeletingPropertyId] = useState<string | null>(null);
  const propertiesPerPage = 5;
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  // Use the new session-safe agency context hook
  const { agencyContext, loading: agencyLoading } = useAgencyContext();
  const isMobile = useIsMobile();

  useEffect(() => {
    loadClientData();
  }, []);

  // Refresh data when the component comes back into focus (e.g., returning from add property page)
  useEffect(() => {
    const handleFocus = () => {
      console.log('Dashboard focused, refreshing data...');
      loadClientData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
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

      // Client authentication is now handled automatically via session token in headers
      console.log('Loading data for client:', client.id);
      console.log('Client session token available:', client.session_token ? 'Yes' : 'No');

      // Load properties
      console.log('Loading properties for client:', client.id);
      
      const { data: propertiesData, error: propertiesError } = await clientSupabase
        .from('client_properties')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Properties loaded:', propertiesData?.length || 0, 'properties');
      if (propertiesError) {
        console.error('Error loading properties:', propertiesError);
      }

      if (propertiesData) {
        setProperties(propertiesData);
      }

      // Load submissions with related data
      const { data: submissionsData } = await clientSupabase
        .from('property_agency_submissions')
        .select(`
          id,
          property_id,
          agency_id,
          agent_id,
          status,
          created_at,
          agencies (name),
          users:users!property_agency_submissions_agent_id_fkey (full_name),
          client_properties (
            title,
            location
          )
        `)
        .order('created_at', { ascending: false });

      if (submissionsData) {
        // Transform the data to match the expected format
        const transformedSubmissions = submissionsData.map(submission => ({
          id: submission.id,
          property_id: submission.property_id,
          agency_id: submission.agency_id,
          agent_id: submission.agent_id,
          status: submission.status,
          submitted_at: submission.created_at,
          agencies: submission.agencies,
          users: submission.users,
          property_title: submission.client_properties?.title || 'Unknown Property',
          property_location: submission.client_properties?.location || ''
        }));
        setSubmissions(transformedSubmissions);
      }

      // Load tasks
      const { data: tasksData } = await clientSupabase
        .from('client_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (tasksData) {
        setTasks(tasksData);
      }

      // Load all submission updates to show as communications in tasks section
      const { data: updatesData } = await clientSupabase
        .from('submission_updates')
        .select(`
          id,
          submission_id,
          sender_role,
          message,
          created_at,
          is_read,
          users!fk_submission_updates_sender(full_name),
          property_agency_submissions!inner(
            id,
            agencies(name),
            client_properties(title, location)
          )
        `)
        .eq('sender_role', 'admin')
        .or('sender_role.eq.agent')
        .order('created_at', { ascending: false })
        .limit(10);

      if (updatesData) {
        setAllUpdates(updatesData);
        // Calculate total unread count from agency messages
        const unreadMessages = updatesData.filter(update => 
          !update.is_read && update.sender_role === 'admin'
        );
        setTotalUnreadCount(unreadMessages.length);
      }
    } catch (error) {
      console.error('Error loading client data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('client_data');
    navigate('/client/login');
  };

  const handleAddProperty = () => {
    navigate('/client/add-property');
  };

  const handleSubmissionComplete = () => {
    loadClientData();
  };

  const handleDeleteProperty = async (propertyId: string) => {
    if (!clientData) return;
    
    setDeletingPropertyId(propertyId);
    
    try {
      const { error } = await clientSupabase
        .from('client_properties')
        .delete()
        .eq('id', propertyId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Property deleted successfully",
      });

      // Reload the data to update the UI
      loadClientData();
      
      // Reset page if we're on a page that no longer has properties
      const remainingProperties = properties.length - 1;
      const maxPage = Math.ceil(remainingProperties / propertiesPerPage);
      if (currentPage > maxPage && maxPage > 0) {
        setCurrentPage(maxPage);
      }
    } catch (error) {
      console.error('Error deleting property:', error);
      toast({
        title: "Error",
        description: "Failed to delete property",
        variant: "destructive",
      });
    } finally {
      setDeletingPropertyId(null);
    }
  };

  const getPropertySubmissions = (propertyId: string) => {
    return submissions.filter(sub => sub.property_id === propertyId);
  };

  const getPropertyStatusBadge = (property: Property) => {
    const propertySubmissions = getPropertySubmissions(property.id);
    
    if (propertySubmissions.length === 0) {
      return <Badge variant="secondary" className="bg-muted text-muted-foreground">In Portfolio</Badge>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {propertySubmissions.map((submission) => (
                           <Badge 
                             key={submission.id}
                             variant={
                               submission.status === 'submitted' ? 'default' :
                               submission.status === 'under_review' ? 'secondary' :
                               submission.status === 'approved' ? 'default' : 'destructive'
                             }
                             className="text-xs cursor-pointer hover:opacity-80"
                             onClick={() => setSelectedSubmission(submission)}
                           >
                             {submission.agencies.name}
                           </Badge>
        ))}
      </div>
    );
  };

  const handleOpenCommunication = (submission: PropertySubmission) => {
    setSelectedSubmission(submission);
  };

  // Calculate pagination
  const totalPages = Math.ceil(properties.length / propertiesPerPage);
  const startIndex = (currentPage - 1) * propertiesPerPage;
  const endIndex = startIndex + propertiesPerPage;
  const currentProperties = properties.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!clientData) {
    return null;
  }

  // Return mobile version for mobile devices
  if (isMobile) {
    return (
      <>
        <ClientDashboardMobile
          properties={properties}
          submissions={submissions}
          onAddProperty={handleAddProperty}
          onSubmitToAgency={agencyContext?.agencyName ? () => setShowSubmissionModal(true) : undefined}
          onOpenSubmission={(submission) => setSelectedSubmission(submission)}
          onOpenAudit={(submission) => setSelectedAuditSubmission(submission)}
          onLogout={handleLogout}
          onOpenSettings={() => navigate('/client/settings')}
        />

        {/* Property Submission Modal */}
        {agencyContext && clientData && (
          <PropertySubmissionModal
            isOpen={showSubmissionModal}
            onClose={() => setShowSubmissionModal(false)}
            properties={properties}
            clientData={clientData}
            agentAgencyInfo={agencyContext}
            onSubmissionComplete={handleSubmissionComplete}
          />
        )}

        {/* Communication Timeline Modal */}
        {selectedSubmission && clientData && (
          <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Communication with {selectedSubmission.agencies.name}
                </DialogTitle>
                <DialogDescription>
                  {selectedSubmission.property_title} - {selectedSubmission.property_location}
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-hidden">
                <ClientSubmissionTimeline
                  submissionId={selectedSubmission.id}
                  clientId={clientData.id}
                  propertyTitle={selectedSubmission.property_title || 'Property'}
                  className="h-full"
                />
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Submission Audit Trail Modal */}
        {selectedAuditSubmission && (
          <SubmissionAuditTrail
            submissionId={selectedAuditSubmission.id}
            isOpen={!!selectedAuditSubmission}
            onClose={() => setSelectedAuditSubmission(null)}
            propertyTitle={selectedAuditSubmission.property_title || 'Property'}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b-0 rounded-none">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <img 
                src="https://ngmwdebxyofxudrbesqs.supabase.co/storage/v1/object/public/nullstack//securaa.svg" 
                alt="Secura" 
                className="h-8 w-auto"
              />
              <div className="hidden sm:block">
                <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {clientData.full_name || 'Client'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="glass"
                size="sm"
                onClick={() => navigate('/client/settings')}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
              <Button
                variant="glass"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Agency Connection Banner */}
      {agencyContext && (
        <div className="agency-connection-glow border-b border-secura-lime/20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-center text-center">
              <Link className="w-4 h-4 text-secura-teal mr-2 flex-shrink-0" />
              <span className="text-sm font-medium text-secura-teal">
                Connected to {agencyContext.agencyName}
                {agencyContext.agentName && (
                  <span className="text-secura-moss"> • {agencyContext.agentName}</span>
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="p-1.5 sm:p-2 bg-secura-mint rounded-full">
                  <Home className="w-4 h-4 sm:w-5 sm:h-5 text-secura-teal" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold">{properties.length}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Properties</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="p-1.5 sm:p-2 bg-secura-mint rounded-full">
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-secura-moss" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold">{totalUnreadCount}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Messages</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="p-1.5 sm:p-2 bg-secura-mint rounded-full">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-secura-teal" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold">{submissions.length}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground cursor-pointer hover:text-secura-teal" onClick={() => setShowSubmissionsView(true)}>Submissions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="p-1.5 sm:p-2 bg-secura-mint rounded-full">
                  <Building className="w-4 h-4 sm:w-5 sm:h-5 text-secura-teal" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold">{new Set(submissions.map(s => s.agency_id)).size}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Agencies</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Manage your portfolio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={handleAddProperty}
                  variant="lime"
                  size="lg"
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Property
                </Button>
                
                <Button
                  onClick={() => navigate('/client/settings')}
                  variant="glass"
                  size="lg"
                  className="w-full"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
                
                {agencyContext?.agencyName && (
                  <Button
                    onClick={() => setShowSubmissionModal(true)}
                    variant="default"
                    size="lg"
                    className="w-full"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Submit to {agencyContext.agencyName}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Properties */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  My Properties ({properties.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {properties.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                      <FileText className="w-12 h-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No properties yet</h3>
                    <p className="text-muted-foreground mb-6">Start building your property portfolio</p>
                    <Button 
                      onClick={handleAddProperty}
                      className="bg-secura-teal hover:bg-secura-moss text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Property
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {currentProperties.map((property) => (
                        <div key={property.id} className="border border-secura-mint/30 rounded-lg p-4 hover:bg-secura-mint/10 transition-colors">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-foreground truncate">{property.title}</h3>
                              <p className="text-muted-foreground truncate">{property.location}</p>
                            </div>
                            <div className="ml-4 flex items-center gap-2">
                              {getPropertyStatusBadge(property)}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteProperty(property.id)}
                                disabled={deletingPropertyId === property.id}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 p-2"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-sm text-muted-foreground">
                            <span className="capitalize">{property.property_type}</span>
                            <span>{new Date(property.created_at).toLocaleDateString()}</span>
                          </div>
                          {(property.bedrooms || property.bathrooms || property.area_sqft) && (
                            <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                              {property.bedrooms && <span>{property.bedrooms} bed</span>}
                              {property.bathrooms && <span>{property.bathrooms} bath</span>}
                              {property.area_sqft && <span>{property.area_sqft} sqft</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="mt-6 flex justify-center">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious 
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                className={currentPage === 1 ? "pointer-events-none opacity-50" : "text-secura-teal hover:bg-secura-mint"}
                              />
                            </PaginationItem>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => setCurrentPage(page)}
                                  isActive={currentPage === page}
                                  className={currentPage === page ? "bg-secura-teal text-white" : "text-secura-teal hover:bg-secura-mint"}
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            ))}
                            <PaginationItem>
                              <PaginationNext 
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "text-secura-teal hover:bg-secura-mint"}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Submissions */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Send className="w-5 h-5 mr-2" />
                  My Submissions ({submissions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {submissions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                      <Send className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No property submissions yet</p>
                    <p className="text-sm text-muted-foreground mt-2">Submit your properties to agencies to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {submissions.map((submission) => (
                      <div key={submission.id} className="border border-secura-mint/30 rounded-lg p-4 hover:bg-secura-mint/10 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{submission.property_title}</h3>
                            <p className="text-muted-foreground text-sm truncate">{submission.property_location}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-sm text-muted-foreground">Submitted to:</span>
                              <Badge variant="outline" className="text-xs">
                                {submission.agencies.name}
                              </Badge>
                              {submission.users && (
                                <Badge variant="secondary" className="text-xs">
                                  {submission.users.full_name}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="ml-4 flex items-center gap-2">
                            <div className="text-right">
                              <Badge 
                                variant={
                                  submission.status === 'submitted' ? 'default' :
                                  submission.status === 'under_review' ? 'secondary' :
                                  submission.status === 'approved' ? 'default' :
                                  'destructive'
                                }
                                className="mb-2"
                              >
                                {submission.status.replace('_', ' ')}
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                {new Date(submission.submitted_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedSubmission(submission)}
                              className="text-secura-teal border-secura-teal hover:bg-secura-mint"
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              Chat
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedAuditSubmission(submission)}
                              className="text-secura-moss border-secura-moss hover:bg-secura-mint ml-2"
                            >
                              <History className="w-4 h-4 mr-1" />
                              Audit
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Property Submission Modal */}
      {agencyContext && clientData && (
        <PropertySubmissionModal
          isOpen={showSubmissionModal}
          onClose={() => setShowSubmissionModal(false)}
          properties={properties}
          clientData={clientData}
          agentAgencyInfo={agencyContext}
          onSubmissionComplete={handleSubmissionComplete}
        />
      )}

      {/* Submissions View Modal */}
      {showSubmissionsView && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">My Submissions</h2>
                <Button variant="ghost" onClick={() => setShowSubmissionsView(false)}>✕</Button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto">
              {submissions.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-muted-foreground">No submissions yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {submissions.map((submission) => (
                    <div key={submission.id} className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{submission.property_title}</h3>
                          <p className="text-sm text-gray-600">{submission.property_location}</p>
                          <p className="text-sm text-gray-500">Submitted to: {submission.agencies.name}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={submission.status === 'pending' ? 'secondary' : 'default'}>
                            {submission.status}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(submission.submitted_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedSubmission(submission);
                              setShowSubmissionsView(false); // Close submissions modal when opening chat
                            }}
                            className="text-secura-teal border-secura-teal hover:bg-secura-mint"
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Chat
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Communication Timeline Modal */}
      {selectedSubmission && clientData && (
        <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Communication with {selectedSubmission.agencies.name}
              </DialogTitle>
              <DialogDescription>
                {selectedSubmission.property_title} - {selectedSubmission.property_location}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              <ClientSubmissionTimeline
                submissionId={selectedSubmission.id}
                clientId={clientData.id}
                propertyTitle={selectedSubmission.property_title || 'Property'}
                className="h-full"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Submission Audit Trail Modal */}
      {selectedAuditSubmission && (
        <SubmissionAuditTrail
          submissionId={selectedAuditSubmission.id}
          isOpen={!!selectedAuditSubmission}
          onClose={() => setSelectedAuditSubmission(null)}
          propertyTitle={selectedAuditSubmission.property_title || 'Property'}
        />
      )}
    </div>
  );
};

export default ClientDashboard;