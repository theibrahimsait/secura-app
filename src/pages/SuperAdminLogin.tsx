
import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SuperAdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, isSuperAdmin, isAuthenticated } = useAuth();
  console.log({signIn, isSuperAdmin, isAuthenticated});
  
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if already authenticated as superadmin
  if (isAuthenticated && isSuperAdmin) {
    return <Navigate to="/superadmin/dashboard" replace />;
  }

  // Redirect non-superadmin users
  if (isAuthenticated && !isSuperAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        toast({
          title: "Authentication Failed",
          description: error,
          variant: "destructive",
        });
      } else {
        window.location.reload();
      }
    } catch (error) {
      toast({
        title: "Authentication Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secura-teal via-secura-moss to-secura-black p-6">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-8">
            <div className="mx-auto w-16 h-16 rounded-2xl secura-gradient flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-secura-black">
              Secura Control Panel
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Authorized personnel only
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-secura-black font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="pl-4 h-12 border-2 focus:border-secura-teal"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-secura-black font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="pl-4 h-12 border-2 focus:border-secura-teal"
                  />
                  <Lock className="absolute right-3 top-3 h-6 w-6 text-muted-foreground" />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-secura-lime hover:bg-secura-lime/90 text-secura-teal font-semibold text-lg rounded-xl transition-all duration-300 hover:scale-105"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-secura-teal"></div>
                    <span>Authenticating...</span>
                  </div>
                ) : (
                  'Access Control Panel'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <div className="text-center mt-6">
          <p className="text-white/70 text-sm">
            This is a restricted access system
          </p>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
