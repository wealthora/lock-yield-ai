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
        JSON.stringify({ error: 'Authorization header is required', verified: false }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Supabase client with user's auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError) {
      console.error('Auth error:', userError.message);
      return new Response(
        JSON.stringify({ error: 'Authentication failed', verified: false }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!user) {
      console.error('No user found in session');
      return new Response(
        JSON.stringify({ error: 'User not found. Please log in again.', verified: false }),
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
      return new Response(
        JSON.stringify({ error: 'Invalid request body', verified: false }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { code, purpose } = body;

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Verification code is required', verified: false }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!purpose) {
      return new Response(
        JSON.stringify({ error: 'Purpose is required', verified: false }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Use service role key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the verification code
    const { data: verificationData, error: fetchError } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('code', code)
      .eq('purpose', purpose)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching verification code:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify code', verified: false }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!verificationData) {
      console.log(`Invalid or expired code attempt for user ${user.id}`);
      return new Response(
        JSON.stringify({ 
          verified: false, 
          message: 'Invalid or expired verification code. Please request a new code.' 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Mark the code as used
    const { error: updateError } = await supabaseAdmin
      .from('verification_codes')
      .update({ used: true })
      .eq('id', verificationData.id);

    if (updateError) {
      console.error('Error marking code as used:', updateError);
      // Continue anyway since the code was valid
    }

    // Update last verified timestamp in user_security
    const { error: securityError } = await supabaseAdmin
      .from('user_security')
      .upsert({
        user_id: user.id,
        last_verified_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (securityError) {
      console.error('Error updating security record:', securityError);
      // Continue anyway since verification was successful
    }

    console.log(`2FA verification successful for user ${user.id}, purpose: ${purpose}`);

    return new Response(
      JSON.stringify({ 
        verified: true,
        message: 'Verification successful'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Unexpected error in verify-2fa-code:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred. Please try again.',
        verified: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
