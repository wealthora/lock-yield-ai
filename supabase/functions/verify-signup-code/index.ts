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
    const { email, code } = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: 'Email and code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying signup code for:', email);

    // Use service role to perform operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the verification code using email column
    const { data: verificationCode, error: findError } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('purpose', 'signup_verification')
      .eq('used', false)
      .maybeSingle();

    if (findError) {
      console.error('Error finding verification code:', findError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!verificationCode) {
      console.log('Invalid or expired verification code for:', email);
      return new Response(
        JSON.stringify({ verified: false, error: 'Invalid verification code' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if code is expired
    const now = new Date();
    const expiresAt = new Date(verificationCode.expires_at);

    if (now > expiresAt) {
      console.log('Expired verification code for:', email);
      return new Response(
        JSON.stringify({ verified: false, error: 'Verification code has expired' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark the code as used
    const { error: updateError } = await supabaseAdmin
      .from('verification_codes')
      .update({ used: true })
      .eq('id', verificationCode.id);

    if (updateError) {
      console.error('Error marking code as used:', updateError);
    }

    console.log('Signup verification successful for:', email);

    return new Response(
      JSON.stringify({ verified: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Unexpected error in verify-signup-code:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred. Please try again.',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
