import { Resend } from "resend";
import dotenv from "dotenv";
import { escapeHtml } from "../middleware/security.js";

dotenv.config();

const CLIENT_URL =
  process.env.FRONTEND_URL ||
  process.env.CLIENT_URL ||
  "http://localhost:5173";

// Resend sender address:
// - Free/Testing tier without verified domain: "D2C CRM <onboarding@resend.dev>"
// - Verified custom domain: e.g. "D2C CRM <noreply@yourdomain.com>"
const EMAIL_FROM =
  process.env.EMAIL_FROM || "D2C CRM <onboarding@resend.dev>";

// Initialize Resend Client
const resendApiKey = process.env.RESEND_API_KEY;
const resendClient = resendApiKey ? new Resend(resendApiKey) : null;

// ============================================================================
// STYLED RESPONSIVE HTML EMAIL TEMPLATE (RESEND OPTIMIZED)
// ============================================================================
interface EmailTemplateOptions {
  title: string;
  badgeText: string;
  name: string;
  bodyParagraphs: string[];
  buttonText: string;
  buttonUrl: string;
  expiryNotice: string;
  securityNotice?: string;
  iconType?: "lock" | "user";
}

const renderEmailHtml = (options: EmailTemplateOptions) => {
  const iconSvg =
    options.iconType === "user"
      ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
      : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1.5"/></svg>`;

  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${options.title}</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body {
      margin: 0 !important;
      padding: 0 !important;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; margin: auto !important; border-radius: 12px !important; }
      .header-cell { padding: 28px 20px !important; }
      .content-cell { padding: 28px 20px !important; }
      .btn { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9;">
  <div style="width: 100%; background-color: #f1f5f9; padding: 40px 16px; box-sizing: border-box;">
    
    <!-- MAIN CONTAINER CARD -->
    <table role="presentation" class="email-container" width="580" align="center" border="0" cellpadding="0" cellspacing="0" style="max-width: 580px; width: 100%; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 16px 40px -10px rgba(15, 23, 42, 0.1); border: 1px solid #e2e8f0; margin: 0 auto;">
      
      <!-- HEADER BANNER -->
      <tr>
        <td class="header-cell" style="background: linear-gradient(135deg, #0b0f19 0%, #1e1b4b 50%, #31104b 100%); padding: 36px 36px; text-align: center;">
          <!-- LOGO ICON BADGE -->
          <table role="presentation" align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 14px auto;">
            <tr>
              <td align="center" style="width: 52px; height: 52px; border-radius: 16px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #9333ea 100%); box-shadow: 0 8px 20px rgba(99, 102, 241, 0.5); text-align: center; vertical-align: middle;">
                ${iconSvg}
              </td>
            </tr>
          </table>

          <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 0.05em; text-transform: uppercase;">
            D2C <span style="color: #818cf8;">CRM</span>
          </h2>
          <div style="display: inline-block; margin-top: 6px; padding: 3px 10px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 20px; color: #c7d2fe; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;">
            ${escapeHtml(options.badgeText)}
          </div>
        </td>
      </tr>

      <!-- BODY CONTENT -->
      <tr>
        <td class="content-cell" style="padding: 38px 38px 30px 38px; background-color: #ffffff;">
          
          <h1 style="margin: 0 0 16px 0; font-size: 23px; font-weight: 800; color: #0f172a; line-height: 1.3; letter-spacing: -0.01em;">
            ${escapeHtml(options.title)}
          </h1>

          <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
            Hello <strong style="color: #0f172a;">${escapeHtml(options.name)}</strong>,
          </p>

          ${options.bodyParagraphs
            .map(
              (p) =>
                `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #475569;">${p}</p>`
            )
            .join("")}

          <!-- PRIMARY ACTION CTA BUTTON -->
          <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 32px 0;">
            <tr>
              <td align="center">
                <a href="${options.buttonUrl}" target="_blank" rel="noopener noreferrer" class="btn" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #7c3aed 100%); color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 15px; padding: 15px 36px; border-radius: 12px; box-shadow: 0 6px 20px rgba(79, 70, 229, 0.45); letter-spacing: 0.01em;">
                  ${options.buttonText} &rarr;
                </a>
              </td>
            </tr>
          </table>

          <!-- SECURITY EXPIRATION & FALLBACK NOTICE BOX -->
          <div style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 18px 20px; margin: 24px 0 16px 0;">
            <p style="margin: 0 0 10px 0; font-size: 13.5px; color: #334155; font-weight: 600;">
              &#9888; Security Notice
            </p>
            <p style="margin: 0 0 12px 0; font-size: 13px; color: #64748b; line-height: 1.5;">
              ${options.expiryNotice}
            </p>
            <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">
              If the button does not work, copy and paste this URL into your browser:
            </p>
            <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; word-break: break-all; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; color: #4f46e5; line-height: 1.4;">
              ${options.buttonUrl}
            </div>
          </div>

          <!-- ASSURANCE -->
          <p style="margin: 24px 0 0 0; font-size: 12.5px; color: #94a3b8; line-height: 1.5;">
            ${
              options.securityNotice ||
              "If you did not request or expect this email, you can safely ignore it. Your account remains completely secure."
            }
          </p>

        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background-color: #f8fafc; padding: 24px 36px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.6;">
          <strong style="color: #64748b;">&copy; ${new Date().getFullYear()} D2C CRM Platform.</strong> All rights reserved.<br>
          This is an automated system security notification. Replies to this address are not monitored.
        </td>
      </tr>

    </table>

  </div>
</body>
</html>
  `.trim();
};

// ============================================================================
// RESEND DISPATCHER WITH LOCAL DEV FALLBACK
// ============================================================================
interface DispatchEmailParams {
  to: string;
  subject: string;
  html: string;
  previewUrl: string;
}

const dispatchEmail = async (
  params: DispatchEmailParams
): Promise<{ success: boolean; previewUrl?: string; messageId?: string }> => {
  const { to, subject, html, previewUrl } = params;

  // 1. SEND VIA RESEND API
  if (resendClient) {
    try {
      const response = await resendClient.emails.send({
        from: EMAIL_FROM,
        to: [to],
        subject,
        html,
      });

      if (response.error) {
        console.error("❌ Resend API error:", response.error);
        return { success: false, previewUrl };
      }

      console.log(`✅ [Resend] Email sent to ${to} (Message ID: ${response.data?.id})`);
      return {
        success: true,
        messageId: response.data?.id,
        previewUrl,
      };
    } catch (resendError) {
      console.error("❌ Resend API exception:", resendError);
      return { success: false, previewUrl };
    }
  }

  // 2. LOCAL DEV / TESTING FALLBACK (NO RESEND API KEY CONFIGURED)
  console.log("=================================================");
  console.log("📧 [EMAIL DEV MODE - NO RESEND_API_KEY CONFIGURED]");
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Action URL: ${previewUrl}`);
  console.log("Tip: Add RESEND_API_KEY to your .env to send real emails via Resend.");
  console.log("=================================================");

  return { success: true, previewUrl };
};

