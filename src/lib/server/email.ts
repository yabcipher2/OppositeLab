interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  const _appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const emailProvider = process.env.EMAIL_PROVIDER ?? "console";

  if (emailProvider === "console") {
    console.log("=== EMAIL SENT ===");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`HTML: ${html}`);
    console.log(`Text: ${text ?? html.replace(/<[^>]*>/g, "")}`);
    console.log("==================");
    return;
  }

  if (emailProvider === "resend") {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "OppositeLab <noreply@oppositelab.app>",
      to,
      subject,
      html,
      text,
    });
    return;
  }

  if (emailProvider === "sendgrid") {
    const sgMail = await import("@sendgrid/mail");
    sgMail.default.setApiKey(process.env.SENDGRID_API_KEY ?? "");
    await sgMail.default.send({
      from: process.env.EMAIL_FROM ?? "noreply@oppositelab.app",
      to,
      subject,
      html,
      text,
    });
    return;
  }

  if (emailProvider === "brevo") {
    const emailFrom = process.env.EMAIL_FROM ?? "noreply@oppositelab.app";
    const senderEmail = emailFrom.match(/<(.+)>/)?.[1] || emailFrom;
    const senderName = emailFrom.match(/(.+?)\s*</)?.[1]?.trim() || "OppositeLab";

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": process.env.BREVO_API_KEY ?? "",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: senderEmail,
          name: senderName,
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text || html.replace(/<[^>]*>/g, ""),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Brevo error: ${JSON.stringify(error)}`);
    }
    return;
  }

  throw new Error(`Unknown email provider: ${emailProvider}`);
}

export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  const subject = "Reset your OppositeLab password";
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">OppositeLab</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px; margin-top: 0;">Hi ${name},</p>
          <p style="font-size: 16px;">You requested to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Reset Password</a>
          </div>
          <p style="font-size: 14px; color: #6b7280;">Or copy this link into your browser:</p>
          <p style="font-size: 13px; color: #6b7280; word-break: break-all; background: #f3f4f6; padding: 12px; border-radius: 6px;">${resetUrl}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="font-size: 13px; color: #9ca3af;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
          <p style="font-size: 13px; color: #9ca3af;">— The OppositeLab Team</p>
        </div>
      </body>
    </html>
  `;
  const text = `Hi ${name},\n\nYou requested to reset your password. Visit this link to create a new password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.\n\n— The OppositeLab Team`;

  await sendEmail({ to: email, subject, html, text });
}

export async function sendVerificationEmail(email: string, name: string, token: string) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const verifyUrl = `${appUrl}/verify-email?token=${token}`;

  const subject = "Verify your OppositeLab email address";
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">OppositeLab</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px; margin-top: 0;">Hi ${name},</p>
          <p style="font-size: 16px;">Welcome to OppositeLab! Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Verify Email</a>
          </div>
          <p style="font-size: 14px; color: #6b7280;">Or copy this link into your browser:</p>
          <p style="font-size: 13px; color: #6b7280; word-break: break-all; background: #f3f4f6; padding: 12px; border-radius: 6px;">${verifyUrl}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="font-size: 13px; color: #9ca3af;">This link expires in 24 hours.</p>
          <p style="font-size: 13px; color: #9ca3af;">— The OppositeLab Team</p>
        </div>
      </body>
    </html>
  `;
  const text = `Hi ${name},\n\nWelcome to OppositeLab! Please verify your email address:\n\n${verifyUrl}\n\nThis link expires in 24 hours.\n\n— The OppositeLab Team`;

  await sendEmail({ to: email, subject, html, text });
}