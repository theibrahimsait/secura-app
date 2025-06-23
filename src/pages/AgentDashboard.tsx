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
  Mail
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
  client_name?: string; // Optional: to join client name
}

interface GenerateLinkForm {
  clientName: string;
  clientPhone: string;
  clientType: 'buy' | 'sell';
}

const AgentDashboard = () => {
  const { signOut, userProfile, loading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  // State for data
  const [clients, setClients] = useState<Client[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);

  // State for dialogs and forms
  const [generateLinkDialogOpen, setGenerateLinkDialogOpen] = useState(false);
  const [generateLinkLoading, setGenerateLinkLoading] = useState(false);
  const [linkForm, setLinkForm] = useState<GenerateLinkForm>({
    clientName: '',
    clientPhone: '',
    clientType: 'buy',
  });

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>; // You can replace with a spinner
  }

  if (!isAuthenticated) {
    window.location.href = "/login";
    return null;
  }

  const fetchClientsAndProperties = async () => {
    if (!userProfile?.id) return;

    try {
      // Fetch clients associated with this agent
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        // Assuming a linking table or direct relationship exists.
        // This will need adjustment based on your actual schema.
        // For now, let's assume properties link clients to agents.
        // We'll fetch properties first then get unique client IDs.

      if (clientError) throw clientError;

      // Fetch properties and their associated clients, filtered by the agent
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select(`
          *,
          clients (
            id,
            full_name,
            phone,
            email
          )
        `)
        .eq('agent_id', userProfile.id);

      if (propertyError) throw propertyError;

      // Process data
      const processedProperties: Property[] = propertyData.map((p: any) => ({
        ...p,
        client_name: p.clients.full_name || 'N/A',
      }));

      const uniqueClients = Array.from(new Map(propertyData.map((p: any) => [p.clients.id, p.clients])).values());

      setProperties(processedProperties);
      setClients(uniqueClients);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (userProfile) {
      fetchClientsAndProperties();
    }
  }, [userProfile]);


  const handleGenerateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerateLinkLoading(true);

    // TODO: Implement actual link generation
    setTimeout(() => {
      toast({
        title: "Secure Link Generated",
        description: `Link generated for ${linkForm.clientName}`,
      });
      setLinkForm({ clientName: '', clientPhone: '', clientType: 'buy' });
      setGenerateLinkDialogOpen(false);
      setGenerateLinkLoading(false);
    }, 1500);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: "Link copied successfully",
    });
  };

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
                <p className="text-xs text-muted-foreground">Real Estate Agent</p>
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
                  <FileText className="w-6 h-6 text-secura-teal" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Documents</p>
                  <p className="text-2xl font-bold text-secura-black">0</p>
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

        {/* Generate Secure Link Section */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl text-secura-black flex items-center">
                  <LinkIcon className="w-5 h-5 mr-2" />
                  Generate Secure Link
                </CardTitle>
                <CardDescription>Create secure links for clients to access their documents and information</CardDescription>
              </div>
              <Dialog open={generateLinkDialogOpen} onOpenChange={setGenerateLinkDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-secura-lime hover:bg-secura-lime/90 text-secura-teal">
                    <Plus className="w-4 h-4 mr-2" />
                    Generate Link
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Generate Secure Client Link</DialogTitle>
                    <DialogDescription>
                      Create a secure link for your client to access their documents and information
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleGenerateLink} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="clientName">Client Name</Label>
                      <Input
                        id="clientName"
                        value={linkForm.clientName}
                        onChange={(e) => setLinkForm({ ...linkForm, clientName: e.target.value })}
                        placeholder="Enter client's full name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientPhone">Client Phone</Label>
                      <Input
                        id="clientPhone"
                        value={linkForm.clientPhone}
                        onChange={(e) => setLinkForm({ ...linkForm, clientPhone: e.target.value })}
                        placeholder="Enter client's phone number"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientType">Client Type</Label>
                      <Select
                        onValueChange={(value: 'buy' | 'sell') => setLinkForm({ ...linkForm, clientType: value })}
                        defaultValue={linkForm.clientType}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select client type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="buy">Buyer</SelectItem>
                          <SelectItem value="sell">Seller</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setGenerateLinkDialogOpen(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={generateLinkLoading}
                        className="flex-1 bg-secura-lime hover:bg-secura-lime/90 text-secura-teal"
                      >
                        {generateLinkLoading ? 'Generating...' : 'Generate Link'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
        </Card>

        {/* Recent Clients */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>My Clients</CardTitle>
              <CardDescription>A list of your most recent clients</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Added On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.full_name}</TableCell>
                      <TableCell>
                        <div>{client.email || 'N/A'}</div>
                        <div className="text-muted-foreground">{client.phone}</div>
                      </TableCell>
                      <TableCell>{new Date(client.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent Properties */}
          <Card>
            <CardHeader>
              <CardTitle>My Properties</CardTitle>
              <CardDescription>A list of properties you manage</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Added On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.map((property) => (
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
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AgentDashboard;
