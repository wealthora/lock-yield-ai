import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to get their ID
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const documentType = formData.get("documentType") as string;

    if (!file || !documentType) {
      return new Response(
        JSON.stringify({ error: "Missing file or documentType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file size (1MB max)
    if (file.size > 1048576) {
      return new Response(
        JSON.stringify({ error: "File size must be less than 1MB" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file type based on document type
    const identityFormats = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    const residenceFormats = [...identityFormats, "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    
    const allowedFormats = documentType === "proof-of-identity" ? identityFormats : residenceFormats;
    
    if (!allowedFormats.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: `Invalid file type: ${file.type}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client for storage operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Generate file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${documentType}-${Date.now()}.${fileExt}`;

    // Convert file to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();

    // Upload using service role (bypasses RLS and bucket metadata checks)
    const { error: uploadError } = await adminClient.storage
      .from("kyc-documents")
      .upload(fileName, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get signed URL (since bucket is private)
    const { data: signedData } = await adminClient.storage
      .from("kyc-documents")
      .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year expiry

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: signedData?.signedUrl || `${supabaseUrl}/storage/v1/object/kyc-documents/${fileName}`,
        path: fileName
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});