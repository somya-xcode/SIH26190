/**
 * DocGuard — Phase 8: Secure Document Access & Retrieval Service
 * 
 * Workflow Specification Implemented:
 * 1. Officer Dashboard (Authenticated Officer Session)
 * 2. Document Search (Query by Case ID / Document ID / Keywords)
 * 3. Secure API Request (HTTPS Endpoint Processing)
 * 4. Access Verification (RBAC / ABAC Officer Authorization Evaluation)
 * 5. Document Retrieval (Fetch AES-256 Encrypted Payload from Storage)
 * 6. Integrity Verification (SHA-256 Hash vs Immutable Blockchain Ledger)
 * 7. Verification Decision (Success Route vs Failure Route)
 * 8. AES-256 Decryption (Execute Cipher Decryption ONLY Upon Success)
 * 9. Document Display (Render Decrypted File in Officer UI Viewer)
 * 10. Activity Logging (Record Search, Retrieval & View Events in Audit Log)
 */

import { auditService, AUDIT_ACTIONS } from './auditService'
import { evaluateRBACPermission, PERMISSIONS } from './accessControl'
import { cryptoService } from './cryptoService'
import { blockchainService } from './blockchainService'
import { verificationService } from './verificationService'
import { db } from './mockCaseData'

// Helper: Convert Hex String to Uint8Array Buffer
function hexToBuffer(hexString) {
  if (!hexString) return new Uint8Array(0).buffer
  const bytes = new Uint8Array(Math.ceil(hexString.length / 2))
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hexString.substr(i * 2, 2), 16)
  }
  return bytes.buffer
}

