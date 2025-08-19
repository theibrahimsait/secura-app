import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filePath, sessionToken, userType } = await req.json();
    
    console.log('📥 Download request:', { filePath, userType, hasToken: !!sessionToken });

    if (!filePath) {
      return new Response(
        JSON.stringify({ error: 'File path is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for file access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let hasAccess = false;
    let clientId: string | null = null;

    // Extract submission ID from file path (submissions/{submission_id}/updates/{filename})
    const pathParts = filePath.split('/');
    if (pathParts.length !== 4 || pathParts[0] !== 'submissions' || pathParts[2] !== 'updates') {
      return new Response(
        JSON.stringify({ error: 'Invalid file path structure' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const submissionId = pathParts[1];

    if (userType === 'client') {
      // Validate client session and access
      if (!sessionToken) {
        return new Response(
          JSON.stringify({ error: 'Session token required for client access' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get client ID from session via RPC (token is hashed server-side)
      const { data: authClientId, error: authErr } = await supabase
        .rpc('authenticate_client_request', { client_session_token: sessionToken });

      console.log('🔍 Session validation via RPC:', { ok: !!authClientId, authErr });

      if (!authClientId) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      clientId = authClientId as string;

      // Check if client has access to this submission
      const { data: submissionData, error: submissionError } = await supabase
        .from('property_agency_submissions')
        .select('id')
        .eq('id', submissionId)
        .eq('client_id', clientId)
        .single();

      console.log('🔍 Submission access check:', { 
        submissionId, 
        clientId, 
        submissionData, 
        submissionError 
      });

      hasAccess = !!submissionData;
      console.log('🔐 Client access check:', { clientId, submissionId, hasAccess });

    } else {
      // For agency staff, get user info from JWT
      const authHeader = req.headers.get('authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Authorization header required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      
      // Create client with the user's token
      const userSupabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      );

      // Get current user
      const { data: { user } } = await userSupabase.auth.getUser();
      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Invalid user token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user profile
      const { data: userData } = await supabase
        .from('users')
        .select('id, role, agency_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) {
        return new Response(
          JSON.stringify({ error: 'User profile not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if agency staff has access to this submission
      const { data: submissionData } = await supabase
        .from('property_agency_submissions')
        .select('id, agent_id')
        .eq('id', submissionId)
        .eq('agency_id', userData.agency_id)
        .single();

      hasAccess = !!submissionData && (
        userData.role === 'agency_admin' || 
        submissionData.agent_id === userData.id
      );

      console.log('🔐 Agency access check:', { 
        userId: userData.id, 
        role: userData.role, 
        agencyId: userData.agency_id,
        submissionId, 
        hasAccess 
      });
    }

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: 'Access denied to this file' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download the file using service role
    console.log('📦 Downloading file from storage:', filePath);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('submission-updates')
      .download(filePath);

    if (downloadError) {
      console.error('❌ Storage download error:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Failed to download file from storage' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!fileData) {
      return new Response(
        JSON.stringify({ error: 'File not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get file metadata for proper content type
    const fileName = pathParts[3];
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    
    let contentType = 'application/octet-stream';
    if (fileExtension === 'pdf') contentType = 'application/pdf';
    else if (fileExtension === 'jpg' || fileExtension === 'jpeg') contentType = 'image/jpeg';
    else if (fileExtension === 'png') contentType = 'image/png';
    else if (fileExtension === 'doc') contentType = 'application/msword';
    else if (fileExtension === 'docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    console.log('✅ File downloaded successfully:', { fileName, contentType, size: fileData.size });

    // Convert blob to array buffer for proper transfer
    const arrayBuffer = await fileData.arrayBuffer();
    
    // Return the file with proper headers
    return new Response(arrayBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileData.size.toString(),
      },
    });

  } catch (error) {
    console.error('❌ Download function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});