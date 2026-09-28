/**
 * DocGuard - Authentication Service
 * Phase 1: Two-Factor Authentication (Credentials + Biometric Face Verification)
 * Phase 2: Extended with rank/role/permissions for RBAC + ABAC
 *
 * CRITICAL SECURITY RULE:
 *   The position selected on the login page is NEVER used for authorization.
 *   Real rank and permissions come from the authenticated database record (mockUsers).
 *
 * Implements clean abstraction for authentication logic.
 * Supports mock development data while providing integration points for backend APIs.
 */

import { mockUsers } from './mockCaseData'
import { FUNCTIONAL_ROLES, getPermissionsForRank, getRankAccessLevel } from './accessControl'
import { auditService, AUDIT_ACTIONS } from './auditService'

const STORAGE_KEY = 'docguard_auth_session'
export const LOCAL_USERS_STORAGE_KEY = 'docguard_local_users'

// Credential lookup table (passwords only — full profile loaded from mockUsers)
const MOCK_CREDENTIALS = [
  { id: 'demo.investigator', password: 'Demo@12345' },
  { id: 'pranshu.kumar', password: 'Pranshu@123' },
  { id: 'a.singh', password: 'Legal@123' },
  { id: 'r.mehta', password: 'Forensic@123' },
  { id: 'sp.sharma', password: 'District@123' },
  { id: 'constable.test', password: 'Constable@123' },
]

function getLocalUsers() {
  try {
    const stored = localStorage.getItem(LOCAL_USERS_STORAGE_KEY)
    const users = stored ? JSON.parse(stored) : []
    return Array.isArray(users) ? users : []
  } catch {
    return []
  }
}

function findUser(userId) {
  const normalizedId = userId.trim().toLowerCase()
  return [...mockUsers, ...getLocalUsers()].find(user => user.id.toLowerCase() === normalizedId)
}

function findUserByPhone(phone) {
  const digits = (phone || '').replace(/\D/g, '')
  if (!digits) return null
  return [...mockUsers, ...getLocalUsers()].find(u => {
    const uDigits = (u.phone || '').replace(/\D/g, '')
    return uDigits && (uDigits === digits || uDigits.slice(-10) === digits.slice(-10))
  })
}

