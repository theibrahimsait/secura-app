import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SignInPage, Testimonial } from '@/components/ui/sign-in';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { GradientText } from '@/components/ui/gradient-text';
const sampleTestimonials: Testimonial[] = [
  {
    avatarSrc: "https://randomuser.me/api/portraits/women/57.jpg",
    name: "Sarah Chen",
    handle: "@sarahdigital",
    text: "Secura has transformed how we handle client documents. Clean, secure, and reliable."
  },
  {
    avatarSrc: "https://randomuser.me/api/portraits/men/64.jpg",
    name: "Marcus Johnson",
    handle: "@marcustech",
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

  const handleSignIn = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate('/login');
  };

  const handleGoogleSignIn = () => {
    navigate('/login');
  };
  
  const handleResetPassword = () => {
    navigate('/login');
  }

  const handleCreateAccount = () => {
    navigate('/client/login');
  }

  return (
    <AuroraBackground className="bg-white">
      <div className="relative z-10 w-full">
        <SignInPage
          title={
            <span className="font-light text-foreground tracking-tighter">
              Welcome to <GradientText className="font-semibold">Secura</GradientText>
            </span>
          }
          description="Secure document sharing for UAE real estate"
          heroImageSrc="https://yugzvvgctlhfcdmmwaxj.supabase.co/storage/v1/object/public/images/IMG_4350.JPG"
          testimonials={sampleTestimonials}
          onSignIn={handleSignIn}
          onResetPassword={handleResetPassword}
          onCreateAccount={handleCreateAccount}
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