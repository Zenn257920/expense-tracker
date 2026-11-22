import nodemailer, { type Transporter } from "nodemailer";

/**
 * Sends mail through Gmail SMTP. Configure with:
 *   GMAIL_USER           the Gmail address the mail is sent from
 *   GMAIL_APP_PASSWORD   a 16-character App Password (Google Account ->
 *                        Security -> 2-Step Verification -> App passwords).
 *                        A normal Gmail password does not work here.
 *
 * The transporter is created lazily so a missing configuration only fails
 * when an email is actually sent, not at server startup.
 */

let transporter: Transporter | null = null;

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error(
      "Email sending is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD.",
    );
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
    });
  }
  return transporter;
}

export async function sendSignupOtpEmail(email: string, otp: string) {
  const from = process.env.GMAIL_USER;
  await getTransporter().sendMail({
    from: `"MyFinance" <${from}>`,
    to: email,
    subject: `Your MyFinance verification code is ${otp}`,
    text: `Your MyFinance verification code is ${otp}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
    html: `<p>Your MyFinance verification code is:</p><p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${otp}</p><p>It expires in 10 minutes. If you did not request this code, you can ignore this email.</p>`,
  });
}
