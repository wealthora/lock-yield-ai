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

    const { code, purpose } = await req.json();

    if (!code || !purpose) {
      throw new Error('Code and purpose are required');
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
      console.error('Error fetching code:', fetchError);
      throw fetchError;
    }

    if (!verificationData) {
      return new Response(
        JSON.stringify({ verified: false, message: 'Invalid or expired code' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark the code as used
    const { error: updateError } = await supabaseAdmin
      .from('verification_codes')
      .update({ used: true })
      .eq('id', verificationData.id);

    if (updateError) {
      console.error('Error updating code:', updateError);
      throw updateError;
    }

    // Update last verified timestamp in user_security
    const { error: securityError } = await supabaseClient
      .from('user_security')
      .upsert({
        user_id: user.id,
        last_verified_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (securityError) {
      console.error('Error updating security record:', securityError);
    }

    return new Response(
      JSON.stringify({ verified: true }),
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
