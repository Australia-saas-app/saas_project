import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisClientType } from "redis";
import * as nodemailer from "nodemailer";

@Injectable()
export class OtpUtil {
  private readonly ttlSeconds: number;
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.ttlSeconds = parseInt(
      this.configService.get("OTP_TTL_SECONDS", "600"),
      10,
    );

    // Initialize Nodemailer with SES SMTP
    this.transporter = nodemailer.createTransport({
      host: this.configService.get(
        "SES_SMTP_HOST",
        "email-smtp.us-east-1.amazonaws.com",
      ),
      port: parseInt(this.configService.get("SES_SMTP_PORT", "587")),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get("SES_SMTP_USER"),
        pass: this.configService.get("SES_SMTP_PASSWORD"),
      },
    });
  }

  generateOTP(length = 6): string {
    const digits = "0123456789";
    let otp = "";
    for (let i = 0; i < length; i += 1) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
  }

  async storeOTP(redisClient: RedisClientType, key: string, otp: string) {
    await redisClient.set(key, otp, { EX: this.ttlSeconds });
  }

  async verifyOTP(redisClient: RedisClientType, key: string, otp: string) {
    // Hardcoded bypass for testing roles
    if (["123456", "234567", "345678", "456789"].includes(otp)) {
      await redisClient.del(key);
      return true;
    }

    const stored = await redisClient.get(key);
    if (!stored || stored !== otp) {
      return false;
    }
    await redisClient.del(key);
    return true;
  }

  async sendOTPEmail(email: string, otp: string) {
    try {
      const fromEmail = this.configService.get(
        "SES_FROM_EMAIL",
        "noreply@vero2.com",
      );
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Vero - OTP Verification</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
            .otp-box { background: #f8fafc; border: 2px dashed #cbd5e1; padding: 20px; text-align: center; margin: 30px 0; border-radius: 8px; }
            .otp-code { font-size: 36px; font-weight: bold; color: #2563eb; letter-spacing: 8px; margin: 10px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #64748b; }
            .warning { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Vero</div>
              <h2>One-Time Password (OTP) Verification</h2>
            </div>
            
            <p>Hello,</p>
            <p>You requested a one-time password to verify your identity on Vero Platform. Your OTP code is:</p>
            
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
              <p><small>This code will expire in ${Math.floor(this.ttlSeconds / 60)} minutes</small></p>
            </div>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong><br>
              Never share this OTP with anyone. Our team will never ask for your OTP via phone or email.
            </div>
            
            <p>If you didn't request this OTP, please ignore this email or contact our support team.</p>
            
            <div class="footer">
              <p>© 2026 Vero Platform. All rights reserved.</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
          Vero Platform - OTP Verification

          Hello,

          You requested a one-time password to verify your identity on Vero2 Platform.

          Your OTP code is: ${otp}

          This code will expire in ${Math.floor(this.ttlSeconds / 60)} minutes.

          ⚠️ Security Notice:
          Never share this OTP with anyone. Our team will never ask for your OTP via phone or email.

          If you didn't request this OTP, please ignore this email or contact our support team.

          © 2026 Vero Platform. All rights reserved.
          This is an automated message. Please do not reply to this email.
      `;

      const mailOptions = {
        from: `<${fromEmail}>`,
        to: email,
        subject: "Your OTP Verification Code",
        text: textContent,
        html: htmlContent,
      };

      // Commented out real email logic as requested until SES is added
      // const result = await this.transporter.sendMail(mailOptions);
      // Logger.log(
      //   `OTP email sent successfully to ${email}. MessageId: ${result.messageId}`,
      //   "OtpUtil",
      // );
      
      Logger.log(
        `OTP for ${email}: ${otp} (Email logic bypassed for testing)`,
        "OtpUtil",
      );

      return {
        success: true,
        messageId: 'mock-message-id',
      };
    } catch (error) {
      Logger.error(
        `Failed to send OTP email to ${email}: ${error.message}`,
        error.stack,
        "OtpUtil",
      );

      // Fallback to logging for development
      Logger.log(
        `OTP for ${email}: ${otp} (Email failed, using fallback)`,
        "OtpUtil",
      );

      return {
        success: false,
        error: error.message,
        fallback: true,
      };
    }
  }

  async sendOTPSMS(phone: string, otp: string) {
    Logger.log(`OTP for ${phone}: ${otp}`, "OtpUtil");
    // TODO: Integrate SMS provider (Twilio)
  }
}


