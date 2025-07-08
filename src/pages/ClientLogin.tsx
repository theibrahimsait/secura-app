
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Phone, Shield, MessageSquare } from 'lucide-react';

const countryCodes = [
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+1', country: 'US/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+52', country: 'Mexico', flag: '🇲🇽' },
  { code: '+7', country: 'Russia', flag: '🇷🇺' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
  { code: '+46', country: 'Sweden', flag: '🇸🇪' },
  { code: '+47', country: 'Norway', flag: '🇳🇴' },
  { code: '+45', country: 'Denmark', flag: '🇩🇰' },
  { code: '+41', country: 'Switzerland', flag: '🇨🇭' },
];

const ClientLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [countryCode, setCountryCode] = useState('+971');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [referralToken, setReferralToken] = useState<string | null>(null);
  const [agencyInfo, setAgencyInfo] = useState<{
    name: string;
    logo_url?: string;
    description?: string;
    primary_color?: string;
  } | null>(null);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralToken(ref);
      loadAgencyInfo(ref);
    }
  }, [searchParams]);

  const loadAgencyInfo = async (refToken: string) => {
    try {
      const { data: linkData } = await supabase
        .from('referral_links')
        .select(`
          agency_id,
          agent_id,
          agencies(
            name,
            logo_url,
            description,
            primary_color
          )
        `)
        .eq('id', refToken)
        .single();

      if (linkData?.agencies) {
        setAgencyInfo(linkData.agencies);
      }
    } catch (error) {
      console.error('Error loading agency info:', error);
    }
  };

  const formatPhoneNumber = (phone: string, selectedCountryCode: string): string => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Return the selected country code with the cleaned number
    return `${selectedCountryCode}${cleaned}`;
  };

  const validatePhoneNumber = (formattedPhone: string): boolean => {
    // Basic validation - must start with + and have at least 8 digits after country code
    const phoneRegex = /^\+\d{1,4}\d{7,}$/;
    return phoneRegex.test(formattedPhone);
  };

  const sendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formattedPhone = formatPhoneNumber(phoneNumber, countryCode);
    
    if (!validatePhoneNumber(formattedPhone)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid mobile number for the selected country",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Check if client exists and update/create
      const { data: existingClient } = await supabase
        .from('clients')
        .select('*')
        .eq('phone', formattedPhone)
        .single();

      if (existingClient) {
        // Update existing client with new referral info if provided
        const updateData: any = {
          mobile_number: formattedPhone,
          updated_at: new Date().toISOString(),
        };
        
        // If there's a referral token, update it and reset agency/agent assignment
        if (referralToken) {
          updateData.referral_token = referralToken;
          // Clear existing agency/agent to allow trigger to reassign
          updateData.agent_id = null;
          updateData.agency_id = null;
        }

        const { error } = await supabase
          .from('clients')
          .update(updateData)
          .eq('id', existingClient.id);

        if (error) throw error;
      } else {
        // Create new client
        const { error } = await supabase
          .from('clients')
          .insert({
            phone: formattedPhone,
            mobile_number: formattedPhone,
            referral_token: referralToken,
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      // Send SMS via Twilio Verify
      const { data, error: smsError } = await supabase.functions.invoke('send-sms', {
        body: {
          phone: formattedPhone,
          action: 'send',
          clientId: existingClient?.id || null
        }
      });

      if (smsError) {
        console.error('SMS sending error:', smsError);
        toast({
          title: "SMS Error",
          description: "Failed to send verification code. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Code Sent",
        description: `Verification code sent to ${formattedPhone}`,
      });

      setPhoneNumber(formattedPhone);
      setStep('otp');
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter the 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Verify code via Twilio Verify
      const { data, error: verifyError } = await supabase.functions.invoke('send-sms', {
        body: {
          phone: phoneNumber,
          action: 'verify',
          code: otpCode
        }
      });

      if (verifyError || !data?.success) {
        toast({
          title: "Invalid Code",
          description: "The verification code is incorrect or has expired.",
          variant: "destructive",
        });
        return;
      }

      // Get client data
      const { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .eq('phone', phoneNumber)
        .single();

      if (error || !client) {
        toast({
          title: "Error",
          description: "Failed to find client record. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Update client as verified
      await supabase
        .from('clients')
        .update({
          is_verified: true,
          last_login: new Date().toISOString(),
        })
        .eq('id', client.id);

      // Create session token for client
      const sessionToken = crypto.randomUUID();
      const { error: sessionError } = await supabase
        .from('client_sessions')
        .insert({
          client_id: client.id,
          session_token: sessionToken,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        });

      if (sessionError) {
        console.error('Session creation error:', sessionError);
      }

      // Store client session with token
      const clientWithSession = {
        ...client,
        session_token: sessionToken
      };
      localStorage.setItem('client_data', JSON.stringify(clientWithSession));

      toast({
        title: "Login Successful",
        description: "Welcome to Secura!",
      });

      // Check if onboarding is completed or if all onboarding steps are done
      const onboardingStatus = client.onboarding_status as any;
      const isOnboardingDone = client.onboarding_completed || 
        (onboardingStatus && 
         onboardingStatus.intro_complete && 
         onboardingStatus.tos_accepted && 
         onboardingStatus.profile_set);

      if (!isOnboardingDone) {
        // Redirect to onboarding with referral parameters if present
        let onboardingUrl = '/client/onboarding';
        if (referralToken) {
          onboardingUrl += `?ref=${referralToken}`;
          // Store referral in sessionStorage for the new tab-safe system
          sessionStorage.setItem('agency_ref', referralToken);
        }
        navigate(onboardingUrl);
      } else {
        // If onboarding steps are done but flag not set, update it
        if (!client.onboarding_completed && onboardingStatus?.profile_set) {
          await supabase
            .from('clients')
            .update({ onboarding_completed: true })
            .eq('id', client.id);
        }
        
        // Client has completed onboarding, go directly to dashboard with referral parameters
        let dashboardUrl = '/client/dashboard';
        if (referralToken) {
          dashboardUrl += `?ref=${referralToken}`;
          // Store referral in sessionStorage for the new tab-safe system  
          sessionStorage.setItem('agency_ref', referralToken);
        }
        navigate(dashboardUrl);
      }

    } catch (error: any) {
      console.error('Verification error:', error);
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      // Send new SMS via Twilio Verify
      const { error: smsError } = await supabase.functions.invoke('send-sms', {
        body: {
          phone: phoneNumber,
          action: 'send'
        }
      });

      if (smsError) throw smsError;

      toast({
        title: "Code Resent",
        description: "A new verification code has been sent to your phone.",
      });
    } catch (error: any) {
      console.error('Error resending OTP:', error);
      toast({
        title: "Error",
        description: "Failed to resend code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {agencyInfo?.logo_url ? (
              <img 
                src={agencyInfo.logo_url} 
                alt={agencyInfo.name} 
                className="h-8 w-auto"
              />
            ) : (
              <img 
                src="https://ngmwdebxyofxudrbesqs.supabase.co/storage/v1/object/public/nullstack//securaa.svg" 
                alt="Secura" 
                className="h-8 w-auto"
              />
            )}
          </div>
          
          {agencyInfo && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Sent by:</span> {agencyInfo.name}
              </p>
              {agencyInfo.description && (
                <p className="text-xs text-blue-600 mt-1">{agencyInfo.description}</p>
              )}
            </div>
          )}
          
          <CardTitle className="text-2xl text-secura-black">
            {step === 'phone' ? 'Client Portal Access' : 'Verify Your Number'}
          </CardTitle>
          <CardDescription>
            {step === 'phone' 
              ? (agencyInfo ? 
                  `Enter your mobile number to access your secure portal via ${agencyInfo.name}` :
                  'Enter your mobile number to access your secure portal')
              : `We've sent a verification code to ${phoneNumber}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'phone' ? (
            <form onSubmit={sendOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center">
                  <Phone className="w-4 h-4 mr-2" />
                  Mobile Number
                </Label>
                <div className="flex space-x-2">
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border shadow-lg z-50">
                      {countryCodes.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          <span className="flex items-center">
                            <span className="mr-2">{country.flag}</span>
                            <span className="text-sm">{country.code}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="501234567"
                    className="flex-1 text-lg"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Enter your mobile number without the country code
                </p>
              </div>
              
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-secura-lime hover:bg-secura-lime/90 text-secura-teal"
                size="lg"
              >
                {loading ? (
                  <>
                    <MessageSquare className="w-4 h-4 mr-2 animate-pulse" />
                    Sending SMS...
                  </>
                ) : (
                  'Send Verification Code'
                )}
              </Button>

              <div className="flex flex-col items-center justify-center text-sm text-muted-foreground mt-4 space-y-3">
                <div className="flex items-center">
                  <Shield className="w-4 h-4 mr-1" />
                  Your information is secure and encrypted
                </div>
                
                {/* Certification logos */}
                <div className="flex items-center justify-center space-x-3 opacity-40">
                  <img 
                    src="https://yugzvvgctlhfcdmmwaxj.storage.supabase.co/v1/object/public/images/compliance/AES-256%20compliance.svg" 
                    alt="AES-256 Compliance" 
                    className="h-6 w-auto grayscale"
                  />
                  <img 
                    src="https://yugzvvgctlhfcdmmwaxj.storage.supabase.co/v1/object/public/images/compliance/HIPAA%20Security.svg" 
                    alt="HIPAA Security" 
                    className="h-6 w-auto grayscale"
                  />
                  <img 
                    src="https://yugzvvgctlhfcdmmwaxj.storage.supabase.co/v1/object/public/images/compliance/SOC%202%20Type%202%20Security.svg" 
                    alt="SOC 2 Type 2 Security" 
                    className="h-6 w-auto grayscale"
                  />
                  <img 
                    src="https://yugzvvgctlhfcdmmwaxj.storage.supabase.co/v1/object/public/images/compliance/TLS_compliant.svg" 
                    alt="TLS Compliant" 
                    className="h-6 w-auto grayscale"
                  />
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={verifyOTP} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-center block">
                  Enter 6-digit verification code
                </Label>
                <div className="flex justify-center">
                  <InputOTP
                    value={otpCode}
                    onChange={setOtpCode}
                    maxLength={6}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Code expires in 10 minutes
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full bg-secura-lime hover:bg-secura-lime/90 text-secura-teal"
                size="lg"
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </Button>

              <div className="text-center space-y-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resendOTP}
                  disabled={loading}
                  className="text-sm text-muted-foreground"
                >
                  Didn't receive the code? Resend
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setStep('phone');
                    setOtpCode('');
                  }}
                  className="text-sm text-muted-foreground block mx-auto"
                >
                  Change phone number
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientLogin;
