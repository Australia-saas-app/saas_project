import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisClientType } from "redis";
import * as nodemailer from "nodemailer";
import twilio from "twilio";

@Injectable()
export class OtpUtil {
  private readonly ttlSeconds: number;
  private readonly transporter: nodemailer.Transporter;
  private readonly twilioClient?: twilio.Twilio;
  private readonly twilioPhoneNumber?: string;
  private readonly twilioMessagingServiceSid?: string;

  constructor(private readonly configService: ConfigService) {
    this.ttlSeconds = parseInt(
      this.configService.get("OTP_TTL_SECONDS", "600"),
      10,
    );

    // Initialize Twilio SMS Client
    const twilioAccountSid = this.configService.get<string>("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = this.configService.get<string>("TWILIO_AUTH_TOKEN");
    this.twilioPhoneNumber = this.configService.get<string>("TWILIO_PHONE_NUMBER");
    this.twilioMessagingServiceSid = this.configService.get<string>("TWILIO_MESSAGING_SERVICE_SID");

    if (twilioAccountSid && twilioAuthToken) {
      try {
        this.twilioClient = twilio(twilioAccountSid, twilioAuthToken);
        Logger.log("Twilio SMS client initialized successfully", "OtpUtil");
      } catch (err) {
        Logger.warn(`Failed to initialize Twilio client: ${err.message}`, "OtpUtil");
      }
    } else {
      Logger.log("Twilio SMS credentials not set; OTPs will be logged to console", "OtpUtil");
    }

    // Initialize Nodemailer with generic SMTP or SES fallback
    const smtpHost =
      this.configService.get("SMTP_HOST") ||
      this.configService.get("SES_SMTP_HOST", "smtp.gmail.com");
    const smtpPort = parseInt(
      this.configService.get("SMTP_PORT") ||
      this.configService.get("SES_SMTP_PORT", "587"),
      10,
    );
    const smtpSecureVal = this.configService.get("SMTP_SECURE");
    const isSecure =
      smtpSecureVal !== undefined && smtpSecureVal !== null
        ? String(smtpSecureVal).toLowerCase() === "true"
        : smtpPort === 465;

    const smtpUser =
      this.configService.get("SMTP_USER") ||
      this.configService.get("SES_SMTP_USER");
    const smtpPassword =
      this.configService.get("SMTP_PASSWORD") ||
      this.configService.get("SES_SMTP_PASSWORD");

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: isSecure,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });
  }

  generateOTP(length = 6, emailOrPhone?: string): string {
    const superAdminEmail = this.configService.get(
      "SUPERADMIN_EMAIL",
      "superadmin@systemdb.com",
    );
    if (emailOrPhone === superAdminEmail) {
      return this.configService.get("SUPERADMIN_DEFAULT_OTP", "123456");
    }
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

  async verifyOTP(redisClient: RedisClientType, key: string, otp: string, deleteKey: boolean = true) {
    // Configurable bypass codes for testing roles
    const testOtps = (
      this.configService.get(
        "TEST_OTP_CODES",
        "123456,234567,345678,456789",
      ) || ""
    )
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);

    if (testOtps.includes(otp)) {
      if (deleteKey) await redisClient.del(key);
      return true;
    }

    const stored = await redisClient.get(key);
    if (!stored || stored !== otp) {
      return false;
    }
    if (deleteKey) await redisClient.del(key);
    return true;
  }

  async sendOTPEmail(email: string, otp: string, type: string = 'verification', context?: { ipAddress?: string }) {
    const superAdminEmail = this.configService.get(
      "SUPERADMIN_EMAIL",
      "superadmin@systemdb.com",
    );
    if (email === superAdminEmail) {
      Logger.log(`OTP for ${email}: ${otp} (Bypassed real email for superadmin)`, "OtpUtil");
      return { success: true, messageId: 'mock-superadmin-id' };
    }

    const is2FA = type?.toLowerCase().includes('2fa') || type?.toLowerCase().includes('two');
    const isNewDevice = type?.toLowerCase().includes('new_device');
    
    const titleText = isNewDevice ? "New Device Authentication" : is2FA ? "Two-Factor Authentication (2FA)" : "One-Time Password (OTP) Verification";
    const subjectText = isNewDevice ? "New Device Authentication - Vero" : is2FA ? "Your Two-Factor Authentication (2FA) Code - Vero" : "Your OTP Verification Code";
    
    let descText = is2FA
      ? "You are receiving this security code to complete Two-Factor Authentication (2FA) for your Vero account."
      : "You requested a one-time password to verify your identity on Vero Platform.";
      
    if (isNewDevice) {
      descText = `We noticed a login attempt from a new device or unrecognized IP address (${context?.ipAddress || 'Unknown IP'}). Please enter this OTP to authorize the device.`;
    }

    try {
      const fromEmail =
        this.configService.get("SMTP_FROM_EMAIL") ||
        this.configService.get("SES_FROM_EMAIL") ||
        this.configService.get("SMTP_USER") ||
        process.env.SMTP_FROM_EMAIL ||
        process.env.SMTP_USER ||
        "noreply@systemdb.com";

      const fromName =
        this.configService.get("SMTP_FROM_NAME") ||
        this.configService.get("SES_FROM_NAME") ||
        "Vero Platform";
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Vero - ${titleText}</title>
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
              <h2>${titleText}</h2>
            </div>
            
            <p>Hello,</p>
            <p>${descText} Your security code is:</p>
            
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
              <p><small>This code will expire in ${Math.floor(this.ttlSeconds / 60)} minutes</small></p>
            </div>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong><br>
              Never share this security code with anyone. Our team will never ask for your 2FA code via phone or email.
            </div>
            
            <p>If you didn't request this code, please secure your account immediately or contact support.</p>
            
            <div class="footer">
              <p>© 2026 Vero Platform. All rights reserved.</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
          Vero Platform - ${titleText}

          Hello,

          ${descText}

          Your security code is: ${otp}

          This code will expire in ${Math.floor(this.ttlSeconds / 60)} minutes.

          ⚠️ Security Notice:
          Never share this security code with anyone. Our team will never ask for your 2FA code via phone or email.

          If you didn't request this code, please secure your account immediately.

          © 2026 Vero Platform. All rights reserved.
          This is an automated message. Please do not reply to this email.
      `;

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: email,
        subject: subjectText,
        text: textContent,
        html: htmlContent,
      };

      // Real email logic enabled
      const result = await this.transporter.sendMail(mailOptions);
      Logger.log(
        `OTP email sent successfully to ${email}. MessageId: ${result.messageId}`,
        "OtpUtil",
      );
      
      // Also log the OTP for development purposes just in case
      Logger.log(
        `OTP for ${email}: ${otp} (Email logic active)`,
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

  async sendOTPSMS(phone: string, otp: string, type: string = 'verification') {
    const cleanPhone = phone ? phone.trim() : '';
    const formattedPhone = cleanPhone.startsWith("+") ? cleanPhone : `+${cleanPhone}`;
    const messageBody = `Vero Platform: Your verification security code is ${otp}. It will expire in ${Math.floor(this.ttlSeconds / 60)} minutes. Do not share this code.`;

    if (this.twilioClient && (this.twilioPhoneNumber || this.twilioMessagingServiceSid)) {
      try {
        const messageOptions: any = {
          to: formattedPhone,
          body: messageBody,
        };

        if (this.twilioMessagingServiceSid) {
          messageOptions.messagingServiceSid = this.twilioMessagingServiceSid;
        } else if (this.twilioPhoneNumber) {
          messageOptions.from = this.twilioPhoneNumber;
        }

        const result = await this.twilioClient.messages.create(messageOptions);
        Logger.log(
          `Twilio SMS OTP sent successfully to ${formattedPhone}. Message SID: ${result.sid}`,
          "OtpUtil",
        );
        return {
          success: true,
          sid: result.sid,
        };
      } catch (error) {
        Logger.error(
          `Failed to send Twilio SMS to ${formattedPhone}: ${error.message}`,
          error.stack,
          "OtpUtil",
        );

        // Fallback to logging for development
        Logger.log(
          `SMS OTP for ${formattedPhone}: ${otp} (Twilio failed, fallback logged)`,
          "OtpUtil",
        );

        return {
          success: false,
          error: error.message,
          fallback: true,
        };
      }
    } else {
      // Graceful development mode fallback when Twilio is not yet configured
      Logger.log(
        `[SMS OTP - DEV SIMULATED] To: ${formattedPhone} | Code: ${otp} | Text: "${messageBody}"`,
        "OtpUtil",
      );
      return {
        success: true,
        simulated: true,
      };
    }
  }
}


