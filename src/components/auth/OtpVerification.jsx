import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, Mail, RefreshCw, AlertCircle, CheckCircle2, Lock, Clock, MessageSquare, ArrowLeft, ArrowRight
} from 'lucide-react'
import { otpService, maskPhoneNumber, maskEmail } from '../../services/otpService'

export function OtpVerification({
  email,
  phone,
  sessionId: initialSessionId,
  expiresAt: initialExpiresAt,
  resendAvailableAt: initialResendAvailableAt,
  onVerificationSuccess,
  onBack,
  title = "Verify Email Address",
  subtitle = "Enter the 6-digit verification code sent to your registered email address."
}) {
  const [sessionId, setSessionId] = useState(initialSessionId)
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt)
  const [resendAvailableAt, setResendAvailableAt] = useState(initialResendAvailableAt)
  
  const targetContact = email || phone || ''
  const displayContact = email ? maskEmail(email) : maskPhoneNumber(phone)

  // OTP input digits array (6 digits)
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)]

  // Timers
  const [timeRemaining, setTimeRemaining] = useState(300) // 5 minutes (seconds)
  const [resendCooldown, setResendCooldown] = useState(30) // 30 seconds
  const [isExpired, setIsExpired] = useState(false)
  const [isResendDisabled, setIsResendDisabled] = useState(true)

  // Status & Feedback
  const [isVerifying, setIsVerifying] = useState(false)
  const [isSendingSms, setIsSendingSms] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [infoMsg, setInfoMsg] = useState(`OTP sent to ${displayContact} via Email.`)
  const [attempts, setAttempts] = useState(0)

  // Initialize timers when session changes or mounts
  useEffect(() => {
    if (expiresAt) {
      const remainingSecs = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
      setTimeRemaining(remainingSecs)
      setIsExpired(remainingSecs <= 0)
    }
    if (resendAvailableAt) {
      const cooldownSecs = Math.max(0, Math.floor((resendAvailableAt - Date.now()) / 1000))
      setResendCooldown(cooldownSecs)
      setIsResendDisabled(cooldownSecs > 0)
    }
  }, [expiresAt, resendAvailableAt])

  // Countdown timer interval for 5-minute expiry
  useEffect(() => {
    const timer = setInterval(() => {
      if (expiresAt) {
        const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
        setTimeRemaining(remaining)
        if (remaining <= 0) {
          setIsExpired(true)
          setErrorMsg('OTP has expired. Please request a new OTP.')
        }
      }
      if (resendAvailableAt) {
        const cooldown = Math.max(0, Math.floor((resendAvailableAt - Date.now()) / 1000))
        setResendCooldown(cooldown)
        setIsResendDisabled(cooldown > 0)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [expiresAt, resendAvailableAt])

  // Auto-focus first digit on mount
  useEffect(() => {
    inputRefs[0]?.current?.focus()
  }, [])

  // Format MM:SS for countdown timer
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // Handle single digit input change
  const handleDigitChange = (index, value) => {
    setErrorMsg('')
    const numOnly = value.replace(/\D/g, '')

    if (numOnly.length > 1) {
      // Paste multi-digit code case
      const pastedDigits = numOnly.slice(0, 6).split('')
      const newDigits = [...digits]
      pastedDigits.forEach((d, idx) => {
        if (idx < 6) newDigits[idx] = d
      })
      setDigits(newDigits)
      const nextFocusIndex = Math.min(5, pastedDigits.length)
      inputRefs[nextFocusIndex]?.current?.focus()
      return
    }

    const newDigits = [...digits]
    newDigits[index] = numOnly.slice(-1)
    setDigits(newDigits)

    // Move to next input box if typed a digit
    if (numOnly && index < 5) {
      inputRefs[index + 1]?.current?.focus()
    }
  }

  // Handle key navigation (Backspace, Arrow keys)
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1]?.current?.focus()
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs[index - 1]?.current?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs[index + 1]?.current?.focus()
    }
  }

  const enteredOtp = digits.join('')
  const isComplete = enteredOtp.length === 6

  // Verify OTP submit handler
  const handleVerify = async (e) => {
    e?.preventDefault()
    e?.stopPropagation()
    setErrorMsg('')

    if (isExpired) {
      setErrorMsg('OTP has expired. Please request a new OTP.')
      return
    }

    if (!isComplete) {
      setErrorMsg('Please enter all 6 digits of the OTP.')
      return
    }

    setIsVerifying(true)
    try {
      const res = await otpService.verifyOtp({
        sessionId,
        phone,
        otp: enteredOtp
      })

      if (res.success) {
        setInfoMsg('Email verified successfully.')
        if (onVerificationSuccess) {
          onVerificationSuccess({ sessionId, phone, email })
        }
      }
    } catch (err) {
      setAttempts(prev => prev + 1)
      setErrorMsg(err.message || 'Invalid OTP. Please enter the correct OTP.')
      // Clear OTP digits on error for quick retry
      setDigits(['', '', '', '', '', ''])
      inputRefs[0]?.current?.focus()
    } finally {
      setIsVerifying(false)
    }
  }

  // Resend OTP handler
  const handleResend = async () => {
    if (isResendDisabled || isSendingSms) return
    setErrorMsg('')
    setIsSendingSms(true)

    try {
      const res = await otpService.resendOtp({ sessionId, phone })
      setSessionId(res.sessionId)
      setExpiresAt(res.expiresAt)
      setResendAvailableAt(res.resendAvailableAt)
      setDigits(['', '', '', '', '', ''])
      setAttempts(0)
      setIsExpired(false)
      setInfoMsg(`A new 6-digit OTP has been sent to ${displayContact}.`)
      inputRefs[0]?.current?.focus()
    } catch (err) {
      setErrorMsg(err.message || 'Failed to resend OTP email.')
    } finally {
      setIsSendingSms(false)
    }
  }

  return (
    <motion.div
      className="otp-verification-container"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="otp-header">
        <div className="otp-header-icon">
          <ShieldCheck size={26} className="text-blue-600" />
        </div>
        <h3>{title}</h3>
        <p className="otp-subtitle">{subtitle}</p>
      </div>

      {/* Email Confirmation Alert Banner */}
      <div className="otp-phone-banner">
        <div className="phone-icon-box">
          <Mail size={18} />
        </div>
        <div className="phone-banner-details">
          <span className="phone-label">OTP Sent to Email: <strong>{displayContact}</strong></span>
        </div>
      </div>

      {/* Status Messages */}
      <AnimatePresence mode="wait">
        {errorMsg && (
          <motion.div
            className="auth-alert error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            role="alert"
          >
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </motion.div>
        )}

        {!errorMsg && infoMsg && (
          <motion.div
            className="auth-alert success"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            role="status"
          >
            <CheckCircle2 size={18} />
            <span>{infoMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6-Digit Code Entry */}
      <form onSubmit={handleVerify} className="otp-form">
        <div className="otp-input-group">
          <label className="otp-input-label">Enter 6-Digit OTP Code</label>
          <div className="otp-digits-grid">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={inputRefs[index]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`otp-digit-box ${digit ? 'filled' : ''} ${isExpired ? 'expired' : ''}`}
                disabled={isVerifying || isExpired}
                autoComplete="off"
              />
            ))}
          </div>
        </div>

        {/* Timer and Expiration Bar */}
        <div className="otp-timer-bar">
          <div className={`otp-timer-badge ${isExpired ? 'expired' : timeRemaining < 60 ? 'warning' : ''}`}>
            <Clock size={15} />
            <span>
              {isExpired ? 'OTP Expired' : `Valid for ${formatTimer(timeRemaining)}`}
            </span>
          </div>
          {attempts > 0 && (
            <span className="otp-attempts-badge">
              Attempt {attempts}/3
            </span>
          )}
        </div>

        {/* Main Actions */}
        <div className="otp-actions-wrapper">
          <button
            type="submit"
            className={`button primary otp-verify-btn ${isVerifying ? 'submitting' : ''}`}
            disabled={!isComplete || isVerifying || isExpired}
          >
            {isVerifying ? (
              <>Verifying OTP Code...</>
            ) : (
              <>
                <Lock size={16} /> Verify OTP & Continue
              </>
            )}
          </button>

          <div className="otp-secondary-row">
            {onBack && (
              <button
                type="button"
                className="button secondary otp-back-btn"
                onClick={onBack}
                disabled={isVerifying}
              >
                <ArrowLeft size={16} /> Change Email
              </button>
            )}

            <button
              type="button"
              className={`button outline otp-resend-btn ${isResendDisabled ? 'disabled' : ''}`}
              onClick={handleResend}
              disabled={isResendDisabled || isSendingSms || isVerifying}
            >
              <RefreshCw size={15} className={isSendingSms ? 'animate-spin' : ''} />
              {isSendingSms ? (
                'Sending Email...'
              ) : isResendDisabled ? (
                `Resend OTP (${resendCooldown}s)`
              ) : (
                'Resend OTP'
              )}
            </button>
          </div>
        </div>
      </form>
    </motion.div>
  )
}
