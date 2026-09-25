import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity, Archive, Bell, BriefcaseBusiness, Check, ChevronDown, ChevronLeft, ChevronRight,
  CircleHelp, CloudUpload, Copy, Download, Eye, File, FileArchive, FileImage, FileText,
  FileVideo, Filter, FolderKanban, Grid2X2, Landmark, LockKeyhole, Menu, MoreHorizontal,
  Plus, Search, Settings, Share2, ShieldCheck, SlidersHorizontal, Trash2, Upload, UserPlus,
  Users, X, CheckCircle2, AlertCircle, Clock3, ExternalLink, KeyRound, LogOut
} from 'lucide-react'
import './styles.css'
import { documents, cases, auditLogs, users, activities } from './services/mockData'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LoginPage } from './components/auth/LoginPage'
import { CasesPage as Phase2CasesPage } from './components/cases/CasesPage'
import { CreateCasePage } from './components/cases/CreateCasePage'
import { CaseDetailPage } from './components/cases/CaseDetailPage'
import { SecurityDashboardPage } from './components/security/SecurityDashboardPage'
import { hasPermission, PERMISSIONS, canCreateCase, getActionTier, ACTION_TIERS } from './services/accessControl'
import { auditService, AUDIT_ACTIONS } from './services/auditService'

const nav = [
  ['Dashboard', Grid2X2], ['Documents', FileText], ['Upload', Upload], ['Search', Search],
  ['Cases', BriefcaseBusiness], ['Shared with Me', Users], ['Audit Log', Archive], ['Users', UserPlus], ['Settings', Settings],
]
const navPermission = {
  Documents: PERMISSIONS.VIEW_DOCUMENTS,
  Upload: PERMISSIONS.UPLOAD_DOCUMENTS,
  Search: PERMISSIONS.SEARCH_CASE_RECORDS,
  'Shared with Me': PERMISSIONS.VIEW_DOCUMENTS,
  'Audit Log': PERMISSIONS.VIEW_AUDIT_LOG,
  Users: PERMISSIONS.MANAGE_USERS,
}
const typeStyle = { PDF: 'pdf', Image: 'image', Document: 'document', Video: 'video' }

function IconButton({ label, children, className = '', onClick }) { return <button className={`icon-button ${className}`} onClick={onClick} aria-label={label}>{children}</button> }
function Button({ children, variant = 'primary', className = '', ...props }) { return <motion.button whileHover={{ y: -1 }} whileTap={{ scale: .98 }} className={`button ${variant} ${className}`} {...props}>{children}</motion.button> }
function TypeBadge({ type }) { return <span className={`type-badge ${typeStyle[type] || 'document'}`}>{type}</span> }

function Toast({ toast, clear }) { return <AnimatePresence>{toast && <motion.div className={`toast ${toast.type}`} initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 18, opacity: 0 }}><span>{toast.type === 'error' ? <AlertCircle /> : <CheckCircle2 />}</span><div><strong>{toast.title}</strong><p>{toast.text}</p></div><IconButton label="Dismiss notification" onClick={clear}><X size={16}/></IconButton></motion.div>}</AnimatePresence> }

