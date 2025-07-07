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
  onContinue: () => void;
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
  onTermsChange,
  onContinue
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleContinue = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      setIsExpanded(false);
    } else if (currentStep === 3) {
      // Final step - accept terms and continue
      if (!termsAccepted) {
        onTermsChange(true);
      }
      onContinue();
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setIsExpanded(true);
    }
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isTermsStep = currentStep === 3;
  const canContinue = !isTermsStep || termsAccepted;

  return (
    <AuroraBackground className="min-h-screen">
      {/* Secura Logo - positioned like landing page */}
      <div className="absolute top-8 left-8 z-20">
        <img 
          src="https://ngmwdebxyofxudrbesqs.supabase.co/storage/v1/object/public/nullstack//securaa.svg" 
          alt="Secura" 
          className="h-8 w-auto"
        />
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Glassmorphic card matching landing page style */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-light leading-tight mb-2">
                Welcome to <GradientText className="font-semibold">Secura</GradientText>
              </h1>
              <p className="text-muted-foreground font-light">
                Your trusted platform for secure property management</p>
              {agency && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 p-4 bg-secura-lime/20 backdrop-blur-sm rounded-xl border border-secura-lime/30"
                >
                  <p className="text-secura-teal font-medium">
                    You've been invited by {agent?.full_name} from {agency.name}
                  </p>
                </motion.div>
              )}
            </div>

            <div className="space-y-6">
              {/* Feature content */}
              <div className="mb-8">
                <AnimatePresence mode="wait">
                  {!isTermsStep ? (
                    <motion.div
                      key={`feature-${currentStep}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="text-center"
                    >
                      <div className="p-8 rounded-3xl bg-white/60 backdrop-blur-md border border-white/30 shadow-lg mb-6">
                        {React.createElement(features[currentStep - 1].icon, {
                          className: "w-16 h-16 mx-auto mb-6 text-secura-teal"
                        })}
                        <h3 className="text-xl font-semibold mb-4 text-foreground">
                          {features[currentStep - 1].title}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                          {features[currentStep - 1].description}
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="terms"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="text-center"
                    >
                      <div className="p-8 rounded-3xl bg-white/60 backdrop-blur-md border border-white/30 shadow-lg mb-6">
                        <CheckCircle className="w-16 h-16 mx-auto mb-6 text-secura-teal" />
                        <h3 className="text-xl font-semibold mb-6 text-foreground">
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Progress Indicator */}
              <div className="flex flex-col items-center justify-center gap-8">
                {/* Progress bar */}
                <div className="flex items-center gap-2 relative">
                  {[1, 2, 3].map((dot, index) => (
                    <div
                      key={dot}
                      className={cn(
                        "w-3 h-3 rounded-full relative z-10 transition-colors",
                        dot <= currentStep ? "bg-white" : "bg-gray-300"
                      )}
                    />
                  ))}

                  {/* Green progress overlay */}
                  <motion.div
                    initial={{ width: '12px' }}
                    animate={{
                      width: currentStep === 1 ? '12px' : currentStep === 2 ? '32px' : '52px',
                    }}
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-6 bg-green-500 rounded-full -z-10"
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                      mass: 0.8,
                      bounce: 0.25,
                      duration: 0.6
                    }}
                  />
                </div>

                {/* Buttons */}
                <div className="w-full max-w-sm">
                  <motion.div
                    className="flex items-center gap-3"
                    animate={{
                      justifyContent: isExpanded ? 'center' : 'space-between'
                    }}
                  >
                    {!isExpanded && (
                      <motion.button
                        initial={{ opacity: 0, width: 0, scale: 0.8 }}
                        animate={{ opacity: 1, width: "80px", scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 15,
                          mass: 0.8,
                          bounce: 0.25,
                          duration: 0.6,
                          opacity: { duration: 0.2 }
                        }}
                        onClick={handleBack}
                        className="px-6 py-3 text-gray-700 bg-gray-100 font-semibold rounded-full hover:bg-gray-50 transition-colors text-sm"
                      >
                        Back
                      </motion.button>
                    )}
                    <motion.button
                      onClick={handleContinue}
                      disabled={!canContinue}
                      animate={{
                        flex: isExpanded ? 1 : 'none',
                      }}
                      className={cn(
                        "px-8 py-3 rounded-full font-semibold transition-all text-sm",
                        canContinue 
                          ? "bg-blue-500 hover:bg-blue-600 text-white" 
                          : "bg-gray-400 cursor-not-allowed text-white",
                        isExpanded ? "w-full" : "flex-1"
                      )}
                    >
                      <div className="flex items-center justify-center gap-2">
                        {currentStep === 3 && termsAccepted && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 15,
                              mass: 0.5,
                              bounce: 0.4
                            }}
                          >
                            <CircleCheck size={16} />
                          </motion.div>
                        )}
                        {currentStep === 3 ? 'Finish' : 'Continue'}
                      </div>
                    </motion.button>
                  </motion.div>
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