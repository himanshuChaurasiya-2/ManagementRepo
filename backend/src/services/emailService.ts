import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const CLIENT_URL = process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173";
const EMAIL_FROM = process.env.EMAIL_FROM || '"D2C CRM" <no-reply@d2ccrm.com>';

// Create transporter instance
const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  // Fallback to service if specified (e.g., Gmail)
  if (process.env.EMAIL_SERVICE && user && pass) {
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user,
        pass,
      },
    });
  }

  return null;
};

// Reusable responsive HTML template wrapper
const renderEmailHtml = (options: {
  title: string;
  previewText: string;
  name: string;
  bodyParagraphs: string[];
  buttonText: string;
  buttonUrl: string;
  expiryNotice: string;
}) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f1f5f9;
      padding: 40px 16px;
      box-sizing: border-box;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      padding: 32px 36px;
      text-align: center;
    }
    .brand {
      color: #ffffff;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0;
      text-transform: uppercase;
    }
    .brand-accent {
      color: #818cf8;
    }
    .content {
      padding: 36px 36px 28px 36px;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 16px 0;
      line-height: 1.3;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      color: #334155;
      margin: 0 0 16px 0;
    }
    .btn-wrapper {
      margin: 28px 0 32px 0;
      text-align: center;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
      padding: 14px 32px;
      border-radius: 10px;
      box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);
    }
    .notice-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 18px;
      margin: 20px 0;
    }
    .notice-box p {
      font-size: 13px;
      color: #64748b;
      margin: 0;
    }
    .fallback-url {
      word-break: break-all;
      font-size: 12px;
      color: #6366f1;
      margin-top: 8px;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 36px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h2 class="brand">D2C <span class="brand-accent">CRM</span></h2>
      </div>
      <div class="content">
        <h1>${options.title}</h1>
        <p>Hello <strong>${options.name}</strong>,</p>
        ${options.bodyParagraphs.map((p) => `<p>${p}</p>`).join("")}
        <div class="btn-wrapper">
          <a href="${options.buttonUrl}" target="_blank" rel="noopener noreferrer" class="btn">
            ${options.buttonText}
          </a>
        </div>
        <div class="notice-box">
          <p><strong>Note:</strong> ${options.expiryNotice}</p>
          <p style="margin-top: 8px;">If the button above does not work, copy and paste this secure link into your browser:</p>
          <div class="fallback-url">${options.buttonUrl}</div>
        </div>
        <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
          If you did not request or expect this email, you can safely disregard it. Your account remains completely secure.
        </p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} D2C CRM. All rights reserved.<br>
        This is an automated system notification. Please do not reply directly to this email.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  rawToken: string
): Promise<{ success: boolean; previewUrl?: string }> => {
  const resetUrl = `${CLIENT_URL}/reset-password/${rawToken}`;

  const html = renderEmailHtml({
    title: "Reset Your Password",
    previewText: "Password reset request for your D2C CRM account",
    name: name || "User",
    bodyParagraphs: [
      "We received a request to reset the password for your D2C CRM account.",
      "Click the button below to choose a new secure password.",
    ],
    buttonText: "Reset Password",
    buttonUrl: resetUrl,
    expiryNotice: "This link is valid for 1 hour and can only be used once.",
  });

  const transporter = createTransporter();

  if (!transporter) {
    console.log("=================================================");
    console.log("📧 [EMAIL DEV MODE - NO SMTP CONFIGURED]");
    console.log(`To: ${email} (${name})`);
    console.log(`Subject: Password Reset Request`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log("=================================================");
    return { success: true, previewUrl: resetUrl };
  }

  try {
    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject: "Reset your D2C CRM password",
      html,
    });

    console.log(`✅ Password reset email sent to ${email} (MessageId: ${info.messageId})`);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`🔗 Ethereal Mailbox Preview: ${previewUrl}`);
    }
    return { success: true, previewUrl: previewUrl ? String(previewUrl) : undefined };
  } catch (error) {
    console.error("❌ Failed to send password reset email:", error);
    // Return with link in log so user is never blocked
    return { success: false, previewUrl: resetUrl };
  }
};

/**
 * Send new user account invitation email
 */
export const sendUserInvitationEmail = async (
  email: string,
  name: string,
  rawToken: string,
  jobPosition?: string
): Promise<{ success: boolean; previewUrl?: string }> => {
  const inviteUrl = `${CLIENT_URL}/set-password/${rawToken}`;

  const html = renderEmailHtml({
    title: "Welcome to D2C CRM",
    previewText: "You have been invited to join D2C CRM",
    name: name || "Team Member",
    bodyParagraphs: [
      `Your account has been created with the role of <strong>${jobPosition || "Sales Representative"}</strong>.`,
      "To activate your account and start using the portal, please click the button below to set up your password.",
    ],
    buttonText: "Set Up Your Password",
    buttonUrl: inviteUrl,
    expiryNotice: "This invitation link is valid for 48 hours and can only be used once.",
  });

  const transporter = createTransporter();

  if (!transporter) {
    console.log("=================================================");
    console.log("📧 [EMAIL DEV MODE - NO SMTP CONFIGURED]");
    console.log(`To: ${email} (${name})`);
    console.log(`Subject: Account Invitation - Set Up Password`);
    console.log(`Invite URL: ${inviteUrl}`);
    console.log("=================================================");
    return { success: true, previewUrl: inviteUrl };
  }

  try {
    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject: "Welcome to D2C CRM - Set up your password",
      html,
    });

    console.log(`✅ Invitation email sent to ${email} (MessageId: ${info.messageId})`);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`🔗 Ethereal Mailbox Preview: ${previewUrl}`);
    }
    return { success: true, previewUrl: previewUrl ? String(previewUrl) : undefined };
  } catch (error) {
    console.error("❌ Failed to send user invitation email:", error);
    return { success: false, previewUrl: inviteUrl };
  }
};

