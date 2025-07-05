import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Shield, 
  Plus, 
  Users, 
  FileText, 
  Activity, 
  LogOut, 
  Home, 
  Link as LinkIcon,
  Copy,
  Calendar,
  Clock,
  Phone,
  Mail,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Define interfaces for our data
interface Client {
  id: string;
  full_name: string | null;
  phone: string;
  email: string | null;
  created_at: string;
}

interface Property {
  id: string;
  location: string;
  property_type: string;
  client_id: string;
  created_at: string;
  client_name?: string;
}

interface GenerateLinkForm {
  clientName: string;
  clientPhone: string;
}

interface ReferralLink {
  id: string;
  ref_token: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

const AgentDashboard = () => {
  const { signOut, userProfile, loading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  // State for data
  const [clients, setClients] = useState<Client[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [referralLink, setReferralLink] = useState<string>('');
  const [agencyName, setAgencyName] = useState<string>('');
  
  // Pagination state
  const [clientsPage, setClientsPage] = useState(1);
  const [propertiesPage, setPropertiesPage] = useState(1);
  const clientsPerPage = 5;
  const propertiesPerPage = 5;
  
  // Client modal state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientProperties, setClientProperties] = useState<Property[]>([]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    window.location.href = "/login";
    return null;
  }

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

  const fetchClientsAndProperties = async () => {
    if (!userProfile?.id) return;

    try {
      console.log('Fetching data for agent:', userProfile.id);
      
      // Query with LEFT JOINs to preserve all submissions
      const { data: submissions, error: submissionsError } = await supabase
        .from('property_agency_submissions')
        .select(`
          *,
          client_properties (
            id,
            title,
            location,
            property_type,
            created_at,
            client_id,
            status
          ),
          clients (
            id,
            full_name,
            phone,
            email,
            created_at
          )
        `)
        .eq('agent_id', userProfile.id);

      console.log('Submissions with LEFT joins result:', { submissions, submissionsError });

      if (submissionsError) {
        console.error('Submissions error:', submissionsError);
        throw submissionsError;
      }

      if (!submissions || submissions.length === 0) {
        console.log('No submissions found for agent');
        setClients([]);
        setProperties([]);
        return;
      }

      // DIAGNOSTIC LOGGING
      console.log('=== DIAGNOSTIC INFO ===');
      submissions.forEach((submission, index) => {
        console.log(`Submission ${index + 1}:`, {
          id: submission.id,
          property_id: submission.property_id,
          client_id: submission.client_id,
          client_properties_exists: !!submission.client_properties,
          client_properties_id: submission.client_properties?.id,
          clients_exists: !!submission.clients,
          clients_id: submission.clients?.id
        });
      });

      // Check if we can fetch properties directly using property_id
      console.log('Attempting direct property fetch for missing properties...');
      const missingPropertyIds = submissions
        .filter(s => !s.client_properties && s.property_id)
        .map(s => s.property_id);
      
      let directProperties = [];
      if (missingPropertyIds.length > 0) {
        console.log('Fetching missing properties directly:', missingPropertyIds);
        const { data: directProps, error: directError } = await supabase
          .from('client_properties')
          .select('*')
          .in('id', missingPropertyIds);
        
        if (!directError && directProps) {
          directProperties = directProps;
          console.log('Direct property fetch results:', directProperties);
        }
      }

      // Extract unique clients (filter out null clients)
      const clientsMap = new Map();
      submissions.forEach(submission => {
        if (submission.clients && submission.clients.id) {
          clientsMap.set(submission.clients.id, submission.clients);
        }
      });
      const uniqueClients = Array.from(clientsMap.values());
      
      // Extract properties with client names - include both joined and directly fetched
      const propertiesWithClients: Property[] = [];
      
      // Add properties from successful joins
      submissions
        .filter(submission => submission.client_properties && submission.client_properties.id)
        .forEach(submission => {
          propertiesWithClients.push({
            id: submission.client_properties.id,
            location: submission.client_properties.location,
            property_type: submission.client_properties.property_type,
            client_id: submission.client_properties.client_id,
            created_at: submission.client_properties.created_at,
            client_name: submission.clients?.full_name || 'N/A'
          });
        });

      // Add properties from direct fetch
      directProperties.forEach(prop => {
        const matchingSubmission = submissions.find(s => s.property_id === prop.id);
        propertiesWithClients.push({
          id: prop.id,
          location: prop.location,
          property_type: prop.property_type,
          client_id: prop.client_id,
          created_at: prop.created_at,
          client_name: matchingSubmission?.clients?.full_name || 'N/A'
        });
      });

      console.log('Final processed data:', { 
        clients: uniqueClients, 
        properties: propertiesWithClients,
        submissionsCount: submissions.length,
        validSubmissions: submissions.filter(s => s.client_properties && s.clients),
        directlyFetchedProperties: directProperties.length
      });

      setClients(uniqueClients);
      setProperties(propertiesWithClients);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data.",
        variant: "destructive",
      });
    }
  };

