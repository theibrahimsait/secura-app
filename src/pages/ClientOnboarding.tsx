import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { clientSupabase } from '@/lib/client-supabase';
import { useToast } from '@/hooks/use-toast';
import OnboardingWelcome from '@/components/OnboardingWelcome';
import OnboardingProfile from '@/components/OnboardingProfile';
import OnboardingDocuments from '@/components/OnboardingDocuments';
import OnboardingComplete from '@/components/OnboardingComplete';
import ProgressIndicator from '@/components/ui/progress-indicator';

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

    // Check if user is authenticated (has client data from login)
    const clientDataStr = localStorage.getItem('client_data');
    if (!clientDataStr) {
      // User not authenticated, redirect to login with referral token
      const loginUrl = ref ? `/client/login?ref=${ref}` : '/client/login';
      navigate(loginUrl);
      return;
    }

    // Check if client has already completed onboarding
    const clientData = JSON.parse(clientDataStr);
    if (clientData.onboarding_completed) {
      // Already completed onboarding, redirect to dashboard
      navigate('/client/dashboard');
      return;
    }
  }, [searchParams, navigate]);

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

  const handleNext = () => {
    if (step === 1) {
      if (!termsAccepted) {
        toast({
          title: "Terms Required",
          description: "Please accept the terms and conditions to continue.",
          variant: "destructive",
        });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!profileData.fullName || !profileData.email) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const canContinue = () => {
    switch (step) {
      case 1:
        return termsAccepted;
      case 2:
        return !!(profileData.fullName && profileData.email);
      case 3:
        return true; // Documents are optional
      default:
        return false;
    }
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
          onboarding_completed: true,
          onboarding_status: {
            intro_complete: true,
            tos_accepted: true,
            profile_set: true,
            docs_uploaded: documents.length > 0,
          },
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
          
          // Upload file to Supabase Storage using client session
          const { error: uploadError } = await clientSupabase.storage
            .from('property-documents')
            .upload(fileName, doc);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error(`Failed to upload ${doc.name}: ${uploadError.message}`);
          }

          // Store document record in database using client session
          const { error: docError } = await clientSupabase
            .from('client_documents')
            .insert({
              client_id: clientData.id,
              document_type: 'national_id',
              file_name: doc.name,
              file_path: fileName,
              file_size: doc.size,
              mime_type: doc.type,
            });

          if (docError) {
            console.error('Database error:', docError);
            // Try to clean up the uploaded file
            await clientSupabase.storage.from('property-documents').remove([fileName]);
            throw docError;
          }
        }
      }

      // Update localStorage with complete client data
      localStorage.setItem('client_data', JSON.stringify({
        ...clientData,
        full_name: profileData.fullName,
        email: profileData.email,
        onboarding_completed: true,
        onboarding_status: {
          intro_complete: true,
          tos_accepted: true,
          profile_set: true,
          docs_uploaded: documents.length > 0,
        },
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

  const getStepContent = () => {
    switch (step) {
      case 1:
        return (
          <OnboardingWelcome
            agency={agency}
            agent={agent}
            termsAccepted={termsAccepted}
            onTermsChange={setTermsAccepted}
          />
        );
      case 2:
        return (
          <OnboardingProfile
            profileData={profileData}
            onProfileChange={setProfileData}
          />
        );
      case 3:
        return (
          <OnboardingDocuments
            documents={documents}
            loading={loading}
            onDocumentUpload={handleDocumentUpload}
            onRemoveDocument={removeDocument}
          />
        );
      default:
        return <OnboardingComplete />;
    }
  };

  if (step === 4) {
    return <OnboardingComplete />;
  }

  return (
    <div className="bg-gray-50">
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 px-4 py-6">
          {getStepContent()}
        </div>
        
        {/* Progress Indicator - sticky when content is short, normal flow when content is long */}
        <div className="bg-white border-t p-4 sticky bottom-0 z-10">
          <div className="max-w-md mx-auto">
            <ProgressIndicator
              step={step}
              totalSteps={3}
              onNext={handleNext}
              onBack={handleBack}
              onSubmit={completeOnboarding}
              isLoading={loading}
              canContinue={canContinue()}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientOnboarding;
