import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  phone: string;
  otp: string;
  clientId?: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const sendSMS = async (phone: string, message: string) => {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

  console.log('Twilio credentials check:', {
    accountSid: accountSid ? 'Present' : 'Missing',
    authToken: authToken ? 'Present' : 'Missing',
    twilioPhone: twilioPhone ? 'Present' : 'Missing'
  });

  if (!accountSid || !authToken || !twilioPhone) {
    throw new Error('Twilio credentials not configured');
  }

  const auth = btoa(`${accountSid}:${authToken}`);
  
  const body = new URLSearchParams({
    To: phone,
    From: twilioPhone,
    Body: message,
  });

  console.log('Sending SMS to:', phone.slice(-4)); // Only log last 4 digits for privacy

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Twilio SMS error:', error);
    throw new Error(`SMS sending failed: ${response.status}`);
  }

  return await response.json();
};

const checkRateLimit = async (phone: string): Promise<boolean> => {
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
  
  const { data, error } = await supabase
    .from('clients')
    .select('updated_at')
    .eq('phone', phone)
    .gte('updated_at', oneMinuteAgo)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Rate limit check error:', error);
    return false;
  }

  return !data; // Allow if no recent update found
};

const logSMSEvent = async (phone: string, success: boolean, error?: string) => {
  try {
    await supabase.rpc('log_audit_event', {
      p_user_id: null,
      p_client_id: null,
      p_action: 'sms_sent',
      p_resource_type: 'authentication',
      p_resource_id: null,
      p_details: {
        phone: phone.slice(-4), // Only log last 4 digits for privacy
        success,
        error: error || null,
        timestamp: new Date().toISOString()
      }
    });
  } catch (auditError) {
    console.error('Failed to log SMS event:', auditError);
  }
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('SMS function called');
    const { phone, otp, clientId }: SMSRequest = await req.json();

    // Validate input
    if (!phone || !otp) {
      console.error('Missing required fields:', { phone: !!phone, otp: !!otp });
      return new Response(
        JSON.stringify({ error: 'Phone number and OTP are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Updated validation for international phone numbers
    const phoneRegex = /^\+\d{1,4}\d{7,}$/;
    if (!phoneRegex.test(phone)) {
      console.error('Invalid phone format:', phone);
      return new Response(
        JSON.stringify({ error: 'Invalid international phone number format' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Check rate limiting
    const canSend = await checkRateLimit(phone);
    if (!canSend) {
      console.log('Rate limit exceeded for phone:', phone.slice(-4));
      await logSMSEvent(phone, false, 'Rate limit exceeded');
      return new Response(
        JSON.stringify({ error: 'Please wait before requesting another code' }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Send SMS
    const message = `Your Secura verification code is: ${otp}. This code expires in 10 minutes. Never share this code with anyone.`;
    
    const twilioResponse = await sendSMS(phone, message);
    console.log('SMS sent successfully:', twilioResponse.sid);

    // Log successful SMS
    await logSMSEvent(phone, true);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: twilioResponse.sid,
        message: 'Verification code sent successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('SMS sending error:', error);
    
    // Extract phone from request for logging if available
    let phone = 'unknown';
    try {
      const body = await req.clone().json();
      phone = body.phone || 'unknown';
    } catch (e) {
      // Ignore parsing errors
    }
    
    await logSMSEvent(phone, false, error.message);

    return new Response(
      JSON.stringify({ 
        error: 'Failed to send verification code. Please try again.',
        details: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
