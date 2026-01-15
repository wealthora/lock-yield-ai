import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TransactionEmailRequest {
  user_id: string;
  type: "deposit" | "withdrawal";
  action: "approved" | "declined";
  amount: number;
  method: string;
  admin_notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Send transaction email function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, type, action, amount, method, admin_notes }: TransactionEmailRequest = await req.json();

    console.log("Request payload:", { user_id, type, action, amount, method, admin_notes });

    // Validate required fields
    if (!user_id || !type || !action || !amount || !method) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase admin client to get user email
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch user profile to get email and name
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email, first_name, other_names")
      .eq("user_id", user_id)
      .single();

    if (profileError || !profile?.email) {
      console.error("Error fetching user profile:", profileError);
      return new Response(
        JSON.stringify({ error: "User profile or email not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userEmail = profile.email;
    const userName = profile.first_name || "Valued Customer";

    console.log(`Sending ${type} ${action} email to: ${userEmail}`);

    // Build email content
    const isApproved = action === "approved";
    const typeCapitalized = type.charAt(0).toUpperCase() + type.slice(1);
    const actionCapitalized = action.charAt(0).toUpperCase() + action.slice(1);
    
    const statusColor = isApproved ? "#22c55e" : "#ef4444";
    const statusBgColor = isApproved ? "#dcfce7" : "#fee2e2";
    const statusIcon = isApproved ? "✓" : "✗";

    // Dynamic subject lines based on type and action
    let emailSubject: string;
    if (type === "deposit") {
      emailSubject = isApproved ? "Deposit Confirmation-Wealthora" : "Deposit Declined-Wealthora";
    } else {
      emailSubject = isApproved ? "Withdrawal Approved-Wealthora" : "Withdrawal Declined-Wealthora";
    }

    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${typeCapitalized} ${actionCapitalized}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <tr>
          <td style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: #ffd700; margin: 0; font-size: 28px; font-weight: bold;">WealthoraUK</h1>
            <p style="color: #94a3b8; margin: 10px 0 0 0; font-size: 14px;">Your Trusted Investment Partner</p>
          </td>
        </tr>
        <tr>
          <td style="background-color: #ffffff; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; background-color: ${statusBgColor}; color: ${statusColor}; padding: 15px 25px; border-radius: 50px; font-size: 18px; font-weight: bold;">
                <span style="font-size: 24px; margin-right: 8px;">${statusIcon}</span>
                ${typeCapitalized} ${actionCapitalized}
              </div>
            </div>
            
            <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              Hello <strong>${userName}</strong>,
            </p>
            
            <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              Your ${type} request has been <strong style="color: ${statusColor};">${action}</strong> by our admin team.
            </p>
            
            <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
              <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 16px;">Transaction Details</h3>
              <table style="width: 100%;">
                <tr>
                  <td style="color: #64748b; padding: 8px 0;">Date:</td>
                  <td style="color: #1e293b; font-weight: 600; text-align: right;">${currentDate}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; padding: 8px 0;">Type:</td>
                  <td style="color: #1e293b; font-weight: 600; text-align: right;">${typeCapitalized}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; padding: 8px 0;">Amount:</td>
                  <td style="color: #1e293b; font-weight: 600; text-align: right;">$${amount.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; padding: 8px 0;">Method:</td>
                  <td style="color: #1e293b; font-weight: 600; text-align: right;">${method}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; padding: 8px 0;">Status:</td>
                  <td style="text-align: right;">
                    <span style="background-color: ${statusBgColor}; color: ${statusColor}; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: 600;">
                      ${actionCapitalized}
                    </span>
                  </td>
                </tr>
              </table>
            </div>
            
            ${admin_notes ? `
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px; border-radius: 0 8px 8px 0;">
              <h4 style="color: #92400e; margin: 0 0 8px 0; font-size: 14px;">Admin Comments:</h4>
              <p style="color: #78350f; margin: 0; font-size: 14px; line-height: 1.5;">${admin_notes}</p>
            </div>
            ` : ""}
            
            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin-top: 30px;">
              ${isApproved 
                ? type === "deposit" 
                  ? "Your funds have been credited to your account. You can now use them to invest in our AI trading bots."
                  : "Your withdrawal has been processed. Please allow 1-3 business days for the funds to reflect in your account."
                : "If you have any questions about this decision, please contact our support team."}
            </p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://wealthoraai.lovable.app/dashboard" style="display: inline-block; background: linear-gradient(135deg, #ffd700 0%, #f59e0b 100%); color: #1e293b; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Dashboard
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding: 20px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} WealthoraUK. All rights reserved.<br>
              This is an automated message. Please do not reply directly to this email.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    // Send email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "WealthoraUK <onboarding@resend.dev>",
        to: [userEmail],
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend API error:", resendData);
      return new Response(
        JSON.stringify({ 
          error: "Failed to send email", 
          details: resendData.message || "Unknown error" 
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Email sent successfully:", resendData);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully", data: resendData }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-transaction-email function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
