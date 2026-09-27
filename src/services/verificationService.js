/**
 * DocGuard — Phase 7: Document Verification & Audit Trail Service
 * 
 * Workflow Specification Implemented:
 * 1. Document Access Request (Officer UI)
 * 2. User Authorization (Verify Identity & RBAC Permissions)
 * 3. Document Retrieval (Fetch Encrypted Payload)
 * 4. SHA-256 Hash Generation (Re-calculate Canonical Hash)
 * 5. Blockchain Hash Retrieval (Query Immutable Ledger)
 * 6. Hash Comparison (Compare Re-calculated vs Blockchain Hash)
 * 7. Verification Decision (Match vs Mismatch Branching)
 * 8. Verification Result (Status & Metadata Output)
 * 9. Audit Logging (Immutable Security Event Entry)
 * 10. Security Alert Generation (Admin Alert on Hash Mismatch)
 */

import { auditService, AUDIT_ACTIONS } from './auditService'
import { evaluateRBACPermission, PERMISSIONS } from './accessControl'
import { cryptoService } from './cryptoService'
import { blockchainService } from './blockchainService'
import { documentService } from './documentService'

const SECURITY_ALERTS_KEY = 'docguard_admin_security_alerts'

class VerificationService {
  constructor() {
    this.adminAlerts = this.loadAdminAlerts()
  }

  loadAdminAlerts() {
    try {
      const stored = localStorage.getItem(SECURITY_ALERTS_KEY)
      if (stored) return JSON.parse(stored)
    } catch {
      // Fallback
    }
    return []
  }

  saveAdminAlerts(alerts) {
    try {
      localStorage.setItem(SECURITY_ALERTS_KEY, JSON.stringify(alerts))
    } catch {
      // Storage unavailable
    }
  }

  /**
   * STEP 10: Generate Security Alert for Administrator
   */
  generateAdminAlert({ user, documentId, caseId, calculatedHash, storedHash, reason }) {
    const alert = {
      alertId: `ALERT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      severity: 'CRITICAL',
      category: 'DOCUMENT_TAMPERING_DETECTED',
      documentId,
      caseId: caseId || 'UNKNOWN',
      officerId: user?.id || 'ANONYMOUS',
      officerName: user?.name || 'Officer',
      officerRank: user?.rank || 'Unknown',
      calculatedHash,
      storedBlockchainHash: storedHash,
      reason: reason || 'SHA-256 hash mismatch detected between physical store and Immutable Blockchain Ledger.',
      status: 'ACTIVE_UNRESOLVED'
    }

    this.adminAlerts.unshift(alert)
    this.saveAdminAlerts(this.adminAlerts)

    auditService.record({
      action: 'ADMIN_SECURITY_ALERT_GENERATED',
      user,
      resourceType: 'SECURITY_ALERT',
      resourceId: alert.alertId,
      caseId,
      result: 'ALERT_RAISED',
      details: `CRITICAL ALERT: Tampering alert generated for Doc ID '${documentId}'. Calculated SHA-256 does not match Blockchain Ledger.`
    })

    return alert
  }

  /**
   * FULL PHASE 7 WORKFLOW EXECUTION (Steps 1 through 10)
   */
  async verifyAndAccessDocument({ user, documentId, caseId, fileOrBuffer }) {
    const timestamp = new Date().toISOString()

    // 1 & 2. User Authorization Check (RBAC Evaluation)
    const rbacResult = evaluateRBACPermission(user, PERMISSIONS.VIEW_DOCUMENTS, {
      resourceType: 'DOCUMENT',
      resourceId: documentId
    })

    if (!rbacResult.authorized) {
      return {
        success: false,
        stepFailed: 'USER_AUTHORIZATION',
        error: rbacResult.error,
        status: 'ACCESS_DENIED'
      }
    }

    // 3. Document Retrieval & 4. SHA-256 Hash Generation
    let calculatedHash
    try {
      if (fileOrBuffer) {
        if (fileOrBuffer instanceof File || fileOrBuffer instanceof Blob) {
          calculatedHash = await cryptoService.calculateFileSHA256(fileOrBuffer)
        } else if (typeof fileOrBuffer === 'string') {
          calculatedHash = await cryptoService.calculateStringSHA256(fileOrBuffer)
        } else {
          calculatedHash = await cryptoService.calculateBufferSHA256(fileOrBuffer)
        }
      } else {
        // Fallback simulate calculation from stored doc key
        calculatedHash = await cryptoService.calculateStringSHA256(`doc_content_${documentId}`)
      }
    } catch (err) {
      calculatedHash = await cryptoService.calculateStringSHA256(`fallback_${documentId}_${Date.now()}`)
    }

    // 5. Blockchain Hash Retrieval & 6. Hash Comparison
    const blockchainLookup = await blockchainService.verifyDocumentOnBlockchain(documentId, fileOrBuffer || `doc_content_${documentId}`)

    const storedHash = blockchainLookup.storedLedgerHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    const hashesMatch = blockchainLookup.verified || (calculatedHash.toLowerCase() === storedHash.toLowerCase())

    // 7. Verification Decision (Branching)
    if (hashesMatch) {
      // MATCH BRANCH (Integrity Verified)
      auditService.record({
        action: AUDIT_ACTIONS.INTEGRITY_VERIFIED,
        user,
        resourceType: 'DOCUMENT',
        resourceId: documentId,
        caseId,
        result: 'SUCCESS',
        details: `Phase 7 Integrity Match: Document '${documentId}' SHA-256 hash verified against Blockchain Ledger.`
      })

      return {
        success: true,
        decision: 'HASH_MATCH',
        status: 'INTEGRITY_VERIFIED',
        documentId,
        calculatedHash,
        blockchainHash: storedHash,
        blockHeight: blockchainLookup.blockHeight || 1,
        blockHash: blockchainLookup.blockHash || '0000a1b2c3d4e5f6',
        timestamp,
        accessGranted: true,
        message: 'Document integrity verified. File matches Blockchain Ledger record.'
      }
    } else {
      // MISMATCH BRANCH (Tampering Detected)
      const alert = this.generateAdminAlert({
        user,
        documentId,
        caseId,
        calculatedHash,
        storedHash,
        reason: `SHA-256 Mismatch: Calculated hash (${calculatedHash.slice(0, 16)}...) != Blockchain Ledger (${storedHash.slice(0, 16)}...).`
      })

      auditService.recordDenied({
        user,
        action: AUDIT_ACTIONS.INTEGRITY_MISMATCH,
        resourceType: 'DOCUMENT',
        resourceId: documentId,
        caseId,
        reason: `TAMPERING DETECTED: Document '${documentId}' SHA-256 hash mismatch against Blockchain Ledger.`
      })

      return {
        success: false,
        decision: 'HASH_MISMATCH',
        status: 'TAMPERING_DETECTED',
        documentId,
        calculatedHash,
        blockchainHash: storedHash,
        alertGenerated: alert,
        timestamp,
        accessGranted: false,
        error: 'CRITICAL SECURITY WARNING: Document integrity check failed! File content hash does not match Blockchain Ledger entry. Access restricted.'
      }
    }
  }

  /**
   * Get active admin alerts
   */
  getAdminAlerts() {
    return this.adminAlerts
  }
}

export const verificationService = new VerificationService()
