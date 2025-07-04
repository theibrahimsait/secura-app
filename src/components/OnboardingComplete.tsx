import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

const OnboardingComplete: React.FC = () => {
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
};

export default OnboardingComplete;