import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Upload, Download, Eye, Shield, CheckCircle2, AlertCircle,
  HardDrive, History, FileCheck, Copy, Clock, Layers, FileWarning, ArrowUpRight
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../services/mockCaseData'
import { documentService, DOCUMENT_TYPES } from '../../services/documentService'
import { cryptoService } from '../../services/cryptoService'
import { hasPermission, PERMISSIONS } from '../../services/accessControl'
import { SensitivityBadge, VersionBadge, RecordStatusBadge, IntegrityBadge } from '../shared/StatusBadge'

export function DocumentsTab({ caseId, notify }) {
  const { user } = useAuth()
  const [documents, setDocuments] = useState([])
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  // Modals state
  const [previewDoc, setPreviewDoc] = useState(null)
  const [versionHistoryDoc, setVersionHistoryDoc] = useState(null)
  const [uploadVersionDoc, setUploadVersionDoc] = useState(null)
  const [verifyIntegrityModal, setVerifyIntegrityModal] = useState(null)

  // Form states
  const [formData, setFormData] = useState({
    documentType: 'FIR',
    classification: 'INTERNAL',
    description: '',
  })
  const [newVersionFile, setNewVersionFile] = useState(null)
  const [changeReason, setChangeReason] = useState('')
  const [verifyFile, setVerifyFile] = useState(null)
  const [verificationResult, setVerificationResult] = useState(null)
  const [verifying, setVerifying] = useState(false)

  const canUpload = hasPermission(user, PERMISSIONS.UPLOAD_DOCUMENTS)
  const canCreateVersion = hasPermission(user, PERMISSIONS.DOCUMENT_VERSION_CREATE) || canUpload
  const canVerifyIntegrity = hasPermission(user, PERMISSIONS.INTEGRITY_VERIFY) || hasPermission(user, PERMISSIONS.VIEW_DOCUMENTS)

  const reload = () => {
    try {
      const data = documentService.getDocuments(user, caseId)
      setDocuments(data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => { reload() }, [caseId, user])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        documentService.validateFile(file)
        setSelectedFile(file)
      } catch (err) {
        notify?.('error', 'Invalid File', err.message)
        e.target.value = ''
        setSelectedFile(null)
      }
    }
  }

  const handleInitialUpload = async (e) => {
    e.preventDefault()
    if (!selectedFile) {
      notify?.('error', 'Missing File', 'Please choose a file to upload.')
      return
    }

    setUploading(true)
    try {
      const doc = await documentService.uploadDocument(user, caseId, selectedFile, formData)
      reload()
      setShowUploadForm(false)
      setSelectedFile(null)
      setFormData({
        documentType: 'FIR',
        classification: 'INTERNAL',
        description: '',
      })
      notify?.('success', 'Document Uploaded (V1)', `Document ${doc.originalFilename} uploaded with SHA-256 integrity hash recorded.`)
    } catch (err) {
      notify?.('error', 'Upload Failed', err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleUploadNewVersion = async (e) => {
    e.preventDefault()
    if (!uploadVersionDoc) return
    if (!newVersionFile) {
      notify?.('error', 'Missing File', 'Please select a file for the new version.')
      return
    }
    if (!changeReason.trim()) {
      notify?.('error', 'Reason Required', 'Please describe the reason for this document update.')
      return
    }

    setUploading(true)
    try {
      const ver = await documentService.createDocumentVersion(
        user, caseId, uploadVersionDoc.id, newVersionFile, changeReason
      )
      reload()
      setUploadVersionDoc(null)
      setNewVersionFile(null)
      setChangeReason('')
      notify?.('success', `Version V${ver.versionNumber} Created`, `New version of ${ver.originalFilename} saved. Historical versions V1..V${ver.versionNumber - 1} remain preserved.`)
    } catch (err) {
      notify?.('error', 'Version Upload Failed', err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleRunIntegrityCheck = async (versionObj, fileToTest) => {
    setVerifying(true)
    try {
      const result = await documentService.verifyIntegrity(user, verifyIntegrityModal.doc.id, versionObj.id, fileToTest)
      setVerificationResult(result)
    } catch (err) {
      notify?.('error', 'Verification Failed', err.message)
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="case-tab-content">
      {/* Storage & Version Control Security Banner */}
      <div className="immutable-banner">
        <div className="immutable-banner-icon">
          <Shield size={18} />
        </div>
        <div>
          <h4 className="immutable-banner-title">Phase 3 Document Integrity & Version Control Active</h4>
          <p className="immutable-banner-desc">
            Historical document versions (V1, V2...) are immutable by law and cannot be overwritten. Every document upload generates an authentic SHA-256 cryptographic hash for tamper verification.
          </p>
        </div>
      </div>

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0 12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a2332' }}>
            Case Documents & Exhibits ({documents.length})
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6a7b95' }}>
            FIRs, investigation reports, forensic sheets, court filings, and evidence documents
          </p>
        </div>

        {canUpload && (
          <button
            className="button primary"
            onClick={() => setShowUploadForm(!showUploadForm)}
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}
          >
            <Upload size={16} /> Upload New Document
          </button>
        )}
      </div>

      {/* Initial Upload Form */}
      <AnimatePresence>
        {showUploadForm && (
          <motion.form
            onSubmit={handleInitialUpload}
            className="panel"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            style={{ marginBottom: 18, border: '1px solid #cbd5e1' }}
          >
            <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#1a2332' }}>
              Upload Initial Legal / Investigation Document (Creates V1)
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
              <div className="form-group">
                <label className="field-label">Document Type *</label>
                <select
                  className="field-input"
                  value={formData.documentType}
                  onChange={e => setFormData(f => ({ ...f, documentType: e.target.value }))}
                >
                  {DOCUMENT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="field-label">Security Classification</label>
                <select
                  className="field-input"
                  value={formData.classification}
                  onChange={e => setFormData(f => ({ ...f, classification: e.target.value }))}
                >
                  <option value="INTERNAL">Internal</option>
                  <option value="RESTRICTED">Restricted</option>
                  <option value="CONFIDENTIAL">Confidential</option>
                  <option value="SECRET">Secret</option>
                  <option value="HIGHLY_SENSITIVE">Highly Sensitive</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="field-label">Select File (PDF, DOC, DOCX, JPG, PNG — Max 50MB) *</label>
              <input
                type="file"
                className="field-input"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                required
              />
              {selectedFile && (
                <div style={{ marginTop: 6, fontSize: 11, color: '#2563eb' }}>
                  Selected: {selectedFile.name} ({documentService.formatFileSize(selectedFile.size)})
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="field-label">Document Description / Remarks *</label>
              <textarea
                className="field-input"
                rows={3}
                placeholder="Describe the nature, source, and context of this document..."
                value={formData.description}
                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="button secondary"
                onClick={() => setShowUploadForm(false)}
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button primary"
                disabled={uploading}
              >
                {uploading ? 'Computing SHA-256 & Uploading...' : 'Upload & Compute SHA-256 Hash'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Document Grid */}
      {documents.length === 0 ? (
        <div className="empty-state">
          <FileText size={36} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
          <h4 style={{ margin: '0 0 6px', color: '#475569' }}>No Documents Uploaded</h4>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
            No files or exhibits have been uploaded to this case repository yet.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
          {documents.map(doc => {
            const docDetails = documentService.getDocumentSummary(user, doc.id)
            const uploader = db.getUserById(doc.uploadedBy)
            const currentVer = docDetails.currentVersion
            const versionCount = docDetails.versionCount
            const typeLabel = DOCUMENT_TYPES.find(t => t.value === doc.documentType)?.label || doc.documentType
            const dateStr = new Date(doc.uploadedAt).toLocaleDateString('en-IN', {
              day: '2-digit', month: 'short', year: 'numeric'
            })

            return (
              <motion.div
                key={doc.id}
                className="panel"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 14 }}
              >
                <div>
                  {/* Top Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 6, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#1e3a8a', background: '#eff6ff', border: '1px solid #dbeafe', padding: '2px 8px', borderRadius: 99 }}>
                        {typeLabel}
                      </span>
                      <VersionBadge version={currentVer?.versionNumber || 1} />
                      <RecordStatusBadge status={doc.status} />
                      <IntegrityBadge verified={doc.integrityStatus === 'VERIFIED'} />
                    </div>
                    <SensitivityBadge sensitivity={doc.classification} />
                  </div>

                  {/* Title & Description */}
                  <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#0f172a', wordBreak: 'break-all' }}>
                    {doc.originalFilename}
                  </h4>

                  <p style={{ margin: '0 0 10px', fontSize: 12, color: '#475569', lineClamp: 2 }}>
                    {doc.description}
                  </p>

                  {/* Current Version Hash Snippet */}
                  {currentVer && (
                    <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 6, border: '1px solid #e2e8f0', marginBottom: 10, fontSize: 11 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: 2 }}>
                        <span>Current SHA-256 Hash (V{currentVer.versionNumber})</span>
                        <span style={{ color: doc.integrityStatus === 'MISMATCH' ? '#dc2626' : '#059669', fontWeight: 600 }}>
                          {doc.integrityStatus === 'MISMATCH' ? '⚠ Mismatch' : `✓ ${doc.integrityStatus || 'PENDING'}`}
                        </span>
                      </div>
                      <code style={{ fontSize: 10, color: '#1e293b', wordBreak: 'break-all', display: 'block' }}>
                        {currentVer.fileHash}
                      </code>
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8a97ab', borderTop: '1px solid #f1f5f9', paddingTop: 8, marginBottom: 10 }}>
                    <span>{documentService.formatFileSize(doc.fileSize)} · {documentService.getFileTypeLabel(doc.mimeType)}</span>
                    <span>Uploaded {dateStr}</span>
                  </div>

                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Uploaded by: <strong>{uploader?.name || doc.uploadedBy}</strong></span>
                    <span style={{ color: '#2563eb', fontWeight: 600 }}>{versionCount} {versionCount === 1 ? 'version' : 'versions'}</span>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
                    <button
                      className="button secondary btn-sm"
                      style={{ fontSize: 11, padding: '5px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                      onClick={() => setPreviewDoc(doc)}
                    >
                      <Eye size={12} /> View Profile
                    </button>
                    <button
                      className="button secondary btn-sm"
                      style={{ fontSize: 11, padding: '5px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                      onClick={() => setVersionHistoryDoc(doc)}
                    >
                      <History size={12} /> Version History
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <button
                      className="button secondary btn-sm"
                      style={{ fontSize: 11, padding: '5px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#059669', borderColor: '#a7f3d0' }}
                      onClick={() => {
                        setVerifyIntegrityModal({ doc, version: currentVer })
                        setVerificationResult(null)
                        setVerifyFile(null)
                        handleRunIntegrityCheck(currentVer, null)
                      }}
                    >
                      <FileCheck size={12} /> Verify Integrity
                    </button>

                    {canCreateVersion && (
                      <button
                        className="button primary btn-sm"
                        style={{ fontSize: 11, padding: '5px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                        onClick={() => {
                          setUploadVersionDoc(doc)
                          setNewVersionFile(null)
                          setChangeReason('')
                        }}
                      >
                        <Upload size={12} /> New Version
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* MODAL 1: Document Details / Security Profile */}
      {previewDoc && (
        <div className="modal-backdrop" onClick={() => setPreviewDoc(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={18} color="#2563eb" /> Document Security Profile
              </h3>
              <button className="button-close" onClick={() => setPreviewDoc(null)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <div><strong>Document Title:</strong> {previewDoc.originalFilename}</div>
                <div><strong>Document ID:</strong> <code>{previewDoc.id}</code></div>
                <div><strong>Document Type:</strong> {previewDoc.documentType}</div>
                <div><strong>Current Version:</strong> <VersionBadge version={documentService.getDocument(user, previewDoc.id).currentVersion?.versionNumber || 1} /></div>
                <div><strong>Record Status:</strong> <RecordStatusBadge status={previewDoc.status} /></div>
                <div><strong>Integrity Status:</strong> <IntegrityBadge verified={previewDoc.integrityStatus === 'VERIFIED'} /></div>
                <div><strong>Classification:</strong> <SensitivityBadge sensitivity={previewDoc.classification} /></div>
                <div><strong>MIME Type:</strong> {previewDoc.mimeType} ({documentService.getFileTypeLabel(previewDoc.mimeType)})</div>
                <div><strong>File Size:</strong> {documentService.formatFileSize(previewDoc.fileSize)}</div>
                <div><strong>Uploaded By:</strong> {db.getUserById(previewDoc.uploadedBy)?.name || previewDoc.uploadedBy}</div>
                <div><strong>Uploaded At:</strong> {new Date(previewDoc.uploadedAt).toLocaleString('en-IN')}</div>
                <div><strong>Description:</strong> {previewDoc.description}</div>
                <div style={{ background: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <strong>Current Version Storage Path:</strong>
                  <code style={{ display: 'block', fontSize: 11, wordBreak: 'break-all', marginTop: 4, color: '#0f172a' }}>
                    {documentService.getDocument(user, previewDoc.id).currentVersion?.storageKey || previewDoc.storageKey}
                  </code>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="button secondary" onClick={() => setPreviewDoc(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Version History */}
      {versionHistoryDoc && (
        <div className="modal-backdrop" onClick={() => setVersionHistoryDoc(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <History size={18} color="#2563eb" /> Version History — {versionHistoryDoc.originalFilename}
              </h3>
              <button className="button-close" onClick={() => setVersionHistoryDoc(null)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '16px 20px' }}>
              <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 14px' }}>
                All previous versions are permanently preserved and cryptographically hashed. Updating a document appends a new version without deleting historical records.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {documentService.getDocumentVersions(user, versionHistoryDoc.id).map(ver => {
                  const uploader = db.getUserById(ver.uploadedBy)
                  const isCurrent = versionHistoryDoc.currentVersionId === ver.id
                  return (
                    <div
                      key={ver.id}
                      style={{
                        border: isCurrent ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                        borderRadius: 8,
                        padding: 12,
                        background: isCurrent ? '#eff6ff' : '#ffffff',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <VersionBadge version={ver.versionNumber} />
                          {isCurrent && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', padding: '1px 7px', borderRadius: 99 }}>
                              CURRENT VERSION
                            </span>
                          )}
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
                            {ver.originalFilename}
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          {new Date(ver.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div style={{ fontSize: 12, color: '#334155', marginBottom: 6 }}>
                        <strong>Change Reason:</strong> {ver.changeReason}
                      </div>

                      <div style={{ fontSize: 11, color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Uploaded by: <strong>{uploader?.name || ver.uploadedBy}</strong> ({documentService.formatFileSize(ver.fileSize)})</span>
                        <button
                          className="button secondary btn-sm"
                          style={{ fontSize: 10, padding: '3px 8px' }}
                          onClick={() => {
                            setVerifyIntegrityModal({ doc: versionHistoryDoc, version: ver })
                            setVerificationResult(null)
                            setVerifyFile(null)
                            handleRunIntegrityCheck(ver, null)
                          }}
                        >
                          <FileCheck size={11} /> Verify V{ver.versionNumber} Hash
                        </button>
                      </div>

                      <div style={{ marginTop: 6, background: '#f1f5f9', padding: '4px 8px', borderRadius: 4 }}>
                        <code style={{ fontSize: 10, color: '#475569', wordBreak: 'break-all' }}>
                          SHA-256: {ver.fileHash}
                        </code>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="button secondary" onClick={() => setVersionHistoryDoc(null)}>Close History</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Upload New Version */}
      {uploadVersionDoc && (
        <div className="modal-backdrop" onClick={() => setUploadVersionDoc(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Upload size={18} color="#2563eb" /> Upload New Version (V{ (documentService.getDocument(user, uploadVersionDoc.id).currentVersion?.versionNumber || 1) + 1 })
              </h3>
              <button className="button-close" onClick={() => setUploadVersionDoc(null)}>×</button>
            </div>
            <form onSubmit={handleUploadNewVersion}>
              <div className="modal-body" style={{ padding: '16px 20px' }}>
                <div style={{ background: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0', marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>Target Document:</div>
                  <div style={{ fontSize: 13, color: '#2563eb', fontWeight: 600 }}>{uploadVersionDoc.originalFilename}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    Current Version V{documentService.getDocument(user, uploadVersionDoc.id).currentVersion?.versionNumber || 1} will be preserved immutably.
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="field-label">Select Updated File *</label>
                  <input
                    type="file"
                    className="field-input"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={e => setNewVersionFile(e.target.files?.[0] || null)}
                    required
                  />
                  {newVersionFile && (
                    <div style={{ marginTop: 6, fontSize: 11, color: '#2563eb' }}>
                      Selected: {newVersionFile.name} ({documentService.formatFileSize(newVersionFile.size)})
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="field-label">Mandatory Change Reason / Update Notes *</label>
                  <textarea
                    className="field-input"
                    rows={3}
                    placeholder="Explain why this new version is being uploaded (e.g. Corrected witness address, Additional forensic analysis added)..."
                    value={changeReason}
                    onChange={e => setChangeReason(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setUploadVersionDoc(null)}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button primary"
                  disabled={uploading}
                >
                  {uploading ? 'Computing Hash & Creating Version...' : 'Create New Immutable Version'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Verify Cryptographic SHA-256 Integrity */}
      {verifyIntegrityModal && (
        <div className="modal-backdrop" onClick={() => setVerifyIntegrityModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileCheck size={18} color="#059669" /> Cryptographic SHA-256 Integrity Check
              </h3>
              <button className="button-close" onClick={() => setVerifyIntegrityModal(null)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '16px 20px' }}>
              <div style={{ background: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #cbd5e1', marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: '#475569' }}>
                  Verifying: <strong>{verifyIntegrityModal.version.originalFilename}</strong> (Version V{verifyIntegrityModal.version.versionNumber})
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  Expected Stored Hash: <code style={{ fontSize: 10, color: '#0f172a' }}>{verifyIntegrityModal.version.fileHash}</code>
                </div>
              </div>

              {/* Upload file to perform active comparison */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="field-label">Optional: Upload Local File to Compare SHA-256 Hash</label>
                <input
                  type="file"
                  className="field-input"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    setVerifyFile(f)
                    if (f) handleRunIntegrityCheck(verifyIntegrityModal.version, f)
                  }}
                />
                <small style={{ color: '#64748b', display: 'block', marginTop: 4 }}>
                  Select a local file from disk to recalculate its SHA-256 hash and verify if it matches the stored audit hash.
                </small>
              </div>

              {/* Verification Result Display */}
              {verifying ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#2563eb' }}>
                  <Clock size={24} className="spin" style={{ margin: '0 auto 8px' }} />
                  <div>Computing cryptographic SHA-256 digest...</div>
                </div>
              ) : verificationResult && (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 8,
                    border: verificationResult.verified ? '1.5px solid #10b981' : '1.5px solid #ef4444',
                    background: verificationResult.verified ? '#ecfdf5' : '#fef2f2',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    {verificationResult.verified ? (
                      <CheckCircle2 size={20} color="#10b981" />
                    ) : (
                      <AlertCircle size={20} color="#ef4444" />
                    )}
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: verificationResult.verified ? '#065f46' : '#991b1b' }}>
                      {verificationResult.verified ? '✓ INTEGRITY VERIFIED' : '⚠ INTEGRITY FAILED (TAMPER DETECTED)'}
                    </h4>
                  </div>

                  <p style={{ margin: '0 0 10px', fontSize: 12, color: verificationResult.verified ? '#047857' : '#b91c1c' }}>
                    {verificationResult.verified
                      ? 'The calculated SHA-256 hash strictly matches the recorded database audit hash. File integrity is authentic and untampered.'
                      : 'WARNING: The computed file hash does NOT match the stored hash! The document contents may have been altered or modified.'}
                  </p>

                  <div style={{ fontSize: 11, background: '#ffffff', padding: 8, borderRadius: 4, border: '1px solid #cbd5e1' }}>
                    <div><strong>Calculated Hash:</strong> <code style={{ fontSize: 10, wordBreak: 'break-all' }}>{verificationResult.calculatedHash}</code></div>
                    <div><strong>Recorded Hash:</strong> <code style={{ fontSize: 10, wordBreak: 'break-all' }}>{verificationResult.storedHash}</code></div>
                    <div><strong>Verification Timestamp:</strong> {new Date(verificationResult.timestamp).toLocaleString('en-IN')}</div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="button secondary" onClick={() => setVerifyIntegrityModal(null)}>Close Verification</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
