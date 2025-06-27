
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, Users, User, Activity, LogOut, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Agent {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  is_active: boolean;
  auth_user_id: string | null;
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
  const [resendLoading, setResendLoading] = useState<string | null>(null);
  const [form, setForm] = useState<CreateAgentForm>({
    fullName: '',
    email: '',
    phone: '',
  });

  const fetchAgents = async () => {
    if (!userProfile?.agency_id) {
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('agency_id', userProfile.agency_id)
        .eq('role', 'agent')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching agents:', error);
        throw error;
      }
      
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

  const resendWelcomeEmail = async (agent: Agent) => {
    if (!agent.auth_user_id) {
      toast({
        title: "Error",
        description: "This agent cannot have their password reset as they have not logged in yet.",
        variant: "destructive",
      });
      return;
    }

    setResendLoading(agent.id);
    try {
      const newPassword = generateSecurePassword();
      const { data: emailData, error: emailError } = await supabase.functions.invoke('create-user', {
        body: {
          email: agent.email,
          password: newPassword,
          fullName: agent.full_name,
          isPasswordReset: true,
          userId: agent.auth_user_id,
          role: 'agent',
        },
      });

      if (emailError) throw emailError;

      if (!emailData.success) {
        throw new Error(emailData.error || 'Failed to send welcome email');
      }

      toast({
        title: "Email Sent Successfully",
        description: `New welcome email with updated credentials sent to ${agent.email}`,
        duration: 8000,
      });

    } catch (error: any) {
      console.error('Error resending welcome email:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to resend welcome email",
        variant: "destructive",
      });
    } finally {
      setResendLoading(null);
    }
  };

  const createAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);

    try {
      const tempPassword = generateSecurePassword();

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

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to create agent account');
      }

      toast({
        title: "Agent Created Successfully",
        description: `Welcome email with login credentials has been sent to ${form.email}`,
        duration: 8000,
      });

      setForm({ fullName: '', email: '', phone: '' });
      setCreateDialogOpen(false);
      fetchAgents();

    } catch (error: any) {
      console.error('Error creating agent:', error);
      toast({
        title: "Error Creating Agent",
        description: error.message || "Failed to create agent",
        variant: "destructive",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  useEffect(() => {
    if(userProfile) {
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
              <div className="w-10 h-10 rounded-xl secura-gradient flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
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
        {/* Stats Cards and Actions */}
        <div className="flex justify-between items-center mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-secura-lime/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-secura-teal" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Agents</p>
                    <p className="text-2xl font-bold">{agents.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-secura-lime/10 flex items-center justify-center">
                    <Activity className="w-6 h-6 text-secura-teal" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Agents</p>
                    <p className="text-2xl font-bold">{agents.filter(a => a.is_active).length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-secura-teal hover:bg-secura-teal/90 text-white font-semibold">
                <Plus className="w-4 h-4 mr-2" />
                Add New Agent
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Agent</DialogTitle>
                <DialogDescription>Create a new agent account for your agency</DialogDescription>
              </DialogHeader>
              <form onSubmit={createAgent} className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" value={form.fullName} onChange={(e) => setForm({...form, fullName: e.target.value})} required />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} required />
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createLoading}>
                    {createLoading ? 'Adding...' : 'Add Agent'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Agents Table */}
        <Card>
          <CardHeader>
            <CardTitle>Agents</CardTitle>
            <CardDescription>A list of all agents in your agency.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined On</th>
                    <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr><td colSpan={5} className="text-center py-8">Loading agents...</td></tr>
                  ) : agents.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8">No agents found.</td></tr>
                  ) : (
                    agents.map((agent) => (
                      <tr key={agent.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="w-5 h-5 mr-3 text-gray-500"/>
                            <span className="font-medium">{agent.full_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{agent.email}</div>
                          <div className="text-sm text-gray-500">{agent.phone || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={agent.is_active ? 'default' : 'destructive'}>
                            {agent.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(agent.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resendWelcomeEmail(agent)}
                            disabled={resendLoading === agent.id}
                          >
                            <Mail className="w-4 h-4 mr-2" />
                            {resendLoading === agent.id ? 'Sending...' : 'Resend Welcome'}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AgencyDashboard;
