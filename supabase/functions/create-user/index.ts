import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  password: string;
  agencyName?: string;
  adminName?: string;
  isPasswordReset?: boolean;
  userId?: string;
  role?: string;
  fullName?: string;
  phone?: string;
  agencyId?: string;
  createdBy?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      email,
      password,
      agencyName,
      adminName,
      isPasswordReset,
      userId,
      role = 'agency_admin',
      fullName,
      phone,
      agencyId,
      createdBy
    }: CreateUserRequest = await req.json();

    // Create Supabase admin client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let authData;

    if (isPasswordReset && userId) {
      // Update existing user's password
      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password }
      );

      if (updateError) {
        console.error('Password update error:', updateError);
        throw updateError;
      }

      authData = { data: updateData };
    } else {
      // Create new auth user
      const { data: createData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
      });

      if (authError) {
        console.error('Auth creation error:', authError);
        throw authError;
      }

      authData = createData;

      // Create user record in public.users table
      if (role === 'agent') {
        const { error: userError } = await supabase
          .from('users')
          .insert({
            auth_user_id: authData.data.user.id,
            email,
            full_name: fullName || adminName,
            phone,
            role: 'agent',
            agency_id: agencyId,
            created_by: createdBy,
          });

        if (userError) {
          console.error('User creation error:', userError);
          throw userError;
        }
      }
    }

    // Send welcome email with credentials
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    if (resend) {
      try {
        const emailSubject = isPasswordReset
          ? "Secura - Your Account Credentials Have Been Updated"
          : role === 'agent'
          ? "Welcome to Secura - Your Agent Account"
          : "Welcome to Secura - Your Agency Account";

        const emailContent = isPasswordReset
          ? `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #2563eb;">Account Credentials Updated</h1>
              <p>Hello ${adminName || 'Admin'},</p>
              <p>Your account credentials for <strong>${agencyName || 'your agency'}</strong> have been updated.</p>

              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Your Updated Login Credentials:</h3>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>New Password:</strong> <code style="background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px;">${password}</code></p>
              </div>

              <p><strong>Important:</strong> Please change your password after logging in for security purposes.</p>

              <p>You can access your dashboard at: <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.secura.app') || 'your-app-url'}/auth/login">Login Here</a></p>

              <p>If you have any questions, please don't hesitate to contact our support team.</p>

              <p>Best regards,<br>The Secura Team</p>
            </div>
          `
          : role === 'agent'
          ? `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #2563eb;">Welcome to Secura</h1>
              <p>Hello ${fullName || adminName},</p>
              <p>Your agent account has been created successfully.</p>

              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Your Login Credentials:</h3>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Temporary Password:</strong> <code style="background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px;">${password}</code></p>
              </div>

              <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>

              <p>You can access your dashboard at: <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.secura.app') || 'your-app-url'}/auth/login">Login Here</a></p>

              <p>If you have any questions, please don't hesitate to contact our support team.</p>

              <p>Best regards,<br>The Secura Team</p>
            </div>
          `
          : `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #2563eb;">Welcome to Secura</h1>
              <p>Hello ${adminName || 'Admin'},</p>
              <p>Your agency account for <strong>${agencyName || 'your agency'}</strong> has been created successfully.</p>

              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Your Login Credentials:</h3>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Temporary Password:</strong> <code style="background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px;">${password}</code></p>
              </div>

              <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>

              <p>You can access your dashboard at: <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.secura.app') || 'your-app-url'}/auth/login">Login Here</a></p>

              <p>If you have any questions, please don't hesitate to contact our support team.</p>

              <p>Best regards,<br>The Secura Team</p>
            </div>
          `;

        await resend.emails.send({
          from: "Secura <noreply@secura.me>",
          to: [email],
          subject: emailSubject,
          html: emailContent,
        });

        console.log('Email sent successfully');
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Don't fail the operation if email fails
      }
    }

    const message = isPasswordReset
      ? 'Password updated successfully. Welcome email sent.'
      : role === 'agent'
      ? 'Agent created successfully. Welcome email sent.'
      : 'User created successfully. Welcome email sent.';

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          user: authData.data.user,
          message
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in create-user function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to process request'
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
