import nodemailer from "nodemailer";
import crypto from "crypto";

export function generateVerificationCode(): string {
  // Cryptographically secure 6-digit code (100000 - 999999)
  return crypto.randomInt(100000, 1000000).toString();
}

export function isGmailConfigured(): boolean {
  return Boolean(
    process.env.GMAIL_USER?.trim() && process.env.GMAIL_APP_PASSWORD?.trim()
  );
}

export async function sendVerificationEmail(params: {
  toEmail: string;
  code: string;
  username?: string;
}): Promise<{ success: boolean; devMode: boolean; error?: string }> {
  const { toEmail, code, username } = params;
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "").trim();

  // 1. Check if Gmail credentials are provided
  if (!user || !pass) {
    console.log("\n=======================================================");
    console.log(`[STREAMIX DEV MAIL SERVICE] 📬 SIMULATED GMAIL DISPATCH`);
    console.log(`Target: ${toEmail}`);
    console.log(`Username: ${username || "New User"}`);
    console.log(`Verification Code: >> ${code} <<`);
    console.log(`Expires in: 10 minutes`);
    console.log(`Note: To send real emails, add GMAIL_USER and GMAIL_APP_PASSWORD in .env.local`);
    console.log("=======================================================\n");

    return { success: true, devMode: true };
  }

  // 2. Production / Configured Gmail SMTP Dispatch
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000,
    });

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Streamix Verification Code</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f4f3f0;
      color: #111111;
      margin: 0;
      padding: 30px 15px;
    }
    .container {
      max-width: 500px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 3px solid #000000;
      box-shadow: 6px 6px 0px #000000;
      overflow: hidden;
    }
    .header {
      background-color: #ffe600;
      border-bottom: 3px solid #000000;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #000000;
    }
    .badge {
      background-color: #000000;
      color: #ffe600;
      font-size: 10px;
      font-weight: 800;
      padding: 3px 8px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .content {
      padding: 30px 24px;
      text-align: center;
    }
    h1 {
      font-size: 24px;
      font-weight: 900;
      text-transform: uppercase;
      margin: 0 0 12px 0;
      letter-spacing: -0.02em;
    }
    p {
      font-size: 14px;
      line-height: 1.5;
      color: #444444;
      margin: 0 0 24px 0;
    }
    .code-box {
      background-color: #f7f7f7;
      border: 3px solid #000000;
      box-shadow: 4px 4px 0px #000000;
      padding: 18px 20px;
      display: inline-block;
      margin-bottom: 24px;
    }
    .code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 38px;
      font-weight: 900;
      letter-spacing: 0.25em;
      color: #000000;
      padding-left: 0.25em;
    }
    .notice {
      font-size: 11px;
      font-weight: 700;
      color: #666666;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border-top: 1px dashed #cccccc;
      padding-top: 16px;
      margin-top: 16px;
    }
    .footer {
      background-color: #111111;
      color: #ffffff;
      padding: 12px 24px;
      text-align: center;
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="brand">STREAMIX</span>
      <span class="badge">SECURITY PROTOCOL</span>
    </div>
    <div class="content">
      <h1>Verify Your Account</h1>
      <p>Hello${username ? ` <strong>${username}</strong>` : ""}, use the verification code below to complete your Streamix account registration:</p>
      
      <div class="code-box">
        <div class="code">${code}</div>
      </div>
      
      <p style="font-size: 13px; font-weight: 700; color: #111111;">
        ⏱️ This code will expire in <strong>10 minutes</strong>.
      </p>
      
      <div class="notice">
        If you did not request this verification code, please disregard this email. Your account remains secure.
      </div>
    </div>
    <div class="footer">
      STREAMIX • PERSONALIZED MEDIA VAULT
    </div>
  </div>
</body>
</html>
    `.trim();

    await transporter.sendMail({
      from: `"Streamix Vault" <${user}>`,
      to: toEmail,
      subject: `Your Streamix Verification Code: ${code}`,
      text: `Your Streamix account verification code is: ${code}. This code expires in 10 minutes.`,
      html: htmlContent,
    });

    return { success: true, devMode: false };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send email via Gmail SMTP.";
    console.error("[STREAMIX GMAIL ERROR]:", err);
    // Graceful fallback: Do not block registration if Gmail SMTP is unreachable or rate-limited
    console.log(`[STREAMIX FALLBACK]: Verification code for ${toEmail} is >> ${code} <<`);
    return { success: true, devMode: true, error: message };
  }
}