// ============================================================================
// EXPORTED SERVICES
// ============================================================================

/**
 * Send password reset email via Resend
 */
export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  rawToken: string,
  baseUrl?: string
): Promise<{ success: boolean; previewUrl?: string; messageId?: string }> => {
  const effectiveBaseUrl = (baseUrl || CLIENT_URL).replace(/\/+$/, "");
  const resetUrl = `${effectiveBaseUrl}/reset-password/${rawToken}`;

  const html = renderEmailHtml({
    title: "Reset Your Password",
    badgeText: "Security Verification",
    iconType: "lock",
    name: name || "User",
    bodyParagraphs: [
      "We received a request to reset the password associated with your D2C CRM account.",
      "Click the button below to choose a new password and regain access to your dashboard.",
    ],
    buttonText: "Reset Password",
    buttonUrl: resetUrl,
    expiryNotice: "This link is valid for 1 hour from generation and can only be used once for security.",
    securityNotice: "If you did not request this password reset, please ignore this email or contact your administrator immediately. Your current password remains safe.",
  });

  return dispatchEmail({
    to: email,
    subject: "Reset your D2C CRM password",
    html,
    previewUrl: resetUrl,
  });
};

/**
 * Send new user account invitation email via Resend
 */
export const sendUserInvitationEmail = async (
  email: string,
  name: string,
  rawToken: string,
  jobPosition?: string,
  baseUrl?: string
): Promise<{ success: boolean; previewUrl?: string; messageId?: string }> => {
  const effectiveBaseUrl = (baseUrl || CLIENT_URL).replace(/\/+$/, "");
  const inviteUrl = `${effectiveBaseUrl}/set-password/${rawToken}`;

  const html = renderEmailHtml({
    title: "Welcome to D2C CRM",
    badgeText: "Account Invitation",
    iconType: "user",
    name: name || "Team Member",
    bodyParagraphs: [
      `Your account has been created with the assigned role of <strong>${jobPosition || "Sales Representative"}</strong>.`,
      "To activate your workspace access and complete your profile setup, please click the secure link below to set your account password.",
    ],
    buttonText: "Activate Account & Set Password",
    buttonUrl: inviteUrl,
    expiryNotice: "This invitation link is valid for 48 hours and can only be used once.",
    securityNotice: "This invitation was issued by your D2C CRM administrator. If you believe this was sent in error, please disregard it.",
  });

  return dispatchEmail({
    to: email,
    subject: "Welcome to D2C CRM - Set up your account password",
    html,
    previewUrl: inviteUrl,
  });
};
