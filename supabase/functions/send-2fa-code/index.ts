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
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authorization header is required' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Extract the JWT token
    const token = authHeader.replace('Bearer ', '');

    // Use service role to verify the user and perform operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the user from the JWT token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError) {
      console.error('Auth error:', userError.message);
      return new Response(
        JSON.stringify({ error: 'Authentication failed', details: userError.message }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!user) {
      console.error('No user found in token');
      return new Response(
        JSON.stringify({ error: 'User not found. Please log in again.' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      body = { purpose: 'settings' };
    }
    
    const { purpose = 'settings' } = body;

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiration to 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // First, invalidate any existing unused codes for this user and purpose
    await supabaseAdmin
      .from('verification_codes')
      .update({ used: true })
      .eq('user_id', user.id)
      .eq('purpose', purpose)
      .eq('used', false);

    // Store the new code
    const { error: insertError } = await supabaseAdmin
      .from('verification_codes')
      .insert({
        user_id: user.id,
        code,
        purpose,
        expires_at: expiresAt,
        used: false,
      });

    if (insertError) {
      console.error('Error storing verification code:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate verification code' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get user email
    const userEmail = user.email;
    
    if (!userEmail) {
      console.error('User has no email address');
      return new Response(
        JSON.stringify({ error: 'No email address associated with your account' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get Resend API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Determine email subject based on purpose
    let subject = 'Your Verification Code';
    let purposeText = 'complete your request';
    
    switch (purpose) {
      case 'login':
        subject = 'Login Verification Code';
        purposeText = 'log in to your account';
        break;
      case 'withdrawal':
        subject = 'Withdrawal Verification Code';
        purposeText = 'authorize your withdrawal';
        break;
      case 'settings':
        subject = 'Security Settings Verification Code';
        purposeText = 'update your security settings';
        break;
    }

    // Send email via Resend API directly
    console.log(`Sending 2FA code to ${userEmail} for purpose: ${purpose}`);
    
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
            <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 50%; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 28px;">🔐</span>
            </div>
            <h1 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0 0 8px;">Verification Code</h1>
            <p style="color: #94a3b8; font-size: 14px; margin: 0 0 32px;">Use this code to ${purposeText}</p>
            
            <div style="background: rgba(245, 158, 11, 0.1); border: 2px dashed #f59e0b; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <div style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #f59e0b;">${code}</div>
            </div>
            
            <p style="color: #64748b; font-size: 13px; margin: 0 0 8px;">
              ⏱️ This code expires in <strong style="color: #f59e0b;">10 minutes</strong>
            </p>
            <p style="color: #475569; font-size: 12px; margin: 0;">
              If you didn't request this code, please ignore this email or contact support if you have concerns.
            </p>
          </div>
          
          <div style="background: rgba(0,0,0,0.2); padding: 20px 32px; text-align: center;">
            <p style="color: #64748b; font-size: 11px; margin: 0;">
              © ${new Date().getFullYear()} Wealthora. All rights reserved.<br>
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
        from: 'Wealthora Security <onboarding@resend.dev>',
        to: [userEmail],
        subject: subject,
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
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Email sent successfully:', emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Verification code sent to your email',
        email: userEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3') // Mask email for privacy
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Unexpected error in send-2fa-code:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred. Please try again.',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
