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
    const { email, code, newPassword } = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: 'Email and verification code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying password reset code for:', email);

    // Use service role to perform operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();

    if (profileError || !profile) {
      console.error('User not found:', profileError);
      return new Response(
        JSON.stringify({ error: 'Invalid email or verification code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the code
    const { data: verificationCode, error: codeError } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('user_id', profile.user_id)
      .eq('code', code)
      .eq('purpose', 'password_reset')
      .eq('used', false)
      .maybeSingle();

    if (codeError || !verificationCode) {
      console.error('Invalid verification code');
      return new Response(
        JSON.stringify({ error: 'Invalid verification code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if code is expired
    const expiresAt = new Date(verificationCode.expires_at);
    if (expiresAt < new Date()) {
      console.error('Verification code expired');
      return new Response(
        JSON.stringify({ error: 'Verification code has expired. Please request a new one.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If newPassword is provided, update the password
    if (newPassword) {
      // Validate password strength
      if (newPassword.length < 8) {
        return new Response(
          JSON.stringify({ error: 'Password must be at least 8 characters long' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update user password using admin API
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        profile.user_id,
        { password: newPassword }
      );

      if (updateError) {
        console.error('Error updating password:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update password. Please try again.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mark code as used
      await supabaseAdmin
        .from('verification_codes')
        .update({ used: true })
        .eq('id', verificationCode.id);

      console.log('Password updated successfully for user:', profile.user_id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Password updated successfully',
          passwordUpdated: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Just verify the code without updating password
    console.log('Code verified successfully for user:', profile.user_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Verification code is valid',
        verified: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Unexpected error in verify-password-reset:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred. Please try again.',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
