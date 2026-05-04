const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const FROM = process.env.EMAIL_FROM || `"SmartHome" <${process.env.EMAIL_USER}>`;
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';

const sendVerificationEmail = async (to, token) => {
  const link = `${FRONTEND}/verify-email?token=${token}`;
  await transporter.sendMail({
    from: FROM,
    to,
    subject: 'Verify your SmartHome email',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#0ea5e9">Verify your email</h2>
        <p>Click the button below to verify your email address. This link expires in 24 hours.</p>
        <a href="${link}" style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">
          Verify Email
        </a>
        <p style="margin-top:16px;color:#6b7280;font-size:12px">Or copy this link: ${link}</p>
      </div>
    `,
  });
};

const sendPasswordResetEmail = async (to, token) => {
  const link = `${FRONTEND}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: FROM,
    to,
    subject: 'Reset your SmartHome password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#0ea5e9">Reset your password</h2>
        <p>Click the button below to set a new password. This link expires in 1 hour.</p>
        <a href="${link}" style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">
          Reset Password
        </a>
        <p style="margin-top:16px;color:#6b7280;font-size:12px">If you didn't request this, ignore this email.</p>
        <p style="color:#6b7280;font-size:12px">Or copy this link: ${link}</p>
      </div>
    `,
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