  const fetchOrCreateReferralLink = async () => {
    if (!userProfile?.id || !userProfile?.agency_id) return;
    
    try {
      // Try to fetch existing referral link
      const { data, error } = await supabase
        .from('referral_links')
        .select('id, slug, url')
        .eq('agent_id', userProfile.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching referral link:', error);
        toast({
          title: "Error",
          description: "Failed to load referral link.",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        // Use existing referral link
        setReferralLink(`/client/login?ref=${data.id}`);
      } else {
        // Create new referral link if none exists
        const agentSlug = userProfile.full_name?.toLowerCase().replace(/\s+/g, '-') || 'agent';
        const uniqueSlug = `${agentSlug}-${Date.now()}`;
        
        const { data: newLink, error: createError } = await supabase
          .from('referral_links')
          .insert({
            agent_id: userProfile.id,
            agency_id: userProfile.agency_id,
            slug: uniqueSlug,
            url: `/client/login?ref=`
          })
          .select('id')
          .single();

        if (createError) {
          console.error('Error creating referral link:', createError);
          toast({
            title: "Error",
            description: "Failed to create referral link.",
            variant: "destructive",
          });
          return;
        }

        if (newLink) {
          setReferralLink(`/client/login?ref=${newLink.id}`);
        }
      }
    } catch (error: any) {
      console.error('Error with referral link:', error);
      toast({
        title: "Error",
        description: "Failed to load referral link.",
        variant: "destructive",
      });
    }
  };

  const fetchClientProperties = async (clientId: string) => {
    try {
      console.log('Fetching properties for client:', clientId);
      
      const { data: clientSubmissions, error } = await supabase
        .from('property_agency_submissions')
        .select('*')
        .eq('agent_id', userProfile?.id)
        .eq('client_id', clientId);

      console.log('Client submissions:', clientSubmissions);

      if (error) throw error;

      const clientPropsData = [];
      
      if (clientSubmissions && clientSubmissions.length > 0) {
        for (const submission of clientSubmissions) {
          if (submission.property_id) {
            const { data: propertyData, error: propError } = await supabase
              .from('client_properties')
              .select('*')
              .eq('id', submission.property_id)
              .single();

            if (!propError && propertyData) {
              clientPropsData.push({
                id: propertyData.id,
                location: propertyData.location,
                property_type: propertyData.property_type,
                client_id: clientId,
                created_at: propertyData.created_at,
                status: propertyData.status || 'submitted'
              });
            }
          }
        }
      }

      console.log('Client properties data:', clientPropsData);
      setClientProperties(clientPropsData);
    } catch (error) {
      console.error('Error fetching client properties:', error);
      toast({
        title: "Error",
        description: "Failed to load client properties.",
        variant: "destructive",
      });
    }
  };

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    fetchClientProperties(client.id);
  };

  // Pagination calculations
  const totalClientsPages = Math.ceil(clients.length / clientsPerPage);
  const totalPropertiesPages = Math.ceil(properties.length / propertiesPerPage);
  
  const paginatedClients = clients.slice(
    (clientsPage - 1) * clientsPerPage,
    clientsPage * clientsPerPage
  );
  
  const paginatedProperties = properties.slice(
    (propertiesPage - 1) * propertiesPerPage,
    propertiesPage * propertiesPerPage
  );

  useEffect(() => {
    if (userProfile) {
      fetchClientsAndProperties();
      fetchAgencyName();
    }
  }, [userProfile]);

  useEffect(() => {
    if (agencyName && userProfile) {
      fetchOrCreateReferralLink();
    }
  }, [agencyName, userProfile]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src="https://ngmwdebxyofxudrbesqs.supabase.co/storage/v1/object/public/nullstack//securaa.svg" 
                alt="Secura" 
                className="h-8 w-auto"
              />
              <div>
                <h1 className="text-2xl font-bold text-secura-black">Agent Dashboard</h1>
                <p className="text-sm text-muted-foreground">Manage your clients and properties</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-secura-black">{userProfile?.full_name}</p>
                <p className="text-xs text-muted-foreground">{agencyName || 'Real Estate Agent'}</p>
              </div>
              <Button
                onClick={signOut}
                variant="outline"
                className="border-secura-moss text-secura-black hover:bg-secura-moss/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-secura-lime/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-secura-teal" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Clients</p>
                  <p className="text-2xl font-bold text-secura-black">{clients.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-secura-mint/20 flex items-center justify-center">
                  <Home className="w-6 h-6 text-secura-moss" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Properties</p>
                  <p className="text-2xl font-bold text-secura-black">{properties.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-secura-teal/10 flex items-center justify-center">
                  <LinkIcon className="w-6 h-6 text-secura-teal" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Referral Links</p>
                  <p className="text-2xl font-bold text-secura-black">{referralLink ? '1' : '0'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="text-lg font-semibold text-green-600">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Permanent Referral Link */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Permanent Referral Link</CardTitle>
            <CardDescription>
              This is your permanent referral link. Share it with clients to onboard them. The link will always be the same.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Input
              value={referralLink ? `${window.location.origin}${referralLink}` : ''}
              readOnly
              className="w-full"
              onClick={e => (e.target as HTMLInputElement).select()}
            />
            <Button
              variant="outline"
              onClick={async () => {
                if (referralLink) {
                  await navigator.clipboard.writeText(`${window.location.origin}${referralLink}`);
                  toast({ title: 'Copied!', description: 'Referral link copied to clipboard.' });
                }
              }}
            >
              <Copy className="w-4 h-4 mr-1" /> Copy
            </Button>
          </CardContent>
        </Card>

        {/* Recent Clients */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>My Clients</CardTitle>
              <CardDescription>A list of your most recent clients</CardDescription>
            </CardHeader>
            <CardContent>
              {clients.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Added On</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedClients.map((client) => (
                        <TableRow key={client.id} className="hover:bg-muted/50 cursor-pointer">
                          <TableCell className="font-medium">{client.full_name || 'N/A'}</TableCell>
                          <TableCell>
                            <div>{client.email || 'N/A'}</div>
                            <div className="text-muted-foreground">{client.phone}</div>
                          </TableCell>
                          <TableCell>{new Date(client.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleClientClick(client)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Properties
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {totalClientsPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {(clientsPage - 1) * clientsPerPage + 1} to {Math.min(clientsPage * clientsPerPage, clients.length)} of {clients.length} clients
                      </p>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={clientsPage === 1}
                          onClick={() => setClientsPage(clientsPage - 1)}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm">
                          Page {clientsPage} of {totalClientsPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={clientsPage === totalClientsPages}
                          onClick={() => setClientsPage(clientsPage + 1)}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No clients yet</p>
                  <p className="text-sm">Share your referral links to get started</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Properties */}
          <Card>
            <CardHeader>
              <CardTitle>My Properties</CardTitle>
              <CardDescription>A list of properties you manage</CardDescription>
            </CardHeader>
            <CardContent>
              {properties.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Added On</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedProperties.map((property) => (
                        <TableRow key={property.id}>
                          <TableCell>
                            <div className="font-medium">{property.location}</div>
                            <div className="text-muted-foreground">{property.property_type}</div>
                          </TableCell>
                          <TableCell>{property.client_name}</TableCell>
                          <TableCell>{new Date(property.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {totalPropertiesPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {(propertiesPage - 1) * propertiesPerPage + 1} to {Math.min(propertiesPage * propertiesPerPage, properties.length)} of {properties.length} properties
                      </p>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={propertiesPage === 1}
                          onClick={() => setPropertiesPage(propertiesPage - 1)}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm">
                          Page {propertiesPage} of {totalPropertiesPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={propertiesPage === totalPropertiesPages}
                          onClick={() => setPropertiesPage(propertiesPage + 1)}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Home className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No properties yet</p>
                  <p className="text-sm">Properties will appear here when clients submit them</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Client Properties Modal */}
        <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                {selectedClient?.full_name || 'Client'} - Properties
              </DialogTitle>
              <DialogDescription>
                All properties submitted by this client
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-4">
              {clientProperties.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientProperties.map((property: any) => (
                      <TableRow key={property.id}>
                        <TableCell>
                          <div className="font-medium">{property.location}</div>
                        </TableCell>
                        <TableCell className="capitalize">{property.property_type}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {property.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(property.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Home className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No properties found for this client</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AgentDashboard;