function ConfirmDialog({ open, onClose, onConfirm, documentName }) { return <AnimatePresence>{open && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div className="modal" initial={{ scale: .97, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .97, y: 10 }} role="dialog" aria-modal="true" aria-labelledby="confirm-title"><div className="modal-icon warning"><AlertCircle /></div><h2 id="confirm-title">Delete document?</h2><p><strong>{documentName}</strong> will be permanently removed from the workspace. This cannot be undone.</p><div className="modal-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={onConfirm}>Delete document</Button></div></motion.div></motion.div>}</AnimatePresence> }

function Sidebar({ active, setActive, open, setOpen, onSelectNav, user }) {
  const canSeeCases = [PERMISSIONS.VIEW_ASSIGNED_CASES, PERMISSIONS.VIEW_STATION_CASES, PERMISSIONS.VIEW_DISTRICT_CASES, PERMISSIONS.VIEW_STATE_CASES, PERMISSIONS.VIEW_LEGAL_CASES, PERMISSIONS.VIEW_FORENSIC_EVIDENCE, PERMISSIONS.VIEW_CYBER_CASES].some(permission => hasPermission(user, permission))
  const visibleNav = nav.filter(([name]) => name === 'Dashboard' || name === 'Settings' || name === 'Cases' ? (name === 'Cases' ? canSeeCases : true) : hasPermission(user, navPermission[name]))
  return <aside className={`sidebar ${open ? 'open' : ''}`}><div className="brand"><span className="brand-mark"><img src="/images/government-emblem.png" alt="Government of India emblem" /></span><div><b>Ministry of Home Affairs</b><small>Government of India</small><em>Secure Digital Documentation Management System</em></div></div><nav>{visibleNav.map(([name, Icon]) => <button key={name} className={`nav-item ${active === name ? 'active' : ''}`} onClick={() => { onSelectNav ? onSelectNav(name) : setActive(name); setOpen(false) }}><Icon size={20}/><span>{name}</span></button>)}</nav><div className="sidebar-footer"><div></div></div></aside>
}

function Header({ menu, setMenu, setActive, user, onSignOut }) { const [profileOpen, setProfileOpen] = useState(false); const searchRef = useRef(); useEffect(() => { const shortcut = e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchRef.current?.focus() } }; window.addEventListener('keydown', shortcut); return () => window.removeEventListener('keydown', shortcut) }, []); const userName = user?.name || 'Pranshu Kumar'; const userRole = user?.rank || user?.role || 'Investigation Officer'; const userInitials = user?.initials || userName.split(' ').map(x => x[0]).join('').slice(0, 2); return <header className="topbar"><IconButton label="Open navigation" className="mobile-menu" onClick={menu}><Menu/></IconButton><label className="global-search"><Search size={19}/><input ref={searchRef} placeholder="Search documents, cases, or keywords..." onKeyDown={e => e.key === 'Enter' && setActive('Search')}/><kbd>Ctrl&nbsp; K</kbd></label><div className="header-actions"><IconButton label="Notifications" className="notification"><Bell size={21}/><i/></IconButton><div className="profile-wrap"><button className="profile" onClick={() => setProfileOpen(!profileOpen)} aria-expanded={profileOpen}><span className="avatar">{userInitials}</span><span className="profile-copy"><b>{userName}</b><small>{userRole}</small></span><ChevronDown size={16}/></button>{profileOpen && <div className="profile-menu"><button onClick={() => { setProfileOpen(false); setActive('Settings'); }}><UserPlus size={16}/> View profile</button><button onClick={() => { setProfileOpen(false); setActive('Settings'); }}><Settings size={16}/> Preferences</button><button onClick={() => { setProfileOpen(false); onSignOut?.(); }}><LogOut size={16}/> Sign out</button></div>}</div></div></header> }

function StatCard({ icon: Icon, tone, value, label }) { return <motion.article className="stat-card" whileHover={{ y: -3, boxShadow: '0 14px 30px rgba(26, 47, 78, .10)' }}><span className={`round-icon ${tone}`}><Icon size={25}/></span><ChevronRight className="stat-chevron" size={18}/><strong>{value}</strong><p>{label}</p></motion.article> }

function UploadDropzone({ notify }) { const [status, setStatus] = useState('idle'); const [progress, setProgress] = useState(0); const upload = (file) => { if (!file) return; if (file.size > 50 * 1024 * 1024) { setStatus('error'); notify('error', 'Upload could not start', 'The selected file exceeds the 50MB limit.'); return } setStatus('uploading'); setProgress(12); let value = 12; const timer = setInterval(() => { value += 22; setProgress(Math.min(value, 100)); if (value >= 100) { clearInterval(timer); setStatus('success'); notify('success', 'Document uploaded', `${file.name} is now ready for secure review.`) } }, 260) }
return <section className={`upload-card ${status}`} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); upload(e.dataTransfer.files[0]) }}><input id="file-input" type="file" hidden onChange={e => upload(e.target.files[0])}/>{status === 'success' ? <><CheckCircle2 className="upload-main-icon"/><h2>Upload complete</h2><p>Your document was added to the secure workspace.</p><Button variant="secondary" onClick={() => setStatus('idle')}>Upload another</Button></> : <><CloudUpload className="upload-main-icon"/><h2>{status === 'error' ? 'Try another file' : 'Upload a Document'}</h2><p>Drag and drop files here, or click to browse</p>{status === 'uploading' ? <div className="progress"><span style={{ width: `${progress}%` }}/><small>Encrypting file · {progress}%</small></div> : <label className="button primary" htmlFor="file-input">Choose Files</label>}<small>Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 50MB)</small></>}</section> }

