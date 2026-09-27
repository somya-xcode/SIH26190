import logging
import requests
from app.core.config import settings

logger = logging.getLogger("esuraksha.email")


class EmailDeliveryError(Exception):
    pass


class EmailNotConfiguredError(EmailDeliveryError):
    pass


def send_otp_email(to_email: str, otp_code: str, full_name: str = "Officer") -> bool:
    """
    Send OTP verification code to user's email via Resend API.
    CRITICAL: Does NOT log the OTP code to prevent exposure in server logs.
    """
    api_key = settings.resend_api_key
    from_email = settings.resend_from_email

    if not api_key:
        logger.warning("[Email] Resend API key not configured in environment.")
        raise EmailNotConfiguredError("Resend API key is not configured in .env.")

    expiry_minutes = settings.otp_expiration_seconds // 60

    html_content = f"""
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
        <h2 style="color: #0f172a; margin: 0 0 12px; font-size: 20px;">Email OTP Verification</h2>
        <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #475569;">
          Hello <strong>{full_name}</strong>,<br/>
          A request has been initiated to register a new account on <strong>eSuraksha</strong>.
        </p>
        <div style="background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0;">
          <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">
            Your One-Time Security Code (OTP)
          </p>
          <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #1d4ed8; font-family: monospace;">
            {otp_code}
          </div>
          <p style="margin: 8px 0 0; font-size: 12px; color: #dc2626; font-weight: 600;">
            ⏱ Valid for {expiry_minutes} minutes only
          </p>
        </div>
        <p style="margin: 0; font-size: 12px; color: #94a3b8; font-style: italic;">
          If you did not request this verification code, please ignore this message.
        </p>
      </div>
      <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8;">
        Ministry of Home Affairs • Government of India • eSuraksha Security Division
      </div>
    </div>
    """

    try:
        resp = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json={
                "from": from_email,
                "to": [to_email],
                "subject": f"eSuraksha OTP Verification Code",
                "html": html_content,
            },
            timeout=15,
        )

        if resp.status_code in (200, 201):
            logger.info(f"[Email] OTP email dispatched successfully to {to_email[:3]}***")
            return True
        else:
            logger.error(f"[Email] Resend API returned status {resp.status_code}: {resp.text}")
            raise EmailDeliveryError(f"Email delivery failed: {resp.text}")

    except requests.RequestException as e:
        logger.error(f"[Email] Network failure sending OTP email")
        raise EmailDeliveryError(f"Email network error: {str(e)}")
