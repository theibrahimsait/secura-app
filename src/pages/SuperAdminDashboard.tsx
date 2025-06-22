
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, Users, Building, Activity, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Agency {
  id: string;
  name: string;
  email: string;
  created_at: string;
  is_active: boolean;
}

interface CreateAgencyForm {
  agencyName: string;
  adminName: string;
  adminEmail: string;
}

const SuperAdminDashboard = () => {
  const { signOut, userProfile } = useAuth();
  const { toast } = useToast();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [form, setForm] = useState<CreateAgencyForm>({
    agencyName: '',
    adminName: '',
    adminEmail: '',
  });

  const fetchAgencies = async () => {
    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgencies(data || []);
    } catch (error) {
      console.error('Error fetching agencies:', error);
      toast({
        title: "Error",
        description: "Failed to load agencies",
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

  const createAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);

    try {
      // Generate secure password
      const tempPassword = generateSecurePassword();

      // Create agency
      const { data: agencyData, error: agencyError } = await supabase
        .from('agencies')
        .insert({
          name: form.agencyName,
          email: form.adminEmail,
        })
        .select()
        .single();

      if (agencyError) throw agencyError;

      // Create user record
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          email: form.adminEmail,
          full_name: form.adminName,
          role: 'agency_admin',
          agency_id: agencyData.id,
          created_by: userProfile?.id,
        })
        .select()
        .single();

      if (userError) throw userError;

      // Create auth user with email notification
      const { data: authData, error: authError } = await supabase.functions.invoke('create-user', {
        body: {
          email: form.adminEmail,
          password: tempPassword,
          agencyName: form.agencyName,
          adminName: form.adminName,
        },
      });

      if (authError) throw authError;

      if (!authData.success) {
        throw new Error(authData.error || 'Failed to create user account');
      }

      // Update user record with auth_user_id
      const { error: updateError } = await supabase
        .from('users')
        .update({ auth_user_id: authData.data.user.id })
        .eq('id', userData.id);

      if (updateError) throw updateError;

      toast({
        title: "Agency Created Successfully",
        description: `Welcome email with login credentials has been sent to ${form.adminEmail}`,
        duration: 8000,
      });

      // Reset form and close dialog
      setForm({ agencyName: '', adminName: '', adminEmail: '' });
      setCreateDialogOpen(false);
      fetchAgencies();

    } catch (error: any) {
      console.error('Error creating agency:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create agency",
        variant: "destructive",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  useEffect(() => {
    fetchAgencies();
  }, []);

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
                <h1 className="text-2xl font-bold text-secura-black">Secura Control Panel</h1>
                <p className="text-sm text-muted-foreground">Super Administrator Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-secura-black">{userProfile?.full_name}</p>
                <p className="text-xs text-muted-foreground">Super Admin</p>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-secura-lime/10 flex items-center justify-center">
                  <Building className="w-6 h-6 text-secura-teal" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Agencies</p>
                  <p className="text-2xl font-bold text-secura-black">{agencies.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-secura-mint/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-secura-moss" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Agencies</p>
                  <p className="text-2xl font-bold text-secura-black">
                    {agencies.filter(a => a.is_active).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-secura-teal/10 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-secura-teal" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">System Status</p>
                  <p className="text-lg font-semibold text-green-600">Operational</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agencies Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl text-secura-black">Agencies Management</CardTitle>
                <CardDescription>Manage real estate agencies and their administrators</CardDescription>
              </div>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-secura-lime hover:bg-secura-lime/90 text-secura-teal">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Agency
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Agency</DialogTitle>
                    <DialogDescription>
                      Add a new real estate agency and create the admin account
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={createAgency} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="agencyName">Agency Name</Label>
                      <Input
                        id="agencyName"
                        value={form.agencyName}
                        onChange={(e) => setForm({ ...form, agencyName: e.target.value })}
                        placeholder="Enter agency name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adminName">Admin Full Name</Label>
                      <Input
                        id="adminName"
                        value={form.adminName}
                        onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                        placeholder="Enter admin name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adminEmail">Admin Email</Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        value={form.adminEmail}
                        onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                        placeholder="Enter admin email"
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
                        {createLoading ? 'Creating...' : 'Create Agency'}
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
            ) : agencies.length === 0 ? (
              <div className="text-center py-8">
                <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No agencies created yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {agencies.map((agency) => (
                  <div
                    key={agency.id}
                    className="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-secura-mint/20 flex items-center justify-center">
                        <Building className="w-5 h-5 text-secura-moss" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-secura-black">{agency.name}</h3>
                        <p className="text-sm text-muted-foreground">{agency.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant={agency.is_active ? "default" : "secondary"}>
                        {agency.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(agency.created_at).toLocaleDateString()}
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

export default SuperAdminDashboard;
