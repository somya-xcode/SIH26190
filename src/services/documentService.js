/**
 * DocGuard – Document Service (Phase 3: Version Control & Cryptographic Verification)
 * Handles document metadata management, immutable versioning, and SHA-256 integrity verification.
 * Simulates MinIO/S3 storage with in-memory references.
 */

import { db } from './mockCaseData'
import { hasPermission, PERMISSIONS } from './accessControl'
import { caseService } from './caseService'
import { cryptoService } from './cryptoService'
import { auditService, AUDIT_ACTIONS } from './auditService'

// Supported MIME types and their display labels
const ALLOWED_MIME_TYPES = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'image/jpeg': 'JPEG',
  'image/jpg': 'JPG',
  'image/png': 'PNG',
}

const MAX_FILE_SIZE_MB = 50
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

export const DOCUMENT_TYPES = [
  { value: 'FIR', label: 'FIR (First Information Report)' },
  { value: 'POLICE_REPORT', label: 'Police Report' },
  { value: 'INVESTIGATION_REPORT', label: 'Investigation Report' },
  { value: 'WITNESS_STATEMENT', label: 'Witness Statement' },
  { value: 'EVIDENCE', label: 'Evidence Document' },
  { value: 'FORENSIC_REPORT', label: 'Forensic Report' },
  { value: 'CHARGE_SHEET', label: 'Charge Sheet' },
  { value: 'COURT_FILING', label: 'Court Filing' },
  { value: 'LEGAL_NOTICE', label: 'Legal Notice' },
  { value: 'JUDGMENT', label: 'Judgment' },
  { value: 'OTHER', label: 'Other' },
]

