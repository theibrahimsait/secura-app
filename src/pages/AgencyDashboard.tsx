import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, Users, FileText, Activity, LogOut, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Agent {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  is_active: boolean;
  last_login: string | null;
}

interface CreateAgentForm {
  fullName: string;
  email: string;
  phone: string;
}

const AgencyDashboard = () => {
  const { signOut, userProfile } = useAuth();
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [form, setForm] = useState<CreateAgentForm>({
    fullName: '',
    email: '',
    phone: '',
  });

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('agency_id', userProfile?.agency_id)
        .eq('role', 'agent')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: "Error",
        description: "Failed to load agents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const createAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);

    try {
      // Generate secure password
      const tempPassword = generateSecurePassword();

      // Call the edge function to create agent
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

      if (error) {
        // This catches network errors or function invocation errors
        throw error;
      }

      if (!data.success) {
        // This catches errors reported by the function itself
        throw new Error(data.error || 'Failed to create agent account');
      }

      toast({
        title: 'Agent Created Successfully',
        description: `Welcome email sent to ${form.email}`,
      });

      // Reset form and close dialog
      setForm({ fullName: '', email: '', phone: '' });
      setCreateDialogOpen(false);
      fetchAgents();

    } catch (error: any) {
      console.error('Error creating agent:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create agent',
        variant: 'destructive',
      });
    } finally {
      setCreateLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile?.agency_id) {
      fetchAgents();
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
                <h1 className="text-2xl font-bold text-secura-black">Agency Dashboard</h1>
                <p className="text-sm text-muted-foreground">Manage your agents and operations</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-secura-black">{userProfile?.full_name}</p>
                <p className="text-xs text-muted-foreground">Agency Admin</p>
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
                  <p className="text-sm text-muted-foreground">Total Agents</p>
                  <p className="text-2xl font-bold text-secura-black">{agents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-secura-mint/20 flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-secura-moss" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Agents</p>
                  <p className="text-2xl font-bold text-secura-black">
                    {agents.filter(a => a.is_active).length}
                  </p>
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

        {/* Agents Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl text-secura-black">Agents Management</CardTitle>
                <CardDescription>Manage your real estate agents</CardDescription>
              </div>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-secura-lime hover:bg-secura-lime/90 text-secura-teal">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Agent
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Agent</DialogTitle>
                    <DialogDescription>
                      Create a new agent account for your agency
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={createAgent} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={form.fullName}
                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                        placeholder="Enter agent's full name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="Enter agent's email"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="Enter agent's phone"
                        required
                      />
                    </div>
                    <div className="flex space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCreateDialogOpen(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createLoading}
                        className="flex-1 bg-secura-lime hover:bg-secura-lime/90 text-secura-teal"
                      >
                        {createLoading ? 'Creating...' : 'Add Agent'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secura-teal"></div>
              </div>
            ) : agents.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No agents added yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-secura-mint/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-secura-moss" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-secura-black">{agent.full_name}</h3>
                        <p className="text-sm text-muted-foreground">{agent.email}</p>
                        {agent.phone && <p className="text-sm text-muted-foreground">{agent.phone}</p>}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant={agent.is_active ? "default" : "secondary"}>
                        {agent.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {agent.last_login 
                          ? `Last login: ${new Date(agent.last_login).toLocaleDateString()}`
                          : 'Never logged in'
                        }
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AgencyDashboard;
