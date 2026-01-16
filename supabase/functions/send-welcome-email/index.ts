import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

    console.log('Sending welcome email to:', email);

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userName = firstName || 'Valued Member';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
        <div style="max-width: 520px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.15);">
          <div style="padding: 40px 32px; text-align: center;">
            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 50%; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 36px;">🎉</span>
            </div>
            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0 0 8px;">Welcome to WealthoraUK!</h1>
            <p style="color: #22c55e; font-size: 16px; font-weight: 500; margin: 0 0 24px;">Hello ${userName}, your account is ready!</p>
            
            <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: left;">
              <h2 style="color: #ffffff; font-size: 16px; font-weight: 600; margin: 0 0 16px;">🚀 Get Started</h2>
              <ul style="color: #94a3b8; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>Complete your profile setup</li>
                <li>Explore our AI-powered investment bots</li>
                <li>Make your first deposit</li>
                <li>Start earning daily returns</li>
              </ul>
            </div>

            <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <p style="color: #22c55e; font-size: 14px; font-weight: 600; margin: 0 0 8px;">💡 Pro Tip</p>
              <p style="color: #94a3b8; font-size: 13px; margin: 0;">Complete your KYC verification to unlock all features and higher investment limits.</p>
            </div>
            
            <a href="https://wealthoraai.lovable.app/dashboard" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">Go to Dashboard</a>
          </div>
          
          <div style="background: rgba(0,0,0,0.2); padding: 24px 32px; text-align: center;">
            <p style="color: #94a3b8; font-size: 13px; margin: 0 0 12px;">Need help? Our support team is here for you 24/7</p>
            <p style="color: #64748b; font-size: 11px; margin: 0;">
              © ${new Date().getFullYear()} WealthoraUK. All rights reserved.<br>
              You're receiving this email because you signed up for WealthoraUK.
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
        subject: `Welcome to WealthoraUK, ${userName}! 🎉`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error('Resend API error:', emailResult);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send welcome email',
          details: emailResult.message || 'Email service error'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Welcome email sent successfully:', emailResult);

    return new Response(
      JSON.stringify({ success: true, message: 'Welcome email sent' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Unexpected error in send-welcome-email:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
