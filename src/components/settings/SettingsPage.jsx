import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserPlus, LockKeyhole, Bell, KeyRound, Archive, SlidersHorizontal,
  Check, Save, ShieldCheck, Laptop, LogOut, CheckCircle2, AlertCircle,
  ChevronRight, RefreshCw, Smartphone, Mail, Globe, Shield, User,
  Eye, EyeOff
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { authService } from '../../services/authService'

export function SettingsPage({ notify }) {
  const { user, session } = useAuth()
  const [activeTab, setActiveTab] = useState('Profile')

  // Profile Form State
  const [profile, setProfile] = useState({
    name: user?.name || 'Pranshu Kumar',
    email: user?.email || 'p.kumar@up.police.gov.in',
    phone: user?.phone || '+91 9876543210',
    rank: user?.rank || 'Deputy Superintendent of Police',
    policeStation: user?.policeStation || 'Kotwali Police Station',
    district: user?.district || 'Lucknow',
    state: user?.state || 'Uttar Pradesh',
    badgeId: user?.id || 'DSP-8849',
    department: user?.department || 'Investigation Services',
  })
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

  // Security / Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showCurrentPass, setShowCurrentPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [isChangingPass, setIsChangingPass] = useState(false)
  const [mfaEnabled, setMfaEnabled] = useState(true)
  const [faceAuthEnabled, setFaceAuthEnabled] = useState(true)

  // Notification State
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    smsAlerts: true,
    caseAssignments: true,
    seniorDirectives: true,
    securityFlags: true,
    auditDigest: false,
  })

  // Access Control Settings
  const [defaultSharing, setDefaultSharing] = useState('station')

  // Audit Settings
  const [logRetention, setLogRetention] = useState('90_days')
  const [autoHashVerify, setAutoHashVerify] = useState(true)

  // System Preferences
  const [language, setLanguage] = useState('en')
  const [refreshInterval, setRefreshInterval] = useState('30')

  // Save Profile Handler
  const handleProfileSave = async (e) => {
    e.preventDefault()
    setIsUpdatingProfile(true)
    try {
      const storedToken = sessionStorage.getItem('token') || localStorage.getItem('token')
      if (storedToken && user?.user_id) {
        await fetch(`/api/users/${user.user_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${storedToken}`,
          },
          body: JSON.stringify({
            full_name: profile.name,
            police_station: profile.policeStation,
            district: profile.district,
            state: profile.state,
          }),
        })
      }
      
      if (session) {
        const updatedUser = { ...session.user, name: profile.name, policeStation: profile.policeStation, district: profile.district, state: profile.state }
        authService.setStoredSession({ ...session, user: updatedUser })
      }

      notify('success', 'Profile Updated', 'Your profile details have been saved successfully.')
    } catch (err) {
      notify('error', 'Update Failed', err.message || 'Could not update profile.')
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  // Password Change Handler
  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (!passwordForm.currentPassword) {
      notify('error', 'Missing Field', 'Please enter your current password.')
      return
    }
    if (passwordForm.newPassword.length < 8) {
      notify('error', 'Weak Password', 'New password must be at least 8 characters long.')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      notify('error', 'Mismatch', 'New password and confirm password do not match.')
      return
    }

    setIsChangingPass(true)
    try {
      const storedToken = sessionStorage.getItem('token') || localStorage.getItem('token')
      if (storedToken) {
        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${storedToken}`,
          },
          body: JSON.stringify({
            current_password: passwordForm.currentPassword,
            new_password: passwordForm.newPassword,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || 'Password update failed')
      }

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      notify('success', 'Password Updated', 'Your password has been changed successfully.')
    } catch (err) {
      notify('error', 'Password Change Failed', err.message || 'Could not change password.')
    } finally {
      setIsChangingPass(false)
    }
  }

  const settingCategories = [
    { title: 'Profile', text: 'Personal information and assigned role', icon: UserPlus },
    { title: 'Security', text: 'Password, multi-factor authentication, and sessions', icon: LockKeyhole },
    { title: 'Notification Preferences', text: 'Choose when and how you are notified', icon: Bell },
    { title: 'Access Control', text: 'Role permissions and default sharing', icon: KeyRound },
    { title: 'Audit Settings', text: 'Log retention and blockchain hash verification', icon: Archive },
    { title: 'System Preferences', text: 'Language, theme, and workspace options', icon: SlidersHorizontal },
  ]

  const lightPanelStyle = {
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08)',
    borderRadius: '12px',
    color: '#0f172a',
  }

  const darkContentInputStyle = {
    width: '100%',
    padding: '0.65rem 0.9rem',
    borderRadius: '8px',
    border: '1px solid #94a3b8',
    background: '#f8fafc',
    color: '#0f172a',
    fontWeight: '600',
    fontSize: '0.875rem',
    outline: 'none',
    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
  }

  return (
    <div className="page narrow-page">
      {/* Horizontal Top Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.25rem 0', letterSpacing: '-0.5px' }}>
            Settings & Workspace Preferences
          </h1>
          <span style={{ color: '#334155', fontSize: '0.925rem', fontWeight: '500' }}>
            Control your Secure Digital Documentation Management System workspace and security preferences.
          </span>
        </div>
      </div>

      {/* Horizontal Tabs Bar (Flex Wrap to guarantee all tabs including System Preferences are always visible) */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.6rem',
        paddingBottom: '0.75rem',
        marginBottom: '1.75rem',
        borderBottom: '2px solid #cbd5e1',
      }}>
        {settingCategories.map(({ title, icon: Icon }) => {
          const active = activeTab === title
          return (
            <button
              key={title}
              onClick={() => setActiveTab(title)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.1rem',
                borderRadius: '8px',
                border: active ? '2px solid #1e3a8a' : '1px solid #cbd5e1',
                background: active ? '#1e3a8a' : '#ffffff',
                color: active ? '#ffffff' : '#1e293b',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                boxShadow: active ? '0 4px 12px rgba(30, 58, 138, 0.25)' : '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.2s ease'
              }}
            >
              <Icon size={16} color={active ? '#ffffff' : '#334155'} />
              <span>{title}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {/* PROFILE PANEL */}
          {activeTab === 'Profile' && (
            <form onSubmit={handleProfileSave} style={{ ...lightPanelStyle, padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Horizontal Subheading Banner */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                    fontWeight: '800',
                    color: '#ffffff',
                    boxShadow: '0 4px 12px rgba(30, 58, 138, 0.3)'
                  }}>
                    {profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: '800' }}>{profile.name}</h3>
                    <span style={{ color: '#475569', fontSize: '0.85rem', fontWeight: '600' }}>Official Officer Record & Assigned Profile</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <span style={{ fontSize: '0.75rem', padding: '4px 12px', borderRadius: '6px', background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd', fontWeight: '700' }}>
                    {profile.rank}
                  </span>
                  <span style={{ fontSize: '0.75rem', padding: '4px 12px', borderRadius: '6px', background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', fontWeight: '700' }}>
                    ID: {profile.badgeId}
                  </span>
                </div>
              </div>

              {/* Horizontal Form Fields Layout */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label style={{ display: 'grid', gridTemplateColumns: '200px 1fr', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: '#0f172a', fontWeight: '700' }}>
                  <span>Full Name</span>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={e => setProfile({ ...profile, name: e.target.value })}
                    style={darkContentInputStyle}
                  />
                </label>

                <label style={{ display: 'grid', gridTemplateColumns: '200px 1fr', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: '#334155', fontWeight: '700' }}>
                  <span>Police Rank (Assigned)</span>
                  <input
                    type="text"
                    disabled
                    value={profile.rank}
                    style={{ ...darkContentInputStyle, background: '#e2e8f0', color: '#475569', cursor: 'not-allowed', border: '1px solid #cbd5e1' }}
                  />
                </label>

                <label style={{ display: 'grid', gridTemplateColumns: '200px 1fr', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: '#334155', fontWeight: '700' }}>
                  <span>Email Address</span>
                  <input
                    type="email"
                    disabled
                    value={profile.email}
                    style={{ ...darkContentInputStyle, background: '#e2e8f0', color: '#475569', cursor: 'not-allowed', border: '1px solid #cbd5e1' }}
                  />
                </label>

                <label style={{ display: 'grid', gridTemplateColumns: '200px 1fr', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: '#334155', fontWeight: '700' }}>
                  <span>Mobile Contact</span>
                  <input
                    type="text"
                    disabled
                    value={profile.phone}
                    style={{ ...darkContentInputStyle, background: '#e2e8f0', color: '#475569', cursor: 'not-allowed', border: '1px solid #cbd5e1' }}
                  />
                </label>

                <label style={{ display: 'grid', gridTemplateColumns: '200px 1fr', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: '#0f172a', fontWeight: '700' }}>
                  <span>Police Station</span>
                  <input
                    type="text"
                    value={profile.policeStation}
                    onChange={e => setProfile({ ...profile, policeStation: e.target.value })}
                    style={darkContentInputStyle}
                  />
                </label>

                <label style={{ display: 'grid', gridTemplateColumns: '200px 1fr', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: '#0f172a', fontWeight: '700' }}>
                  <span>District</span>
                  <input
                    type="text"
                    value={profile.district}
                    onChange={e => setProfile({ ...profile, district: e.target.value })}
                    style={darkContentInputStyle}
                  />
                </label>

                <label style={{ display: 'grid', gridTemplateColumns: '200px 1fr', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: '#0f172a', fontWeight: '700' }}>
                  <span>State</span>
                  <input
                    type="text"
                    value={profile.state}
                    onChange={e => setProfile({ ...profile, state: e.target.value })}
                    style={darkContentInputStyle}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.7rem 1.4rem',
                    borderRadius: '8px',
                    background: '#152f59',
                    color: '#ffffff',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(21, 47, 89, 0.3)'
                  }}
                >
                  <Save size={16} />
                  {isUpdatingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          )}

          {/* SECURITY PANEL */}
          {activeTab === 'Security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              {/* Password Form */}
              <form onSubmit={handlePasswordChange} style={{ ...lightPanelStyle, padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {/* Horizontal Subheading Banner */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <LockKeyhole size={20} color="#1d4ed8" />
                    Change Account Password
                  </h3>
                  <span style={{ color: '#475569', fontSize: '0.85rem', fontWeight: '600' }}>
                    Ensure your account uses a strong password with letters, numbers, and symbols.
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                  <label style={{ display: 'grid', gridTemplateColumns: '200px 1fr', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: '#0f172a', fontWeight: '700' }}>
                    <span>Current Password</span>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <input
                        type={showCurrentPass ? 'text' : 'password'}
                        value={passwordForm.currentPassword}
                        onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        placeholder="••••••••"
                        style={{ ...darkContentInputStyle, paddingRight: '2.5rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}
                      >
                        {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </label>

                  <label style={{ display: 'grid', gridTemplateColumns: '200px 1fr', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: '#0f172a', fontWeight: '700' }}>
                    <span>New Password</span>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        placeholder="Min 8 characters"
                        style={{ ...darkContentInputStyle, paddingRight: '2.5rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}
                      >
                        {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </label>

                  <label style={{ display: 'grid', gridTemplateColumns: '200px 1fr', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: '#0f172a', fontWeight: '700' }}>
                    <span>Confirm New Password</span>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Repeat new password"
                      style={darkContentInputStyle}
                    />
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    disabled={isChangingPass}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.7rem 1.4rem',
                      borderRadius: '8px',
                      background: '#152f59',
                      color: '#ffffff',
                      fontWeight: '700',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(21, 47, 89, 0.3)'
                    }}
                  >
                    <LockKeyhole size={16} />
                    {isChangingPass ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>

              {/* 2FA & Biometrics */}
              <div style={{ ...lightPanelStyle, padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {/* Horizontal Subheading Banner */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <ShieldCheck size={20} color="#059669" />
                    Two-Factor Authentication & Biometrics
                  </h3>
                  <span style={{ color: '#475569', fontSize: '0.85rem', fontWeight: '600' }}>Multi-factor verification settings</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 0', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <b style={{ color: '#0f172a', fontSize: '0.95rem', minWidth: '180px' }}>Email & SMS 2FA</b>
                    <span style={{ color: '#475569', fontSize: '0.825rem', fontWeight: '500' }}>Require a 6-digit verification code sent to your email/mobile upon sign-in.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={mfaEnabled}
                    onChange={e => {
                      setMfaEnabled(e.target.checked)
                      notify('info', 'MFA Updated', `2FA is now ${e.target.checked ? 'enabled' : 'disabled'}.`)
                    }}
                    style={{ width: '20px', height: '20px', accentColor: '#1e3a8a', cursor: 'pointer' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <b style={{ color: '#0f172a', fontSize: '0.95rem', minWidth: '180px' }}>Biometric Face Auth</b>
                    <span style={{ color: '#475569', fontSize: '0.825rem', fontWeight: '500' }}>Enforce camera face scan verification for high-security document releases.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={faceAuthEnabled}
                    onChange={e => {
                      setFaceAuthEnabled(e.target.checked)
                      notify('info', 'Face Auth Updated', `Face verification is now ${e.target.checked ? 'enabled' : 'disabled'}.`)
                    }}
                    style={{ width: '20px', height: '20px', accentColor: '#1e3a8a', cursor: 'pointer' }}
                  />
                </div>
              </div>

              {/* Active Sessions */}
              <div style={{ ...lightPanelStyle, padding: '1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Laptop size={20} color="#7c3aed" />
                    Active Sessions & Devices
                  </h3>
                  <span style={{ color: '#475569', fontSize: '0.85rem', fontWeight: '600' }}>Manage logged-in devices</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                    <Laptop size={22} color="#2563eb" />
                    <div>
                      <b style={{ fontSize: '0.925rem', color: '#0f172a' }}>Current Web Session (Windows / Chrome)</b>
                      <span style={{ color: '#475569', fontSize: '0.8rem', marginLeft: '0.75rem', fontWeight: '500' }}>IP: 127.0.0.1 • Authenticated via Password + Face Auth</span>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '4px', background: '#dcfce7', color: '#15803d', fontWeight: '700', border: '1px solid #86efac' }}>Active Now</span>
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS PANEL */}
          {activeTab === 'Notification Preferences' && (
            <div style={{ ...lightPanelStyle, padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Horizontal Subheading Banner */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Bell size={20} color="#d97706" />
                  Notification & Alert Preferences
                </h3>
                <span style={{ color: '#475569', fontSize: '0.85rem', fontWeight: '600' }}>
                  Control automated alerts for case directives and security flags.
                </span>
              </div>

              {[
                ['emailAlerts', 'Email Notifications', 'Receive real-time email alerts for high priority updates.', Mail],
                ['smsAlerts', 'SMS Mobile Alerts', 'Get urgent SMS updates on assigned emergency cases.', Smartphone],
                ['caseAssignments', 'Case Assignments', 'Alert when assigned as lead or team member to a new FIR.', Shield],
                ['seniorDirectives', 'Senior Directives', 'Notify when SP, DIG, or IG posts instructions on a case.', User],
                ['securityFlags', 'Security Alerts', 'Immediate warning if a document hash integrity check fails.', AlertCircle],
                ['auditDigest', 'Weekly Audit Digest', 'Receive weekly summary report of workspace activity.', Archive],
              ].map(([key, label, desc, Icon]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 0', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                    <div style={{ padding: '10px', borderRadius: '8px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                      <Icon size={18} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                      <b style={{ color: '#0f172a', fontSize: '0.925rem', minWidth: '180px' }}>{label}</b>
                      <span style={{ color: '#475569', fontSize: '0.825rem', fontWeight: '500' }}>{desc}</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications[key]}
                    onChange={e => {
                      const updated = { ...notifications, [key]: e.target.checked }
                      setNotifications(updated)
                      notify('success', 'Preferences Saved', `${label} updated.`)
                    }}
                    style={{ width: '18px', height: '18px', accentColor: '#1e3a8a', cursor: 'pointer' }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* ACCESS CONTROL PANEL */}
          {activeTab === 'Access Control' && (
            <div style={{ ...lightPanelStyle, padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Horizontal Subheading Banner */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <KeyRound size={20} color="#7e22ce" />
                  Role Permissions & Access Matrix
                </h3>
                <span style={{ color: '#475569', fontSize: '0.85rem', fontWeight: '600' }}>Role-based access level and collaboration scope</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '1.25rem', borderRadius: '10px', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <b style={{ color: '#1e40af', fontSize: '0.975rem' }}>Assigned Rank: {profile.rank}</b>
                  <span style={{ color: '#1e3a8a', fontSize: '0.875rem', marginLeft: '1rem', fontWeight: '500' }}>
                    Permissions dynamically bound to police rank record in database.
                  </span>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <b style={{ color: '#0f172a', fontSize: '0.95rem' }}>Default Collaboration Scope</b>
                  <span style={{ color: '#475569', fontSize: '0.825rem', fontWeight: '500' }}>Scope applied when sharing files</span>
                </div>
                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                  {[
                    ['private', 'Strictly Private (Owner Only)'],
                    ['station', 'Station Level (Assigned Station)'],
                    ['district', 'District Wide (SP / DSP Scope)'],
                  ].map(([val, label]) => (
                    <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.875rem', color: '#0f172a', fontWeight: '700', background: '#f8fafc', padding: '0.65rem 1.1rem', borderRadius: '8px', border: defaultSharing === val ? '2px solid #1e3a8a' : '1px solid #cbd5e1' }}>
                      <input
                        type="radio"
                        name="defaultSharing"
                        value={val}
                        checked={defaultSharing === val}
                        onChange={() => {
                          setDefaultSharing(val)
                          notify('info', 'Default Scope Changed', label)
                        }}
                        style={{ accentColor: '#1e3a8a' }}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AUDIT SETTINGS PANEL */}
          {activeTab === 'Audit Settings' && (
            <div style={{ ...lightPanelStyle, padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Horizontal Subheading Banner */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Archive size={20} color="#0284c7" />
                  Audit Logging & Verification Policy
                </h3>
                <span style={{ color: '#475569', fontSize: '0.85rem', fontWeight: '600' }}>Security log retention & verification policy</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', alignItems: 'center', gap: '1rem' }}>
                <b style={{ color: '#0f172a', fontSize: '0.95rem' }}>Audit Log Retention</b>
                <select
                  value={logRetention}
                  onChange={e => {
                    setLogRetention(e.target.value)
                    notify('success', 'Retention Policy Updated', `Logs retained for ${e.target.value.replace('_', ' ')}.`)
                  }}
                  style={{ ...darkContentInputStyle, maxWidth: '340px' }}
                >
                  <option value="30_days">30 Days Retention</option>
                  <option value="90_days">90 Days Retention (Standard)</option>
                  <option value="1_year">1 Year Retention (High Security)</option>
                  <option value="permanent">Permanent (Indefinite Archive)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <b style={{ color: '#0f172a', fontSize: '0.95rem', minWidth: '220px' }}>Blockchain Auto-Verification</b>
                  <span style={{ color: '#475569', fontSize: '0.825rem', fontWeight: '500' }}>Periodically compare stored document SHA-256 hashes against ledger blocks.</span>
                </div>
                <input
                  type="checkbox"
                  checked={autoHashVerify}
                  onChange={e => {
                    setAutoHashVerify(e.target.checked)
                    notify('info', 'Verification Setting', `Automated hash verification ${e.target.checked ? 'enabled' : 'disabled'}.`)
                  }}
                  style={{ width: '20px', height: '20px', accentColor: '#1e3a8a', cursor: 'pointer' }}
                />
              </div>
            </div>
          )}

          {/* SYSTEM PREFERENCES PANEL */}
          {activeTab === 'System Preferences' && (
            <div style={{ ...lightPanelStyle, padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Horizontal Subheading Banner */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <SlidersHorizontal size={20} color="#e11d48" />
                  Workspace & UI Preferences
                </h3>
                <span style={{ color: '#475569', fontSize: '0.85rem', fontWeight: '600' }}>System language, theme & dashboard options</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label style={{ display: 'grid', gridTemplateColumns: '200px 1fr', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: '#0f172a', fontWeight: '700' }}>
                  <span>Language</span>
                  <select
                    value={language}
                    onChange={e => {
                      setLanguage(e.target.value)
                      notify('info', 'Language Updated', 'Language preference saved.')
                    }}
                    style={{ ...darkContentInputStyle, maxWidth: '320px' }}
                  >
                    <option value="en">English (Official Government Format)</option>
                    <option value="hi">Hindi (हिन्दी)</option>
                  </select>
                </label>

                <label style={{ display: 'grid', gridTemplateColumns: '200px 1fr', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: '#0f172a', fontWeight: '700' }}>
                  <span>Timezone Display</span>
                  <select
                    disabled
                    value="IST"
                    style={{ ...darkContentInputStyle, maxWidth: '320px', background: '#e2e8f0', color: '#475569', cursor: 'not-allowed' }}
                  >
                    <option value="IST">Indian Standard Time (IST, UTC+5:30)</option>
                  </select>
                </label>

                <label style={{ display: 'grid', gridTemplateColumns: '200px 1fr', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: '#0f172a', fontWeight: '700' }}>
                  <span>Dashboard Refresh Interval</span>
                  <select
                    value={refreshInterval}
                    onChange={e => {
                      setRefreshInterval(e.target.value)
                      notify('info', 'Refresh Interval', `Set to ${e.target.value} seconds.`)
                    }}
                    style={{ ...darkContentInputStyle, maxWidth: '320px' }}
                  >
                    <option value="15">15 Seconds (Real-time updates)</option>
                    <option value="30">30 Seconds (Default Standard)</option>
                    <option value="60">60 Seconds (Low Bandwidth)</option>
                  </select>
                </label>

                <label style={{ display: 'grid', gridTemplateColumns: '200px 1fr', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: '#0f172a', fontWeight: '700' }}>
                  <span>Auto-save Draft Interval</span>
                  <select
                    defaultValue="2_min"
                    onChange={() => notify('success', 'Auto-save Interval', 'Draft auto-save interval updated.')}
                    style={{ ...darkContentInputStyle, maxWidth: '320px' }}
                  >
                    <option value="1_min">Every 1 Minute</option>
                    <option value="2_min">Every 2 Minutes (Recommended)</option>
                    <option value="5_min">Every 5 Minutes</option>
                  </select>
                </label>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
