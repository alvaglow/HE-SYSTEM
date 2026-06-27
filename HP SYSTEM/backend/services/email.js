const nodemailer = require("nodemailer");

const getTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

const sendEmail = async (to, subject, html, attachments = []) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      throw new Error("SMTP credentials not configured");
    }

    if (!to) {
      throw new Error("Recipient email is required");
    }

    const transporter = getTransporter();
    const from = process.env.FROM_EMAIL || process.env.SMTP_USER;

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      attachments,
    });

    console.log(`Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email:", error.message);
    return { success: false, error: error.message };
  }
};

const sendWelcomeEmail = async (to, firstName) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to HED System!</h2>
      <p>Hello ${firstName},</p>
      <p>Thank you for joining the HED System. Your account has been successfully created.</p>
      <p>If you have any questions, please don't hesitate to contact our support team.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply.</p>
    </div>
  `;

  return sendEmail(to, "Welcome to HED System!", html);
};

const sendPaymentReceipt = async (to, paymentDetails) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Payment Receipt</h2>
      <p>Thank you for your payment!</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background-color: #f8f8f8;">
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Invoice ID</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${paymentDetails.invoiceId}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">$${paymentDetails.amount}</td>
        </tr>
        <tr style="background-color: #f8f8f8;">
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Date</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${paymentDetails.date}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Method</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${paymentDetails.method}</td>
        </tr>
      </table>
      <p>If you have any questions about this payment, please contact support.</p>
    </div>
  `;

  return sendEmail(to, "Payment Receipt - HED System", html);
};

const sendPasswordReset = async (to, resetToken) => {
  const resetUrl = `${process.env.APP_URL || "https://app.hed.system"}/reset-password?token=${resetToken}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset Request</h2>
      <p>You recently requested to reset your password. Click the link below to reset it:</p>
      <p style="margin: 20px 0;">
        <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
      </p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #4CAF50;">${resetUrl}</p>
      <p><strong>This link will expire in 1 hour.</strong></p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">If you did not request a password reset, please ignore this email and contact support.</p>
    </div>
  `;

  return sendEmail(to, "Password Reset - HED System", html);
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPaymentReceipt,
  sendPasswordReset,
};
