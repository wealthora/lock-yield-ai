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
    const { email, firstName } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Signup verification code requested for:', email);

    // Use service role to perform operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Rate limiting: Check how many codes were sent in the last minute (using email column)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recentCodes, error: rateCheckError } = await supabaseAdmin
      .from('verification_codes')
      .select('id, created_at')
      .eq('email', email)
      .eq('purpose', 'signup_verification')
      .gte('created_at', oneMinuteAgo);

    if (rateCheckError) {
      console.error('Rate limit check error:', rateCheckError);
    }

    // Allow max 2 codes per minute
    if (recentCodes && recentCodes.length >= 2) {
      console.log('Rate limit exceeded for:', email);
      return new Response(
        JSON.stringify({ 
          error: 'Too many requests. Please wait a moment before requesting another code.',
          retryAfter: 60
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check hourly limit: max 5 codes per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: hourlyCodesCodes, error: hourlyCheckError } = await supabaseAdmin
      .from('verification_codes')
      .select('id')
      .eq('email', email)
      .eq('purpose', 'signup_verification')
      .gte('created_at', oneHourAgo);

    if (hourlyCheckError) {
      console.error('Hourly rate limit check error:', hourlyCheckError);
    }

    if (hourlyCodesCodes && hourlyCodesCodes.length >= 5) {
      console.log('Hourly rate limit exceeded for:', email);
      return new Response(
        JSON.stringify({ 
          error: 'Too many verification attempts. Please try again in an hour.',
          retryAfter: 3600
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiration to 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Invalidate any existing unused signup verification codes for this email
    await supabaseAdmin
      .from('verification_codes')
      .update({ used: true })
      .eq('email', email)
      .eq('purpose', 'signup_verification')
      .eq('used', false);

    // Store the new code using email column (user_id is null for signup)
    const { error: insertError } = await supabaseAdmin
      .from('verification_codes')
      .insert({
        email: email,
        user_id: null, // NULL for signup verification (user doesn't exist yet)
        code,
        purpose: 'signup_verification',
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

    const userName = firstName || 'New User';

    // Send email via Resend API
    console.log(`Sending signup verification code to ${email}`);
    
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
            <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 50%; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 28px;">✉️</span>
            </div>
            <h1 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0 0 8px;">Verify Your Email</h1>
            <p style="color: #94a3b8; font-size: 14px; margin: 0 0 32px;">Hello ${userName}, welcome to WealthoraUK! Use this code to verify your email</p>
            
            <div style="background: rgba(34, 197, 94, 0.1); border: 2px dashed #22c55e; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <div style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #22c55e;">${code}</div>
            </div>
            
            <p style="color: #64748b; font-size: 13px; margin: 0 0 8px;">
              ⏱️ This code expires in <strong style="color: #22c55e;">10 minutes</strong>
            </p>
            <p style="color: #475569; font-size: 12px; margin: 0;">
              If you didn't request this code, please ignore this email.
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
        subject: 'Verify Your WealthoraUK Account',
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

    console.log('Signup verification code sent successfully:', emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Verification code sent to your email',
        email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Unexpected error in send-signup-verification-code:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred. Please try again.',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});