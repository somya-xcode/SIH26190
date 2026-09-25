import React, { useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, CheckCircle2, Download, Filter, Search,
  ShieldAlert, ShieldCheck, SlidersHorizontal, XCircle
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { auditService } from '../../services/auditService'

const ACTION_GROUPS = [
  ['ALL', 'All actions'],
  ['AUTHENTICATION', 'Authentication'],
  ['DOCUMENT', 'Documents & integrity'],
  ['CASE', 'Cases & records'],
  ['ACCESS', 'Restricted access'],
]

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function SecurityDashboardPage() {
  const { user } = useAuth()
  const [logs, setLogs] = useState([])
  const [summary, setSummary] = useState({ total: 0, successful: 0, denied: 0, integrityEvents: 0, restrictedAttempts: 0 })
  const [filters, setFilters] = useState({ search: '', category: 'ALL', result: 'ALL', range: 'ALL', action: 'ALL', caseId: 'ALL', documentId: 'ALL', actorId: 'ALL' })
  const [error, setError] = useState('')

  const query = useMemo(() => {
    if (filters.range === 'ALL') return {}
    const from = new Date()
    from.setDate(from.getDate() - Number(filters.range))
    return { from: from.toISOString() }
  }, [filters.range])

  useEffect(() => {
    try {
      const nextFilters = { search: filters.search, category: filters.category, result: filters.result, action: filters.action, caseId: filters.caseId, documentId: filters.documentId, actorId: filters.actorId, ...query }
      setLogs(auditService.getLogs(user, nextFilters))
      setSummary(auditService.getSummary(user, nextFilters))
      setError('')
    } catch (err) {
      setLogs([])
      setSummary({ total: 0, successful: 0, denied: 0, integrityEvents: 0, restrictedAttempts: 0 })
      setError(err.message)
    }
  }, [user, filters.search, filters.category, filters.result, filters.action, filters.caseId, filters.documentId, filters.actorId, query])

  const updateFilter = (key, value) => setFilters(current => ({ ...current, [key]: value }))
  const clearFilters = () => setFilters({ search: '', category: 'ALL', result: 'ALL', range: 'ALL', action: 'ALL', caseId: 'ALL', documentId: 'ALL', actorId: 'ALL' })
  const actionOptions = [...new Set(logs.map(log => log.action).filter(Boolean))].sort()
  const caseOptions = [...new Set(logs.filter(log => log.caseId).map(log => `${log.caseId}|${log.resourceLabel || log.caseId}`))].sort()
  const documentOptions = [...new Set(logs.filter(log => log.resourceType?.startsWith('DOCUMENT')).map(log => `${log.resourceId}|${log.resourceLabel || log.resourceId}`))].sort()
  const userOptions = [...new Set(logs.filter(log => log.actorId).map(log => `${log.actorId}|${log.actorName || log.actorId}`))].sort()

  const downloadAudit = () => {
    try {
      const csv = auditService.exportCsv(user, { search: filters.search, category: filters.category, result: filters.result, action: filters.action, caseId: filters.caseId, documentId: filters.documentId, actorId: filters.actorId, ...query })
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'docguard-audit-trail.csv'
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    }
  }

  if (error) {
    return (
      <div className="page narrow-page">
        <section className="page-title">
          <div><p className="eyebrow">SECURITY OPERATIONS</p><h1>Security dashboard</h1><span>Security telemetry is restricted to authorized supervisors and auditors.</span></div>
        </section>
        <section className="empty-state security-denied">
          <ShieldAlert size={42} />
          <h2>Authorization required</h2>
          <p>{error}</p>
          <small>Attempted access has been recorded in the immutable security trail.</small>
        </section>
      </div>
    )
  }

  return (
    <div className="page security-page">
      <section className="page-title">
        <div>
          <p className="eyebrow">SECURITY OPERATIONS</p>
          <h1>Security dashboard</h1>
          <span>Monitor authentication, record integrity, and authorization events.</span>
        </div>
        <button className="button secondary" onClick={downloadAudit}><Download size={16} /> Export CSV</button>
      </section>

      <div className="security-summary-grid">
        <article className="security-stat"><span className="round-icon blue"><Activity size={20} /></span><strong>{summary.total}</strong><small>Events in view</small></article>
        <article className="security-stat"><span className="round-icon green"><CheckCircle2 size={20} /></span><strong>{summary.successful}</strong><small>Successful actions</small></article>
        <article className="security-stat"><span className="round-icon orange"><XCircle size={20} /></span><strong>{summary.denied}</strong><small>Denied / failed</small></article>
        <article className="security-stat"><span className="round-icon purple"><ShieldCheck size={20} /></span><strong>{summary.integrityEvents}</strong><small>Integrity checks</small></article>
      </div>

      <section className="panel security-filters">
        <label className="security-search"><Search size={17} /><input value={filters.search} onChange={e => updateFilter('search', e.target.value)} placeholder="Search user, resource, action, or detail" /></label>
        <label><span>Event group</span><select value={filters.category} onChange={e => updateFilter('category', e.target.value)}>{ACTION_GROUPS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label><span>Action</span><select value={filters.action} onChange={e => updateFilter('action', e.target.value)}><option value="ALL">All actions</option>{actionOptions.map(action => <option value={action} key={action}>{action.replace(/_/g, ' ')}</option>)}</select></label>
        <label><span>Case</span><select value={filters.caseId} onChange={e => updateFilter('caseId', e.target.value)}><option value="ALL">All cases</option>{caseOptions.map(option => { const [id, label] = option.split('|'); return <option value={id} key={id}>{label}</option> })}</select></label>
        <label><span>Document</span><select value={filters.documentId} onChange={e => updateFilter('documentId', e.target.value)}><option value="ALL">All documents</option>{documentOptions.map(option => { const [id, label] = option.split('|'); return <option value={id} key={id}>{label}</option> })}</select></label>
        <label><span>User</span><select value={filters.actorId} onChange={e => updateFilter('actorId', e.target.value)}><option value="ALL">All users</option>{userOptions.map(option => { const [id, label] = option.split('|'); return <option value={id} key={id}>{label}</option> })}</select></label>
        <label><span>Result</span><select value={filters.result} onChange={e => updateFilter('result', e.target.value)}><option value="ALL">All results</option><option value="SUCCESS">Success</option><option value="DENIED">Denied</option><option value="FAILURE">Failed</option></select></label>
        <label><span>Time range</span><select value={filters.range} onChange={e => updateFilter('range', e.target.value)}><option value="ALL">All time</option><option value="1">Last 24 hours</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select></label>
        <button className="filter-clear" onClick={clearFilters}><SlidersHorizontal size={15} /> Clear</button>
      </section>

      <section className="panel documents-panel security-log-panel">
        <div className="panel-heading"><div><h2>Immutable audit trail</h2><small className="security-caption"><Filter size={13} /> {logs.length} matching events · append-only</small></div><span className="audit-retention"><ShieldCheck size={14} /> Tamper-evident</span></div>
        {logs.length === 0 ? <div className="empty-state"><AlertTriangle size={28} /><h2>No matching events</h2><p>Try adjusting the security dashboard filters.</p></div> : (
          <div className="table-wrap"><table><thead><tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Resource</th><th>Result</th><th>Source</th></tr></thead><tbody>{logs.map(log => (
            <tr key={log.id}><td className="muted">{formatTime(log.timestamp)}</td><td><b>{log.actorName || log.actorId}</b><small className="table-subtext">{log.actorId} · {log.actorRank || 'Unknown rank'}</small></td><td><span className={`audit-action ${log.category.toLowerCase()}`}>{log.action.replace(/_/g, ' ')}</span><small className="table-subtext">{log.details || '—'}</small></td><td>{log.resourceLabel || log.resourceId || '—'}</td><td><span className={`audit-result ${log.result.toLowerCase()}`}>{log.result === 'SUCCESS' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}{log.result}</span></td><td className="muted">{log.ipAddress || 'mock-client'}<small className="table-subtext">{log.device || 'Mock client'}</small></td></tr>
          ))}</tbody></table></div>
        )}
      </section>
    </div>
  )
}
