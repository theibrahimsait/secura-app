
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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

interface GenerateLinkForm {
  clientName: string;
  clientPhone: string;
  clientType: 'buyer' | 'seller';
}

const AgentDashboard = () => {
  const { signOut, userProfile } = useAuth();
  const { toast } = useToast();
  const [generateLinkDialogOpen, setGenerateLinkDialogOpen] = useState(false);
  const [generateLinkLoading, setGenerateLinkLoading] = useState(false);
  const [linkForm, setLinkForm] = useState<GenerateLinkForm>({
    clientName: '',
    clientPhone: '',
    clientType: 'buyer',
  });

  // Mock data for demonstration
  const mockClients = [
    {
      id: '1',
      name: 'John Smith',
      phone: '+1 (555) 123-4567',
      email: 'john.smith@email.com',
      type: 'Buyer',
      status: 'Active',
      created_at: '2024-01-15',
      last_activity: '2024-01-20'
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      phone: '+1 (555) 987-6543',
      email: 'sarah.j@email.com',
      type: 'Seller',
      status: 'Pending',
      created_at: '2024-01-18',
      last_activity: '2024-01-19'
    }
  ];

  const mockProperties = [
    {
      id: '1',
      address: '123 Main St, Downtown',
      type: 'Condo',
      client: 'John Smith',
      status: 'Active',
      created_at: '2024-01-16'
    },
    {
      id: '2',
      address: '456 Oak Ave, Suburbs',
      type: 'House',
      client: 'Sarah Johnson',
      status: 'Under Review',
      created_at: '2024-01-18'
    }
  ];

  const handleGenerateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerateLinkLoading(true);

    // TODO: Implement actual link generation
    setTimeout(() => {
      toast({
        title: "Secure Link Generated",
        description: `Link generated for ${linkForm.clientName}`,
      });
      setLinkForm({ clientName: '', clientPhone: '', clientType: 'buyer' });
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
                  <p className="text-2xl font-bold text-secura-black">{mockClients.length}</p>
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
                  <p className="text-2xl font-bold text-secura-black">{mockProperties.length}</p>
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
                        value={linkForm.clientType}
                        onValueChange={(value: 'buyer' | 'seller') => 
                          setLinkForm({ ...linkForm, clientType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select client type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="buyer">Buyer</SelectItem>
                          <SelectItem value="seller">Seller</SelectItem>
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

        {/* Clients Management */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl text-secura-black">Client Management</CardTitle>
            <CardDescription>Manage your clients and their information</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-secura-black">{client.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Added {new Date(client.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
                          <Phone className="w-4 h-4 mr-1 text-muted-foreground" />
                          {client.phone}
                        </div>
                        <div className="flex items-center text-sm">
                          <Mail className="w-4 h-4 mr-1 text-muted-foreground" />
                          {client.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={client.type === 'Buyer' ? 'default' : 'secondary'}>
                        {client.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={client.status === 'Active' ? 'default' : 'secondary'}>
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 mr-1" />
                        {new Date(client.last_activity).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(`https://secura.app/client/${client.id}`)}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy Link
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Properties Management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-secura-black">Properties</CardTitle>
            <CardDescription>Track properties and their documentation status</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockProperties.map((property) => (
                  <TableRow key={property.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-secura-black">{property.address}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{property.type}</Badge>
                    </TableCell>
                    <TableCell>{property.client}</TableCell>
                    <TableCell>
                      <Badge variant={property.status === 'Active' ? 'default' : 'secondary'}>
                        {property.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(property.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">
                        <FileText className="w-4 h-4 mr-1" />
                        View Docs
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AgentDashboard;