function ActivityCard() { const iconMap = { upload: Upload, share: Share2, view: Eye, edit: FileText, user: Users }; return <section className="panel activity-card"><div className="panel-heading"><h2>Recent Activity</h2><button>View all</button></div><div className="activity-list">{activities.map(item => { const Icon = iconMap[item.icon]; return <div className="activity" key={item.title}><span className={`round-icon small ${item.tone}`}><Icon size={17}/></span><div><b>{item.title}</b><small>{item.time}</small></div></div> })}</div></section> }

function QuickActions({ setActive, onCreateCase, user }) {
  const canUpload = hasPermission(user, PERMISSIONS.UPLOAD_DOCUMENTS)
  const canCreate = canCreateCase(user)

  const quick = []
  if (canUpload) quick.push([Upload, 'Upload Document', () => setActive('Upload')])
  if (canCreate) quick.push([FolderKanban, 'Create New Case', () => { setActive('Cases'); onCreateCase?.(); }])
  if (hasPermission(user, PERMISSIONS.SEARCH_CASE_RECORDS)) quick.push([Search, 'Search Documents', () => setActive('Search')])
  if ([PERMISSIONS.VIEW_ASSIGNED_CASES, PERMISSIONS.VIEW_STATION_CASES, PERMISSIONS.VIEW_DISTRICT_CASES, PERMISSIONS.VIEW_STATE_CASES].some(permission => hasPermission(user, permission))) {
    quick.push([BriefcaseBusiness, 'View Cases', () => setActive('Cases')])
  }
  if (hasPermission(user, PERMISSIONS.VIEW_DOCUMENTS)) quick.push([Share2, 'Share a File', () => setActive('Shared with Me')])

  return (
    <section className="panel quick-actions">
      <h2>Quick Actions</h2>
      {quick.slice(0, 4).map(([Icon, label, act]) => (
        <button key={label} onClick={act}>
          <Icon size={18}/>
          <span>{label}</span>
          <ChevronRight size={16}/>
        </button>
      ))}
    </section>
  )
}

function SecurityCard() { return <section className="security-card"><span className="round-icon green"><ShieldCheck size={27}/></span><div><b>Your Data is Protected</b><p>End-to-end encryption<br/>Blockchain verified logs<br/>Access controlled & monitored</p></div><ChevronRight size={17}/></section> }

function RowMenu({ doc, onDelete, notify, onView }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const record = (action, details) => auditService.record({ action, user, resourceType: 'DOCUMENT', resourceId: doc.id, resourceLabel: doc.name, details })
  return <div className="row-menu"><IconButton label={`Actions for ${doc.name}`} onClick={() => setOpen(!open)}><MoreHorizontal size={19}/></IconButton>{open && <div className="dropdown"><button onClick={() => { record(AUDIT_ACTIONS.DOCUMENT_VIEW, 'Document opened from workspace list.'); onView?.(doc); notify('success', 'Document opened', `${doc.name} opened in secure preview.`) }}><Eye/> View</button><button onClick={() => { record(AUDIT_ACTIONS.DOCUMENT_DOWNLOAD, 'Secure download requested.'); notify('success', 'Download prepared', 'A secure download is being prepared.') }}><Download/> Download</button><button onClick={() => { record(AUDIT_ACTIONS.DOCUMENT_SHARED, 'Secure sharing link requested.'); notify('success', 'Sharing enabled', 'A secure sharing link has been created.') }}><Share2/> Share</button><button onClick={() => notify('success', 'Integrity verified', 'The file hash matches its audit record.')}><ShieldCheck/> Verify Integrity</button><button className="danger-text" onClick={() => onDelete(doc)}><Trash2/> Delete</button></div>}</div>
}

function DocumentTable({ docs = documents, onDelete, notify, onView, title = 'Recent Documents', showViewAll = true }) { return <section className="panel documents-panel"><div className="panel-heading"><h2>{title}</h2>{showViewAll && <button>View all</button>}</div><div className="table-wrap"><table><thead><tr><th>Name</th><th>Case</th><th>Type</th><th>Uploaded On</th><th className="actions-head">Actions</th></tr></thead><tbody>{docs.map(doc => <tr key={doc.id}><td><span className="file-name">{doc.type === 'PDF' ? <FileText/> : doc.type === 'Image' ? <FileImage/> : doc.type === 'Video' ? <FileVideo/> : <File/>}{doc.name}</span></td><td className="muted">{doc.case}</td><td><TypeBadge type={doc.type}/></td><td className="muted">{doc.uploaded}</td><td><RowMenu doc={doc} onDelete={onDelete} notify={notify} onView={onView}/></td></tr>)}</tbody></table></div></section> }

function Dashboard({ setActive, notify, onDelete, user, onCreateCase }) {
  const firstName = user?.name?.split(' ')[0] || 'Pranshu'
  const canUpload = hasPermission(user, PERMISSIONS.UPLOAD_DOCUMENTS)
  const canViewDocuments = hasPermission(user, PERMISSIONS.VIEW_DOCUMENTS)

  return (
    <div className="page dashboard-page">
      <section className="hero">
        <div>
          <h1>Welcome back, {firstName}</h1>
          <p>Manage, access, and secure your legal and investigation documents — all in one place.</p>
        </div>
        <em>“Secure records. Stronger justice.”</em>
      </section>
      <div className="dashboard-grid">
        <main>
          <section className="stats-grid">
            <StatCard icon={FileText} tone="blue" value="128" label="Total Documents"/>
            <StatCard icon={FolderKanban} tone="green" value="24" label="Active Cases"/>
            <StatCard icon={Users} tone="purple" value="8" label="Shared with You"/>
            <StatCard icon={ShieldCheck} tone="orange" value="100%" label="Secure & Encrypted"/>
          </section>
          <section className="upload-grid">
            {canUpload ? (
              <UploadDropzone notify={notify}/>
            ) : (
              <section className="upload-card idle" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px 20px' }}>
                <ShieldCheck className="upload-main-icon" style={{ color: '#2563eb' }} />
                <h2 style={{ fontSize: 17, margin: '8px 0 4px' }}>Investigation Record Access</h2>
                <p style={{ maxWidth: 380, margin: '4px 0 14px', fontSize: 12, color: '#5c6d8b', lineHeight: 1.4 }}>
                  Your official rank (<strong>{user?.rank}</strong>) operates under <strong>Investigation Record</strong> permissions. Record entry & upload functions are managed by lead investigators.
                </p>
                <Button variant="secondary" onClick={() => setActive('Cases')}>View Authorized Cases</Button>
              </section>
            )}
          </section>
          {canViewDocuments ? <DocumentTable onDelete={onDelete} notify={notify} onView={() => setActive('Document Detail')}/> : (
            <section className="panel documents-panel"><div className="panel-heading"><h2>Document workspace</h2></div><p className="muted">Document content access is not granted for this account by default.</p></section>
          )}
        </main>
        <aside className="dashboard-side">
          <ActivityCard/>
          <QuickActions setActive={setActive} onCreateCase={onCreateCase} user={user}/>
          <SecurityCard/>
        </aside>
      </div>
    </div>
  )
}

function PageHeader({ title, text, action, children }) { return <><section className="page-title"><div><p className="eyebrow">SECURE WORKSPACE</p><h1>{title}</h1><span>{text}</span></div>{action}</section>{children}</> }

function DocumentsPage({ notify, onDelete, setActive }) {
  const { user } = useAuth()
  const canUpload = hasPermission(user, PERMISSIONS.UPLOAD_DOCUMENTS)

  return (
    <div className="page">
      <PageHeader
        title="Documents"
        text="Organize and protect every file in your investigation."
        action={
          canUpload ? (
            <Button onClick={() => setActive('Upload')}><Upload size={17}/> Upload document</Button>
          ) : (
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, padding: '6px 12px', background: '#f1f5f9', borderRadius: 6 }}>⚡ Record Access: View Only</span>
          )
        }
      />
      <section className="filter-bar">
        <label><Search size={18}/><input placeholder="Search documents"/></label>
        <button><Filter size={17}/> All types <ChevronDown size={15}/></button>
        <button><SlidersHorizontal size={17}/> More filters</button>
      </section>
      <DocumentTable title="All Documents" showViewAll={false} docs={[...documents, { id: 6, name: 'Chain_of_Custody.pdf', case: 'Case #2025_15', type: 'PDF', uploaded: '06 Sep 2026' }]} notify={notify} onDelete={onDelete} onView={() => setActive('Document Detail')}/>
    </div>
  )
}

function DocumentDetail({ notify, setActive }) {
  const doc = documents[0];
  const fullHash = '8f91a7c2e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7';
  const versions = [
    { ver: 'V2 (Current)', by: 'Pranshu Kumar', date: '12 Sep 2026, 10:24 AM', reason: 'Updated investigation annexure and witness details', hash: fullHash },
    { ver: 'V1', by: 'Pranshu Kumar', date: '10 Sep 2026, 09:15 AM', reason: 'Initial document upload', hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
  ];
  const details = [
    ['File name', doc.name],
    ['File type', 'PDF document'],
    ['Current version', 'V2 (Current)'],
    ['Uploaded on', '12 Sep 2026, 10:24 AM'],
    ['Case association', 'Case #2026-001'],
    ['Document owner', 'Pranshu Kumar'],
    ['Current status', 'Active'],
    ['Access permissions', 'Investigation team · 5 members']
  ];
  return (
    <div className="page">
      <button className="back-button" onClick={() => setActive('Documents')}>
        <ChevronLeft size={16}/> Back to documents
      </button>
      <PageHeader
        title={doc.name}
        text="Immutable legal document record, version history, and cryptographic SHA-256 integrity proof."
        action={
          <div className="action-row">
            <Button variant="secondary" onClick={() => notify('success', 'Download prepared', 'Preparing secure download stream.')}>
              <Download size={17}/> Download
            </Button>
            <Button onClick={() => {
              navigator.clipboard?.writeText(fullHash);
              notify('success', 'SHA-256 Hash Copied', 'Full 64-character SHA-256 hash copied to clipboard.');
            }}>
              <ShieldCheck size={17}/> Copy SHA-256 Hash
            </Button>
          </div>
        }
      />
      <div className="details-layout">
        <section className="panel detail-card">
          <div className="file-preview"><FileText size={48}/><span>PDF</span></div>
          <div className="detail-list">
            {details.map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}
          </div>
        </section>
        <section className="verification">
          <div className="verify-header">
            <span><ShieldCheck/></span>
            <div>
              <p>DOCUMENT INTEGRITY</p>
              <h2>SHA-256 Integrity Verified</h2>
              <small>Calculated file hash strictly matches database audit record.</small>
            </div>
          </div>
          <div className="verify-grid">
            <div>
              <small>SHA-256 Hash (V2)</small>
              <code style={{ wordBreak: 'break-all', fontSize: 11 }}>{fullHash}</code>
              <button style={{ marginTop: 6 }} onClick={() => {
                navigator.clipboard?.writeText(fullHash);
                notify('success', 'Hash copied', 'The full 64-character SHA-256 hash was copied to your clipboard.');
              }}>
                <Copy size={14}/> Copy hash
              </button>
            </div>
            <div><small>Verification timestamp</small><b>12 Sep 2026, 10:25 AM</b></div>
            <div><small>Version status</small><b style={{ color: '#059669' }}>V2 — CURRENT</b></div>
            <div><small>Audit status</small><b className="verified"><CheckCircle2 size={16}/> Verified Untampered</b></div>
          </div>
        </section>
      </div>

      {/* Version History Table */}
      <section className="panel documents-panel" style={{ marginTop: 18 }}>
        <div className="panel-heading">
          <h2>Document Version History (Immutable Audit Log)</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Version</th>
                <th>Uploaded By</th>
                <th>Timestamp</th>
                <th>Change Reason</th>
                <th>SHA-256 Hash</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {versions.map(v => (
                <tr key={v.ver}>
                  <td><b>{v.ver}</b></td>
                  <td>{v.by}</td>
                  <td className="muted">{v.date}</td>
                  <td>{v.reason}</td>
                  <td><code style={{ fontSize: 10 }}>{v.hash.slice(0, 20)}...</code></td>
                  <td><span className="result"><CheckCircle2 size={14}/> Preserved</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function UploadPage({ notify, setActive }) {
  const { user } = useAuth()
  const canUpload = hasPermission(user, PERMISSIONS.UPLOAD_DOCUMENTS)

  if (!canUpload) {
    return (
      <div className="page narrow-page">
        <PageHeader title="Upload document" text="Add a file to a case with secure, auditable handling." />
        <section className="empty-state" style={{ padding: 40, textAlign: 'center' }}>
          <span className="round-icon" style={{ background: '#eff6ff', color: '#2563eb', width: 56, height: 56, display: 'grid', placeItems: 'center', borderRadius: '50%', margin: '0 auto 14px' }}>
            <ShieldCheck size={28} />
          </span>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Investigation Record Level</h2>
          <p style={{ maxWidth: 440, margin: '8px auto 16px', color: '#64748b', fontSize: 13 }}>
            Your official position (<strong>{user?.rank}</strong>) is assigned to <strong>Investigation Record</strong> permissions (View & Verify). Direct document upload is restricted to Investigation Officers and Supervisors.
          </p>
          <Button variant="secondary" onClick={() => setActive('Cases')}>Back to Cases</Button>
        </section>
      </div>
    )
  }

  return (
    <div className="page narrow-page">
      <PageHeader title="Upload document" text="Add a file to a case with secure, auditable handling."/>
      <UploadDropzone notify={notify}/>
      <section className="panel upload-notes">
        <ShieldCheck/>
        <div>
          <h3>Secure upload handling</h3>
          <p>Uploads are shown as a frontend demonstration. A production workflow would request upload URLs and integrity verification from the backend.</p>
        </div>
      </section>
    </div>
  )
}

function AuditPage() { return <div className="page"><PageHeader title="Audit Log" text="An immutable-style activity record for document and case operations."/><section className="filter-bar"><label><Search size={18}/><input placeholder="Search audit activity"/></label><button><Filter size={17}/> All activity</button><button>Last 30 days <ChevronDown size={15}/></button></section><section className="panel documents-panel"><div className="table-wrap"><table><thead><tr><th>User</th><th>Action</th><th>Document / Case</th><th>Timestamp</th><th>IP / Device</th><th>Result</th></tr></thead><tbody>{auditLogs.map(log => <tr key={log.id}><td><b>{log.user}</b></td><td>{log.action}</td><td className="muted">{log.subject}</td><td className="muted">{log.time}</td><td className="muted">{log.device}</td><td><span className="result"><CheckCircle2/> {log.result}</span></td></tr>)}</tbody></table></div></section></div> }

function SearchPage({ notify, onDelete, setActive }) { const [query, setQuery] = useState(''); const results = useMemo(() => documents.filter(d => d.name.toLowerCase().includes(query.toLowerCase()) || d.case.toLowerCase().includes(query.toLowerCase())), [query]); return <div className="page"><PageHeader title="Advanced Search" text="Find records by metadata, case context, ownership, and verification status."/><section className="search-form"><label><span>Keyword</span><div><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Document name or keyword"/></div></label>{['Document type','Case','Owner','Date range','Verification status','User'].map(item => <label key={item}><span>{item}</span><button>{item === 'Date range' ? 'Any time' : `All ${item.toLowerCase()}s`}<ChevronDown size={15}/></button></label>)}<Button><Search size={17}/> Search records</Button></section><div className="filter-chips applied"><span>Active filters:</span><button>Integrity verified <X size={14}/></button><button>Last 90 days <X size={14}/></button></div><DocumentTable title={`${results.length} Results`} showViewAll={false} docs={results} notify={notify} onDelete={onDelete} onView={() => setActive('Document Detail')}/></div> }

function UsersPage({ notify }) { return <div className="page"><PageHeader title="Users & Access" text="Manage users, role-based access, and account status." action={<Button onClick={() => notify('success', 'Invite ready', 'An invitation form would open here.')}><UserPlus size={17}/> Add user</Button>}/><section className="panel users-panel"><div className="table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Department</th><th>Access level</th><th>Status</th><th>Last active</th><th></th></tr></thead><tbody>{users.map(u => <tr key={u.name}><td><span className="user-cell"><span className="avatar small-avatar">{u.initials}</span><b>{u.name}</b></span></td><td>{u.role}</td><td className="muted">{u.department}</td><td><TypeBadge type={u.access}/></td><td><span className={`status ${u.status.toLowerCase()}`}>{u.status}</span></td><td className="muted">{u.lastActive}</td><td><IconButton label={`Manage ${u.name}`}><MoreHorizontal size={19}/></IconButton></td></tr>)}</tbody></table></div></section></div> }

function SettingsPage({ notify }) { const settings = [['Profile', 'Personal information and assigned role', UserPlus], ['Security', 'Password, multi-factor authentication, and sessions', LockKeyhole], ['Notification Preferences', 'Choose when you are notified', Bell], ['Access Control', 'Default collaboration permissions', KeyRound], ['Audit Settings', 'Log retention and verification', Archive], ['System Preferences', 'Language, date, and workspace settings', SlidersHorizontal]]; return <div className="page narrow-page"><PageHeader title="Settings" text="Control your Secure Digital Documentation Management System workspace and security preferences."/>{settings.map(([title, text, Icon]) => <motion.button className="settings-item" key={title} whileHover={{ y: -2 }} onClick={() => notify('success', `${title} selected`, 'This setting panel is ready to connect to your API.')}><span className="round-icon blue"><Icon size={20}/></span><span><b>{title}</b><small>{text}</small></span><ChevronRight size={18}/></motion.button>)}</div> }

function PlaceholderPage({ title }) { return <div className="page narrow-page"><PageHeader title={title} text="A tailored secure workspace view for your assigned records."/><section className="empty-state"><span className="round-icon blue"><FileArchive size={28}/></span><h2>Nothing here yet</h2><p>This frontend state is ready to receive data from your secure backend service.</p><Button>Explore documents</Button></section></div> }

function Skeleton() { return <div className="page"><div className="skeleton hero-skeleton"/><div className="skeleton-grid">{[1,2,3,4].map(x=><div className="skeleton" key={x}/>)}</div><div className="skeleton large"/></div> }

function DashboardShell() {
  const { user, logout } = useAuth()
  const [active, setActive] = useState('Dashboard')
  const [caseSubView, setCaseSubView] = useState('list') // 'list' | 'create' | 'detail'
  const [selectedCaseId, setSelectedCaseId] = useState(null)
  const [menu, setMenu] = useState(false)
  const [toast, setToast] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [loading, setLoading] = useState(true)

  const notify = (type, title, text) => {
    setToast({ type, title, text })
    setTimeout(() => setToast(null), 4200)
  }

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 460)
    return () => clearTimeout(t)
  }, [])

  const deleteDoc = doc => setConfirm(doc)
  const confirmDelete = () => {
    auditService.recordDenied({ user, action: AUDIT_ACTIONS.RESTRICTED_ACCESS_ATTEMPT, resourceType: 'DOCUMENT', resourceLabel: confirm.name, reason: 'Physical deletion of legal documents is forbidden; records are preserved through status changes and new versions.' })
    notify('error', 'Deletion blocked', 'Legal documents are immutable. Use a status change or create a new version instead.')
    setConfirm(null)
  }

  const handleNavSelect = (name) => {
    setActive(name)
    if (name === 'Cases') {
      setCaseSubView('list')
      setSelectedCaseId(null)
    }
  }

  const handleOpenCase = (id) => {
    setSelectedCaseId(id)
    setCaseSubView('detail')
  }

  const handleCreateCase = () => {
    setCaseSubView('create')
  }

  const renderCasesView = () => {
    if (caseSubView === 'detail' && selectedCaseId) {
      return (
        <CaseDetailPage
          caseId={selectedCaseId}
          onBack={() => setCaseSubView('list')}
          notify={notify}
        />
      )
    }
    if (caseSubView === 'create') {
      return (
        <CreateCasePage
          onBack={() => setCaseSubView('list')}
          onCreated={(newCase) => {
            setSelectedCaseId(newCase.id)
            setCaseSubView('detail')
            notify('success', 'Case Created', `Case ${newCase.caseNumber} has been opened.`)
          }}
        />
      )
    }
    return (
      <Phase2CasesPage
        onOpenCase={handleOpenCase}
        onCreateCase={handleCreateCase}
      />
    )
  }

  const pages = {
    Dashboard: (
      <Dashboard
        setActive={setActive}
        notify={notify}
        onDelete={deleteDoc}
        user={user}
        onCreateCase={() => { setActive('Cases'); setCaseSubView('create'); }}
      />
    ),
    Documents: <DocumentsPage notify={notify} onDelete={deleteDoc} setActive={setActive}/>,
    Upload: <UploadPage notify={notify} setActive={setActive}/>,
    Search: <SearchPage notify={notify} onDelete={deleteDoc} setActive={setActive}/>,
    Cases: renderCasesView(),
    'Shared with Me': <PlaceholderPage title="Shared with Me"/>,
    'Audit Log': <SecurityDashboardPage/>,
    Users: <UsersPage notify={notify}/>,
    Settings: <SettingsPage notify={notify}/>,
    'Document Detail': <DocumentDetail notify={notify} setActive={setActive}/>,
  }

  return (
    <div className="app-shell">
      <Sidebar
        active={active}
        setActive={setActive}
        open={menu}
        setOpen={setMenu}
        onSelectNav={handleNavSelect}
        user={user}
      />
      {menu && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMenu(false)}/>}
      <div className="content">
        <Header menu={() => setMenu(true)} setActive={setActive} user={user} onSignOut={logout}/>
        <AnimatePresence mode="wait">
          <motion.div
            key={active + (active === 'Cases' ? '-' + caseSubView + '-' + (selectedCaseId || '') : '')}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: .22 }}
          >
            {loading ? <Skeleton/> : pages[active]}
          </motion.div>
        </AnimatePresence>
      </div>
      <Toast toast={toast} clear={() => setToast(null)}/>
      <ConfirmDialog open={!!confirm} documentName={confirm?.name} onClose={() => setConfirm(null)} onConfirm={confirmDelete}/>
    </div>
  )
}

function MainRouter() {
  const { isAuthenticated, loading, currentRoute, navigate } = useAuth()
  if (loading) {
    return (
      <div className="login-root">
        <div className="login-shell" style={{ textAlign: 'center' }}>
          <div className="brand-mark-login" style={{ margin: '0 auto 16px' }}>
            <ShieldCheck size={28} />
          </div>
          <p style={{ color: '#8da4c4', fontSize: 13 }}>Verifying Secure Documentation Security Session...</p>
        </div>
      </div>
    )
  }
  if (!isAuthenticated) {
    return <LoginPage />
  }
  if (currentRoute === '/login') {
    navigate('/')
  }
  return <DashboardShell />
}

function App() {
  return (
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  )
}

createRoot(document.getElementById('root')).render(<App />)
