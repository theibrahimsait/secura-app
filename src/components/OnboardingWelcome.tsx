import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, FileText, CheckCircle } from 'lucide-react';

interface OnboardingWelcomeProps {
  agency: { name: string } | null;
  agent: { full_name: string } | null;
  termsAccepted: boolean;
  onTermsChange: (accepted: boolean) => void;
  onContinue: () => void;
}

const OnboardingWelcome: React.FC<OnboardingWelcomeProps> = ({
  agency,
  agent,
  termsAccepted,
  onTermsChange,
  onContinue
}) => {
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
                onCheckedChange={(checked) => onTermsChange(checked as boolean)}
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
            onClick={onContinue}
            className="w-full bg-secura-lime hover:bg-secura-lime/90 text-secura-teal"
            size="lg"
          >
            Get Started
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingWelcome;