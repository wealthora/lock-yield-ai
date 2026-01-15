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
    const { email, resetLink } = await req.json();

    console.log('Sending password reset email to:', email);

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'WealthoraUK <onboarding@resend.dev>',
        to: [email],
        subject: 'Reset Your Wealthora Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px;">
            <h1 style="color: #ffd700; text-align: center;">Password Reset Request</h1>
            <p style="color: #94a3b8; font-size: 16px;">
              You requested to reset your password. Click the button below to set a new password:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #10b981; color: white; padding: 14px 28px; 
                        text-decoration: none; border-radius: 8px; font-weight: bold;
                        display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #64748b; font-size: 14px;">
              If you didn't request this, you can safely ignore this email.
            </p>
            <p style="color: #64748b; font-size: 14px;">
              This link will expire in 1 hour.
            </p>
            <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 30px 0;">
            <p style="color: #64748b; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} WealthoraUK. All rights reserved.
            </p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error('Resend API error:', errorData);
      throw new Error(`Resend API error: ${errorData}`);
    }

    const result = await emailResponse.json();
    console.log('Reset email sent successfully:', result);

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in send-reset-email function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
