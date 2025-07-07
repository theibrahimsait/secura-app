import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignInPage, Testimonial } from '@/components/ui/sign-in';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { GradientText } from '@/components/ui/gradient-text';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
const sampleTestimonials: Testimonial[] = [
  {
    avatarSrc: "https://randomuser.me/api/portraits/women/57.jpg",
    name: "Cezalyn AMG",
    handle: "Admin Manager - Throne Properties",
    text: "Secura has transformed how we handle client documents. Clean, secure, and reliable."
  },
  {
    avatarSrc: "https://randomuser.me/api/portraits/men/64.jpg",
    name: "Vignesh Menon",
    handle: "Owner - Sai Real Estate",
    text: "Finally, a compliant way to collect documents from clients. Our agency loves it."
  },
  {
    avatarSrc: "https://randomuser.me/api/portraits/men/32.jpg",
    name: "David Martinez",
    handle: "@davidcreates",
    text: "Secure, simple, and exactly what the UAE real estate industry needed."
  },
];

const Index = () => {
  const navigate = useNavigate();
  const { signIn, isAuthenticated, isAgencyAdmin, isAgent } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated) {
    if (isAgencyAdmin) navigate('/agency/dashboard');
    else if (isAgent) navigate('/agent/dashboard');
  }

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      return; // Don't submit if fields are empty
    }

    setLoading(true);
    
    try {
      const { error } = await signIn(email, password);

      if (error) {
        toast({
          title: "Login Failed",
          description: error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login Successful",
          description: "Redirecting to your dashboard...",
        });
      }
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    // Google signin functionality would go here
    toast({
      title: "Google Sign In",
      description: "Google authentication coming soon.",
    });
  };
  
  const handleResetPassword = () => {
    toast({
      title: "Password Reset",
      description: "Password reset functionality coming soon.",
    });
  }

  const handleCreateAccount = () => {
    navigate('/client/login');
  }

  return (
    <AuroraBackground className="min-h-screen">
      <div className="relative z-10 w-full">
        <SignInPage
          title={
            <span className="font-light text-foreground tracking-tighter whitespace-nowrap text-left">
              Welcome to <GradientText className="font-semibold">Secura</GradientText>
            </span>
          }
          description="Secure document sharing for UAE real estate"
          heroImageSrc="https://yugzvvgctlhfcdmmwaxj.supabase.co/storage/v1/object/public/images/IMG_4350.JPG"
          testimonials={sampleTestimonials}
          onSignIn={handleSignIn}
          onResetPassword={handleResetPassword}
          onCreateAccount={handleCreateAccount}
          loading={loading}
        />
      </div>
      {/* Secura Logo */}
      <div className="absolute top-8 left-8 z-20">
        <img 
          src="https://ngmwdebxyofxudrbesqs.supabase.co/storage/v1/object/public/nullstack//securaa.svg" 
          alt="Secura" 
          className="h-8 w-auto"
        />
      </div>
    </AuroraBackground>
  );
};
export default Index;