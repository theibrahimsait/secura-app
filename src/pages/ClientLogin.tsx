
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { Phone, Shield } from 'lucide-react';

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

  const sendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Generate OTP code
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Check if client exists
      const { data: existingClient } = await supabase
        .from('clients')
        .select('*')
        .eq('phone', phoneNumber)
        .single();

      if (existingClient) {
        // Update existing client with new OTP
        const { error } = await supabase
          .from('clients')
          .update({
            otp_code: otp,
            otp_expires_at: otpExpiry.toISOString(),
            mobile_number: phoneNumber,
          })
          .eq('id', existingClient.id);

        if (error) throw error;
      } else {
        // Create new client
        const { error } = await supabase
          .from('clients')
          .insert({
            phone: phoneNumber,
            mobile_number: phoneNumber,
            otp_code: otp,
            otp_expires_at: otpExpiry.toISOString(),
            referral_token: referralToken,
          });

        if (error) throw error;
      }

      // For demo purposes, show the OTP in a toast
      toast({
        title: "Verification Code Sent",
        description: `Your verification code is: ${otp}`,
      });

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
              ? 'Enter your mobile number to access your secure portal'
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
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+971 50 123 4567"
                  className="text-center text-lg"
                  required
                />
              </div>
              
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-secura-lime hover:bg-secura-lime/90 text-secura-teal"
                size="lg"
              >
                {loading ? 'Sending...' : 'Send Verification Code'}
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
              </div>

              <Button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full bg-secura-lime hover:bg-secura-lime/90 text-secura-teal"
                size="lg"
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep('phone')}
                  className="text-sm text-muted-foreground"
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
