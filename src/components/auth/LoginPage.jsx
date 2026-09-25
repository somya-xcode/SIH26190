import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, User, AlertCircle, CheckCircle2, LockKeyhole, FolderKanban, Activity,
  KeyRound, Menu, X, BriefcaseBusiness, Phone, ArrowLeft, ArrowRight
} from 'lucide-react'
import { PasswordInput } from './PasswordInput'
import { FaceAuthentication } from './FaceAuthentication'
import { SecurityNotice } from './SecurityNotice'
import { useAuth } from '../../context/AuthContext'
import { cases } from '../../services/mockData'
import { ALL_POSITIONS } from '../../services/accessControl'
import { authService } from '../../services/authService'

const PUBLIC_LINKS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'services', label: 'Services' },
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
  const [signUpOtp, setSignUpOtp] = useState('')
  const [signUpStep, setSignUpStep] = useState(1)
  const [signUpFaceVerification, setSignUpFaceVerification] = useState(null)
  const [signUpPassword, setSignUpPassword] = useState('')
  const [signUpConfirm, setSignUpConfirm] = useState('')

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

  const handleSignUp = (e) => {
    e?.preventDefault()
    setErrorMessage('')
    if (signUpStep === 1) {
      if (!signUpName.trim() || !signUpId.trim() || !signUpPosition) {
        setErrorMessage('Please enter your name, username, and police post.')
        return
      }
      if (authService.userExists(signUpId)) {
        setErrorMessage('That username is already registered. Please choose another username.')
        return
      }
      setSignUpStep(2)
      return
    }
    if (signUpStep === 2) {
      if (!/^\+?[0-9\s-]{10,15}$/.test(signUpPhone.trim())) {
        setErrorMessage('Please enter a valid phone number.')
        return
      }
      if (signUpOtp.trim() !== '123456') {
        setErrorMessage('Invalid OTP. For this demo, enter 123456.')
        return
      }
      setSignUpStep(3)
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
    if (signUpPassword !== signUpConfirm) {
      setErrorMessage('Passwords do not match.')
      return
    }
    if (signUpPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters.')
      return
    }
    try {
      authService.registerLocalUser({
        id: signUpId,
        password: signUpPassword,
        name: signUpName,
        phone: signUpPhone,
        rank: signUpPosition,
        biometricToken: signUpFaceVerification.biometricToken,
      })
    } catch (err) {
      setErrorMessage(err.message || 'Registration could not be completed.')
      return
    }
    setSuccessMessage('Registration complete. Redirecting to sign in...')
    window.setTimeout(() => {
      setSignUpStep(1)
      setSignUpPassword('')
      setSignUpConfirm('')
      setSignUpFaceVerification(null)
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
        <button type="button" className="public-nav-brand" onClick={() => goToView('signin')}>
          <span className="public-nav-mark">
            <img src="/images/government-emblem.png" alt="Government of India emblem" />
          </span>
          <span className="public-nav-brand-copy">
            <strong>Ministry of Home Affairs</strong>
            <small>Government of India</small>
          </span>
          <span className="public-nav-divider" aria-hidden="true" />
          <span className="public-nav-platform">SECURE DIGITAL DOCUMENTATION MANAGEMENT SYSTEM</span>
        </button>

        <nav className={`public-nav-links ${mobileNavOpen ? 'open' : ''}`} aria-label="Primary">
          {PUBLIC_LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              className={publicView === link.id ? 'active' : ''}
              onClick={() => goToView(link.id === 'home' ? 'signin' : link.id)}
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="public-nav-actions">
          <button
            type="button"
            className={`public-nav-ghost ${publicView === 'signin' ? 'active' : ''}`}
            onClick={() => goToView('signin')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`public-nav-cta ${publicView === 'signup' ? 'active' : ''}`}
            onClick={() => goToView('signup')}
          >
            Sign up
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
          {PUBLIC_LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              className={publicView === link.id ? 'active' : ''}
              onClick={() => goToView(link.id === 'home' ? 'signin' : link.id)}
            >
              {link.label}
            </button>
          ))}
          <button type="button" onClick={() => goToView('signin')}>Sign in</button>
          <button type="button" onClick={() => goToView('signup')}>Sign up</button>
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
                  </>
                )}
                {signUpStep === 2 && (
                  <>
                    <div className="signup-step-heading"><span>Step 2 of 4</span><h3>Verify phone number</h3><p>Enter your phone number and confirm the OTP sent to you.</p></div>
                    <div className="form-group"><label htmlFor="signup-phone">Phone number <span className="req">*</span></label><div className="auth-input-wrapper"><Phone className="input-icon left-icon" size={18} aria-hidden="true" /><input id="signup-phone" className="auth-input" value={signUpPhone} onChange={(e) => setSignUpPhone(e.target.value)} placeholder="Enter your phone number" inputMode="tel" autoComplete="tel" /></div></div>
                    <div className="form-group"><label htmlFor="signup-otp">OTP confirmation <span className="req">*</span></label><input id="signup-otp" className="auth-input signup-otp-input" value={signUpOtp} onChange={(e) => setSignUpOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Enter 6-digit OTP" inputMode="numeric" autoComplete="one-time-code" maxLength={6} /><small className="signup-demo-hint">Demo OTP: 123456</small></div>
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
                  <button type="submit" className="button primary login-submit-btn">{signUpStep === 4 ? 'Complete registration' : <>Continue <ArrowRight size={16} /></>}</button>
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
                <img src="/images/government-emblem.png" alt="Government of India emblem" />
              </div>
              <h1>SECURE DIGITAL DOCUMENTATION MANAGEMENT SYSTEM</h1>
            </motion.div>

            <div className="login-headings">
              <h2>Secure Access</h2>
              <p>Authenticate to access secure legal and investigation records.</p>
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
                        <h4>Officer Credentials</h4>
                      </div>

                      {/* User ID Field */}
                      <div className="form-group">
                        <label htmlFor="user-id-input">
                          User ID <span className="req">*</span>
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
                            placeholder="Enter your User ID"
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
                            Password <span className="req">*</span>
                          </label>
                          <button
                            type="button"
                            className="text-link-btn"
                            onClick={() => setForgotModalOpen(true)}
                          >
                            Forgot Password?
                          </button>
                        </div>
                        <PasswordInput
                          id="password-input"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value)
                            if (errorMessage) setErrorMessage('')
                          }}
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
                        <>Authenticating Identity...</>
                      ) : (
                        <>
                          Sign In to Secure Workspace
                        </>
                      )}
                    </button>

                    {/* Security Information Notice */}
                    <SecurityNotice />
                  </div>

                  {/* Biometric face authentication */}
                  <div className="login-col-biometrics">
                    <div className="auth-form-section biometrics-section">
                      <div className="section-header">
                        <h4>Biometric Verification</h4>
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
                      />
                    </div>
                  </div>
                </div>
              </form>
            </motion.div>
          </>
        )}

        <footer className="login-footer">
          <div className="login-case-stats" aria-label="Case statistics">
            <div className="login-case-stat">
              <BriefcaseBusiness size={17} />
              <span><strong>{caseStats.total}</strong><small>Total Cases</small></span>
            </div>
            <div className="login-case-stat completed">
              <CheckCircle2 size={17} />
              <span><strong>{caseStats.completed}</strong><small>Completed</small></span>
            </div>
            <div className="login-case-stat running">
              <Activity size={17} />
              <span><strong>{caseStats.running}</strong><small>Currently Running</small></span>
            </div>
          </div>
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
