import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Activity, Shield, FileText, AlertCircle, HardDrive, Filter, Clock, CheckCircle2, User
} from 'lucide-react'
import { db } from '../../services/mockCaseData'
import { useAuth } from '../../context/AuthContext'
import { caseService } from '../../services/caseService'
import { VersionBadge } from '../shared/StatusBadge'

const TYPE_FILTERS = [
  { id: 'ALL', label: 'All Events' },
  { id: 'EVIDENCE', label: 'Evidence', icon: Shield },
  { id: 'STATEMENT', label: 'Witness Statements', icon: FileText },
  { id: 'FACT', label: 'Case Facts', icon: AlertCircle },
  { id: 'UPDATE', label: 'Investigation Updates', icon: Activity },
  { id: 'DOCUMENT', label: 'Documents', icon: HardDrive },
  { id: 'AUDIT', label: 'Security Activity', icon: Shield },
]

export function InvestigationHistory({ caseId }) {
  const { user } = useAuth()
  const [filter, setFilter] = useState('ALL')
  const [events, setEvents] = useState([])

  useEffect(() => {
    try {
      const history = caseService.getCaseActivity(user, caseId)
      setEvents(history)
    } catch (err) {
      console.error(err)
    }
  }, [caseId, user])

  const filteredEvents = filter === 'ALL'
    ? events
    : events.filter(e => filter === 'DOCUMENT'
      ? ['DOCUMENT', 'DOCUMENT_VERSION'].includes(e.type)
      : e.type === filter)

  const getEventIcon = (type) => {
    switch (type) {
      case 'EVIDENCE': return <Shield size={14} color="#2563eb" />
      case 'STATEMENT': return <FileText size={14} color="#0891b2" />
      case 'FACT': return <AlertCircle size={14} color="#d97706" />
      case 'UPDATE': return <Activity size={14} color="#16a34a" />
      case 'DOCUMENT': return <HardDrive size={14} color="#7c3aed" />
      case 'AUDIT': return <Shield size={14} color="#dc2626" />
      default: return <Clock size={14} color="#64748b" />
    }
  }

  const getEventBadgeClass = (type) => {
    switch (type) {
      case 'EVIDENCE': return 'badge-info'
      case 'STATEMENT': return 'badge-secondary'
      case 'FACT': return 'badge-warning'
      case 'UPDATE': return 'badge-success'
      case 'DOCUMENT': return 'badge-purple'
      case 'AUDIT': return 'badge-danger'
      default: return 'badge-neutral'
    }
  }

  return (
    <div className="case-tab-content">
      {/* Immutability Audit Banner */}
      <div className="immutable-banner">
        <div className="immutable-banner-icon">
          <CheckCircle2 size={18} />
        </div>
        <div>
          <h4 className="immutable-banner-title">Complete Immutable Audit Trail</h4>
          <p className="immutable-banner-desc">
            This timeline provides a unified, tamper-evident chronological ledger of all actions, submissions, supplementary statements, corrections, and documents recorded for this case.
          </p>
        </div>
      </div>

      {/* Filter Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0 14px', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a2332' }}>
            Unified Investigation Timeline ({filteredEvents.length})
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6a7b95' }}>
            Ordered chronologically from most recent action
          </p>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TYPE_FILTERS.map(f => (
            <button
              key={f.id}
              className={`button btn-sm ${filter === f.id ? 'primary' : 'secondary'}`}
              onClick={() => setFilter(f.id)}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline view */}
      {filteredEvents.length === 0 ? (
        <div className="empty-state">
          <Clock size={36} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
          <h4 style={{ margin: '0 0 6px', color: '#475569' }}>No Activity Recorded</h4>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
            No actions match the selected filter.
          </p>
        </div>
      ) : (
        <div className="history-timeline" style={{ position: 'relative', paddingLeft: 24, borderLeft: '2px solid #e2e8f0', marginLeft: 12 }}>
          {filteredEvents.map((evt, idx) => {
            const userObj = db.getUserById(evt.by)
            const dateStr = new Date(evt.date).toLocaleDateString('en-IN', {
              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
            })

            return (
              <motion.div
                key={evt.id + '-' + idx}
                className="timeline-item"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                style={{ position: 'relative', marginBottom: 20 }}
              >
                {/* Timeline dot */}
                <div style={{
                  position: 'absolute',
                  left: -33,
                  top: 0,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#fff',
                  border: '2px solid #3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6' }} />
                </div>

                <div className="panel" style={{ padding: '12px 16px', background: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {getEventIcon(evt.type)}
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                        {evt.label}
                      </span>
                      {evt.version && <VersionBadge version={evt.version} />}
                    </div>
                    <span style={{ fontSize: 11, color: '#64748b' }}>
                      {dateStr}
                    </span>
                  </div>

                  <p style={{ margin: '4px 0 8px', fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                    {evt.detail}
                  </p>

                  <div style={{ fontSize: 11, color: '#8a97ab', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <User size={12} />
                    Logged by: <strong>{userObj?.name || evt.by}</strong> · <span>{userObj?.rank || 'Authorized Personnel'}</span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
