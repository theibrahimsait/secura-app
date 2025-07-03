import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Plus, FileText, CheckCircle, Clock, AlertCircle, User, Send, Link, Home, Building } from 'lucide-react';
import PropertySubmissionModal from '@/components/PropertySubmissionModal';

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
}

interface AgentAgencyInfo {
  agencyId: string;
  agencyName: string;
  agentId: string;
  agentName: string;
}

const ClientDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<PropertySubmission[]>([]);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [currentAgentAgency, setCurrentAgentAgency] = useState<AgentAgencyInfo | null>(null);

  useEffect(() => {
    const checkReferral = async () => {
      const refParam = searchParams.get("ref");
      if (!refParam) return;

      try {
        // Get referral link data
        const { data: linkData, error: linkError } = await supabase
          .from('referral_links')
          .select('id, agent_id, agency_id')
          .eq('id', refParam)
          .single();

        if (linkError || !linkData) return;

        // Get agency and user data
        const [{ data: agencyData }, { data: userData }] = await Promise.all([
          supabase.from('agencies').select('id, name').eq('id', linkData.agency_id).single(),
          supabase.from('users').select('id, full_name').eq('id', linkData.agent_id).single()
        ]);

        if (agencyData && userData) {
          setCurrentAgentAgency({
            agencyId: agencyData.id,
            agencyName: agencyData.name,
            agentId: userData.id,
            agentName: userData.full_name
          });
        }
      } catch (error) {
        // Silently handle errors - referral is optional
      }
    };

    loadClientData();
    checkReferral();
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

      // Load properties
      const { data: propertiesData } = await supabase
        .from('client_properties')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (propertiesData) {
        setProperties(propertiesData);
      }

      // Load submissions with related data
      const { data: submissionsData } = await supabase
        .from('submissions')
        .select(`
          id,
          status,
          created_at,
          agencies (name),
          users (full_name),
          submission_properties (
            property_id
          )
        `)
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (submissionsData) {
        // Transform the data to match the expected format
        const transformedSubmissions = submissionsData.flatMap(submission => 
          submission.submission_properties.map(sp => ({
            id: submission.id,
            property_id: sp.property_id,
            agency_id: '', // This will be inferred from the property
            agent_id: null,
            status: submission.status,
            submitted_at: submission.created_at,
            agencies: submission.agencies,
            users: submission.users
          }))
        );
        setSubmissions(transformedSubmissions);
      }

      // Load tasks
      const { data: tasksData } = await supabase
        .from('client_tasks')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (tasksData) {
        setTasks(tasksData);
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
            className="text-xs"
          >
            Submitted to {submission.agencies.name}
          </Badge>
        ))}
      </div>
    );
  };

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <img 
                src="https://ngmwdebxyofxudrbesqs.supabase.co/storage/v1/object/public/nullstack//securaa.svg" 
                alt="Secura" 
                className="h-8 w-auto"
              />
              <div className="hidden sm:block">
                <h1 className="text-xl font-semibold">Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {clientData.full_name || 'Client'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Agency Connection Banner */}
      {currentAgentAgency && (
        <div className="bg-primary/5 border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-center text-center">
              <Link className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
              <span className="text-sm font-medium text-primary">
                Connected to {currentAgentAgency.agencyName}
                {currentAgentAgency.agentName && (
                  <span className="text-muted-foreground"> • {currentAgentAgency.agentName}</span>
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Home className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{properties.length}</p>
                  <p className="text-sm text-muted-foreground">Properties</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-full">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{tasks.filter(t => t.status !== 'completed').length}</p>
                  <p className="text-sm text-muted-foreground">Pending Tasks</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{submissions.length}</p>
                  <p className="text-sm text-muted-foreground">Submissions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Building className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{currentAgentAgency ? '1' : '0'}</p>
                  <p className="text-sm text-muted-foreground">Connections</p>
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
                  className="w-full"
                  size="lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Property
                </Button>
                
                {currentAgentAgency?.agencyName && (
                  <Button
                    onClick={() => setShowSubmissionModal(true)}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Submit to {currentAgentAgency.agencyName}
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
                    <Button onClick={handleAddProperty}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Property
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {properties.map((property) => (
                      <div key={property.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{property.title}</h3>
                            <p className="text-muted-foreground truncate">{property.location}</p>
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            {getPropertyStatusBadge(property)}
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
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tasks */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Tasks & Updates ({tasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No tasks assigned yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {tasks.map((task) => (
                      <div key={task.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start gap-3">
                          {task.status === 'completed' ? (
                            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                          ) : task.status === 'in_progress' ? (
                            <Clock className="w-5 h-5 text-blue-500 mt-0.5" />
                          ) : task.status === 'action_required' ? (
                            <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                          ) : (
                            <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-foreground">{task.title}</h3>
                            {task.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                            )}
                            {task.action_required && (
                              <div className="mt-3 p-3 bg-orange-50 rounded-md border border-orange-200">
                                <p className="text-sm font-medium text-orange-800">Action Required:</p>
                                <p className="text-sm text-orange-700 mt-1">{task.action_required}</p>
                              </div>
                            )}
                            {task.due_date && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Due: {new Date(task.due_date).toLocaleDateString()}
                              </p>
                            )}
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
      {currentAgentAgency && clientData && (
        <PropertySubmissionModal
          isOpen={showSubmissionModal}
          onClose={() => setShowSubmissionModal(false)}
          properties={properties}
          clientData={clientData}
          agentAgencyInfo={currentAgentAgency}
          onSubmissionComplete={handleSubmissionComplete}
        />
      )}
    </div>
  );
};

export default ClientDashboard;