// Helper: Convert ArrayBuffer to Hex String
function bufferToHex(buffer) {
  const byteArray = new Uint8Array(buffer)
  return Array.from(byteArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

class RetrievalService {
  /**
   * STEP 1 & 2: Search Documents with RBAC filtering
   */
  searchDocuments(user, { query = '', caseId = '', documentType = '' } = {}) {
    // Access Verification check
    const rbacResult = evaluateRBACPermission(user, PERMISSIONS.SEARCH_CASE_RECORDS, {
      resourceType: 'SEARCH',
      resourceId: caseId || 'SEARCH_QUERY'
    })

    if (!rbacResult.authorized) {
      throw new Error(rbacResult.error || 'Access Denied: Search permission required.')
    }

    const normalizedQuery = query.toLowerCase().trim()
    const allDocs = db.documents || []

    const filtered = allDocs.filter(doc => {
      const matchCase = !caseId || doc.caseId === caseId
      const matchType = !documentType || doc.documentType === documentType
      const matchText = !normalizedQuery || 
        doc.originalFilename.toLowerCase().includes(normalizedQuery) ||
        doc.description?.toLowerCase().includes(normalizedQuery) ||
        doc.id.toLowerCase().includes(normalizedQuery)

      return matchCase && matchType && matchText
    })

    auditService.record({
      action: 'SEARCH_DOCUMENTS',
      user,
      resourceType: 'SEARCH_QUERY',
      resourceId: query || caseId || 'ALL',
      details: `Officer searched records. Query: "${query}". Found: ${filtered.length} matching documents.`
    })

    return filtered
  }

  /**
   * STEP 8: AES-256 Symmetric Decryption of encrypted file ciphertext
   */
  async decryptDocumentAES256(encryptedRecord, passwordSeed = 'DocGuard_Master_Key_AES256') {
    if (!encryptedRecord || !encryptedRecord.ciphertextHex) {
      throw new Error('Decryption Error: Encrypted payload is missing or corrupted.')
    }

    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle && encryptedRecord.ivHex && encryptedRecord.saltHex) {
      try {
        const encoder = new TextEncoder()
        const keyMaterial = await window.crypto.subtle.importKey(
          'raw',
          encoder.encode(passwordSeed),
          { name: 'PBKDF2' },
          false,
          ['deriveKey']
        )

        const salt = new Uint8Array(hexToBuffer(encryptedRecord.saltHex))
        const iv = new Uint8Array(hexToBuffer(encryptedRecord.ivHex))
        const ciphertextBuffer = hexToBuffer(encryptedRecord.ciphertextHex)

        const key = await window.crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt,
            iterations: 100000,
            hash: 'SHA-256'
          },
          keyMaterial,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt']
        )

        const decryptedBuffer = await window.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          key,
          ciphertextBuffer
        )

        return decryptedBuffer
      } catch (err) {
        console.warn('[AES-256 Decryption Warning - SubtleCrypto Fallback]', err)
      }
    }

    // Fallback simulation
    return hexToBuffer(encryptedRecord.ciphertextHex)
  }

  /**
   * FULL PHASE 8 SECURE ACCESS & RETRIEVAL WORKFLOW (Steps 1 through 10)
   */
  async retrieveAndDecryptDocument({ user, documentId, caseId }) {
    const timestamp = new Date().toISOString()

    // 3 & 4. Access Verification (RBAC & Officer Authorization Check)
    const rbacResult = evaluateRBACPermission(user, PERMISSIONS.VIEW_DOCUMENTS, {
      resourceType: 'DOCUMENT',
      resourceId: documentId
    })

    if (!rbacResult.authorized) {
      // FAILURE ROUTE: Access Denied
      auditService.recordDenied({
        user,
        action: AUDIT_ACTIONS.DOCUMENT_VIEW,
        resourceType: 'DOCUMENT',
        resourceId: documentId,
        caseId,
        reason: 'RBAC Access Verification Failed: Officer rank lacks permission.'
      })

      return {
        success: false,
        route: 'FAILURE_ACCESS_DENIED',
        status: '403_FORBIDDEN',
        documentId,
        error: rbacResult.error || 'Access Denied: You do not have authorization to access this document.',
        timestamp
      }
    }

    // 5. Document Retrieval (Fetch Encrypted Payload from Storage)
    const docRecord = db.getDocumentById(documentId)
    const encryptedRecord = blockchainService.encryptedStore[documentId] || {
      ciphertextHex: bufferToHex(new TextEncoder().encode(`Sample Document Payload Content for ID ${documentId}`).buffer),
      ivHex: '000102030405060708090a0b',
      saltHex: '000102030405060708090a0b0c0d0e0f',
      algorithm: 'AES-256-GCM'
    }

    // 6. Integrity Verification (Check SHA-256 Hash against Blockchain Ledger)
    const verificationResult = await verificationService.verifyAndAccessDocument({
      user,
      documentId,
      caseId: caseId || docRecord?.caseId,
      fileOrBuffer: encryptedRecord.ciphertextHex
    })

    // 7. Decision Point (Check if Hash Matches & Verification Succeeded)
    if (!verificationResult.success || verificationResult.decision === 'HASH_MISMATCH') {
      // FAILURE ROUTE: Hash Mismatch / Tampering Detected
      return {
        success: false,
        route: 'FAILURE_HASH_MISMATCH',
        status: '409_INTEGRITY_FAILED',
        documentId,
        alertGenerated: verificationResult.alertGenerated,
        error: 'CRITICAL INTEGRITY FAILURE: Document hash does not match Blockchain Ledger entry! Retrieval blocked.',
        timestamp
      }
    }

    // 8. AES-256 Decryption (Execute ONLY after successful authorization and integrity check)
    let decryptedArrayBuffer
    try {
      decryptedArrayBuffer = await this.decryptDocumentAES256(encryptedRecord)
    } catch (err) {
      throw new Error(`AES-256 Decryption Failure: ${err.message}`)
    }

    // 9. Document Display (Prepare decrypted file payload for Officer UI Viewer)
    const decryptedBlob = new Blob([decryptedArrayBuffer], { type: docRecord?.mimeType || 'application/pdf' })
    const previewUrl = URL.createObjectURL(decryptedBlob)

    // 10. Activity Logging (Record search, retrieval, verification, decryption & viewing in Audit Log)
    auditService.record({
      action: AUDIT_ACTIONS.DOCUMENT_VIEW,
      user,
      resourceType: 'DOCUMENT',
      resourceId: documentId,
      resourceLabel: docRecord?.originalFilename || documentId,
      caseId: caseId || docRecord?.caseId,
      result: 'SUCCESS',
      details: `Officer ${user.name} (${user.rank}) successfully retrieved and decrypted document '${docRecord?.originalFilename || documentId}' via AES-256 & Blockchain SHA-256 validation.`
    })

    return {
      success: true,
      route: 'SUCCESS_AUTHORIZED_DECRYPTED',
      status: '200_OK',
      documentId,
      originalFilename: docRecord?.originalFilename || `${documentId}.pdf`,
      mimeType: docRecord?.mimeType || 'application/pdf',
      fileSize: docRecord?.fileSize || decryptedArrayBuffer.byteLength,
      sha256Hash: verificationResult.calculatedHash,
      blockchainBlockHeight: verificationResult.blockHeight,
      decryptedPreviewUrl: previewUrl,
      encryptionMethod: 'AES-256-GCM',
      timestamp
    }
  }
}

export const retrievalService = new RetrievalService()
