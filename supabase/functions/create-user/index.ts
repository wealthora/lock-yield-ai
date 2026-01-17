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
    const { email, password, firstName, otherNames, phone, country, dateOfBirth, referrerId } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating user with pre-confirmed email:', email);

    // Use service role to create user with admin API
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create user with email already confirmed using admin API
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // This marks email as already confirmed
      user_metadata: {
        first_name: firstName,
        other_names: otherNames,
        phone,
        country,
        date_of_birth: dateOfBirth
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      
      // Check for duplicate email
      if (createError.message.includes('already been registered') || createError.message.includes('duplicate')) {
        return new Response(
          JSON.stringify({ error: 'This email is already registered. Please sign in instead.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userData.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User created successfully:', userData.user.id);

    // Save referral relationship if referrer exists
    if (referrerId && referrerId !== userData.user.id) {
      const { error: referralError } = await supabaseAdmin
        .from('referrals')
        .insert({
          referrer_id: referrerId,
          referred_id: userData.user.id
        });
      
      if (referralError) {
        console.error('Error saving referral:', referralError);
        // Don't fail the signup for referral errors
      } else {
        console.log('Referral saved successfully');
      }
    }

    // Mark verification codes as used for this email
    await supabaseAdmin
      .from('verification_codes')
      .update({ used: true })
      .eq('email', email)
      .eq('purpose', 'signup_verification');

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: userData.user.id,
          email: userData.user.email
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Unexpected error in create-user:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred. Please try again.',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});