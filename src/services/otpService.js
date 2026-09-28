async function postAuthRequest(path, payload) {
  const response = await fetch(`/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.detail || 'OTP request failed. Please try again.')
  }

  return data
}

export function maskPhoneNumber(phone) {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length < 10) return phone
  const last4 = cleaned.slice(-4)
  const prefix = cleaned.length > 10 ? `+${cleaned.slice(0, -10)} ` : '+91 '
  return `${prefix}******${last4}`
}

export function maskEmail(email) {
  if (!email || typeof email !== 'string') return ''
  const parts = email.trim().split('@')
  if (parts.length !== 2) return email
  const [name, domain] = parts
  if (name.length <= 2) return `${name}***@${domain}`
  return `${name[0]}***${name[name.length - 1]}@${domain}`
}

function toOtpSession(data) {
  if (data.delivery_status !== 'sent' && data.delivery_status !== 'ready') {
    throw new Error(data.gateway_notice || 'OTP could not be sent. Please try again later.')
  }

  const now = Date.now()
  const expiryMs = Number(data.expires_in_seconds) * 1000
  const resendDelayMs = Number(data.resend_after_seconds) * 1000
  if (!Number.isFinite(expiryMs) || expiryMs <= 0) {
    throw new Error('The OTP service returned an invalid expiry time.')
  }
  if (!Number.isFinite(resendDelayMs) || resendDelayMs < 0) {
    throw new Error('The OTP service returned an invalid resend delay.')
  }

  return {
    success: true,
    sessionId: null,
    expiresAt: now + expiryMs,
    resendAvailableAt: now + resendDelayMs,
    demoMode: data.demo_mode === true,
    message: data.message,
  }
}

export const otpService = {
  async sendOtp({ phone, email, fullName }) {
    const data = await postAuthRequest('start-registration', {
      email: (email || '').trim(),
      full_name: fullName || 'Officer',
      phone_number: phone ? phone.replace(/\D/g, '') : null,
    })
    return toOtpSession(data)
  },

  async verifyOtp({ phone, otp }) {
    const data = await postAuthRequest('verify-otp', {
      phone_number: (phone || '').replace(/\D/g, ''),
      otp: String(otp || '').trim(),
    })
    return { success: data.status === 'success', message: data.message }
  },

  async resendOtp({ phone, email, fullName }) {
    return this.sendOtp({ phone, email, fullName })
  },
}
