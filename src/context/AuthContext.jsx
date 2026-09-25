import React, { createContext, useContext, useEffect, useState } from 'react'
import { authService } from '../services/authService'
import { auditService, AUDIT_ACTIONS } from '../services/auditService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentRoute, setCurrentRoute] = useState(() => {
    return window.location.pathname || '/'
  })

  // Hydrate session from storage on initial load
  useEffect(() => {
    try {
      const stored = authService.getStoredSession()
      if (stored && stored.isAuthenticated) {
        setSession(stored)
      }
    } catch (e) {
      console.error('Session hydration error:', e)
    } finally {
      setLoading(false)
    }

    // Synchronize browser history / popstate
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname || '/')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Navigation helper
  const navigate = (path) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path)
    }
    setCurrentRoute(path)
  }

  /**
   * Complete 2FA login.
   */
  const login = async (userId, password, faceVerification) => {
    const newSession = await authService.completeLogin({
      userId,
      password,
      faceVerification,
    })
    setSession(newSession)
    navigate('/')
    return newSession
  }

  // Logout
  const logout = () => {
    auditService.record({ action: AUDIT_ACTIONS.LOGOUT, user: session?.user, details: 'User session ended.' })
    authService.clearSession()
    setSession(null)
    navigate('/login')
  }

  const value = {
    session,
    user: session?.user || null,
    isAuthenticated: !!session?.isAuthenticated,
    // Phase 2: expose permissions and access level from authenticated DB record
    permissions: session?.permissions || [],
    accessLevel: session?.accessLevel || 0,
    rank: session?.rank || null,
    selectedPosition: session?.selectedPosition || null,
    positionVerification: session?.positionVerification || null,
    loading,
    currentRoute,
    navigate,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
