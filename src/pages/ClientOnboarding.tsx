
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Shield, Upload, FileText, CheckCircle } from 'lucide-react';

interface Agency {
  id: string;
  name: string;
  email: string;
}

interface Agent {
  id: string;
  full_name: string;
  email: string;
}

const ClientOnboarding = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1); // 1: Welcome, 2: Profile, 3: Documents, 4: Complete
  const [referralToken, setReferralToken] = useState<string | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
  });
  const [documents, setDocuments] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralToken(ref);
      fetchReferralInfo(ref);
    }
  }, [searchParams]);

  const fetchReferralInfo = async (token: string) => {
    try {
      const { data: linkData } = await supabase
        .from('agent_referral_links')
        .select(`
          agent_id,
          agency_id,
          users!agent_referral_links_agent_id_fkey (
            full_name,
            email
          ),
          agencies (
            name,
            email
          )
        `)
        .eq('ref_token', token)
        .eq('is_active', true)
        .single();

      if (linkData) {
        setAgent({
          id: linkData.agent_id,
          full_name: linkData.users.full_name,
          email: linkData.users.email,
        });
        setAgency({
          id: linkData.agency_id,
          name: linkData.agencies.name,
          email: linkData.agencies.email,
        });
      }
    } catch (error) {
      console.error('Error fetching referral info:', error);
    }
  };

  const handleAcceptTerms = () => {
    if (!termsAccepted) {
      toast({
        title: "Terms Required",
        description: "Please accept the terms and conditions to continue.",
        variant: "destructive",
      });
      return;
    }
    setStep(2);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData.fullName || !profileData.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    setStep(3);
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setDocuments(prev => [...prev, ...files]);
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      // Get current client from localStorage (from OTP verification)
      const clientDataStr = localStorage.getItem('client_data');
      if (!clientDataStr) {
        throw new Error('No client session found');
      }
      
      const clientData = JSON.parse(clientDataStr);
      
      // Update client with profile info and referral tracking
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          full_name: profileData.fullName,
          email: profileData.email,
          terms_accepted_at: new Date().toISOString(),
          profile_completed: true,
          onboarding_completed: true,
          referral_token: referralToken,
          agent_id: agent?.id || null,
          agency_id: agency?.id || null,
        })
        .eq('id', clientData.id);

      if (updateError) throw updateError;

      // Upload documents if any
      if (documents.length > 0) {
        for (const doc of documents) {
          const fileName = `${clientData.id}/${Date.now()}_${doc.name}`;
          
          // For demo purposes, we'll store document info without actual upload
          const { error: docError } = await supabase
            .from('client_documents')
            .insert({
              client_id: clientData.id,
              document_type: 'national_id', // Default type, can be enhanced
              file_name: doc.name,
              file_path: fileName,
              file_size: doc.size,
              mime_type: doc.type,
            });

          if (docError) throw docError;
        }
      }

      // Update localStorage with complete client data
      localStorage.setItem('client_data', JSON.stringify({
        ...clientData,
        full_name: profileData.fullName,
        email: profileData.email,
        onboarding_completed: true,
      }));

      toast({
        title: "Welcome to Secura!",
        description: "Your profile has been set up successfully.",
      });

      setStep(4);
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/client/dashboard');
      }, 2000);
      
    } catch (error: any) {
      console.error('Onboarding error:', error);
      toast({
        title: "Setup Error",
        description: error.message || "Failed to complete profile setup.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img 
                src="https://ngmwdebxyofxudrbesqs.supabase.co/storage/v1/object/public/nullstack//securaa.svg" 
                alt="Secura" 
                className="h-12 w-auto"
              />
            </div>
            <CardTitle className="text-3xl text-secura-black">Welcome to Secura!</CardTitle>
            <CardDescription className="text-lg">
              Your trusted platform for secure property management
              {agency && (
                <div className="mt-4 p-4 bg-secura-lime/10 rounded-lg">
                  <p className="text-secura-teal font-medium">
                    You've been invited by {agent?.full_name} from {agency.name}
                  </p>
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4">
                <Shield className="w-12 h-12 mx-auto mb-2 text-secura-teal" />
                <h3 className="font-semibold">Secure & Private</h3>
                <p className="text-sm text-muted-foreground">Your documents are encrypted and protected</p>
              </div>
              <div className="text-center p-4">
                <FileText className="w-12 h-12 mx-auto mb-2 text-secura-moss" />
                <h3 className="font-semibold">Easy Management</h3>
                <p className="text-sm text-muted-foreground">Organize all your property documents in one place</p>
              </div>
              <div className="text-center p-4">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-600" />
                <h3 className="font-semibold">Expert Support</h3>
                <p className="text-sm text-muted-foreground">Get help from certified real estate professionals</p>
              </div>
            </div>
            
            <div className="border-t pt-6">
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="terms" 
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                />
                <div className="text-sm">
                  <label htmlFor="terms" className="cursor-pointer">
                    I agree to the{' '}
                    <a href="/terms" target="_blank" className="text-secura-teal hover:underline">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="/privacy" target="_blank" className="text-secura-teal hover:underline">
                      Privacy Policy
                    </a>
                  </label>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleAcceptTerms}
              className="w-full bg-secura-lime hover:bg-secura-lime/90 text-secura-teal"
              size="lg"
            >
              Get Started
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Complete Your Profile</CardTitle>
            <CardDescription>
              Let's set up your profile information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={profileData.fullName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <Button type="submit" className="w-full bg-secura-lime hover:bg-secura-lime/90 text-secura-teal">
                Continue
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Upload ID Documents</CardTitle>
            <CardDescription>
              Upload your identification documents (passport, national ID, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="documents">Identity Documents</Label>
              <Input
                id="documents"
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleDocumentUpload}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Upload images or PDF files. You can select multiple files.
              </p>
            </div>

            {documents.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Documents:</Label>
                {documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-100 rounded">
                    <span className="text-sm truncate">{doc.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Button
                onClick={completeOnboarding}
                disabled={loading}
                className="w-full bg-secura-lime hover:bg-secura-lime/90 text-secura-teal"
              >
                {loading ? 'Setting up...' : 'Complete Setup'}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={completeOnboarding}
                disabled={loading}
                className="w-full"
              >
                Skip for now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
            <h2 className="text-2xl font-bold mb-2">Welcome to Secura!</h2>
            <p className="text-muted-foreground mb-4">
              Your profile has been set up successfully. You'll be redirected to your dashboard shortly.
            </p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-secura-teal mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default ClientOnboarding;
