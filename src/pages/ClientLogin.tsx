import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { Phone, Shield, MessageSquare } from 'lucide-react';

const ClientLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [referralToken, setReferralToken] = useState<string | null>(null);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralToken(ref);
    }
  }, [searchParams]);

  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // If it starts with 971, keep as is, otherwise prepend +971
    if (cleaned.startsWith('971')) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('0')) {
      return `+971${cleaned.slice(1)}`;
    } else if (cleaned.length === 8 || cleaned.length === 9) {
      return `+971${cleaned}`;
    }
    
    return phone; // Return original if can't format
  };

  const sendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    if (!formattedPhone.match(/^\+971[0-9]{8,9}$/)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid UAE mobile number (e.g., +971 50 123 4567)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Generate OTP code
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Check if client exists and update/create
      const { data: existingClient } = await supabase
        .from('clients')
        .select('*')
        .eq('phone', formattedPhone)
        .single();

      if (existingClient) {
        // Update existing client with new OTP
        const { error } = await supabase
          .from('clients')
          .update({
            otp_code: otp,
            otp_expires_at: otpExpiry.toISOString(),
            mobile_number: formattedPhone,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingClient.id);

        if (error) throw error;
      } else {
        // Create new client
        const { error } = await supabase
          .from('clients')
          .insert({
            phone: formattedPhone,
            mobile_number: formattedPhone,
            otp_code: otp,
            otp_expires_at: otpExpiry.toISOString(),
            referral_token: referralToken,
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      // Send SMS via Twilio
      const { data, error: smsError } = await supabase.functions.invoke('send-sms', {
        body: {
          phone: formattedPhone,
          otp: otp,
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
      const { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .eq('phone', phoneNumber)
        .eq('otp_code', otpCode)
        .gt('otp_expires_at', new Date().toISOString())
        .single();

      if (error || !client) {
        toast({
          title: "Invalid Code",
          description: "The verification code is incorrect or has expired.",
          variant: "destructive",
        });
        return;
      }

      // Update client as verified and clear OTP
      await supabase
        .from('clients')
        .update({
          is_verified: true,
          last_login: new Date().toISOString(),
          otp_code: null,
          otp_expires_at: null,
        })
        .eq('id', client.id);

      // Store client session
      localStorage.setItem('client_data', JSON.stringify(client));

      toast({
        title: "Login Successful",
        description: "Welcome to Secura!",
      });

      // Check if onboarding is completed
      if (!client.onboarding_completed || referralToken) {
        // Redirect to onboarding with referral token if present
        const onboardingUrl = referralToken 
          ? `/client/onboarding?ref=${referralToken}`
          : '/client/onboarding';
        navigate(onboardingUrl);
      } else {
        navigate('/client/dashboard');
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
      // Generate new OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      // Update client with new OTP
      const { error } = await supabase
        .from('clients')
        .update({
          otp_code: otp,
          otp_expires_at: otpExpiry.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('phone', phoneNumber);

      if (error) throw error;

      // Send new SMS
      const { error: smsError } = await supabase.functions.invoke('send-sms', {
        body: {
          phone: phoneNumber,
          otp: otp
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
            <img 
              src="https://ngmwdebxyofxudrbesqs.supabase.co/storage/v1/object/public/nullstack//securaa.svg" 
              alt="Secura" 
              className="h-8 w-auto"
            />
          </div>
          <CardTitle className="text-2xl text-secura-black">
            {step === 'phone' ? 'Client Portal Access' : 'Verify Your Number'}
          </CardTitle>
          <CardDescription>
            {step === 'phone' 
              ? 'Enter your UAE mobile number to access your secure portal'
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
                  UAE Mobile Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+971 50 123 4567"
                  className="text-center text-lg"
                  required
                />
                <p className="text-xs text-muted-foreground text-center">
                  Enter your number with or without +971 country code
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

              <div className="flex items-center justify-center text-sm text-muted-foreground mt-4">
                <Shield className="w-4 h-4 mr-1" />
                Your information is secure and encrypted
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
