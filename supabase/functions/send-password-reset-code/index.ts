import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Password reset code requested for:', email);

    // Use service role to perform operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if user exists in auth.users via profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, first_name')
      .eq('email', email)
      .maybeSingle();

    if (profileError) {
      console.error('Error checking user:', profileError);
    }

    // For security, always return success even if user doesn't exist
    // This prevents email enumeration attacks
    if (!profile) {
      console.log('No user found with email:', email);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'If an account exists with this email, a verification code has been sent.',
          email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiration to 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Invalidate any existing unused password reset codes for this user
    await supabaseAdmin
      .from('verification_codes')
      .update({ used: true })
      .eq('user_id', profile.user_id)
      .eq('purpose', 'password_reset')
      .eq('used', false);

    // Store the new code
    const { error: insertError } = await supabaseAdmin
      .from('verification_codes')
      .insert({
        user_id: profile.user_id,
        code,
        purpose: 'password_reset',
        expires_at: expiresAt,
        used: false,
      });

    if (insertError) {
      console.error('Error storing verification code:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate verification code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Resend API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userName = profile.first_name || 'Valued User';

    // Send email via Resend API
    console.log(`Sending password reset code to ${email}`);
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.15);">
          <div style="padding: 40px 32px; text-align: center;">
            <img src="https://wealthoraai.lovable.app/wealthora-logo.png" alt="WealthoraUK" style="width: 100px; height: auto; margin-bottom: 20px;">
            <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 50%; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 28px;">🔑</span>
            </div>
            <h1 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0 0 8px;">Password Reset</h1>
            <p style="color: #94a3b8; font-size: 14px; margin: 0 0 32px;">Hello ${userName}, use this code to reset your password</p>
            
            <div style="background: rgba(245, 158, 11, 0.1); border: 2px dashed #f59e0b; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <div style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #f59e0b;">${code}</div>
            </div>
            
            <p style="color: #64748b; font-size: 13px; margin: 0 0 8px;">
              ⏱️ This code expires in <strong style="color: #f59e0b;">10 minutes</strong>
            </p>
            <p style="color: #475569; font-size: 12px; margin: 0;">
              If you didn't request this code, please ignore this email. Your password will remain unchanged.
            </p>
          </div>
          
          <div style="background: rgba(0,0,0,0.2); padding: 20px 32px; text-align: center;">
            <p style="color: #64748b; font-size: 11px; margin: 0;">
              © ${new Date().getFullYear()} WealthoraUK. All rights reserved.<br>
              This is an automated security email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'WealthoraUK <onboarding@resend.dev>',
        to: [email],
        subject: 'Reset Your Wealthora Password',
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error('Resend API error:', emailResult);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send verification email. Please try again.',
          details: emailResult.message || 'Email service error'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Password reset code sent successfully:', emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Verification code sent to your email',
        email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Unexpected error in send-password-reset-code:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred. Please try again.',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
