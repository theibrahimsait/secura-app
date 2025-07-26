import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Shield, FileText, CheckCircle, CircleCheck, X } from 'lucide-react';
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

const privacyPolicyContent = `
**Privacy Policy - Secura**
*Effective Date: 18/06/2025*

**1. Information We Collect**
Secura collects information necessary to provide secure document sharing services to real estate brokerages and agents. This includes:
• Account information (company name, contact details, licensing information)
• User credentials and authentication data
• Documents uploaded through our platform
• Usage data and access logs for security and audit purposes

**2. How We Use Your Information**
We use collected information to:
• Provide secure document storage and sharing services
• Maintain platform security and prevent unauthorized access
• Generate audit logs and compliance reports
• Provide customer support and technical assistance
• Improve our services and platform functionality

**3. Data Security**
Secura employs industry-standard security measures including:
• AES-256 encryption for data at rest
• TLS encryption for data in transit
• Multi-factor authentication
• Regular security audits and monitoring
• Restricted access controls and audit logging

**4. Data Retention**
We retain data as follows:
• Documents and client data: Up to 60 days after completion or inactivity
• Audit logs: As required for compliance purposes
• Account information: Until account termination

**5. Data Sharing**
Secura does not sell, lease, or share client data with third parties except:
• When required by law or legal process
• With your explicit consent
• With trusted service providers who assist in platform operations (under strict confidentiality agreements)

**6. Your Rights**
Under applicable data protection laws, you have the right to:
• Access your personal data
• Request correction of inaccurate data
• Request deletion of your data
• Object to processing of your data
• Request data portability

**7. Contact Information**
For privacy-related inquiries, contact us at:
• Email: privacy@secura.me
• WhatsApp: +971 58 948 9955
• Address: First Floor, In5 Building, King Salman Bin Abdulaziz Al Saud Street, Dubai Internet City, Dubai, UAE

**8. Updates to This Policy**
We may update this Privacy Policy from time to time. We will notify you of any material changes via email or through our platform.
`;

