/**
 * DocGuard – Phase 5 audit trail service.
 *
 * Audit events are append-only and intentionally contain no file contents or
 * credentials.  This is the frontend/mock equivalent of a write-once security
 * event store and keeps the service boundary ready for a backend API.
 */
import { db } from './mockCaseData'
import { canViewSecurityDashboard, hasPermission, PERMISSIONS } from './accessControl'

export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  BIOMETRIC_FAILURE: 'BIOMETRIC_FAILURE',
  DOCUMENT_UPLOAD: 'DOCUMENT_UPLOAD',
  DOCUMENT_VERSION_CREATED: 'DOCUMENT_VERSION_CREATED',
  DOCUMENT_VIEW: 'DOCUMENT_VIEW',
  DOCUMENT_DOWNLOAD: 'DOCUMENT_DOWNLOAD',
  DOCUMENT_SHARED: 'DOCUMENT_SHARED',
  INTEGRITY_VERIFIED: 'INTEGRITY_VERIFIED',
  INTEGRITY_MISMATCH: 'INTEGRITY_MISMATCH',
  DOCUMENT_STATUS_CHANGED: 'DOCUMENT_STATUS_CHANGED',
  CASE_CREATED: 'CASE_CREATED',
  CASE_STATUS_CHANGED: 'CASE_STATUS_CHANGED',
  CASE_OFFICER_ASSIGNED: 'CASE_OFFICER_ASSIGNED',
  EVIDENCE_ADDED: 'EVIDENCE_ADDED',
  EVIDENCE_CORRECTED: 'EVIDENCE_CORRECTED',
  STATEMENT_ADDED: 'STATEMENT_ADDED',
  STATEMENT_SUPPLEMENTED: 'STATEMENT_SUPPLEMENTED',
  FACT_ADDED: 'FACT_ADDED',
  FACT_CORRECTED: 'FACT_CORRECTED',
  INVESTIGATION_UPDATE_ADDED: 'INVESTIGATION_UPDATE_ADDED',
  RESTRICTED_ACCESS_ATTEMPT: 'RESTRICTED_ACCESS_ATTEMPT',
}

const categoryFor = action => {
  if (action.startsWith('LOGIN') || action === AUDIT_ACTIONS.LOGOUT || action === AUDIT_ACTIONS.BIOMETRIC_FAILURE) return 'AUTHENTICATION'
  if (action.startsWith('DOCUMENT') || action.startsWith('INTEGRITY')) return 'DOCUMENT'
  if (action.startsWith('CASE') || action.startsWith('EVIDENCE') || action.startsWith('STATEMENT') || action.startsWith('FACT') || action.startsWith('INVESTIGATION')) return 'CASE'
  if (action === AUDIT_ACTIONS.RESTRICTED_ACCESS_ATTEMPT) return 'ACCESS'
  return 'SYSTEM'
}

const actorName = actorId => db.getUserById(actorId)?.name || actorId || 'Anonymous'
const actorRank = (actorId, user) => user?.rank || db.getUserById(actorId)?.rank || 'Unknown'

export const auditService = {
  record({ action, user, actorId, resourceType, resourceId, resourceLabel, caseId, result = 'SUCCESS', details = '', reason, metadata = {} }) {
    return db.addAuditLog({
      action,
      category: categoryFor(action),
      actorId: actorId || user?.id || 'anonymous',
      actorName: actorName(actorId || user?.id),
      actorRank: actorRank(actorId || user?.id, user),
      resourceType,
      resourceId,
      resourceLabel,
      caseId,
      result,
      details,
      reason,
      metadata,
      // Browser metadata is deliberately coarse; no sensitive payload is stored.
      ipAddress: metadata.ipAddress || 'mock-client',
      device: metadata.device || (typeof navigator !== 'undefined' ? navigator.userAgent.split(' ').slice(0, 2).join(' ') : 'Mock client'),
    })
  },

  recordDenied({ user, action = AUDIT_ACTIONS.RESTRICTED_ACCESS_ATTEMPT, resourceType, resourceId, resourceLabel, caseId, reason }) {
    return this.record({
      action,
      user,
      resourceType,
      resourceId,
      resourceLabel,
      caseId,
      result: 'DENIED',
      reason,
      details: reason || 'Access denied by authorization policy',
    })
  },

  canView(user) {
    return canViewSecurityDashboard(user)
  },

  getLogs(user, filters = {}) {
    if (!this.canView(user)) {
      this.recordDenied({ user, resourceType: 'AUDIT_LOG', reason: 'Security dashboard access requires supervisor or auditor authorization.' })
      throw new Error('Access denied: Security audit records are restricted to authorized supervisors and auditors.')
    }
    return db.getAuditLogs(filters).map(event => ({
      ...event,
      actorName: event.actorName || actorName(event.actorId),
    }))
  },

  // Friendly aliases for consumers that refer to the ledger as a trail/events.
  getAuditTrail(user, filters = {}) {
    return this.getLogs(user, filters)
  },
  getEvents(user, filters = {}) {
    return this.getLogs(user, filters)
  },

  getSummary(user, filters = {}) {
    const logs = this.getLogs(user, filters)
    return {
      total: logs.length,
      successful: logs.filter(log => log.result === 'SUCCESS').length,
      denied: logs.filter(log => log.result === 'DENIED' || log.result === 'FAILURE').length,
      integrityEvents: logs.filter(log => log.action.startsWith('INTEGRITY')).length,
      restrictedAttempts: logs.filter(log => log.action === AUDIT_ACTIONS.RESTRICTED_ACCESS_ATTEMPT).length,
    }
  },

  exportCsv(user, filters = {}) {
    if (!hasPermission(user, PERMISSIONS.EXPORT_AUDIT_LOG) && !this.canView(user)) {
      this.recordDenied({ user, resourceType: 'AUDIT_LOG', reason: 'Audit export permission required.' })
      throw new Error('Access denied: Audit export permission required.')
    }
    const logs = this.getLogs(user, filters)
    const columns = ['timestamp', 'actorName', 'action', 'category', 'resourceLabel', 'result', 'details']
    return [columns.join(','), ...logs.map(log => columns.map(column => `"${String(log[column] || '').replace(/"/g, '""')}"`).join(','))].join('\n')
  },
}