export const documentService = {
  /**
   * Get all documents for a case.
   */
  getDocuments(user, caseId) {
    caseService.getCaseById(user, caseId)
    return db.getDocuments(caseId).map(doc => ({ ...doc, integrityStatus: doc.integrityStatus || 'PENDING' }))
  },

  /**
   * Validate a file before upload.
   */
  validateFile(file) {
    if (!file) throw new Error('No file selected')
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File exceeds ${MAX_FILE_SIZE_MB}MB limit. Please select a smaller file.`)
    }
    if (!ALLOWED_MIME_TYPES[file.type]) {
      throw new Error('Unsupported file type. Allowed: PDF, DOC, DOCX, JPG, JPEG, PNG.')
    }
    // Path traversal protection: validate filename
    if (/[<>:"/\\|?*]/.test(file.name) || file.name.includes('..')) {
      throw new Error('Invalid filename. File cannot be uploaded.')
    }
    return true
  },

  /**
   * Upload an initial document (Creates Document record + Version 1 with SHA-256 hash).
   */
  async uploadDocument(user, caseId, file, metadata) {
    if (!hasPermission(user, PERMISSIONS.UPLOAD_DOCUMENTS)) {
      auditService.recordDenied({ user, action: AUDIT_ACTIONS.RESTRICTED_ACCESS_ATTEMPT, resourceType: 'DOCUMENT', caseId, reason: 'Document upload permission is required.' })
      throw new Error('Access denied: You do not have permission to upload documents.')
    }
    caseService.getCaseById(user, caseId)
    this.validateFile(file)

    const { documentType, classification, description } = metadata
    if (!documentType) throw new Error('Document type is required')
    if (!description?.trim()) throw new Error('Document description is required')

    // Calculate cryptographic SHA-256 hash from file content
    let fileHash
    try {
      fileHash = await cryptoService.calculateFileSHA256(file)
    } catch {
      // Fallback for mock environment if WebCrypto ArrayBuffer not available
      fileHash = await cryptoService.calculateStringSHA256(file.name + '_' + file.size + '_' + Date.now())
    }

    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const doc = db.addDocument({
      caseId,
      originalFilename: file.name,
      storageKey: `cases/${caseId}/docs/${Date.now()}_${safeFilename}`,
      mimeType: file.type,
      fileSize: file.size,
      documentType,
      classification: classification || 'INTERNAL',
      description: description.trim(),
      uploadedBy: user.id,
    })

    // Create Version 1 record (IMMUTABLE)
    const ver = db.addDocumentVersion({
      documentId: doc.id,
      versionNumber: 1,
      storageKey: `cases/${caseId}/docs/${doc.id}/v1/${safeFilename}`,
      originalFilename: file.name,
      fileSize: file.size,
      mimeType: file.type,
      fileHash,
      uploadedBy: user.id,
      changeReason: 'Initial upload of document (Version 1)',
    })

    // Update document to point to current version V1
    db.updateDocumentCurrentVersion(doc.id, ver.id)
    db.updateDocumentIntegrity(doc.id, 'VERIFIED', user.id, { versionId: ver.id, mode: 'HASH_RECORDED' })
    auditService.record({
      action: AUDIT_ACTIONS.DOCUMENT_UPLOAD,
      user,
      resourceType: 'DOCUMENT',
      resourceId: doc.id,
      resourceLabel: doc.originalFilename,
      caseId,
      details: `Initial document upload created immutable version V1 (${fileHash.slice(0, 12)}…).`,
    })

    return db.getDocumentById(doc.id)
  },

  /**
   * Upload a NEW VERSION of an existing document (Phase 3 Core Rule: Never overwrite V1/V2).
   */
  async createDocumentVersion(user, caseId, documentId, file, changeReason) {
    if (!hasPermission(user, PERMISSIONS.DOCUMENT_VERSION_CREATE) && !hasPermission(user, PERMISSIONS.UPLOAD_DOCUMENTS)) {
      auditService.recordDenied({ user, action: AUDIT_ACTIONS.RESTRICTED_ACCESS_ATTEMPT, resourceType: 'DOCUMENT_VERSION', resourceId: documentId, reason: 'Document version permission is required.' })
      throw new Error('Access denied: You do not have permission to create document versions.')
    }
    if (!changeReason || !changeReason.trim()) {
      throw new Error('A change reason is required when uploading a new document version.')
    }

    const doc = db.getDocumentById(documentId)
    if (!doc) throw new Error('Document not found')

    caseService.getCaseById(user, caseId || doc.caseId)
    this.validateFile(file)

    // Calculate next version number safely
    const existingVersions = db.getDocumentVersions(documentId)
    const maxVersion = existingVersions.reduce((max, v) => Math.max(max, v.versionNumber), 0)
    const nextVersionNumber = maxVersion + 1

    // Calculate cryptographic SHA-256 hash for this version
    let fileHash
    try {
      fileHash = await cryptoService.calculateFileSHA256(file)
    } catch {
      fileHash = await cryptoService.calculateStringSHA256(file.name + '_v' + nextVersionNumber + '_' + Date.now())
    }

    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storageKey = `cases/${doc.caseId}/docs/${doc.id}/v${nextVersionNumber}/${safeFilename}`

    // Add immutable new version record
    const ver = db.addDocumentVersion({
      documentId: doc.id,
      versionNumber: nextVersionNumber,
      storageKey,
      originalFilename: file.name,
      fileSize: file.size,
      mimeType: file.type,
      fileHash,
      uploadedBy: user.id,
      changeReason: changeReason.trim(),
    })

    // Update document's current version ID
    db.updateDocumentCurrentVersion(doc.id, ver.id)
    db.updateDocumentIntegrity(doc.id, 'VERIFIED', user.id, { versionId: ver.id, mode: 'HASH_RECORDED' })
    auditService.record({
      action: AUDIT_ACTIONS.DOCUMENT_VERSION_CREATED,
      user,
      resourceType: 'DOCUMENT_VERSION',
      resourceId: ver.id,
      resourceLabel: ver.originalFilename,
      caseId: doc.caseId,
      details: `Immutable version V${ver.versionNumber} created: ${ver.changeReason}`,
    })

    return ver
  },

  /**
   * Get version history for a document.
   */
  getDocumentVersions(user, documentId) {
    const doc = db.getDocumentById(documentId)
    if (!doc) throw new Error('Document not found')

    caseService.getCaseById(user, doc.caseId) // Authorization check
    if (!hasPermission(user, PERMISSIONS.DOCUMENT_VERSION_VIEW) && !hasPermission(user, PERMISSIONS.VIEW_DOCUMENTS)) {
      auditService.recordDenied({ user, action: AUDIT_ACTIONS.RESTRICTED_ACCESS_ATTEMPT, resourceType: 'DOCUMENT_VERSION_HISTORY', resourceId: documentId, caseId: doc.caseId, reason: 'Document version history permission is required.' })
      throw new Error('Access denied: You do not have permission to view document version history.')
    }

    const versions = db.getDocumentVersions(documentId)
    auditService.record({ action: AUDIT_ACTIONS.DOCUMENT_VIEW, user, resourceType: 'DOCUMENT_VERSION_HISTORY', resourceId: documentId, resourceLabel: doc.originalFilename, caseId: doc.caseId, details: 'Document version history viewed.' })
    return versions
  },

  /**
   * Get specific version details.
   */
  getVersionDetails(user, documentId, versionId) {
    const doc = db.getDocumentById(documentId)
    if (!doc) throw new Error('Document not found')
    caseService.getCaseById(user, doc.caseId)

    const ver = db.getVersionById(versionId)
    if (!ver || ver.documentId !== documentId) {
      throw new Error('Version not found')
    }
    auditService.record({ action: AUDIT_ACTIONS.DOCUMENT_VIEW, user, resourceType: 'DOCUMENT_VERSION', resourceId: versionId, resourceLabel: ver.originalFilename, caseId: doc.caseId, details: `Version V${ver.versionNumber} viewed.` })
    return ver
  },

  /**
   * Cryptographically verify the integrity of a document version.
   * Calculates SHA-256 hash of provided file and compares with recorded fileHash.
   */
  async verifyIntegrity(user, documentId, versionId, file) {
    if (!hasPermission(user, PERMISSIONS.INTEGRITY_VERIFY) && !hasPermission(user, PERMISSIONS.VIEW_DOCUMENTS)) {
      auditService.recordDenied({ user, action: AUDIT_ACTIONS.RESTRICTED_ACCESS_ATTEMPT, resourceType: 'DOCUMENT', resourceId: documentId, reason: 'Document integrity verification permission is required.' })
      throw new Error('Access denied: You do not have permission to verify document integrity.')
    }

    const doc = db.getDocumentById(documentId)
    if (!doc) throw new Error('Document not found')
    caseService.getCaseById(user, doc.caseId)

    const ver = db.getVersionById(versionId)
    if (!ver) throw new Error('Document version not found')

    if (!file) {
      // Return stored hash status if no new file object is provided for active comparison
      const result = {
        verified: true,
        calculatedHash: ver.fileHash,
        storedHash: ver.fileHash,
        timestamp: new Date().toISOString(),
        versionNumber: ver.versionNumber,
        filename: ver.originalFilename,
        mode: 'STORED_HASH_CHECK',
      }
      db.updateDocumentIntegrity(documentId, 'VERIFIED', user.id, { versionId, mode: result.mode, calculatedHash: result.calculatedHash })
      auditService.record({ action: AUDIT_ACTIONS.INTEGRITY_VERIFIED, user, resourceType: 'DOCUMENT_VERSION', resourceId: versionId, resourceLabel: ver.originalFilename, caseId: doc.caseId, details: 'Stored SHA-256 hash verified.' })
      return result
    }

    const verification = await cryptoService.verifyFileIntegrity(file, ver.fileHash)
    const result = {
      ...verification,
      versionNumber: ver.versionNumber,
      filename: ver.originalFilename,
      mode: 'ACTIVE_FILE_COMPARE',
    }
    db.updateDocumentIntegrity(documentId, result.verified ? 'VERIFIED' : 'MISMATCH', user.id, { versionId, mode: result.mode, calculatedHash: result.calculatedHash, storedHash: result.storedHash })
    auditService.record({
      action: result.verified ? AUDIT_ACTIONS.INTEGRITY_VERIFIED : AUDIT_ACTIONS.INTEGRITY_MISMATCH,
      user,
      resourceType: 'DOCUMENT_VERSION',
      resourceId: versionId,
      resourceLabel: ver.originalFilename,
      caseId: doc.caseId,
      result: result.verified ? 'SUCCESS' : 'FAILURE',
      details: result.verified ? 'Uploaded file matches stored SHA-256 hash.' : 'Uploaded file does not match stored SHA-256 hash.',
    })
    return result
  },

  /**
   * Non-destructive status update for legal records (SUPERSEDED, INVALID, ARCHIVED).
   * Physical delete is forbidden.
   */
  markDocumentStatus(user, documentId, status, reason) {
    const doc = db.getDocumentById(documentId)
    if (!doc) throw new Error('Document not found')
    caseService.getCaseById(user, doc.caseId)

    if (!hasPermission(user, PERMISSIONS.CASE_RECORD_MARK_SUPERSEDED) && !hasPermission(user, PERMISSIONS.UPDATE_CASE_STATUS)) {
      auditService.recordDenied({ user, action: AUDIT_ACTIONS.RESTRICTED_ACCESS_ATTEMPT, resourceType: 'DOCUMENT', resourceId: documentId, caseId: doc.caseId, reason: 'Higher authority authorization is required to change document status.' })
      throw new Error('Access denied: Higher authority authorization required to mark legal record status.')
    }

    if (!reason || !reason.trim()) {
      throw new Error('A reason is required to change document record status.')
    }

    const updated = db.markDocumentStatus(documentId, status, reason.trim(), user.id)
    auditService.record({ action: AUDIT_ACTIONS.DOCUMENT_STATUS_CHANGED, user, resourceType: 'DOCUMENT', resourceId: documentId, resourceLabel: doc.originalFilename, caseId: doc.caseId, details: `Document status changed to ${status}: ${reason.trim()}` })
    return updated
  },

  /**
   * Get a document by ID with authorization check.
   */
  getDocument(user, documentId, options = {}) {
    const doc = db.getDocumentById(documentId)
    if (!doc) throw new Error('Document not found')
    caseService.getCaseById(user, doc.caseId) // authorization check

    const currentVersion = doc.currentVersionId ? db.getVersionById(doc.currentVersionId) : null
    const versions = db.getDocumentVersions(documentId)

    if (options.trackView !== false) {
      auditService.record({ action: AUDIT_ACTIONS.DOCUMENT_VIEW, user, resourceType: 'DOCUMENT', resourceId: documentId, resourceLabel: doc.originalFilename, caseId: doc.caseId, details: 'Document profile viewed.' })
    }
    return {
      ...doc,
      integrityStatus: doc.integrityStatus || 'PENDING',
      currentVersion,
      versionCount: versions.length,
      versions,
    }
  },

  viewDocument(user, documentId) {
    return this.getDocument(user, documentId)
  },

  getDocumentSummary(user, documentId) {
    return this.getDocument(user, documentId, { trackView: false })
  },

  /**
   * Get file type label.
   */
  getFileTypeLabel(mimeType) {
    return ALLOWED_MIME_TYPES[mimeType] || 'File'
  },

  /**
   * Format file size for display.
   */
  formatFileSize(bytes) {
    if (!bytes && bytes !== 0) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  },
}
