/**
 * eSuraksha - Resend Email Service Integration
 * Uses VITE_RESEND_API_KEY environment variable.
 */

const RESEND_API_KEY = typeof import.meta !== 'undefined' && import.meta.env ? (import.meta.env.VITE_RESEND_API_KEY || '') : ''
const DEFAULT_EMAIL = '260somyajain@gmail.com'


export const resendEmailService = {
  /**
   * Send OTP Verification Code Email to New User
   */
  async sendOtpEmail({ email = DEFAULT_EMAIL, fullName, phone, otpCode }) {
    console.info(`[Resend Email] Sending OTP email to ${email}...`)
    try {
      const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
          <div style="background: #091a34; padding: 24px; text-align: center; border-bottom: 3px solid #2563eb;">
            <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">
              <span style="color: #3b82f6;">e</span>Suraksha
            </h1>
            <p style="color: #94a3b8; margin: 6px 0 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
              Secure Digital Document Management System
            </p>
          </div>
          
          <div style="padding: 32px 28px; color: #1e293b;">
            <span style="display: inline-block; background: #eff6ff; color: #2563eb; font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 999px; margin-bottom: 12px;">
              OFFICIAL VERIFICATION
            </span>
            <h2 style="color: #0f172a; margin: 0 0 12px; font-size: 20px;">User Registration OTP Verification</h2>
            <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #475569;">
              Hello <strong>${fullName || 'Officer'}</strong>,<br/>
              A request has been initiated to register a new account on <strong>eSuraksha</strong> using phone number <strong>${phone || ''}</strong>.
            </p>
            
            <div style="background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0;">
              <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">
                Your One-Time Security Code (OTP)
              </p>
              <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #1d4ed8; font-family: monospace;">
                ${otpCode}
              </div>
              <p style="margin: 8px 0 0; font-size: 12px; color: #dc2626; font-weight: 600;">
                ⏱ Valid for 5 minutes only
              </p>
            </div>
            
            <p style="margin: 0 0 10px; font-size: 13px; color: #64748b; line-height: 1.5;">
              Next Step: After verifying this OTP, you will be prompted to complete <strong>Biometric Face Registration</strong>.
            </p>
            <p style="margin: 0; font-size: 12px; color: #94a3b8; font-style: italic;">
              If you did not request this verification code, please ignore this message.
            </p>
          </div>
          
          <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8;">
            Ministry of Home Affairs • Government of India • eSuraksha Security Division
          </div>
        </div>
      `

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
          to: [email || DEFAULT_EMAIL],
          subject: `eSuraksha OTP Verification Code: ${otpCode}`,
          html: htmlContent
        })
      })

      const data = await res.json()
      if (!res.ok) {
        console.warn('[Resend Email Error]', data)
        return { success: false, error: data }
      }

      console.info('[Resend Email Sent Successfully]', data)
      return { success: true, data }
    } catch (err) {
      console.error('[Resend Email Exception]', err)
      return { success: false, error: err.message }
    }
  },

  /**
   * Send Welcome & Registration Confirmation Email after Face & Password completion
   */
  async sendWelcomeEmail({ email = DEFAULT_EMAIL, fullName, username, rank, phone }) {
    console.info(`[Resend Email] Sending Welcome email to ${email}...`)
    try {
      const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
          <div style="background: #091a34; padding: 24px; text-align: center; border-bottom: 3px solid #16a34a;">
            <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">
              <span style="color: #3b82f6;">e</span>Suraksha
            </h1>
            <p style="color: #94a3b8; margin: 6px 0 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
              Secure Digital Document Management System
            </p>
          </div>
          
          <div style="padding: 32px 28px; color: #1e293b;">
            <div style="display: inline-flex; align-items: center; background: #dcfce7; color: #16a34a; font-weight: 700; font-size: 12px; padding: 6px 12px; border-radius: 999px; margin-bottom: 16px;">
              ✓ REGISTRATION & 2FA COMPLETE
            </div>
            <h2 style="color: #0f172a; margin: 0 0 12px; font-size: 22px;">Welcome to eSuraksha Workspace!</h2>
            <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #475569;">
              Dear <strong>${fullName || 'Officer'}</strong>,<br/>
              Your official account has been successfully registered and verified.
            </p>
            
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; margin-bottom: 24px;">
              <h3 style="margin: 0 0 12px; font-size: 14px; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px;">
                Account Details
              </h3>
              <table style="width: 100%; font-size: 13px; color: #334155; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; width: 40%;">Username:</td>
                  <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${username || ''}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Designated Rank:</td>
                  <td style="padding: 6px 0; font-weight: 600;">${rank || 'Officer'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Phone Verified:</td>
                  <td style="padding: 6px 0; color: #16a34a; font-weight: 600;">✓ ${phone || 'Verified'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Biometric 2FA:</td>
                  <td style="padding: 6px 0; color: #16a34a; font-weight: 600;">✓ Face Biometrics Enrolled</td>
                </tr>
              </table>
            </div>

            <p style="margin: 0 0 12px; font-size: 13px; color: #475569; line-height: 1.6;">
              You can now sign in using your <strong>Username</strong>, <strong>Password</strong>, and <strong>Biometric Face Scan</strong>.
            </p>
          </div>
          
          <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8;">
            Ministry of Home Affairs • Government of India • eSuraksha Security Division
          </div>
        </div>
      `

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
          to: [email || DEFAULT_EMAIL],
          subject: 'Welcome to eSuraksha — Account & Biometric Registration Complete',
          html: htmlContent
        })
      })

      const data = await res.json()
      return { success: res.ok, data }
    } catch (err) {
      console.error('[Resend Welcome Email Exception]', err)
      return { success: false, error: err.message }
    }
  }
}
