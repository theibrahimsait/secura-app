import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SignInPage, Testimonial } from '@/components/ui/sign-in';
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
    <div className="bg-white text-foreground">
      <SignInPage
        title={
          <span className="font-light text-foreground tracking-tighter">
            Welcome to <span className="font-semibold">Secura</span>
          </span>
        }
        description="Secure document sharing for UAE real estate"
        heroImageSrc="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=2160&q=80"
        testimonials={sampleTestimonials}
        onSignIn={handleSignIn}
        onGoogleSignIn={handleGoogleSignIn}
        onResetPassword={handleResetPassword}
        onCreateAccount={handleCreateAccount}
      />
    </div>
  );
};
export default Index;