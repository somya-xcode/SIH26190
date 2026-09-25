import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Activity, Shield, Clock, AlertCircle, Tag } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../services/mockCaseData'
import { hasPermission, PERMISSIONS } from '../../services/accessControl'
import { caseService } from '../../services/caseService'
import { ImmutableBadge, SensitivityBadge } from '../shared/StatusBadge'

const UPDATE_TYPES = [
  { value: 'GENERAL', label: 'General Update' },
  { value: 'FIELD_VISIT', label: 'Field Visit / Crime Scene Visit' },
  { value: 'WITNESS_INTERVIEW', label: 'Witness / Suspect Interview' },
  { value: 'SEARCH_SEIZURE', label: 'Search & Seizure' },
  { value: 'SURVEILLANCE', label: 'Surveillance Operation' },
  { value: 'FORENSIC_RESULT', label: 'Forensic Lab Result' },
  { value: 'COURT_HEARING', label: 'Court Hearing / Order' },
  { value: 'ARREST', label: 'Arrest / Detention' },
]

export function UpdatesTab({ caseId, notify }) {
  const { user } = useAuth()
  const [updates, setUpdates] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    updateType: 'GENERAL',
    classification: 'INTERNAL',
    updateText: '',
  })

  const canAdd = hasPermission(user, PERMISSIONS.ADD_INVESTIGATION_UPDATE)

  const reload = () => {
    try {
      const data = db.getUpdates(caseId)
      setUpdates(data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => { reload() }, [caseId])

  const handleAddUpdate = (e) => {
    e.preventDefault()
    if (!formData.updateText.trim()) return

    try {
      caseService.addInvestigationUpdate(user, caseId, {
        updateType: formData.updateType,
        classification: formData.classification,
        updateText: formData.updateText.trim(),
      })
      reload()
      setShowAddForm(false)
      setFormData({
        updateType: 'GENERAL',
        classification: 'INTERNAL',
        updateText: '',
      })
      notify?.('success', 'Update Logged', 'Investigation update has been appended to the case log.')
    } catch (err) {
      notify?.('error', 'Failed to Log Update', err.message)
    }
  }

  return (
    <div className="case-tab-content">
      {/* Immutability Banner */}
      <div className="immutable-banner">
        <div className="immutable-banner-icon">
          <Shield size={18} />
        </div>
        <div>
          <h4 className="immutable-banner-title">Investigation Log is Append-Only & Immutable</h4>
          <p className="immutable-banner-desc">
            All updates logged in this chronological journal are permanently signed and timestamped. Entries cannot be edited, reordered, or deleted by any officer or administrator.
          </p>
        </div>
      </div>

      {/* Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0 12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a2332' }}>
            Investigation Log ({updates.length})
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6a7b95' }}>
            Chronological append-only diary of investigative actions
          </p>
        </div>

        {canAdd && (
          <button
            className="button primary"
            onClick={() => setShowAddForm(!showAddForm)}
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}
          >
            <Plus size={16} /> Log Investigation Update
          </button>
        )}
      </div>

      {/* Add Update Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.form
            onSubmit={handleAddUpdate}
            className="panel"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            style={{ marginBottom: 18, border: '1px solid #cbd5e1' }}
          >
            <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#1a2332' }}>
              Log New Investigation Update
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
              <div className="form-group">
                <label className="field-label">Activity / Update Type</label>
                <select
                  className="field-input"
                  value={formData.updateType}
                  onChange={e => setFormData(f => ({ ...f, updateType: e.target.value }))}
                >
                  {UPDATE_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="field-label">Classification</label>
                <select
                  className="field-input"
                  value={formData.classification}
                  onChange={e => setFormData(f => ({ ...f, classification: e.target.value }))}
                >
                  <option value="INTERNAL">Internal</option>
                  <option value="RESTRICTED">Restricted</option>
                  <option value="CONFIDENTIAL">Confidential</option>
                  <option value="SECRET">Secret</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="field-label">Update Log Description *</label>
              <textarea
                className="field-input"
                rows={4}
                placeholder="Detail the investigative progress, findings, observations, or actions performed..."
                value={formData.updateText}
                onChange={e => setFormData(f => ({ ...f, updateText: e.target.value }))}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="button secondary"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button primary"
              >
                Append to Official Log
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Updates Timeline List */}
      {updates.length === 0 ? (
        <div className="empty-state">
          <Activity size={36} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
          <h4 style={{ margin: '0 0 6px', color: '#475569' }}>No Investigation Updates</h4>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
            No progress entries have been logged for this case yet.
          </p>
        </div>
      ) : (
        <div className="updates-timeline" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {updates.map(upd => {
            const addedByUser = db.getUserById(upd.addedBy)
            const dateStr = new Date(upd.addedAt).toLocaleDateString('en-IN', {
              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })
            const typeLabel = UPDATE_TYPES.find(t => t.value === upd.updateType)?.label || upd.updateType || 'Update'

            return (
              <motion.div
                key={upd.id}
                className="immutable-card"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="immutable-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#1e3a8a', background: '#eff6ff', border: '1px solid #dbeafe', padding: '2px 8px', borderRadius: 99 }}>
                      {typeLabel}
                    </span>
                    <ImmutableBadge />
                    {upd.classification && (
                      <SensitivityBadge sensitivity={upd.classification} />
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#8a97ab', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} />
                    {addedByUser?.name || upd.addedBy} · {addedByUser?.rank || ''} · {dateStr}
                  </div>
                </div>

                <p className="immutable-text" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
                  {upd.updateText}
                </p>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
