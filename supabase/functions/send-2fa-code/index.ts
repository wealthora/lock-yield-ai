import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { purpose } = await req.json();

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiration to 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Store the code
    const { error: insertError } = await supabaseClient
      .from('verification_codes')
      .insert({
        user_id: user.id,
        code,
        purpose,
        expires_at: expiresAt,
        used: false,
      });

    if (insertError) {
      console.error('Error storing code:', insertError);
      throw insertError;
    }

    // Get user email
    const userEmail = user.email;

    // Here you would integrate with an email service like Resend
    // For now, we'll log the code (in production, send via email)
    console.log(`2FA Code for ${userEmail}: ${code} (expires in 10 minutes)`);

    // TODO: Integrate with email service
    // Example with Resend:
    // const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    // await resend.emails.send({
    //   from: 'Security <security@yourdomain.com>',
    //   to: [userEmail],
    //   subject: 'Your Verification Code',
    //   html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 10 minutes.</p>`,
    // });

    return new Response(
      JSON.stringify({ message: 'Verification code sent', code }), // Remove code in production
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
