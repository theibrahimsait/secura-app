
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Phone, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ClientLogin = () => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const agentRef = searchParams.get('ref');

  const sendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generate a 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Check if client exists, if not create them
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('phone', phone)
        .single();

      if (existingClient) {
        // Update existing client with new OTP
        const { error } = await supabase
          .from('clients')
          .update({
            otp_code: otpCode,
            otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
          })
          .eq('phone', phone);
        
        if (error) throw error;
      } else {
        // Create new client
        const { error } = await supabase
          .from('clients')
          .insert({
            phone,
            mobile_number: phone,
            otp_code: otpCode,
            otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          });
        
        if (error) throw error;
      }

      // In production, send SMS here
      console.log('OTP sent:', otpCode); // For development
      
      toast({
        title: "OTP Sent",
        description: `Verification code sent to ${phone}. For demo: ${otpCode}`,
      });

      setStep('otp');
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast({
        title: "Error",
        description: "Failed to send OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .eq('phone', phone)
        .eq('otp_code', otp)
        .gt('otp_expires_at', new Date().toISOString())
        .single();

      if (error || !client) {
        throw new Error('Invalid or expired OTP');
      }

      // Mark as verified and clear OTP
      await supabase
        .from('clients')
        .update({
          is_verified: true,
          last_login: new Date().toISOString(),
          otp_code: null,
          otp_expires_at: null,
        })
        .eq('id', client.id);

      // Store client info in localStorage for session management
      localStorage.setItem('secura_client', JSON.stringify({
        id: client.id,
        phone: client.phone,
        full_name: client.full_name,
        agent_ref: agentRef,
      }));

      toast({
        title: "Login Successful",
        description: "Welcome to Secura!",
      });

      // Redirect based on whether they have properties or not
      navigate('/client/dashboard');
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast({
        title: "Verification Failed",
        description: "Invalid or expired OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <img 
              src="https://ngmwdebxyofxudrbesqs.supabase.co/storage/v1/object/public/nullstack//securaa.svg" 
              alt="Secura" 
              className="h-12 w-auto"
            />
          </div>
          <h1 className="text-2xl font-bold text-secura-black">Client Portal</h1>
          <p className="text-muted-foreground">Secure access to your property portfolio</p>
          {agentRef && (
            <div className="mt-4 p-3 bg-secura-lime/10 rounded-lg">
              <p className="text-sm text-secura-teal font-medium">
                You've been invited by one of our trusted agents
              </p>
            </div>
          )}
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {step === 'phone' ? <Phone className="w-5 h-5 mr-2" /> : <MessageSquare className="w-5 h-5 mr-2" />}
              {step === 'phone' ? 'Enter Your Mobile Number' : 'Enter Verification Code'}
            </CardTitle>
            <CardDescription>
              {step === 'phone' 
                ? 'We\'ll send you a verification code via SMS'
                : `We've sent a 6-digit code to ${phone}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'phone' ? (
              <form onSubmit={sendOTP} className="space-y-4">
                <div>
                  <Label htmlFor="phone">Mobile Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+971 50 123 4567"
                    required
                    className="mt-1"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-secura-teal hover:bg-secura-teal/90"
                >
                  {loading ? 'Sending...' : 'Send Verification Code'}
                </Button>
              </form>
            ) : (
              <form onSubmit={verifyOTP} className="space-y-4">
                <div>
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    required
                    className="mt-1 text-center text-lg tracking-wider"
                  />
                </div>
                <div className="flex space-x-3">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setStep('phone')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="flex-1 bg-secura-teal hover:bg-secura-teal/90"
                  >
                    {loading ? 'Verifying...' : 'Verify & Login'}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setStep('phone');
                    setOtp('');
                  }}
                  className="w-full text-sm"
                >
                  Didn't receive code? Send again
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Security Note */}
        <div className="text-center">
          <div className="flex items-center justify-center text-sm text-muted-foreground">
            <Shield className="w-4 h-4 mr-2" />
            Your information is protected with bank-grade security
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientLogin;
