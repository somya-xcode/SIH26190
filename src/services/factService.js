/**
 * DocGuard – Case Fact Service (Phase 2)
 *
 * CRITICAL: Case facts are IMMUTABLE (append-only).
 * - No delete operation exists.
 * - When new information corrects a fact, a NEW record is created
 *   linked to the original via parentFactId.
 * - Original facts are preserved permanently.
 */

import { db } from './mockCaseData'
import { hasPermission, PERMISSIONS } from './accessControl'
import { caseService } from './caseService'
import { auditService, AUDIT_ACTIONS } from './auditService'

export const factService = {
  /**
   * Get all case facts.
   */
  getFacts(user, caseId) {
    caseService.getCaseById(user, caseId)
    return db.getFacts(caseId)
  },

  /**
   * Add a new investigation fact.
   */
  addFact(user, caseId, data) {
    if (!hasPermission(user, PERMISSIONS.ADD_CASE_FACT)) {
      auditService.recordDenied({ user, action: AUDIT_ACTIONS.RESTRICTED_ACCESS_ATTEMPT, resourceType: 'CASE_FACT', caseId, reason: 'Case fact permission is required.' })
      throw new Error('Access denied: You do not have permission to add case facts.')
    }
    caseService.getCaseById(user, caseId)

    const { factText, source, confidence } = data
    if (!factText?.trim()) throw new Error('Fact text is required')

    const fact = db.addFact({
      caseId,
      factText: factText.trim(),
      createdBy: user.id,
      source: source?.trim() || '',
      confidence: confidence || 'REPORTED',
    })
    auditService.record({ action: AUDIT_ACTIONS.FACT_ADDED, user, resourceType: 'CASE_FACT', resourceId: fact.id, caseId, details: 'Investigation fact appended.' })
    return fact
  },

  /**
   * Add a correction or new information that updates an existing fact.
   * DOES NOT modify the original fact. Creates a new linked record.
   */
  addFactCorrection(user, caseId, parentFactId, data) {
    if (!hasPermission(user, PERMISSIONS.ADD_CASE_FACT)) {
      auditService.recordDenied({ user, action: AUDIT_ACTIONS.RESTRICTED_ACCESS_ATTEMPT, resourceType: 'CASE_FACT', resourceId: parentFactId, caseId, reason: 'Case fact correction permission is required.' })
      throw new Error('Access denied: You do not have permission to add case facts.')
    }
    caseService.getCaseById(user, caseId)

    const parent = db.getFactById(parentFactId)
    if (!parent) throw new Error('Original fact not found')
    if (parent.caseId !== caseId) throw new Error('Fact does not belong to this case')

    const { factText, source, confidence, changeReason } = data
    if (!factText?.trim()) throw new Error('New fact text is required')
    if (!changeReason?.trim()) throw new Error('Reason for correction is required')

    const fact = db.addFactCorrection(parentFactId, {
      factText: factText.trim(),
      createdBy: user.id,
      source: source?.trim() || parent.source,
      confidence: confidence || 'REPORTED',
      changeReason: changeReason.trim(),
    })
    auditService.record({ action: AUDIT_ACTIONS.FACT_CORRECTED, user, resourceType: 'CASE_FACT', resourceId: fact.id, caseId, details: fact.changeReason })
    return fact
  },

  /**
   * Get the version chain for a fact (original + all corrections).
   */
  getFactHistory(user, caseId, factId) {
    caseService.getCaseById(user, caseId)
    return db.getFactHistory(factId)
  },

  // NOTE: deleteFact() does NOT exist — by design.
  // Case facts are immutable and must never be permanently removed.
}
