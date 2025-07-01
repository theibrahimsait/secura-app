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
  const [referralLink, setReferralLink] = useState<string>('');
  const [agencyName, setAgencyName] = useState<string>('');

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

  const fetchOrCreateReferralLink = async () => {
    if (!userProfile?.id || !userProfile?.agency_id) return;
    
    try {
      // First try to get existing referral link
      const { data: existingLink, error: fetchError } = await supabase
        .from('agent_referral_links')
        .select('ref_token')
        .eq('agent_id', userProfile.id)
        .eq('agency_id', userProfile.agency_id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingLink) {
        // Link exists, use it
        const linkUrl = `/client/onboarding?ref=${existingLink.ref_token}`;
        setReferralLink(linkUrl);
      } else {
        // Create new referral link
        const { data: newLink, error: createError } = await supabase
          .from('agent_referral_links')
          .insert({
            agent_id: userProfile.id,
            agency_id: userProfile.agency_id,
            is_active: true
          })
          .select('ref_token')
          .single();

        if (createError) throw createError;

        const linkUrl = `/client/onboarding?ref=${newLink.ref_token}`;
        setReferralLink(linkUrl);
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

  useEffect(() => {
    if (userProfile) {
      fetchClientsAndProperties();
      fetchOrCreateReferralLink();
      fetchAgencyName();
    }
  }, [userProfile]);

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
