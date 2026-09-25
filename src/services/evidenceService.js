/**
 * DocGuard – Evidence Service (Phase 2)
 *
 * CRITICAL: Evidence records are IMMUTABLE.
 * - No delete operation exists.
 * - Corrections create a new version record linked to the original.
 * - Original records are preserved permanently.
 */

import { db } from './mockCaseData'
import { hasPermission, PERMISSIONS, canAccessCase } from './accessControl'
import { caseService } from './caseService'
import { auditService, AUDIT_ACTIONS } from './auditService'

export const evidenceService = {
  /**
   * Get all evidence for a case.
   */
  getEvidence(user, caseId) {
    caseService.getCaseById(user, caseId) // authorization check
    return db.getEvidence(caseId)
  },

  /**
   * Get evidence grouped by evidence number (showing version history).
   */
  getEvidenceWithHistory(user, caseId) {
    const evidence = this.getEvidence(user, caseId)
    const grouped = {}
    evidence.forEach(ev => {
      if (!grouped[ev.evidenceNumber]) grouped[ev.evidenceNumber] = []
      grouped[ev.evidenceNumber].push(ev)
    })
    // Sort versions descending (latest first) within each group
    Object.values(grouped).forEach(versions => versions.sort((a, b) => b.version - a.version))
    return grouped
  },

  /**
   * Add new evidence to a case.
   */
  addEvidence(user, caseId, data) {
    if (!hasPermission(user, PERMISSIONS.ADD_EVIDENCE)) {
      auditService.recordDenied({ user, action: AUDIT_ACTIONS.RESTRICTED_ACCESS_ATTEMPT, resourceType: 'EVIDENCE', caseId, reason: 'Evidence entry permission is required.' })
      throw new Error('Access denied: You do not have permission to add evidence.')
    }
    caseService.getCaseById(user, caseId) // authorization check

    const { evidenceType, description, source, collectedBy, collectionDate, location, classification } = data
    if (!description?.trim()) throw new Error('Evidence description is required')
    if (!evidenceType) throw new Error('Evidence type is required')
    if (!collectionDate) throw new Error('Collection date is required')

    // Generate evidence number
    const existing = db.getEvidence(caseId)
    const maxNum = existing.reduce((max, e) => {
      const num = parseInt(e.evidenceNumber.replace('E-', '')) || 0
      return Math.max(max, num)
    }, 0)
    const evidenceNumber = `E-${String(maxNum + 1).padStart(3, '0')}`

    const evidence = db.addEvidence({
      caseId,
      evidenceNumber,
      evidenceType,
      description: description.trim(),
      source: source?.trim() || '',
      collectedBy: collectedBy || user.id,
      collectionDate,
      location: location?.trim() || '',
      submittedBy: user.id,
      classification: classification || 'INTERNAL',
      storageRef: null,
      status: 'ACTIVE',
      parentEvidenceId: null,
      version: 1,
      changeReason: null,
    })
    auditService.record({ action: AUDIT_ACTIONS.EVIDENCE_ADDED, user, resourceType: 'EVIDENCE', resourceId: evidence.id, resourceLabel: evidence.evidenceNumber, caseId, details: 'Evidence record appended.' })
    return evidence
  },

  /**
   * Add a correction/update to existing evidence.
   * DOES NOT modify the original record. Creates a new version.
   */
  addEvidenceCorrection(user, caseId, parentEvidenceId, data) {
    if (!hasPermission(user, PERMISSIONS.ADD_EVIDENCE)) {
      auditService.recordDenied({ user, action: AUDIT_ACTIONS.RESTRICTED_ACCESS_ATTEMPT, resourceType: 'EVIDENCE', resourceId: parentEvidenceId, caseId, reason: 'Evidence correction permission is required.' })
      throw new Error('Access denied: You do not have permission to update evidence records.')
    }
    caseService.getCaseById(user, caseId)

    const parent = db.getEvidenceById(parentEvidenceId)
    if (!parent) throw new Error('Original evidence record not found')
    if (parent.caseId !== caseId) throw new Error('Evidence does not belong to this case')

    const { description, source, changeReason } = data
    if (!description?.trim()) throw new Error('Updated description is required')
    if (!changeReason?.trim()) throw new Error('Reason for correction is required')

    const evidence = db.addEvidenceVersion(parentEvidenceId, {
      description: description.trim(),
      source: source?.trim() || parent.source,
      collectedBy: parent.collectedBy,
      collectionDate: parent.collectionDate,
      location: parent.location,
      submittedBy: user.id,
      classification: parent.classification,
      storageRef: parent.storageRef,
      status: 'ACTIVE',
      changeReason: changeReason.trim(),
    })
    auditService.record({ action: AUDIT_ACTIONS.EVIDENCE_CORRECTED, user, resourceType: 'EVIDENCE', resourceId: evidence.id, resourceLabel: evidence.evidenceNumber, caseId, details: evidence.changeReason })
    return evidence
  },

  /**
   * Change evidence status (SUPERSEDED, WITHDRAWN, ARCHIVED, INVALIDATED).
   * This is NOT deletion — the record is preserved with a status change.
   */
  changeEvidenceStatus(user, evidenceId, newStatus, reason) {
    if (!hasPermission(user, PERMISSIONS.REVIEW_RECORDS)) {
      throw new Error('Access denied: Insufficient permissions to change evidence status.')
    }
    const evidence = db.getEvidenceById(evidenceId)
    if (!evidence) throw new Error('Evidence not found')
    // Status-only update — record preserved
    evidence.status = newStatus
    evidence.statusChangedBy = user.id
    evidence.statusChangeReason = reason
    evidence.statusChangedAt = new Date().toISOString()
    return evidence
  },

  // NOTE: deleteEvidence() does NOT exist — by design.
  // Evidence records are immutable and must never be permanently removed.
}
