
import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, isAuthenticated, isAgencyAdmin, isAgent, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // Redirect if already authenticated
  if (isAuthenticated) {
    if (isAgencyAdmin) return <Navigate to="/agency/dashboard" replace />;
    if (isAgent) return <Navigate to="/agent/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    console.log('Starting login process for:', email);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        console.error('Login failed:', error);
        toast({
          title: "Login Failed",
          description: error,
          variant: "destructive",
        });
        setLoading(false);
      } else {
        console.log('Login request successful, waiting for auth state...');
        // Don't set loading to false here - let the auth state change handle it
        // The loading state will be cleared when auth context updates
        
        // Set a timeout to prevent infinite loading
        setTimeout(() => {
          if (loading) {
            console.log('Login timeout reached');
            setLoading(false);
            toast({
              title: "Login Timeout",
              description: "Login is taking longer than expected. Please try again.",
              variant: "destructive",
            });
          }
        }, 10000); // 10 second timeout
      }
    } catch (error) {
      console.error('Login exception:', error);
      setLoading(false);
      toast({
        title: "Login Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Show loading spinner while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secura-teal"></div>
          <span className="text-secura-black">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src="https://ngmwdebxyofxudrbesqs.supabase.co/storage/v1/object/public/nullstack//securaa.svg" alt="Secura" className="h-8 w-auto" />
            </div>
            <Link to="/" className="text-secura-teal hover:text-secura-moss transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Login Form */}
      <div className="flex items-center justify-center py-12 px-6">
        <div className="w-full max-w-md animate-fade-in">
          <Card className="shadow-lg border-2 border-gray-100">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto w-16 h-16 rounded-2xl secura-gradient flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-secura-black">
                Professional Login
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Sign in to your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-secura-black font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={loading}
                    className="h-12 border-2 focus:border-secura-teal"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-secura-black font-medium">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={loading}
                    className="h-12 border-2 focus:border-secura-teal"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-secura-lime hover:bg-secura-lime/90 text-secura-teal font-semibold text-lg rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-secura-teal"></div>
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Need help accessing your account?{' '}
                  <Link to="/support" className="text-secura-teal hover:text-secura-moss">
                    Contact Support
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
