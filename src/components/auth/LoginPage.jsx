import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, User, AlertCircle, CheckCircle2, LockKeyhole, FolderKanban, Activity,
  KeyRound, Menu, X, BriefcaseBusiness, Phone, ArrowLeft, ArrowRight,
  Home, Info, LayoutGrid, HelpCircle, Mail, Globe, LogIn, UserPlus, ChevronDown
} from 'lucide-react'
import { PasswordInput } from './PasswordInput';
import { OtpVerification } from './OtpVerification';
import { FaceAuthentication } from './FaceAuthentication'
import { SecurityNotice } from './SecurityNotice'
import { useAuth } from '../../context/AuthContext'
import { cases } from '../../services/mockData'
import { ALL_POSITIONS } from '../../services/accessControl'
import { authService } from '../../services/authService'
import { otpService } from '../../services/otpService'

const TRANSLATIONS = {
  en: {
    platform: 'Digital Document Management System',
    tagline: 'Secure Documents | Stronger India',
    home: 'Home',
    about: 'About',
    services: 'Services',
    help: 'Help & Support',
    contact: 'Contact',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    secureAccess: 'Secure Access',
    subtitle: 'Authenticate to access secure legal and investigation records.',
    officerCredentials: 'Officer Credentials',
    userId: 'User ID',
    password: 'Password',
    forgotPassword: 'Forgot Password?',
    signInBtn: 'Sign In to Secure Workspace',
    authenticating: 'Authenticating Identity...',
    biometricVerification: 'Biometric Verification',
  },
  hi: {
    platform: 'डिजिटल दस्तावेज़ प्रबंधन प्रणाली',
    tagline: 'सुरक्षित दस्तावेज़ | सशक्त भारत',
    home: 'मुख्य पृष्ठ',
    about: 'हमारे बारे में',
    services: 'सेवाएं',
    help: 'सहायता एवं समर्थन',
    contact: 'संपर्क करें',
    signIn: 'साइन इन',
    signUp: 'साइन अप',
    secureAccess: 'सुरक्षित प्रवेश',
    subtitle: 'सुरक्षित कानूनी और जांच रिकॉर्ड तक पहुंचने के लिए सत्यापित करें।',
    officerCredentials: 'अधिकारी क्रेडेंशियल',
    userId: 'यूज़र आई डी',
    password: 'पासवर्ड',
    forgotPassword: 'पासवर्ड भूल गए?',
    signInBtn: 'सुरक्षित कार्यक्षेत्र में साइन इन करें',
    authenticating: 'पहचान सत्यापित हो रही है...',
    biometricVerification: 'बायोमेट्रिक सत्यापन',
  }
}

const PUBLIC_LINKS = [
  { id: 'home', labelKey: 'home', icon: Home },
  { id: 'about', labelKey: 'about', icon: Info },
  { id: 'services', labelKey: 'services', icon: LayoutGrid, hasDropdown: true },
]

