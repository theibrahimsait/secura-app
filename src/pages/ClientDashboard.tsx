
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Plus, FileText, CheckCircle, Clock, AlertCircle, User, Send } from 'lucide-react';
import ClientDashboardMobile from '@/components/ClientDashboardMobile';
import AgencySubmissionModal from '@/components/AgencySubmissionModal';

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
  status: string;
  submitted_at: string;
  agencies: {
    name: string;
  };
}

const ClientDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<PropertySubmission[]>([]);
  const [agencyInfo, setAgencyInfo] = useState<{ name: string } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

      // Load agency info if available
      if (client.agency_id) {
        const { data: agencyData } = await supabase
          .from('agencies')
          .select('name')
          .eq('id', client.agency_id)
          .single();
        
        if (agencyData) {
          setAgencyInfo({ name: agencyData.name });
        }
      }

      // Load properties
      const { data: propertiesData } = await supabase
        .from('client_properties')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (propertiesData) {
        setProperties(propertiesData);
      }

      // Load property submissions
      const { data: submissionsData } = await supabase
        .from('property_agency_submissions')
        .select(`
          id,
          property_id,
          agency_id,
          status,
          submitted_at,
          agencies (name)
        `)
        .eq('client_id', client.id)
        .order('submitted_at', { ascending: false });

      if (submissionsData) {
        setSubmissions(submissionsData);
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
      return <Badge className="bg-blue-100 text-blue-800">In Portfolio</Badge>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {propertySubmissions.map((submission) => (
          <Badge 
            key={submission.id}
            className={`text-xs ${
              submission.status === 'submitted' ? 'bg-yellow-100 text-yellow-800'
              : submission.status === 'under_review' ? 'bg-orange-100 text-orange-800'
              : submission.status === 'approved' ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
            }`}
          >
            {submission.agencies.name} - {submission.status.replace('_', ' ')}
          </Badge>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secura-lime mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!clientData) {
    return null;
  }

  // Mobile view
  if (isMobile) {
    return (
      <div className="relative">
        <ClientDashboardMobile
          properties={properties}
          tasks={tasks}
          onAddProperty={handleAddProperty}
        />
        
        {/* Mobile Header with logout */}
        <div className="fixed top-0 left-0 right-0 bg-white shadow-sm border-b z-10 p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <User className="w-5 h-5 mr-2 text-secura-teal" />
              <span className="font-medium text-sm truncate">
                {clientData.full_name || 'Client'}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-600"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Add top padding to account for fixed header */}
        <div className="pt-16"></div>
      </div>
    );
  }

  // Desktop view
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <img 
                src="https://ngmwdebxyofxudrbesqs.supabase.co/storage/v1/object/public/nullstack//securaa.svg" 
                alt="Secura" 
                className="h-8 w-auto mr-4"
              />
              <div>
                <h1 className="text-xl font-bold text-secura-black">Client Dashboard</h1>
                <p className="text-sm text-gray-600">
                  Welcome back, {clientData.full_name || 'Client'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="flex items-center"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Manage your properties</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={handleAddProperty}
                  className="w-full bg-secura-lime hover:bg-secura-lime/90 text-secura-teal"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Property
                </Button>
                
                {/* Show agency submission button if client has an assigned agency */}
                {clientData.agency_id && agencyInfo && (
                  <Button
                    onClick={() => setShowSubmissionModal(true)}
                    variant="outline"
                    className="w-full border-secura-lime text-secura-teal hover:bg-secura-lime/10"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Submit to {agencyInfo.name}
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
                  <div className="text-center py-8">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No properties yet</h3>
                    <p className="text-gray-600 mb-4">Start by adding your first property</p>
                    <Button onClick={handleAddProperty} className="bg-secura-lime hover:bg-secura-lime/90 text-secura-teal">
                      Add Property
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {properties.map((property) => (
                      <div key={property.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">{property.title}</h3>
                            <p className="text-gray-500 truncate">{property.location}</p>
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            {getPropertyStatusBadge(property)}
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-gray-500">
                          <span className="capitalize">{property.property_type}</span>
                          <span>{new Date(property.created_at).toLocaleDateString()}</span>
                        </div>
                        {(property.bedrooms || property.bathrooms || property.area_sqft) && (
                          <div className="flex gap-4 mt-2 text-gray-600">
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
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-600">No tasks assigned yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tasks.map((task) => (
                      <div key={task.id} className="border rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          {task.status === 'completed' ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : task.status === 'in_progress' ? (
                            <Clock className="w-4 h-4 text-blue-500" />
                          ) : task.status === 'action_required' ? (
                            <AlertCircle className="w-4 h-4 text-orange-500" />
                          ) : (
                            <Clock className="w-4 h-4 text-gray-500" />
                          )}
                          <div>
                            <h3 className="font-medium text-gray-900">{task.title}</h3>
                            {task.description && (
                              <p className="text-gray-600 mt-1 line-clamp-2">{task.description}</p>
                            )}
                            {task.action_required && (
                              <div className="mt-2 p-2 bg-orange-50 rounded border border-orange-200">
                                <p className="text-orange-800 font-medium">Action Required:</p>
                                <p className="text-orange-700">{task.action_required}</p>
                              </div>
                            )}
                            {task.due_date && (
                              <p className="text-gray-500 mt-2">
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
      </div>

      {/* Agency Submission Modal */}
      <AgencySubmissionModal
        isOpen={showSubmissionModal}
        onClose={() => setShowSubmissionModal(false)}
        clientData={clientData}
        onSubmissionComplete={handleSubmissionComplete}
      />
    </div>
  );
};

export default ClientDashboard;