export const authService = {
  userExists(userId) {
    return Boolean(userId && findUser(userId))
  },

  registerLocalUser({ id, password, name, phone, rank, biometricToken }) {
    const normalizedId = id.trim().toLowerCase()
    if (this.userExists(normalizedId)) {
      throw new Error('That username is already registered. Please choose another username.')
    }

    const localUser = {
      id: normalizedId,
      password,
      name: name.trim(),
      role: rank,
      functionalRole: FUNCTIONAL_ROLES.INVESTIGATION_OFFICER,
      rank,
      accessLevel: getRankAccessLevel(rank),
      department: 'Investigation Services',
      policeStation: 'Assigned Police Station',
      jurisdiction: 'India',
      phone: phone.trim(),
      initials: name.trim().split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase(),
      enrolledBiometrics: true,
      biometricToken,
      permissions: getPermissionsForRank(rank),
    }

    const users = getLocalUsers()
    localStorage.setItem(LOCAL_USERS_STORAGE_KEY, JSON.stringify([...users, localUser]))
    return localUser
  },

  /**
   * Validate User ID and Password without exposing which field failed.
   * Returns full sanitized user profile from mockUsers (Phase 2 extended data).
   */
  async validateCredentials(userId, password) {
    // Simulate brief network latency
    await new Promise(resolve => setTimeout(resolve, 350))

    if (!userId || !password) {
      auditService.record({ action: AUDIT_ACTIONS.LOGIN_FAILURE, actorId: userId?.trim().toLowerCase(), result: 'FAILURE', details: 'Login rejected because required credentials were missing.' })
      throw new Error('Please enter both User ID and password.')
    }

    const trimmedId = userId.trim().toLowerCase()

    // Step 1: Verify credentials
    const cred = MOCK_CREDENTIALS.find(
      u => u.id.toLowerCase() === trimmedId && u.password === password
    )
    const localUser = getLocalUsers().find(
      u => u.id.toLowerCase() === trimmedId && u.password === password
    )

    if (!cred && !localUser) {
      auditService.record({ action: AUDIT_ACTIONS.LOGIN_FAILURE, actorId: trimmedId, result: 'FAILURE', details: 'Invalid credentials supplied.' })
      // Intentionally generic security error message
      throw new Error('Invalid User ID or password.')
    }

    // Step 2: Load full user profile from Phase 2 data store (ABAC data)
    const fullUser = findUser(trimmedId)
    if (!fullUser) {
      auditService.record({ action: AUDIT_ACTIONS.LOGIN_FAILURE, actorId: trimmedId, result: 'FAILURE', details: 'Credential matched but no user profile was available.' })
      throw new Error('User profile not found. Contact system administrator.')
    }

    // Return public user data without password
    const { password: _, ...safeUser } = fullUser
    safeUser.permissions = getPermissionsForRank(safeUser.rank)
    safeUser.accessLevel = getRankAccessLevel(safeUser.rank)
    return safeUser
  },

  /**
   * Complete 2FA login requiring BOTH valid credentials AND face verification.
   */
  async completeLogin({ userId, password, faceVerification, selectedPosition }) {
    // 1. Validate credentials and get full user profile
    const safeUser = await this.validateCredentials(userId, password)

    // 2. Validate face verification factor
    if (
      !faceVerification ||
      !faceVerification.verified ||
      faceVerification.officerId?.trim().toLowerCase() !== safeUser.id.trim().toLowerCase()
    ) {
      auditService.record({ action: AUDIT_ACTIONS.BIOMETRIC_FAILURE, user: safeUser, result: 'FAILURE', details: 'Face authentication factor was not completed.' })
      throw new Error('Face authentication required for this User ID. Please complete face scan.')
    }

    // 3. Construct authenticated session object
    const session = {
      isAuthenticated: true,
      user: safeUser, // Full user profile with permissions from DB
      authenticationMethod: {
        password: true,
        face: true,
      },
      faceBiometricToken: faceVerification.biometricToken || 'mock_bio_token_' + Date.now(),
      loginTime: new Date().toISOString(),
      selectedPosition: safeUser.rank,
      permissions: safeUser.permissions || [],
      accessLevel: safeUser.accessLevel,
      rank: safeUser.rank, // Authoritative rank from DB
    }

    this.setStoredSession(session)
    auditService.record({ action: AUDIT_ACTIONS.LOGIN_SUCCESS, user: safeUser, details: 'Password and face authentication completed.' })
    return session
  },

  /**
   * Complete Login via Verified Phone Number OTP & Face Verification
   */
  async loginWithPhoneOtp({ phone, otpSessionId, faceVerification }) {
    const user = findUserByPhone(phone)
    if (!user) {
      throw new Error('No registered officer account found matching this phone number.')
    }

    if (!faceVerification || !faceVerification.verified) {
      auditService.record({ action: AUDIT_ACTIONS.BIOMETRIC_FAILURE, user, result: 'FAILURE', details: 'Face authentication factor was not completed.' })
      throw new Error('Face authentication required. Please scan your face to complete identity verification.')
    }

    const { password: _, ...safeUser } = user
    safeUser.permissions = getPermissionsForRank(safeUser.rank)
    safeUser.accessLevel = getRankAccessLevel(safeUser.rank)

    const session = {
      isAuthenticated: true,
      user: safeUser,
      authenticationMethod: {
        phoneOtp: true,
        face: true,
      },
      faceBiometricToken: faceVerification.biometricToken || 'mock_bio_token_' + Date.now(),
      loginTime: new Date().toISOString(),
      selectedPosition: safeUser.rank,
      permissions: safeUser.permissions || [],
      accessLevel: safeUser.accessLevel,
      rank: safeUser.rank,
    }

    this.setStoredSession(session)
    auditService.record({ action: AUDIT_ACTIONS.LOGIN_SUCCESS, user: safeUser, details: 'Phone SMS OTP and face authentication completed.' })
    return session
  },

  /**
   * Retrieve active session from storage
   */
  getStoredSession() {
    try {
      const data = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY)
      if (!data) return null
      const parsed = JSON.parse(data)
      if (parsed && parsed.isAuthenticated && parsed.user) {
        return parsed
      }
    } catch {
      // Ignore parse errors and return null
    }
    return null
  },

  /**
   * Save session to storage
   */
  setStoredSession(session) {
    try {
      const serialized = JSON.stringify(session)
      sessionStorage.setItem(STORAGE_KEY, serialized)
      localStorage.setItem(STORAGE_KEY, serialized)
    } catch {
      // Storage unavailable or disabled
    }
  },

  /**
   * Terminate session and remove credentials from storage
   */
  clearSession() {
    try {
      sessionStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Storage unavailable
    }
  },

}
