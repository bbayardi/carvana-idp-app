import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface ShareEmailRequest {
  collaboratorEmail: string;
  originalUserEmail: string;
  roleName: string;
  shareToken: string;
  shareLink: string;
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { collaboratorEmail, originalUserEmail, roleName, shareLink }: ShareEmailRequest =
      await req.json();

    // Send email via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Carvana IDP Tool <noreply@carvana.com>", // Update with your verified domain
        to: [collaboratorEmail],
        subject: `${originalUserEmail} shared their ${roleName} assessment with you`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                }
                .header {
                  background-color: #003B5C;
                  color: white;
                  padding: 30px;
                  text-align: center;
                  border-radius: 8px 8px 0 0;
                }
                .content {
                  background-color: #ffffff;
                  padding: 30px;
                  border: 1px solid #e0e0e0;
                  border-top: none;
                }
                .button {
                  display: inline-block;
                  background-color: #00A8E1;
                  color: white;
                  padding: 14px 28px;
                  text-decoration: none;
                  border-radius: 6px;
                  font-weight: bold;
                  margin: 20px 0;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                }
                .footer {
                  background-color: #f5f5f5;
                  padding: 20px 30px;
                  border: 1px solid #e0e0e0;
                  border-top: none;
                  border-radius: 0 0 8px 8px;
                  font-size: 12px;
                  color: #666;
                  text-align: center;
                }
                .highlight {
                  background-color: #f0f9ff;
                  border-left: 4px solid #00A8E1;
                  padding: 15px;
                  margin: 20px 0;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1 style="margin: 0; font-size: 24px;">Carvana IDP Tool</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Individual Development Plan</p>
              </div>

              <div class="content">
                <h2 style="color: #003B5C; margin-top: 0;">You've been asked to provide feedback</h2>

                <p>Hi there,</p>

                <p>
                  <strong>${originalUserEmail}</strong> has shared their
                  <strong>${roleName}</strong> assessment with you and is requesting your feedback.
                </p>

                <div class="highlight">
                  <p style="margin: 0;">
                    <strong>What's this about?</strong><br>
                    Your colleague is working on their Individual Development Plan and values your perspective.
                    They'd like you to review their self-assessment and provide your feedback on their competencies.
                  </p>
                </div>

                <p style="text-align: center;">
                  <a href="${shareLink}" class="button">View Assessment & Provide Feedback</a>
                </p>

                <p style="font-size: 14px; color: #666;">
                  <strong>Note:</strong> This link never expires and is specific to you.
                  You can save it and come back to provide feedback at your convenience.
                </p>
              </div>

              <div class="footer">
                <p style="margin: 0;">
                  This is an automated message from the Carvana IDP Tool.<br>
                  If you have questions, please contact ${originalUserEmail}.
                </p>
              </div>
            </body>
          </html>
        `,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to send email");
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