export function LoginPage() {
  const { login } = useAuth()
  const caseStats = {
    total: cases.length,
    completed: cases.filter(item => ['Closed', 'Completed', 'Resolved'].includes(item.status)).length,
    running: cases.filter(item => ['Active', 'Running', 'Open', 'In Progress'].includes(item.status)).length,
  }
  const [publicView, setPublicView] = useState('signin')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [currentLang, setCurrentLang] = useState('en')
  const [langDropdownOpen, setLangDropdownOpen] = useState(false)
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en

  // Form states
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [faceVerification, setFaceVerification] = useState(null)

  // Feedback states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [forgotModalOpen, setForgotModalOpen] = useState(false)

  const [signUpName, setSignUpName] = useState('')
  const [signUpId, setSignUpId] = useState('')
  const [signUpPosition, setSignUpPosition] = useState('')
  const [signUpPhone, setSignUpPhone] = useState('')
  const [signUpEmail, setSignUpEmail] = useState('')
  const [signUpOtp, setSignUpOtp] = useState('')
  const [signUpStep, setSignUpStep] = useState(1)
  const [signUpFaceVerification, setSignUpFaceVerification] = useState(null)
  const [signUpPassword, setSignUpPassword] = useState('')
  const [signUpConfirm, setSignUpConfirm] = useState('');
  // OTP session state
  const [otpSessionId, setOtpSessionId] = useState(null);
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [otpResendAvailableAt, setOtpResendAvailableAt] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [showOtpVerification, setShowOtpVerification] = useState(false);

  const goToView = (view) => {
    setPublicView(view)
    setMobileNavOpen(false)
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    // 1. Validation checks
    if (!userId.trim()) {
      setErrorMessage('Please enter your User ID.')
      return
    }

    if (!password) {
      setErrorMessage('Please enter your password.')
      return
    }

    // 2. Strict 2FA Enforcement: Face Verification required before main dashboard entry
    if (!faceVerification || !faceVerification.verified) {
      setErrorMessage('Face authentication required. Please scan your face to complete identity verification.')
      return
    }

    setIsSubmitting(true)

    try {
      setSuccessMessage('Verifying credentials...')
      await login(userId, password, faceVerification)
    } catch (err) {
      setIsSubmitting(false)
      setErrorMessage(err.message || 'Authentication failed. Please check credentials and biometric verification.')
    }
  }

  const handleSignUp = async (e) => {
    e?.preventDefault()
    setErrorMessage('')
    if (signUpStep === 1) {
      if (!signUpName.trim() || !signUpId.trim() || !signUpPosition || !signUpEmail.trim()) {
        setErrorMessage('Please enter your name, email, username, and police post.')
        return
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signUpEmail.trim())) {
        setErrorMessage('Please enter a valid email address.')
        return
      }
      if (authService.userExists(signUpId)) {
        setErrorMessage('That username is already registered. Please choose another username.')
        return
      }
      try {
        setIsSubmitting(true)
        const otpRes = await otpService.sendOtp({
          phone: signUpPhone,
          email: signUpEmail.trim(),
          fullName: signUpName.trim()
        })
        setOtpSessionId(otpRes.sessionId)
        setOtpExpiresAt(otpRes.expiresAt)
        setOtpResendAvailableAt(otpRes.resendAvailableAt)
        setShowOtpVerification(true)
        setSuccessMessage(`OTP sent to ${signUpEmail.trim()}. Check your inbox for the 6-digit verification code.`)
        setSignUpStep(2)
      } catch (err) {
        setErrorMessage(err.message || 'Failed to send OTP to registered email.')
      } finally {
        setIsSubmitting(false)
      }
      return
    }
    if (signUpStep === 2) {
      if (!showOtpVerification) {
        setErrorMessage('Please request an OTP verification code.')
        return
      }
      setErrorMessage('Please enter and verify the 6-digit OTP code sent to your registered email.')
      return
    }
    if (signUpStep === 3) {
      if (!signUpFaceVerification?.verified) {
        setErrorMessage('Please complete face registration before continuing.')
        return
      }
      setSignUpStep(4)
      return
    }
    if (signUpStep !== 4) {
      return
    }
    if (signUpPassword !== signUpConfirm) {
      setErrorMessage('Passwords do not match.')
      return
    }
    if (signUpPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters.')
      return
    }
    try {
      // Complete registration with backend API (fallback to local authService if API offline)
      try {
        const res = await fetch('/api/auth/complete-registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: signUpName,
            email: signUpEmail.trim(),
            phone_number: signUpPhone,
            police_id: signUpId,
            rank: signUpPosition,
            station: 'Central Station',
            district: 'District 1',
            password: signUpPassword,
            confirm_password: signUpConfirm
          })
        })
        let data = {}
        try {
          const text = await res.text()
          data = text ? JSON.parse(text) : {}
        } catch (_) {}
        if (!res.ok) {
          throw new Error(data.detail || 'Registration failed')
        }
      } catch (apiErr) {
        // Fallback for demo/offline client state
        authService.registerLocalUser({
          id: signUpId,
          password: signUpPassword,
          name: signUpName,
          phone: signUpPhone,
          rank: signUpPosition,
          biometricToken: signUpFaceVerification?.biometricToken,
        })
      }
    } catch (err) {
      setErrorMessage(err.message || 'Registration could not be completed.')
      return
    }
    setSuccessMessage('Registration complete. Redirecting to sign in...')
    window.setTimeout(() => {
      setSignUpEmail('')
      setSignUpStep(1)
      setSignUpPassword('')
      setSignUpConfirm('')
      setSignUpFaceVerification(null)
      setShowOtpVerification(false)
      goToView('signin')
    }, 1200)
  }

  const goToPreviousSignUpStep = () => {
    setErrorMessage('')
    setSignUpStep(step => Math.max(1, step - 1))
  }

  return (
    <div className="login-root">
      <div className="login-backdrop-glow" />
      <div className="login-backdrop-grid" />

      <header className="public-nav">
        <div className="public-nav-left">
          <button type="button" className="public-nav-brand" onClick={() => goToView('signin')}>
            <span className="public-nav-mark-wrap">
              <img src="/esuraksha-logo.jpg" alt="eSuraksha logo" className="public-nav-mark-img" />
            </span>
            <div className="public-nav-brand-text">
              <div className="public-nav-brand-title">
                <span className="brand-esuraksha" style={{ color: '#000000', fontWeight: 800 }}>eSuraksha</span>
                <span className="brand-tricolor-bar" />
              </div>
              <small className="brand-tagline" style={{ color: '#000000', opacity: 1, textShadow: 'none', filter: 'none', fontWeight: 800 }}>{t.tagline}</small>
            </div>
          </button>
          <span className="public-nav-divider" aria-hidden="true" />
          <span className="public-nav-platform" style={{ color: '#000000', opacity: 1, textShadow: 'none', filter: 'none', fontWeight: 700 }}>{t.platform}</span>
        </div>

        <nav className={`public-nav-links ${mobileNavOpen ? 'open' : ''}`} aria-label="Primary">
          {PUBLIC_LINKS.map((link) => {
            const Icon = link.icon
            return (
              <div key={link.id} className="nav-item-dropdown-wrapper">
                <button
                  type="button"
                  className={publicView === link.id ? 'active' : ''}
                  onClick={() => goToView(link.id === 'home' ? 'signin' : link.id)}
                >
                  <Icon size={16} />
                  <span>{t[link.labelKey] || link.labelKey}</span>
                  {link.hasDropdown && <ChevronDown size={14} className="dropdown-caret" />}
                </button>
              </div>
            )
          })}
        </nav>

        <div className="public-nav-actions">
          <div className="language-selector-wrap" style={{ position: 'relative' }}>
            <button
              type="button"
              className="language-selector"
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              aria-label="Select language"
            >
              <Globe size={16} />
              <span>{currentLang === 'hi' ? 'हिन्दी (Hindi)' : 'English'}</span>
              <ChevronDown size={14} />
            </button>
            {langDropdownOpen && (
              <div className="language-dropdown-menu">
                <button
                  type="button"
                  className={currentLang === 'en' ? 'active' : ''}
                  onClick={() => { setCurrentLang('en'); setLangDropdownOpen(false); }}
                >
                  English
                </button>
                <button
                  type="button"
                  className={currentLang === 'hi' ? 'active' : ''}
                  onClick={() => { setCurrentLang('hi'); setLangDropdownOpen(false); }}
                >
                  हिन्दी (Hindi)
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            className={`button secondary nav-signin-btn ${publicView === 'signin' ? 'active' : ''}`}
            onClick={() => goToView('signin')}
          >
            <LogIn size={15} />
            <span>{t.signIn}</span>
          </button>
          <button
            type="button"
            className={`button primary nav-signup-btn ${publicView === 'signup' ? 'active' : ''}`}
            onClick={() => goToView('signup')}
          >
            <UserPlus size={15} />
            <span>{t.signUp}</span>
          </button>
          <button
            type="button"
            className="public-nav-menu"
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {mobileNavOpen && (
        <div className="public-nav-drawer">
          {PUBLIC_LINKS.map((link) => {
            const Icon = link.icon
            return (
              <button
                key={link.id}
                type="button"
                className={publicView === link.id ? 'active' : ''}
                onClick={() => goToView(link.id === 'home' ? 'signin' : link.id)}
              >
                <Icon size={18} />
                <span>{link.label}</span>
              </button>
            )
          })}
          <button type="button" onClick={() => goToView('signin')}><LogIn size={18} /> Sign In</button>
          <button type="button" onClick={() => goToView('signup')}><UserPlus size={18} /> Sign Up</button>
        </div>
      )}

      {publicView === 'about' && (
        <section className="public-about" aria-labelledby="about-title">
          <div className="public-about-hero">
            <span className="public-about-kicker">ABOUT THE SYSTEM</span>
            <h1 id="about-title">Secure Digital Document Management System</h1>
            <p>
              A secure, centralized platform for managing, organizing, and protecting legal and investigation-related documents.
            </p>
          </div>

          <div className="public-about-grid">
            <article className="public-about-card public-about-card-wide">
              <span className="public-about-icon"><FolderKanban size={20} /></span>
              <div>
                <h2>About the System</h2>
                <p>
                  The Secure Digital Document Management System helps authorized police and investigation personnel create, upload, access, organize, and manage case documents through a structured, role-based environment. It reduces dependency on traditional paperwork while improving accessibility, security, and accountability.
                </p>
              </div>
            </article>
            <article className="public-about-card">
              <span className="public-about-icon"><ShieldCheck size={20} /></span>
              <h2>Our Mission</h2>
              <p>
                To provide a secure, efficient, and transparent digital ecosystem where confidential investigation documents are accessible only to authorized personnel according to their roles and responsibilities.
              </p>
            </article>
            <article className="public-about-card">
              <span className="public-about-icon"><LockKeyhole size={20} /></span>
              <h2>Why It Matters</h2>
              <p>
                Legal and investigation processes involve sensitive information requiring confidentiality, integrity, and controlled access. This platform brings structure, security, and accountability to digital documentation.
              </p>
            </article>
            <article className="public-about-card public-about-card-wide">
              <span className="public-about-icon"><Activity size={20} /></span>
              <div>
                <h2>Our Vision</h2>
                <p>
                  To build trusted digital infrastructure for law enforcement and investigation teams, enabling sensitive documents to be managed securely and efficiently with transparency, accountability, and controlled access.
                </p>
              </div>
            </article>
          </div>
        </section>
      )}

      {publicView === 'services' && (
        <section className="public-about" aria-labelledby="services-title">
          <div className="public-about-hero">
            <span className="public-about-kicker">CORE SERVICES</span>
            <h1 id="services-title">Digital Document & Security Services</h1>
            <p>Comprehensive features designed for secure government document lifecycle management.</p>
          </div>
          <div className="public-about-grid">
            <article className="public-about-card">
              <span className="public-about-icon"><ShieldCheck size={20} /></span>
              <h2>Cryptographic Document Protection</h2>
              <p>End-to-end AES-256 encryption and SHA-256 integrity verification for legal files.</p>
            </article>
            <article className="public-about-card">
              <span className="public-about-icon"><FolderKanban size={20} /></span>
              <h2>Case Document Repository</h2>
              <p>Role-based access control (RBAC) ensuring strict confidentiality across departments.</p>
            </article>
            <article className="public-about-card">
              <span className="public-about-icon"><Activity size={20} /></span>
              <h2>Blockchain Audit Ledger</h2>
              <p>Immutable logging of all document access, updates, and verification attempts.</p>
            </article>
          </div>
        </section>
      )}

      <main className="login-shell" role="main">
  <div className="login-inner">
        {publicView === 'signup' && (
          <>
            <div className="login-headings">
              <h2>Request Access</h2>
              <p>Create an account request. Credentials are issued after identity verification.</p>
            </div>
            <motion.div
              className="login-card signup-card"
              initial={{ opacity: 0, scale: 0.98, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {errorMessage && (
                <div className="auth-alert error" role="alert">
                  <AlertCircle size={18} />
                  <span>{errorMessage}</span>
                </div>
              )}
              {successMessage && (
                <div className="auth-alert success" role="status">
                  <CheckCircle2 size={18} />
                  <span>{successMessage}</span>
                </div>
              )}
              <div className="signup-step-indicator" aria-label={`Registration step ${signUpStep} of 4`}>
                {[1, 2, 3, 4].map(step => <span className={signUpStep >= step ? 'active' : ''} key={step}>{step}</span>)}
              </div>
              <form onSubmit={handleSignUp} className="login-form signup-flow" noValidate>
                {signUpStep === 1 && (
                  <>
                    <div className="signup-step-heading"><span>Step 1 of 4</span><h3>Basic details</h3><p>Tell us who is requesting access.</p></div>
                    <div className="form-group">
                      <label htmlFor="signup-name">Full name <span className="req">*</span></label>
                      <div className="auth-input-wrapper"><User className="input-icon left-icon" size={18} aria-hidden="true" /><input id="signup-name" className="auth-input" value={signUpName} onChange={(e) => setSignUpName(e.target.value)} placeholder="Enter your full name" autoComplete="name" /></div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="signup-id">Username <span className="req">*</span></label>
                      <div className="auth-input-wrapper"><User className="input-icon left-icon" size={18} aria-hidden="true" /><input id="signup-id" className="auth-input" value={signUpId} onChange={(e) => setSignUpId(e.target.value)} placeholder="Create your username" autoComplete="username" /></div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="signup-position">Police post / position <span className="req">*</span></label>
                      <select id="signup-position" className="auth-input auth-select" value={signUpPosition} onChange={(e) => setSignUpPosition(e.target.value)} required>
                        <option value="">Select your current post</option>
                        {ALL_POSITIONS.map(position => <option value={position} key={position}>{position}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="signup-email">Official email address <span className="req">*</span></label>
                      <div className="auth-input-wrapper"><Mail className="input-icon left-icon" size={18} aria-hidden="true" /><input id="signup-email" type="email" className="auth-input" value={signUpEmail} onChange={(e) => setSignUpEmail(e.target.value)} placeholder="Enter your email address" autoComplete="email" /></div>
                    </div>
                  </>
                )}
                {signUpStep === 2 && (
                  <>
                    <div className="signup-step-heading"><span>Step 2 of 4</span><h3>Verify email address</h3><p>Enter your official email address to receive an OTP verification code.</p></div>
                    <div className="form-group"><label htmlFor="signup-email-step2">Official email address <span className="req">*</span></label><div className="auth-input-wrapper"><Mail className="input-icon left-icon" size={18} aria-hidden="true" /><input id="signup-email-step2" type="email" className="auth-input" value={signUpEmail} onChange={(e) => { setSignUpEmail(e.target.value); setErrorMessage(''); }} placeholder="Enter your email address" autoComplete="email" /></div></div>
                    {showOtpVerification ? (
                      <OtpVerification
                        email={signUpEmail}
                        phone={signUpPhone}
                        sessionId={otpSessionId}
                        expiresAt={otpExpiresAt}
                        resendAvailableAt={otpResendAvailableAt}
                        onVerificationSuccess={() => {
                          setSuccessMessage('Email address verified! Proceeding to face registration...');
                          setSignUpStep(3);
                          setShowOtpVerification(false);
                          setOtpSessionId(null);
                          setOtpExpiresAt(null);
                          setOtpResendAvailableAt(null);
                          setTimeout(() => setSuccessMessage(''), 3000);
                        }}
                        onBack={() => {
                          setShowOtpVerification(false);
                          setOtpSessionId(null);
                          setOtpExpiresAt(null);
                          setOtpResendAvailableAt(null);
                        }}
                      />
                    ) : (
                      <button type="button" className="button primary" onClick={async () => {
                        if (!signUpEmail.trim()) { setErrorMessage('Please enter a valid email address.'); return; }
                        setErrorMessage('');
                        try {
                          const otpRes = await otpService.sendOtp({ phone: signUpPhone, email: signUpEmail.trim(), fullName: signUpName.trim() });
                          setOtpSessionId(otpRes.sessionId);
                          setOtpExpiresAt(otpRes.expiresAt);
                          setOtpResendAvailableAt(otpRes.resendAvailableAt);
                          setShowOtpVerification(true);
                        } catch (err) {
                          setErrorMessage(err.message || 'Failed to send OTP to email.');
                        }
                      }}>Send OTP to Email</button>
                    )}
                  </>
                )}
                {signUpStep === 3 && (
                  <>
                    <div className="signup-step-heading"><span>Step 3 of 4</span><h3>Register your face</h3><p>Complete face registration before creating your password.</p></div>
                    <FaceAuthentication userId={signUpId} registrationMode verificationResult={signUpFaceVerification} onVerificationComplete={setSignUpFaceVerification} />
                  </>
                )}
                {signUpStep === 4 && (
                  <>
                    <div className="signup-step-heading"><span>Step 4 of 4</span><h3>Create your password</h3><p>Choose a password to complete registration.</p></div>
                    <div className="form-group"><label htmlFor="signup-password">Password <span className="req">*</span></label><PasswordInput id="signup-password" value={signUpPassword} onChange={(e) => setSignUpPassword(e.target.value)} autoComplete="new-password" /></div>
                    <div className="form-group"><label htmlFor="signup-confirm">Re-enter password <span className="req">*</span></label><PasswordInput id="signup-confirm" value={signUpConfirm} onChange={(e) => setSignUpConfirm(e.target.value)} autoComplete="new-password" /></div>
                  </>
                )}
                <div className="signup-flow-actions">
                  {signUpStep > 1 && <button type="button" className="button secondary" onClick={goToPreviousSignUpStep}><ArrowLeft size={16} /> Back</button>}
                  {!showOtpVerification && (
                    <button type="submit" className="button primary login-submit-btn">
                      {signUpStep === 4 ? 'Complete registration' : <>Continue <ArrowRight size={16} /></>}
                    </button>
                  )}
                </div>
                <p className="signup-switch">
                  Already have an account?{' '}
                  <button type="button" className="text-link-btn" onClick={() => goToView('signin')}>Sign in</button>
                </p>
              </form>
            </motion.div>
          </>
        )}

        {publicView === 'signin' && (
          <>
            <motion.div
              className="login-brand"
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="brand-mark-login">
                <img src="/esuraksha-logo.jpg" alt="eSuraksha logo" />
              </div>
              <h1 className="login-system-title">{t.platform.toUpperCase()}</h1>
            </motion.div>

            <div className="login-headings">
              <h2>{t.secureAccess}</h2>
              <p>{t.subtitle}</p>
            </div>

            {/* Main Authentication Card */}
            <motion.div
              className="login-card"
              initial={{ opacity: 0, scale: 0.98, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Feedback Messages */}
              <AnimatePresence>
                {errorMessage && (
                  <motion.div
                    className="auth-alert error"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    role="alert"
                  >
                    <AlertCircle size={18} />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}

                {successMessage && (
                  <motion.div
                    className="auth-alert success"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    role="status"
                  >
                    <CheckCircle2 size={18} />
                    <span>{successMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} noValidate className="login-form">
                <div className="login-grid-landscape">
                  {/* Credentials and access action */}
                  <div className="login-col-credentials">
                    <div className="auth-form-section">
                      <div className="section-header">
                        <h4>{t.officerCredentials}</h4>
                      </div>

                      {/* User ID Field */}
                      <div className="form-group">
                        <label htmlFor="user-id-input">
                          {t.userId} <span className="req">*</span>
                        </label>
                        <div className="auth-input-wrapper">
                          <User className="input-icon left-icon" size={18} aria-hidden="true" />
                          <input
                            id="user-id-input"
                            type="text"
                            value={userId}
                            onChange={(e) => {
                              setUserId(e.target.value)
                              if (errorMessage) setErrorMessage('')
                            }}
                            placeholder={t.enterUserId}
                            className="auth-input"
                            autoComplete="username"
                            disabled={isSubmitting}
                            required
                          />
                        </div>
                      </div>

                      {/* Password Field */}
                      <div className="form-group">
                        <div className="label-with-action">
                          <label htmlFor="password-input">
                            {t.password} <span className="req">*</span>
                          </label>
                          <button
                            type="button"
                            className="text-link-btn"
                            onClick={() => setForgotModalOpen(true)}
                          >
                            {t.forgotPassword}
                          </button>
                        </div>
                        <PasswordInput
                          id="password-input"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value)
                            if (errorMessage) setErrorMessage('')
                          }}
                          placeholder={t.enterPassword}
                          disabled={isSubmitting}
                        />
                      </div>

                    </div>

                    {/* Submission CTA */}
                    <button
                      type="submit"
                      className={`button primary login-submit-btn ${isSubmitting ? 'submitting' : ''}`}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>{t.authenticating}</>
                      ) : (
                        <>
                          {t.signInBtn}
                        </>
                      )}
                    </button>

                    {/* Security Information Notice */}
                    <SecurityNotice t={t} />
                  </div>

                  {/* Biometric face authentication */}
                  <div className="login-col-biometrics">
                    <div className="auth-form-section biometrics-section">
                      <div className="section-header">
                        <h4>{t.biometricVerification}</h4>
                      </div>

                      <FaceAuthentication
                        userId={userId}
                        verificationResult={faceVerification}
                        onVerificationComplete={(result) => {
                          setFaceVerification(result)
                          if (result?.verified) {
                            setErrorMessage('')
                          }
                        }}
                        disabled={isSubmitting}
                        lang={currentLang}
                      />
                    </div>
                  </div>
                </div>
              </form>
            </motion.div>
          </>
        )}

        <footer className="login-footer">
        </footer>
      </div> {/* close login-inner */}
    </main>

      {/* ATTRACTIVE RANK SELECTION MODAL — RENDERED VIA PORTAL TO BODY FOR ABSOLUTE OPAQUE OVERLAY & TOP Z-INDEX */}
      {false && (
        <AnimatePresence>
          {rankModalOpen && (
            <div
              className="rank-modal-backdrop-portal"
              onClick={() => setRankModalOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: '#0a1426',
                zIndex: 999999,
                display: 'grid',
                placeItems: 'center',
                padding: 20,
              }}
            >
              <motion.div
                className="rank-modal-content-portal"
                onClick={e => e.stopPropagation()}
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                style={{
                  maxWidth: 640,
                  width: '100%',
                  background: '#ffffff',
                  opacity: 1,
                  zIndex: 1000000,
                  border: '1px solid #cbd5e1',
                  borderRadius: 12,
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
                  color: '#0f172a',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Award size={20} color="#2563eb" /> Select Official Position / Rank
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                      Select your official designated position for security verification
                    </p>
                  </div>
                  <button className="button-close" onClick={() => setRankModalOpen(false)}>×</button>
                </div>

                {/* Opaque Search Filter */}
                <div style={{ padding: '12px 20px 0', background: '#ffffff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', opacity: 1, border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 12px', gap: 8 }}>
                    <Search size={16} color="#64748b" />
                    <input
                      type="text"
                      placeholder="Search position or rank (e.g. Sub-Inspector, Inspector, SP, Legal Officer)..."
                      value={rankSearchQuery}
                      onChange={e => setRankSearchQuery(e.target.value)}
                      style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: 13, color: '#0f172a' }}
                    />
                    {rankSearchQuery && (
                      <button type="button" onClick={() => setRankSearchQuery('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="modal-body" style={{ padding: 20, maxHeight: 420, overflowY: 'auto', background: '#ffffff', opacity: 1 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {RANK_GROUPS.map(group => {
                      const filteredItems = group.items.filter(item =>
                        item.title.toLowerCase().includes(rankSearchQuery.toLowerCase()) ||
                        item.desc.toLowerCase().includes(rankSearchQuery.toLowerCase())
                      )

                      if (filteredItems.length === 0) return null

                      return (
                        <div key={group.category}>
                          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 10 }}>
                            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                              {group.category}
                            </h4>
                            <span style={{ fontSize: 11, color: '#64748b' }}>{group.description}</span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                            {filteredItems.map(item => {
                              const isSelected = selectedPosition === item.title
                              const canCreate = item.level >= ACCESS_LEVELS.STATION_SUPERVISOR || item.title === RANKS.LEGAL_OFFICER

                              return (
                                <motion.div
                                  key={item.title}
                                  whileHover={{ scale: 1.01 }}
                                  whileTap={{ scale: 0.99 }}
                                  onClick={() => {
                                    setSelectedPosition(item.title)
                                    if (errorMessage) setErrorMessage('')
                                    setRankModalOpen(false)
                                  }}
                                  style={{
                                    padding: '10px 12px',
                                    borderRadius: 8,
                                    border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                                    background: isSelected ? '#eff6ff' : '#ffffff',
                                    opacity: 1,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justify: 'space-between',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                      <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? '#1d4ed8' : '#0f172a' }}>
                                        {item.title}
                                      </span>
                                      {isSelected && <CheckCircle2 size={16} color="#2563eb" />}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
                                      {item.desc}
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
                                    <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, color: '#334155', fontWeight: 600 }}>
                                      Level {item.level} · {getAccessLevelLabel(item.level)}
                                    </span>
                                     {(() => {
                                       const tier = getActionTier(item.title)
                                       const isHigher = tier === ACTION_TIERS.HIGHER_AUTHORITY
                                       const isCreate = tier === ACTION_TIERS.CREATE
                                       return (
                                         <span style={{
                                           padding: '1px 6px',
                                           borderRadius: 4,
                                           fontWeight: 700,
                                           fontSize: 10,
                                           background: isHigher ? '#e0e7ff' : isCreate ? '#dcfce7' : '#f1f5f9',
                                           color: isHigher ? '#3730a3' : isCreate ? '#166534' : '#475569',
                                         }}>
                                           ⚡ {tier}
                                         </span>
                                       )
                                     })()}
                                  </div>
                                </motion.div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    Selected: <strong>{selectedPosition || 'None'}</strong>
                  </span>
                  <button className="button primary" style={{ opacity: 1, zIndex: 1 }} onClick={() => setRankModalOpen(false)}>Done</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {forgotModalOpen && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="modal auth-dialog"
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="forgot-modal-title"
            >
              <div className="modal-icon blue">
                <KeyRound size={24} />
              </div>
              <h2 id="forgot-modal-title">Credential Recovery Protocol</h2>
              <p>
                In accordance with Secure Investigation Guidelines, password resets must be issued
                through the <strong>Department Security Administrator</strong> or the <strong>Nodal IT Cell</strong>.
              </p>
              <div className="modal-instruction-box">
                <small>Contact your designated System Nodal Officer with your Service ID:</small>
                <code>sec-officer@docguard.gov.in</code>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="button primary"
                  onClick={() => setForgotModalOpen(false)}
                >
                  Understood
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PublicFeature({ icon: Icon, title, text }) {
  return (
    <article className="public-feature">
      <span><Icon size={18} /></span>
      <b>{title}</b>
      <small>{text}</small>
    </article>
  )
}
