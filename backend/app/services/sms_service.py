import logging
import requests
from typing import Optional
from app.core.config import settings

logger = logging.getLogger("docguard.sms")

class SMSGatewayError(Exception):
    pass

class SMSGatewayNotConfiguredError(SMSGatewayError):
    pass

def send_sms(mobile_number: str, message: str) -> bool:
    """
    Send SMS via configured real gateway provider (Fast2SMS / Twilio).
    CRITICAL: Does NOT log the message content to prevent OTP exposure in server logs.
    """
    provider = settings.sms_provider.lower()
    clean_phone = "".join(filter(str.isdigit, mobile_number))

    if provider == "twilio":
        sid = settings.twilio_account_sid
        token = settings.twilio_auth_token.get_secret_value()
        from_number = settings.twilio_phone_number
        if not sid or not token or not from_number:
            logger.warning("[SMS] Twilio credentials not configured in environment.")
            raise SMSGatewayNotConfiguredError("Twilio SMS credentials are not configured.")

        # Ensure E.164 format
        to_number = f"+{clean_phone}" if not mobile_number.startswith("+") else mobile_number
        url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
        data = {
            "From": from_number,
            "To": to_number,
            "Body": message
        }
        try:
            resp = requests.post(url, data=data, auth=(sid, token), timeout=10)
            if resp.status_code in (200, 201):
                logger.info(f"[SMS] Twilio dispatched successfully to masked number ending in {clean_phone[-4:]}")
                return True
            else:
                logger.error(f"[SMS] Twilio returned status {resp.status_code}")
                raise SMSGatewayError(f"Twilio error: {resp.text}")
        except requests.RequestException as e:
            logger.error(f"[SMS] Twilio network failure")
            raise SMSGatewayError(f"SMS network error: {str(e)}")

    elif provider == "fast2sms":
        api_key = settings.sms_api_key.get_secret_value()
        if not api_key or api_key == "dummy-sms-key" or api_key.startswith("CHANGE_ME"):
            logger.warning("[SMS] Fast2SMS API key not configured.")
            # If in development and not configured, raise specific configuration error
            raise SMSGatewayNotConfiguredError("Fast2SMS API key is not configured in .env.")

        # Fast2SMS requires 10-digit Indian phone number
        phone_10 = clean_phone[-10:] if len(clean_phone) >= 10 else clean_phone
        url = "https://www.fast2sms.com/dev/bulkV2"
        headers = {
            "authorization": api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "route": "q",
            "message": message,
            "language": "english",
            "flash": 0,
            "numbers": phone_10
        }
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=10)
            result = resp.json()
            if result.get("return") is True:
                logger.info(f"[SMS] Fast2SMS dispatched successfully to number ending in {phone_10[-4:]}")
                return True
            else:
                logger.error(f"[SMS] Fast2SMS delivery failure: {result.get('message', 'Unknown')}")
                raise SMSGatewayError(f"Fast2SMS error: {result.get('message', 'Delivery failed')}")
        except requests.RequestException as e:
            raise SMSGatewayError(f"SMS network error: {str(e)}")

    else:
        raise SMSGatewayNotConfiguredError(f"Unsupported or unconfigured SMS provider: '{provider}'.")
