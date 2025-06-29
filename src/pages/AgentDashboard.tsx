
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
  CheckCircle
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
  const [referralLinks, setReferralLinks] = useState<ReferralLink[]>([]);

  // State for dialogs and forms
  const [generateLinkDialogOpen, setGenerateLinkDialogOpen] = useState(false);
  const [generateLinkLoading, setGenerateLinkLoading] = useState(false);
  const [linkForm, setLinkForm] = useState<GenerateLinkForm>({
    clientName: '',
    clientPhone: '',
  });

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    window.location.href = "/login";
    return null;
  }

  const fetchClientsAndProperties = async () => {
    if (!userProfile?.id) return;

    try {
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
        client_name: p.clients?.full_name || 'N/A',
      }));

      const uniqueClients = Array.from(new Map(propertyData.map((p: any) => [p.clients?.id, p.clients])).values()).filter(Boolean);

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

  const fetchReferralLinks = async () => {
    if (!userProfile?.id) return;

    try {
      const { data, error } = await supabase
        .from('agent_referral_links')
        .select('*')
        .eq('agent_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReferralLinks(data || []);
    } catch (error: any) {
      console.error('Error fetching referral links:', error);
    }
  };

  useEffect(() => {
    if (userProfile) {
      fetchClientsAndProperties();
      fetchReferralLinks();
    }
  }, [userProfile]);

  const handleGenerateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.id || !userProfile?.agency_id) return;
    
    setGenerateLinkLoading(true);

    try {
      const { data, error } = await supabase
        .from('agent_referral_links')
        .insert({
          agent_id: userProfile.id,
          agency_id: userProfile.agency_id,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      // Generate the full URL
      const referralUrl = `${window.location.origin}/client/login?ref=${data.ref_token}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(referralUrl);
      
      toast({
        title: "Link Generated & Copied!",
        description: `Referral link for ${linkForm.clientName} has been copied to your clipboard.`,
      });

      // Refresh the links list
      fetchReferralLinks();
      
      // Reset form and close dialog
      setLinkForm({ clientName: '', clientPhone: '' });
      setGenerateLinkDialogOpen(false);
    } catch (error: any) {
      console.error('Error generating link:', error);
      toast({
        title: "Error",
        description: "Failed to generate referral link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerateLinkLoading(false);
    }
  };

  const copyToClipboard = async (token: string) => {
    const referralUrl = `${window.location.origin}/client/login?ref=${token}`;
    try {
      await navigator.clipboard.writeText(referralUrl);
      toast({
        title: "Link Copied!",
        description: "Referral link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  const toggleLinkStatus = async (linkId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('agent_referral_links')
        .update({ is_active: !currentStatus })
        .eq('id', linkId);

      if (error) throw error;

      toast({
        title: "Link Updated",
        description: `Link ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });

      fetchReferralLinks();
    } catch (error: any) {
      console.error('Error updating link:', error);
      toast({
        title: "Error",
        description: "Failed to update link status",
        variant: "destructive",
      });
    }
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
                  <LinkIcon className="w-6 h-6 text-secura-teal" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Referral Links</p>
                  <p className="text-2xl font-bold text-secura-black">{referralLinks.length}</p>
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
                  Client Referral Links
                </CardTitle>
                <CardDescription>Generate and manage secure links for clients to access their portal</CardDescription>
              </div>
              <Dialog open={generateLinkDialogOpen} onOpenChange={setGenerateLinkDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-secura-lime hover:bg-secura-lime/90 text-secura-teal">
                    <Plus className="w-4 h-4 mr-2" />
                    Generate New Link
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Generate Client Referral Link</DialogTitle>
                    <DialogDescription>
                      Create a secure referral link. You can share this with potential clients.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleGenerateLink} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="clientName">Client Name (Optional)</Label>
                      <Input
                        id="clientName"
                        value={linkForm.clientName}
                        onChange={(e) => setLinkForm({ ...linkForm, clientName: e.target.value })}
                        placeholder="Enter client's name for reference"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientPhone">Client Phone (Optional)</Label>
                      <Input
                        id="clientPhone"
                        value={linkForm.clientPhone}
                        onChange={(e) => setLinkForm({ ...linkForm, clientPhone: e.target.value })}
                        placeholder="Enter client's phone for reference"
                      />
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
                        {generateLinkLoading ? 'Generating...' : 'Generate & Copy Link'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {referralLinks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Link Token</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referralLinks.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell className="font-mono text-sm">
                        {link.ref_token.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <Badge variant={link.is_active ? "default" : "secondary"}>
                          {link.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(link.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {link.last_used_at ? new Date(link.last_used_at).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(link.ref_token)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleLinkStatus(link.id, link.is_active)}
                          >
                            {link.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <LinkIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No referral links generated yet</p>
                <p className="text-sm">Click "Generate New Link" to create your first referral link</p>
              </div>
            )}
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
                        <TableCell className="font-medium">{client.full_name || 'N/A'}</TableCell>
                        <TableCell>
                          <div>{client.email || 'N/A'}</div>
                          <div className="text-muted-foreground">{client.phone}</div>
                        </TableCell>
                        <TableCell>{new Date(client.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
      </main>
    </div>
  );
};

export default AgentDashboard;