const termsOfServiceContent = `
**Terms of Service for Property Owner Users of Secura**
*Last Updated: 18/07/2025*

These Terms of Service ("Terms") govern your use of the Secura platform ("Platform") operated by Secura ("we," "our," or "us"). By accessing or using the Platform, you ("Client," "you," or "your") agree to be bound by these Terms.

**1. Definitions**
• **Platform**: The online and mobile application operated by Secura enabling secure document sharing, property submissions, management of portfolios, and communication with authorized real estate agencies and agents.
• **Client**: An individual property owner who uses the Platform.
• **Agency**: Real estate agencies registered and authorized to access submitted documents and property details via the Platform.
• **Agent**: Authorized representatives of an Agency with limited access to certain information as determined by the Platform.
• **Documents**: Any uploaded materials including identity documents, passports, Emirates IDs, title deeds, proof of ownership, and other property-related documents.
• **Portfolio**: The collection of property details and related documents managed by the Client on the Platform.
• **Magic Link**: A secure and unique link provided by agents to Clients allowing controlled access and submissions on the Platform.
• **Audit Trail**: Digital record of activities performed on documents and property information, accessible to Clients.

**2. Acceptance and Eligibility**
• You affirm you are legally authorized to manage and submit information related to properties.
• You must be at least 18 years of age and possess a valid Emirates ID or equivalent government-issued identification.
• You agree to provide accurate, truthful, and current information at all times.

**3. Platform Services**
Secura provides:
• Secure document storage and encrypted transmission to authorized Agencies
• Submission of property details and documents to Agencies via Magic Links
• Management of your property Portfolio
• Detailed Audit Trail tracking document interactions and access events
• Communication channels with authorized Agencies or Agents for transaction purposes

**4. Account Management**
• Clients log in via mobile number with OTP verification to ensure security
• You are solely responsible for maintaining confidentiality regarding access to your mobile devices and Platform credentials
• If your device is lost or compromised, you must immediately notify us via our official support channel to temporarily suspend your account

**5. Document Submission & Management**
• Documents uploaded by you must be valid, authentic, and free from alteration or falsification
• Uploaded documents remain within your Portfolio, allowing you to select which documents or properties to share with authorized Agencies
• Agencies access documents strictly via secure Platform-generated links and may download files as permitted by Platform policies
• The Platform maintains an Audit Trail, viewable by you, of every document action

**6. Consent and Data Privacy**
• By uploading documents and property details, you explicitly consent to their transmission, storage, and usage strictly within the Platform by authorized Agencies, agents, and us for transaction purposes
• You retain full rights over your documents and may withdraw consent or remove documents by written notice to Secura
• Secura follows strict compliance with UAE Personal Data Protection Law (PDPL) and Cybercrime Law

**7. Confidentiality and Security**
• Secura employs advanced encryption standards (AES-256) and secure socket layer (SSL/TLS) protocols for data transmission and storage
• Only authorized, verified Agency Admins and permitted Agents may access your documents and details
• Unauthorized access, reproduction, or distribution of information is strictly prohibited

**8. Prohibited Uses**
You agree not to:
• Use the Platform in violation of UAE laws or regulations
• Upload fraudulent, misleading, or malicious content
• Attempt to breach security features or gain unauthorized access
• Impersonate another user or entity
• Use the Platform for purposes other than those explicitly intended

**9. Liability and Indemnification**
• Secura will take every reasonable measure to secure your documents and information
• You agree to indemnify Secura against any claims resulting from your breach of these Terms

**10. Audit Rights and Transparency**
• You have full transparency via the Audit Trail feature
• You may request formal audit reports from Secura

**11. Termination and Account Suspension**
• Secura reserves the right to suspend or terminate your account for violations of these Terms
• You may request account termination at any time by contacting Secura support

**12. Amendments and Updates**
• Secura reserves the right to modify these Terms periodically
• You will be notified of substantial changes via your registered contact method

**13. Governing Law and Arbitration**
• These Terms are governed by the laws of the United Arab Emirates, particularly the Emirate of Dubai
• Any disputes shall be settled exclusively by arbitration in accordance with Dubai International Arbitration Centre (DIAC) rules

**14. Contact and Support**
For questions regarding these Terms or the Platform:
• Email: privacy@secura.me
• WhatsApp: +971 58 948 9955
• Address: First Floor, In5 Building, King Salman Bin Abdulaziz Al Saud Street, Dubai Internet City, Dubai, UAE
`;

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
          src="https://yugzvvgctlhfcdmmwaxj.supabase.co/storage/v1/object/public/images//secfav.png" 
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
                      <Dialog>
                        <DialogTrigger asChild>
                          <button className="text-secura-teal hover:underline font-medium underline">
                            Terms of Service
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                          <DialogHeader className="p-6 pb-4">
                            <DialogTitle className="text-xl font-semibold text-secura-teal">
                              Terms of Service
                            </DialogTitle>
                          </DialogHeader>
                          <div className="px-6 pb-6 max-h-[70vh] overflow-y-auto">
                            <div className="prose prose-sm max-w-none text-foreground">
                              {termsOfServiceContent.split('\n').map((line, index) => {
                                if (line.startsWith('**') && line.endsWith('**')) {
                                  return (
                                    <h3 key={index} className="font-semibold text-secura-teal mt-6 mb-3 text-base">
                                      {line.replace(/\*\*/g, '')}
                                    </h3>
                                  );
                                } else if (line.startsWith('*') && line.endsWith('*')) {
                                  return (
                                    <p key={index} className="text-muted-foreground italic mb-4">
                                      {line.replace(/\*/g, '')}
                                    </p>
                                  );
                                } else if (line.startsWith('•')) {
                                  return (
                                    <div key={index} className="ml-4 mb-2 text-sm">
                                      {line}
                                    </div>
                                  );
                                } else if (line.trim()) {
                                  return (
                                    <p key={index} className="mb-3 text-sm leading-relaxed">
                                      {line}
                                    </p>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>{' '}
                      and{' '}
                      <Dialog>
                        <DialogTrigger asChild>
                          <button className="text-secura-teal hover:underline font-medium underline">
                            Privacy Policy
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                          <DialogHeader className="p-6 pb-4">
                            <DialogTitle className="text-xl font-semibold text-secura-teal">
                              Privacy Policy
                            </DialogTitle>
                          </DialogHeader>
                          <div className="px-6 pb-6 max-h-[70vh] overflow-y-auto">
                            <div className="prose prose-sm max-w-none text-foreground">
                              {privacyPolicyContent.split('\n').map((line, index) => {
                                if (line.startsWith('**') && line.endsWith('**')) {
                                  return (
                                    <h3 key={index} className="font-semibold text-secura-teal mt-6 mb-3 text-base">
                                      {line.replace(/\*\*/g, '')}
                                    </h3>
                                  );
                                } else if (line.startsWith('*') && line.endsWith('*')) {
                                  return (
                                    <p key={index} className="text-muted-foreground italic mb-4">
                                      {line.replace(/\*/g, '')}
                                    </p>
                                  );
                                } else if (line.startsWith('•')) {
                                  return (
                                    <div key={index} className="ml-4 mb-2 text-sm">
                                      {line}
                                    </div>
                                  );
                                } else if (line.trim()) {
                                  return (
                                    <p key={index} className="mb-3 text-sm leading-relaxed">
                                      {line}
                                    </p>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
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