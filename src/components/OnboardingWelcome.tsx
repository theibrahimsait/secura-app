import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, FileText, CheckCircle, CircleCheck } from 'lucide-react';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { GradientText } from '@/components/ui/gradient-text';
import { cn } from '@/lib/utils';

interface OnboardingWelcomeProps {
  agency: { name: string } | null;
  agent: { full_name: string } | null;
  termsAccepted: boolean;
  onTermsChange: (accepted: boolean) => void;
}

const features = [
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your documents are encrypted and protected with bank-level security"
  },
  {
    icon: FileText,
    title: "Easy Management", 
    description: "Organize all your property documents in one centralized location"
  },
  {
    icon: CheckCircle,
    title: "Expert Support",
    description: "Get assistance from certified real estate professionals"
  }
];

const OnboardingWelcome: React.FC<OnboardingWelcomeProps> = ({
  agency,
  agent,
  termsAccepted,
  onTermsChange
}) => {
  return (
    <AuroraBackground className="min-h-screen">
      {/* Secura Logo - positioned like landing page */}
      <div className="absolute top-8 left-8 z-20">
        <img 
          src="https://yugzvvgctlhfcdmmwaxj.storage.supabase.co/v1/object/public/images//secfav.png" 
          alt="Secura" 
          className="h-8 w-auto"
        />
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Glassmorphic card matching landing page style */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-light leading-tight mb-2">
                Welcome to <GradientText className="font-semibold">Secura</GradientText>
              </h1>
              <p className="text-muted-foreground font-light text-sm">
                Your trusted platform for secure property management</p>
              {agency && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-3 p-3 bg-secura-lime/20 backdrop-blur-sm rounded-xl border border-secura-lime/30"
                >
                  <p className="text-secura-teal font-medium text-sm">
                    You've been invited by {agent?.full_name} from {agency.name}
                  </p>
                </motion.div>
              )}
            </div>

            <div className="space-y-6">
              {/* Features showcase */}
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-2xl bg-white/40 backdrop-blur-sm border border-white/20"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-secura-lime/20 flex items-center justify-center">
                      {React.createElement(feature.icon, {
                        className: "w-5 h-5 text-secura-teal"
                      })}
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Terms & Conditions */}
              <div className="p-4 rounded-2xl bg-white/40 backdrop-blur-sm border border-white/20">
                <h3 className="font-medium mb-4 text-foreground">
                  Terms & Conditions
                </h3>
                <div className="flex items-start space-x-3">
                  <Checkbox 
                    id="terms" 
                    checked={termsAccepted}
                    onCheckedChange={(checked) => onTermsChange(checked as boolean)}
                    className="mt-1"
                  />
                  <div className="text-sm text-left">
                    <label htmlFor="terms" className="cursor-pointer text-muted-foreground">
                      I agree to the{' '}
                      <a href="/terms" target="_blank" className="text-secura-teal hover:underline font-medium">
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a href="/privacy" target="_blank" className="text-secura-teal hover:underline font-medium">
                        Privacy Policy
                      </a>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AuroraBackground>
  );
};

export default OnboardingWelcome;