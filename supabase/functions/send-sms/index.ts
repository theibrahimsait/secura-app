
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  phone: string;
  action: 'send' | 'verify';
  code?: string;
  clientId?: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const sendVerificationCode = async (phone: string) => {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const verifyServiceSid = Deno.env.get('TWILIO_VERIFY_SERVICE_SID');

  console.log('Twilio Verify credentials check:', {
    accountSid: accountSid ? 'Present' : 'Missing',
    authToken: authToken ? 'Present' : 'Missing',
    verifyServiceSid: verifyServiceSid ? 'Present' : 'Missing'
  });

  if (!accountSid || !authToken || !verifyServiceSid) {
    throw new Error('Twilio Verify credentials not configured');
  }

  const auth = btoa(`${accountSid}:${authToken}`);
  
  const body = new URLSearchParams({
    To: phone,
    Channel: 'sms',
    Locale: 'en',
  });

  console.log('Sending verification code to:', phone.slice(-4));

  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${verifyServiceSid}/Verifications`,
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
    console.error('Twilio Verify error:', {
      status: response.status,
      statusText: response.statusText,
      error: error,
      phone: phone.slice(-4)
    });
    
    // Parse Twilio error for specific messages
    let errorMessage = `Verification sending failed: ${response.status}`;
    try {
      const errorData = JSON.parse(error);
      if (errorData.message) {
        errorMessage = errorData.message;
        console.error('Twilio specific error:', errorData);
      }
    } catch (e) {
      // Error parsing JSON, use generic message
    }
    
    throw new Error(errorMessage);
  }

  return await response.json();
};

const verifyCode = async (phone: string, code: string) => {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const verifyServiceSid = Deno.env.get('TWILIO_VERIFY_SERVICE_SID');

  if (!accountSid || !authToken || !verifyServiceSid) {
    throw new Error('Twilio Verify credentials not configured');
  }

  const auth = btoa(`${accountSid}:${authToken}`);
  
  const body = new URLSearchParams({
    To: phone,
    Code: code,
  });

  console.log('Verifying code for:', phone.slice(-4));

  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${verifyServiceSid}/VerificationCheck`,
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
    console.error('Twilio Verify check error:', {
      status: response.status,
      statusText: response.statusText,
      error: error,
      phone: phone.slice(-4)
    });
    
    // Parse Twilio error for specific messages
    let errorMessage = `Verification check failed: ${response.status}`;
    try {
      const errorData = JSON.parse(error);
      if (errorData.message) {
        errorMessage = errorData.message;
        console.error('Twilio verification error:', errorData);
      }
    } catch (e) {
      // Error parsing JSON, use generic message
    }
    
    throw new Error(errorMessage);
  }

  return await response.json();
};

const checkRateLimit = async (phone: string): Promise<boolean> => {
  // Check for SMS attempts in the last 2 minutes
  const twoMinutesAgo = new Date(Date.now() - 2 * 60000).toISOString();
  
  const { data, error } = await supabase
    .from('audit_logs')
    .select('created_at')
    .eq('action', 'sms_sent')
    .gte('created_at', twoMinutesAgo)
    .contains('details', { phone: phone.slice(-4) })
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Rate limit check error:', error);
    return true; // Allow if we can't check
  }

  return !data; // Allow if no recent SMS found
};

const logSMSEvent = async (phone: string, action: string, success: boolean, error?: string) => {
  try {
    await supabase.rpc('log_audit_event', {
      p_user_id: null,
      p_client_id: null,
      p_action: 'sms_sent',
      p_resource_type: 'authentication',
      p_resource_id: null,
      p_details: {
        phone: phone.slice(-4),
        action,
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
    console.log('SMS Verify function called');
    const { phone, action, code, clientId }: SMSRequest = await req.json();

    // Validate input
    if (!phone || !action) {
      console.error('Missing required fields:', { phone: !!phone, action: !!action });
      return new Response(
        JSON.stringify({ error: 'Phone number and action are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Validate phone format
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

    if (action === 'send') {
      // Check rate limiting for sending
      const canSend = await checkRateLimit(phone);
      if (!canSend) {
        console.log('Rate limit exceeded for phone:', phone.slice(-4));
        await logSMSEvent(phone, 'send', false, 'Rate limit exceeded');
        return new Response(
          JSON.stringify({ error: 'Please wait before requesting another code' }),
          {
            status: 429,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      // Send verification code
      const twilioResponse = await sendVerificationCode(phone);
      console.log('Verification code sent successfully:', twilioResponse.sid);

      // Log successful SMS
      await logSMSEvent(phone, 'send', true);

      return new Response(
        JSON.stringify({ 
          success: true, 
          sid: twilioResponse.sid,
          status: twilioResponse.status,
          message: 'Verification code sent successfully'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

    } else if (action === 'verify') {
      if (!code) {
        return new Response(
          JSON.stringify({ error: 'Verification code is required' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      // Verify the code
      const verificationResult = await verifyCode(phone, code);
      console.log('Verification result:', verificationResult.status);

      const isValid = verificationResult.status === 'approved';
      await logSMSEvent(phone, 'verify', isValid, isValid ? null : 'Invalid code');

      return new Response(
        JSON.stringify({ 
          success: isValid,
          status: verificationResult.status,
          message: isValid ? 'Code verified successfully' : 'Invalid verification code'
        }),
        {
          status: isValid ? 200 : 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use "send" or "verify"' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

  } catch (error: any) {
    console.error('SMS Verify error:', error);
    
    let phone = 'unknown';
    try {
      const body = await req.clone().json();
      phone = body.phone || 'unknown';
    } catch (e) {
      // Ignore parsing errors
    }
    
    await logSMSEvent(phone, 'error', false, error.message);

    return new Response(
      JSON.stringify({ 
        error: 'Failed to process verification request. Please try again.',
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
