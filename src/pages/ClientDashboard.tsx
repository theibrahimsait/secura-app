import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Home, 
  Plus, 
  FileText, 
  Bell, 
  LogOut, 
  Building,
  MapPin,
  Bed,
  Bath,
  Square
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ClientInfo {
  id: string;
  phone: string;
  full_name: string | null;
  agent_ref?: string;
}

interface Property {
  id: string;
  title: string;
  property_type: string;
  location: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  action_required: string | null;
  due_date: string | null;
  created_at: string;
}

const ClientDashboard = () => {
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if client is logged in - use the correct localStorage key
    const storedClient = localStorage.getItem('client_data');
    if (!storedClient) {
      navigate('/client/login');
      return;
    }

    const client = JSON.parse(storedClient);
    setClientInfo(client);
    fetchClientData(client.id);
  }, [navigate]);

  const fetchClientData = async (clientId: string) => {
    try {
      // Fetch properties
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('client_properties')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (propertiesError) throw propertiesError;

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('client_tasks')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      setProperties(propertiesData || []);
      setTasks(tasksData || []);
    } catch (error: any) {
      console.error('Error fetching client data:', error);
      toast({
        title: "Error",
        description: "Failed to load your data. Please try again.",
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

  const getPropertyTypeIcon = (type: string) => {
    switch (type) {
      case 'apartment':
      case 'penthouse':
      case 'studio':
        return Building;
      case 'villa':
      case 'townhouse':
        return Home;
      default:
        return Building;
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'action_required':
        return 'destructive';
      case 'in_progress':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatPropertyType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading your portfolio...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src="https://ngmwdebxyofxudrbesqs.supabase.co/storage/v1/object/public/nullstack//securaa.svg" 
                alt="Secura" 
                className="h-8 w-auto"
              />
              <div>
                <h1 className="text-xl font-bold text-secura-black">My Portfolio</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {clientInfo?.full_name || 'Client'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="relative"
              >
                <Bell className="w-4 h-4" />
                {tasks.filter(t => t.status === 'action_required').length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-secura-lime/10 flex items-center justify-center">
                  <Home className="w-6 h-6 text-secura-teal" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">My Properties</p>
                  <p className="text-2xl font-bold text-secura-black">{properties.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-secura-mint/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-secura-moss" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Tasks</p>
                  <p className="text-2xl font-bold text-secura-black">
                    {tasks.filter(t => t.status !== 'completed').length}
                  </p>
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
                  <p className="text-sm text-muted-foreground">Action Required</p>
                  <p className="text-2xl font-bold text-secura-black">
                    {tasks.filter(t => t.status === 'action_required').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Properties Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-secura-black">My Properties</h2>
              <Button
                onClick={() => navigate('/client/add-property')}
                className="bg-secura-teal hover:bg-secura-teal/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Property
              </Button>
            </div>

            <div className="space-y-4">
              {properties.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Home className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No Properties Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start building your portfolio by adding your first property
                    </p>
                    <Button
                      onClick={() => navigate('/client/add-property')}
                      className="bg-secura-teal hover:bg-secura-teal/90"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Property
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                properties.map((property) => {
                  const PropertyIcon = getPropertyTypeIcon(property.property_type);
                  return (
                    <Card key={property.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 rounded-xl bg-secura-lime/10 flex items-center justify-center">
                            <PropertyIcon className="w-6 h-6 text-secura-teal" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-secura-black mb-1">{property.title}</h3>
                            <div className="flex items-center text-sm text-muted-foreground mb-2">
                              <MapPin className="w-4 h-4 mr-1" />
                              {property.location}
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span className="flex items-center">
                                <Badge variant="outline" className="mr-2">
                                  {formatPropertyType(property.property_type)}
                                </Badge>
                              </span>
                              {property.bedrooms && (
                                <span className="flex items-center">
                                  <Bed className="w-4 h-4 mr-1" />
                                  {property.bedrooms}
                                </span>
                              )}
                              {property.bathrooms && (
                                <span className="flex items-center">
                                  <Bath className="w-4 h-4 mr-1" />
                                  {property.bathrooms}
                                </span>
                              )}
                              {property.area_sqft && (
                                <span className="flex items-center">
                                  <Square className="w-4 h-4 mr-1" />
                                  {property.area_sqft} sqft
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {/* Tasks Section */}
          <div>
            <h2 className="text-xl font-semibold text-secura-black mb-6">Pending Tasks</h2>
            <div className="space-y-4">
              {tasks.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No Tasks</h3>
                    <p className="text-muted-foreground">
                      You're all caught up! No pending tasks at the moment.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                tasks.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-secura-black">{task.title}</h3>
                            <Badge variant={getTaskStatusColor(task.status)}>
                              {task.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                          )}
                          {task.action_required && (
                            <p className="text-sm text-secura-teal font-medium mb-3">
                              Action Required: {task.action_required}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Created: {new Date(task.created_at).toLocaleDateString()}
                            {task.due_date && (
                              <span className="ml-4">
                                Due: {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </p>
                        </div>
                        {task.status === 'action_required' && (
                          <Button size="sm" className="bg-secura-teal hover:bg-secura-teal/90">
                            Take Action
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClientDashboard;
