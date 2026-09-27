import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity, Archive, Bell, BriefcaseBusiness, Check, ChevronDown, ChevronLeft, ChevronRight,
  CircleHelp, CloudUpload, Copy, Download, Eye, File, FileArchive, FileImage, FileText,
  FileVideo, Filter, FolderKanban, Grid2X2, Landmark, LockKeyhole, Menu, MoreHorizontal,
  Plus, Search, Settings, Share2, ShieldCheck, SlidersHorizontal, Trash2, Upload, UserPlus,
  Users, X, CheckCircle2, AlertCircle, Clock3, ExternalLink, KeyRound, LogOut, Layers, Link2,
  Lock, Hash, Cpu, BadgeCheck, XCircle, DatabaseZap, UserCheck, ShieldAlert
} from 'lucide-react'
import './styles.css'
import { documents, cases, auditLogs, users, activities } from './services/mockData'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LoginPage } from './components/auth/LoginPage'
import { CasesPage as Phase2CasesPage } from './components/cases/CasesPage'
import { CreateCasePage } from './components/cases/CreateCasePage'
import { CaseDetailPage } from './components/cases/CaseDetailPage'
import { SecurityDashboardPage } from './components/security/SecurityDashboardPage'
import { SettingsPage } from './components/settings/SettingsPage'
import { hasPermission, PERMISSIONS, canCreateCase, getActionTier, ACTION_TIERS } from './services/accessControl'
import { auditService, AUDIT_ACTIONS } from './services/auditService'

const nav = [
  ['Dashboard', Grid2X2], ['Documents', FileText], ['Upload', Upload], ['Search', Search],
  ['Cases', BriefcaseBusiness], ['Shared with Me', Users], ['Audit Log', Archive], ['Users', UserPlus],
  ['System Phases', Layers], ['Settings', Settings],
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

function Header({ menu, setMenu, setActive, user, onSignOut }) {
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const searchRef = useRef()

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'New Case Assigned',
      message: 'DSP Directives: You have been assigned as Lead Officer for Case FIR #2024-8849.',
      time: '10 mins ago',
      unread: true,
      type: 'assignment',
      target: 'Cases'
    },
    {
      id: 2,
      title: 'Senior Directive Update',
      message: 'SP R. K. Sharma posted an update on Case #2025_18: "Complete evidence audit report by 17:00 IST."',
      time: '1 hour ago',
      unread: true,
      type: 'senior_update',
      target: 'Cases'
    },
    {
      id: 3,
      title: 'Document Verified',
      message: 'Inspector General approved Witness_Statement.docx for Case #2025_17.',
      time: '3 hours ago',
      unread: false,
      type: 'approval',
      target: 'Documents'
    }
  ])

  const unreadCount = notifications.filter(n => n.unread).length

  useEffect(() => {
    const shortcut = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [])

  const userName = user?.name || 'Pranshu Kumar'
  const userRole = user?.rank || user?.role || 'Investigation Officer'
  const userInitials = user?.initials || userName.split(' ').map(x => x[0]).join('').slice(0, 2)

  return (
    <header className="topbar">
      <IconButton label="Open navigation" className="mobile-menu" onClick={menu}>
        <Menu />
      </IconButton>
      <label className="global-search">
        <Search size={19} />
        <input
          ref={searchRef}
          placeholder="Search documents, cases, or keywords..."
          onKeyDown={e => e.key === 'Enter' && setActive('Search')}
        />
        <kbd>Ctrl&nbsp; K</kbd>
      </label>
      <div className="header-actions">
        <div className="notification-wrap" style={{ position: 'relative' }}>
          <IconButton
            label="Notifications"
            className="notification"
            onClick={() => {
              setNotifOpen(!notifOpen)
              setProfileOpen(false)
            }}
          >
            <Bell size={21} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 3,
                  right: 3,
                  width: 9,
                  height: 9,
                  background: '#ef4444',
                  borderRadius: '50%',
                  border: '2px solid #ffffff'
                }}
              />
            )}
          </IconButton>
          {notifOpen && (
            <div
              className="notification-menu"
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                width: '340px',
                background: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.18)',
                border: '1px solid #e2e8f0',
                zIndex: 100,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bell size={16} style={{ color: '#1d4ed8' }} />
                  <b style={{ fontSize: 13, color: '#0f172a' }}>Notifications</b>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        background: '#dbeafe',
                        color: '#1d4ed8',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 12
                      }}
                    >
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => setNotifications(notifications.map(n => ({ ...n, unread: false })))}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => {
                      setNotifications(notifications.map(x => (x.id === n.id ? { ...x, unread: false } : x)))
                      setNotifOpen(false)
                      if (n.target) setActive(n.target)
                    }}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f1f5f9',
                      background: n.unread ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start'
                    }}
                  >
                    <span
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                        background:
                          n.type === 'assignment'
                            ? '#dcfce7'
                            : n.type === 'senior_update'
                            ? '#e0e7ff'
                            : '#f1f5f9',
                        color:
                          n.type === 'assignment'
                            ? '#15803d'
                            : n.type === 'senior_update'
                            ? '#4338ca'
                            : '#475569'
                      }}
                    >
                      {n.type === 'assignment' ? (
                        <UserCheck size={16} />
                      ) : n.type === 'senior_update' ? (
                        <ShieldAlert size={16} />
                      ) : (
                        <FileText size={16} />
                      )}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <b style={{ fontSize: 12, color: '#0f172a' }}>{n.title}</b>
                        <span style={{ fontSize: 10, color: '#94a3b8' }}>{n.time}</span>
                      </div>
                      <p style={{ fontSize: 11, color: '#475569', margin: 0, lineHeight: 1.4 }}>{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="profile-wrap">
          <button
            className="profile"
            onClick={() => {
              setProfileOpen(!profileOpen)
              setNotifOpen(false)
            }}
            aria-expanded={profileOpen}
          >
            <span className="avatar">{userInitials}</span>
            <span className="profile-copy">
              <b>{userName}</b>
              <small>{userRole}</small>
            </span>
            <ChevronDown size={16} />
          </button>
          {profileOpen && (
            <div className="profile-menu">
              <button
                onClick={() => {
                  setProfileOpen(false)
                  setActive('Settings')
                }}
              >
                <UserPlus size={16} /> View profile
              </button>
              <button
                onClick={() => {
                  setProfileOpen(false)
                  setActive('Settings')
                }}
              >
                <Settings size={16} /> Preferences
              </button>
              <button
                onClick={() => {
                  setProfileOpen(false)
                  onSignOut?.()
                }}
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function StatCard({ icon: Icon, tone, value, label, onClick }) {
  return (
    <motion.article
      className="stat-card"
      whileHover={{ y: -3, boxShadow: '0 14px 30px rgba(26, 47, 78, .10)' }}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      title={onClick ? `View ${label}` : undefined}
    >
      <span className={`round-icon ${tone}`}>
        <Icon size={25} />
      </span>
      <ChevronRight className="stat-chevron" size={18} />
      <strong>{value}</strong>
      <p>{label}</p>
    </motion.article>
  )
}

function UploadDropzone({ notify }) { const [status, setStatus] = useState('idle'); const [progress, setProgress] = useState(0); const upload = (file) => { if (!file) return; if (file.size > 50 * 1024 * 1024) { setStatus('error'); notify('error', 'Upload could not start', 'The selected file exceeds the 50MB limit.'); return } setStatus('uploading'); setProgress(12); let value = 12; const timer = setInterval(() => { value += 22; setProgress(Math.min(value, 100)); if (value >= 100) { clearInterval(timer); setStatus('success'); notify('success', 'Document uploaded', `${file.name} is now ready for secure review.`) } }, 260) }
return <section className={`upload-card ${status}`} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); upload(e.dataTransfer.files[0]) }}><input id="file-input" type="file" hidden onChange={e => upload(e.target.files[0])}/>{status === 'success' ? <><CheckCircle2 className="upload-main-icon"/><h2>Upload complete</h2><p>Your document was added to the secure workspace.</p><Button variant="secondary" onClick={() => setStatus('idle')}>Upload another</Button></> : <><CloudUpload className="upload-main-icon"/><h2>{status === 'error' ? 'Try another file' : 'Upload a Document'}</h2><p>Drag and drop files here, or click to browse</p>{status === 'uploading' ? <div className="progress"><span style={{ width: `${progress}%` }}/><small>Encrypting file · {progress}%</small></div> : <label className="button primary" htmlFor="file-input">Choose Files</label>}<small>Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 50MB)</small></>}</section> }

function ActivityCard({ setActive }) {
  const iconMap = { upload: Upload, share: Share2, view: Eye, edit: FileText, user: Users }

  const handleActivityClick = item => {
    if (!setActive) return
    if (item.title.includes('Case') || item.title.includes('FIR')) {
      setActive('Cases')
    } else if (item.title.includes('uploaded') || item.title.includes('viewed') || item.icon === 'upload' || item.icon === 'view') {
      setActive('Documents')
    } else if (item.title.includes('Shared') || item.icon === 'share') {
      setActive('Shared with Me')
    } else if (item.title.includes('user') || item.icon === 'user') {
      setActive('Users')
    } else {
      setActive('Audit Log')
    }
  }

  return (
    <section className="panel activity-card">
      <div className="panel-heading">
        <h2>Recent Activity</h2>
        <button onClick={() => setActive?.('Audit Log')}>View all</button>
      </div>
      <div className="activity-list">
        {activities.map(item => {
          const Icon = iconMap[item.icon] || FileText
          return (
            <div
              className="activity"
              key={item.title}
              onClick={() => handleActivityClick(item)}
              style={{ cursor: 'pointer' }}
              title="Click to view related details"
            >
              <span className={`round-icon small ${item.tone}`}>
                <Icon size={17} />
              </span>
              <div>
                <b>{item.title}</b>
                <small>{item.time}</small>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

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

  // Real dynamic stats based on available system records
  const totalDocumentsCount = documents.length
  const activeCasesCount = cases.filter(c => c.status === 'Active' || c.status === 'OPEN' || c.status === 'UNDER_INVESTIGATION').length
  const sharedWithYouCount = cases.filter(c => c.investigator && !c.investigator.includes('Pranshu')).length || 2

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
            <StatCard icon={FileText} tone="blue" value={String(totalDocumentsCount)} label="Total Documents" onClick={() => setActive('Documents')} />
            <StatCard icon={FolderKanban} tone="green" value={String(activeCasesCount)} label="Active Cases" onClick={() => setActive('Cases')} />
            <StatCard icon={Users} tone="purple" value={String(sharedWithYouCount)} label="Shared with You" onClick={() => setActive('Shared with Me')} />
            <StatCard icon={ShieldCheck} tone="orange" value="100%" label="Secure & Encrypted" onClick={() => setActive('Audit Log')} />
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
          <ActivityCard setActive={setActive}/>
          <QuickActions setActive={setActive} onCreateCase={onCreateCase} user={user}/>
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



function PlaceholderPage({ title }) { return <div className="page narrow-page"><PageHeader title={title} text="A tailored secure workspace view for your assigned records."/><section className="empty-state"><span className="round-icon blue"><FileArchive size={28}/></span><h2>Nothing here yet</h2><p>This frontend state is ready to receive data from your secure backend service.</p><Button>Explore documents</Button></section></div> }

function SystemPhasesPage() {
  const [activePhase, setActivePhase] = useState('phase5')

  const phase7Steps = [
    { id: 1, icon: FileText,    color: 'blue',  title: 'Access Request',           desc: 'User requests a specific document from the system', tag: 'REQ' },
    { id: 2, icon: ShieldCheck, color: 'navy',  title: 'User Authorization',       desc: 'JWT token validated + RBAC permission check performed', tag: 'AUTH' },
    { id: 3, icon: DatabaseZap, color: 'navy',  title: 'Document Retrieval',       desc: 'Encrypted document fetched from Secure Storage', tag: 'FETCH' },
    { id: 4, icon: Hash,        color: 'blue',  title: 'SHA-256 Hash Generation',  desc: 'Hash computed from retrieved document (same canonical representation)', tag: 'HASH' },
    { id: 5, icon: Link2,       color: 'navy',  title: 'Blockchain Hash Retrieval',desc: 'Original hash fetched from immutable Blockchain Ledger', tag: 'CHAIN' },
    { id: 6, icon: Cpu,         color: 'navy',  title: 'Hash Comparison',          desc: 'Retrieved hash vs Blockchain hash — byte-for-byte comparison', tag: 'COMPARE' },
  ]

  const phase8Steps = [
    { id: 1, layer: 'FRONTEND', icon: Grid2X2,    color: 'navy',  title: 'Officer Dashboard',     desc: 'Authenticated officer opens the secure dashboard', tag: 'UI' },
    { id: 2, layer: 'FRONTEND', icon: Search,     color: 'navy',  title: 'Document Search',       desc: 'Search by Case ID / Document ID / Keywords', tag: 'SEARCH' },
    { id: 3, layer: 'FRONTEND', icon: ExternalLink,color:'blue',  title: 'Secure API Request',    desc: 'HTTPS encrypted request sent to backend over secure channel', tag: 'API' },
    { id: 4, layer: 'BACKEND',  icon: ShieldCheck,color: 'navy', title: 'Access Verification',   desc: 'RBAC + JWT token — officer permissions verified server-side', tag: 'RBAC' },
    { id: 5, layer: 'BACKEND',  icon: DatabaseZap,color: 'navy', title: 'Document Retrieval',    desc: 'Encrypted document fetched from Secure Storage (remains encrypted)', tag: 'FETCH' },
    { id: 6, layer: 'BACKEND',  icon: Hash,       color: 'navy', title: 'Integrity Verification', desc: 'SHA-256 hash computed and compared with original Blockchain hash', tag: 'VERIFY' },
    { id: 7, layer: 'BACKEND',  icon: Lock,       color: 'blue', title: 'AES-256 Decryption',    desc: 'Decryption ONLY after full authorization + integrity verified', tag: 'DECRYPT' },
    { id: 8, layer: 'FRONTEND', icon: Eye,        color: 'blue', title: 'Display Document',      desc: 'Decrypted document displayed securely to the authorized officer', tag: 'VIEW' },
    { id: 9, layer: 'AUDIT',    icon: Archive,    color: 'navy', title: 'Activity Logging',      desc: 'Search, retrieval, verification, and viewing recorded in Audit Log', tag: 'LOG' },
  ]

  const phase9Steps = [
    { id: 1, icon: Activity,    color: 'navy',  title: 'Activity Collection',   desc: 'Collects logs from Login · Uploads · Downloads · Access Requests · Verifications', tag: 'COLLECT' },
    { id: 2, icon: Archive,     color: 'navy',  title: 'Audit Log Storage',     desc: 'User ID · Doc ID · Timestamp · Action · Result stored in secure database', tag: 'STORE' },
    { id: 3, icon: Eye,         color: 'navy',  title: 'Activity Monitoring',   desc: 'Continuous real-time monitoring of all user actions across the system', tag: 'MONITOR' },
    { id: 4, icon: Cpu,         color: 'blue',  title: 'Security Analysis',     desc: 'Analyzes repeated failed logins · Unauthorized access · Integrity failures', tag: 'ANALYZE' },
  ]

  const phase9AlertSteps = [
    { id: 5, icon: ShieldAlert, color: 'red',   title: 'Generate Security Alert', desc: 'Alert triggered for suspicious or tampered document event' },
    { id: 6, icon: Bell,        color: 'orange',title: 'Notify Administrator',    desc: 'Admin receives real-time notification with full event details' },
    { id: 7, icon: Eye,         color: 'orange',title: 'Review Security Event',   desc: 'Admin investigates and assesses the flagged activity' },
    { id: 8, icon: Archive,     color: 'gray',  title: 'Record Action Taken',     desc: 'Admin response, decision, and resolution permanently logged' },
  ]

  const phase9NormalSteps = [
    { id: 5, icon: Grid2X2,     color: 'blue',  title: 'Update Dashboard',       desc: 'Admin dashboard updated with latest system activity data' },
    { id: 6, icon: FileText,    color: 'blue',  title: 'Generate Audit Report',  desc: 'Reports: access history, user activity, verification results' },
    { id: 7, icon: Activity,    color: 'blue',  title: 'Display System Status',  desc: 'Storage · Blockchain integration · Verification services status' },
  ]

  const phase5Steps = [
    { id: 1, icon: Upload,      color: 'blue',   title: 'Document Upload',         desc: 'Authorized officer uploads document via secure portal', tag: 'INPUT' },
    { id: 2, icon: Lock,        color: 'navy',   title: 'AES-256 Encryption',      desc: 'Document encrypted with military-grade AES-256 key', tag: 'CRYPTO' },
    { id: 3, icon: Hash,        color: 'navy',   title: 'SHA-256 Hash Generation', desc: 'Unique digital fingerprint of the encrypted document', tag: 'HASH' },
    { id: 4, icon: Cpu,         color: 'blue',   title: 'Transaction Creation',    desc: 'Doc ID · Case ID · Hash · Timestamp · User ID bundled', tag: 'TX' },
    { id: 5, icon: ShieldCheck, color: 'blue',   title: 'ECDSA Digital Signature', desc: "Officer's private key cryptographically signs the transaction", tag: 'SIGN' },
    { id: 6, icon: BadgeCheck,  color: 'navy',   title: 'Blockchain Validation',   desc: 'Consensus nodes verify transaction integrity', tag: 'VERIFY' },
    { id: 7, icon: Link2,       color: 'navy',   title: 'Block Creation',          desc: 'New block linked to previous block hash (chain)', tag: 'BLOCK' },
    { id: 8, icon: DatabaseZap, color: 'navy',   title: 'Blockchain Storage',      desc: 'Block appended to the immutable distributed ledger', tag: 'STORE' },
    { id: 9, icon: CheckCircle2,color: 'green',  title: 'Transaction Confirmed',   desc: 'Confirmation ID returned to officer — record secured', tag: 'DONE' },
  ]

  const phase6Steps = [
    { id: 1, icon: UserCheck,   color: 'blue',   title: 'User Login',              desc: 'Officer enters Badge ID and Password via secure portal', tag: 'AUTH' },
    { id: 2, icon: ShieldCheck, color: 'navy',   title: 'Authentication',          desc: 'JWT token verified by backend authentication service', tag: 'JWT' },
    { id: 3, icon: Users,       color: 'navy',   title: 'Role Identification',     desc: 'System retrieves officer rank and role from User Database', tag: 'ROLE' },
    { id: 4, icon: Layers,      color: 'blue',   title: 'Permission Mapping',      desc: 'Role mapped to allowed actions (View/Upload/Update/Admin)', tag: 'MAP' },
    { id: 5, icon: FileText,    color: 'blue',   title: 'Access Request',          desc: 'User requests a specific resource or performs an action', tag: 'REQ' },
    { id: 6, icon: Lock,        color: 'navy',   title: 'Authorization Check',     desc: 'Backend enforces permissions server-side before granting access', tag: 'CHECK' },
  ]

  const rbacRoles = [
    { rank: 'Constable',        level: 'Read Only',                color: '#e2e8f0', text: '#475569' },
    { rank: 'Inspector',        level: 'Read + Upload',            color: '#dbeafe', text: '#1d4ed8' },
    { rank: 'DSP',              level: 'Read + Upload + Update',   color: '#e0e7ff', text: '#4338ca' },
    { rank: 'SP / Commissioner',level: 'Full Access (Admin)',       color: '#dcfce7', text: '#15803d' },
  ]

  const colorMap = {
    blue:  { bg: '#1d4ed8', light: '#eff6ff', border: '#bfdbfe' },
    navy:  { bg: '#0f2d5e', light: '#e8edf5', border: '#c3d0e3' },
    green: { bg: '#15803d', light: '#dcfce7', border: '#86efac' },
  }

  return (
    <div className="page">
      <PageHeader
        title="System Architecture Phases"
        text="Technical implementation of blockchain integrity and role-based access control for police records."
      />

      {/* Phase Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { key: 'phase5', label: 'Phase 5 — Blockchain Integration' },
          { key: 'phase6', label: 'Phase 6 — Role-Based Access Control' },
          { key: 'phase7', label: 'Phase 7 — Verification & Audit Trail' },
          { key: 'phase8', label: 'Phase 8 — Secure Access & Retrieval' },
          { key: 'phase9', label: 'Phase 9 — Monitoring & Final Output' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActivePhase(tab.key)}
            style={{
              padding: '10px 22px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', border: 'none',
              background: activePhase === tab.key ? '#0f2d5e' : '#f1f5f9',
              color: activePhase === tab.key ? '#fff' : '#475569',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* PHASE 5 */}
      {activePhase === 'phase5' && (
        <>
          <section className="panel" style={{ padding: '20px 24px', marginBottom: 20, borderLeft: '4px solid #1d4ed8' }}>
            <p style={{ fontSize: 13, color: '#0f2d5e', fontWeight: 600, marginBottom: 4 }}>PHASE 5 · BLOCKCHAIN INTEGRATION</p>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>Cryptographic Document Integrity via Blockchain</h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              Documents are AES-256 encrypted and stored in a secure database. Only their SHA-256 hash and transaction metadata are written to the blockchain — ensuring tamper-proof audit trails without exposing sensitive content.
            </p>
          </section>

          {/* Workflow Steps */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
            {phase5Steps.map((step, i) => {
              const c = colorMap[step.color]
              const Icon = step.icon
              return (
                <motion.div
                  key={step.id}
                  whileHover={{ y: -4, boxShadow: '0 12px 28px rgba(15,45,94,0.15)' }}
                  style={{
                    background: '#fff', border: `1.5px solid ${c.border}`, borderRadius: 12,
                    padding: '16px 18px', flex: '1 1 200px', minWidth: 180, maxWidth: 230,
                    cursor: 'default', transition: 'box-shadow 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ background: c.bg, color: '#fff', borderRadius: 8, width: 32, height: 32, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <Icon size={16} />
                    </span>
                    <span style={{ background: c.light, color: c.bg, fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, letterSpacing: 0.5 }}>{step.tag}</span>
                    <span style={{ marginLeft: 'auto', background: '#f1f5f9', color: '#64748b', fontSize: 11, fontWeight: 700, borderRadius: 20, width: 22, height: 22, display: 'grid', placeItems: 'center' }}>{step.id}</span>
                  </div>
                  <p style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', margin: '0 0 5px' }}>{step.title}</p>
                  <p style={{ fontSize: 11, color: '#64748b', margin: 0, lineHeight: 1.5 }}>{step.desc}</p>
                  {i < phase5Steps.length - 1 && (
                    <div style={{ marginTop: 10, textAlign: 'right', color: '#94a3b8', fontSize: 16 }}>→</div>
                  )}
                </motion.div>
              )
            })}
          </div>

          {/* Storage Split */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <section className="panel" style={{ borderLeft: '4px solid #64748b', padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Lock size={18} style={{ color: '#0f2d5e' }} />
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0 }}>Secure Encrypted Document Database</h3>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12, color: '#475569', lineHeight: 2 }}>
                <li><CheckCircle2 size={13} style={{ color: '#15803d', marginRight: 6, verticalAlign: 'middle' }}/>Stores AES-256 encrypted documents</li>
                <li><CheckCircle2 size={13} style={{ color: '#15803d', marginRight: 6, verticalAlign: 'middle' }}/>Access: Authorized Personnel Only</li>
                <li><CheckCircle2 size={13} style={{ color: '#15803d', marginRight: 6, verticalAlign: 'middle' }}/>Indexed by Document ID</li>
                <li><CheckCircle2 size={13} style={{ color: '#15803d', marginRight: 6, verticalAlign: 'middle' }}/>Separate from Blockchain</li>
              </ul>
            </section>
            <section className="panel" style={{ borderLeft: '4px solid #1d4ed8', padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Link2 size={18} style={{ color: '#1d4ed8' }} />
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0 }}>Blockchain Ledger</h3>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12, color: '#475569', lineHeight: 2 }}>
                <li><CheckCircle2 size={13} style={{ color: '#1d4ed8', marginRight: 6, verticalAlign: 'middle' }}/>Stores SHA-256 Hashes only</li>
                <li><CheckCircle2 size={13} style={{ color: '#1d4ed8', marginRight: 6, verticalAlign: 'middle' }}/>Transaction Metadata (Doc ID, Case ID, User ID, Timestamp)</li>
                <li><CheckCircle2 size={13} style={{ color: '#1d4ed8', marginRight: 6, verticalAlign: 'middle' }}/>Block Header + Previous Block Hash</li>
                <li style={{ color: '#dc2626', fontWeight: 700 }}><AlertCircle size={13} style={{ marginRight: 6, verticalAlign: 'middle', color: '#dc2626' }}/>NOT the actual documents</li>
              </ul>
            </section>
          </div>
        </>
      )}

      {/* PHASE 9 */}
      {activePhase === 'phase9' && (
        <>
          <section className="panel" style={{ padding: '20px 24px', marginBottom: 20, borderLeft: '4px solid #7c3aed' }}>
            <p style={{ fontSize: 13, color: '#6d28d9', fontWeight: 600, marginBottom: 4 }}>PHASE 9 · SYSTEM MONITORING AND FINAL OUTPUT</p>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>Real-Time Monitoring, Security Analysis & Transparent Reporting</h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              All system activities are continuously collected, stored, and analyzed. Suspicious events trigger real-time alerts to administrators. Normal operations update the dashboard and generate audit reports. The final output is a secure, tamper-evident, blockchain-verified document management system for police records.
            </p>
          </section>

          {/* Main workflow steps */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Main Flow (Steps 1–4)</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {phase9Steps.map(step => {
                const cMap = { navy: { bg: '#0f2d5e', light: '#e8edf5', border: '#c3d0e3' }, blue: { bg: '#1d4ed8', light: '#eff6ff', border: '#bfdbfe' } }
                const c = cMap[step.color]
                const Icon = step.icon
                return (
                  <motion.div key={step.id} whileHover={{ y: -4, boxShadow: '0 12px 28px rgba(15,45,94,0.15)' }}
                    style={{ background: '#fff', border: `1.5px solid ${c.border}`, borderRadius: 12, padding: '16px 18px', flex: '1 1 200px', minWidth: 180 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ background: c.bg, color: '#fff', borderRadius: 8, width: 32, height: 32, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon size={16}/></span>
                      <span style={{ background: c.light, color: c.bg, fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, letterSpacing: 0.5 }}>{step.tag}</span>
                      <span style={{ marginLeft: 'auto', background: '#f1f5f9', color: '#64748b', fontSize: 11, fontWeight: 700, borderRadius: 20, width: 22, height: 22, display: 'grid', placeItems: 'center' }}>{step.id}</span>
                    </div>
                    <p style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', margin: '0 0 5px' }}>{step.title}</p>
                    <p style={{ fontSize: 11, color: '#64748b', margin: 0, lineHeight: 1.5 }}>{step.desc}</p>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Decision + Two branches */}
          <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '18px 22px', marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>Decision — Suspicious Activity Detected?</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

              {/* YES Branch */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 }}>🚨 YES — Alert Flow</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {phase9AlertSteps.map(step => {
                    const styleMap = {
                      red:    { bg: '#dc2626', light: '#fee2e2', border: '#fca5a5', text: '#fff' },
                      orange: { bg: '#ea580c', light: '#fff7ed', border: '#fdba74', text: '#fff' },
                      gray:   { bg: '#475569', light: '#f1f5f9', border: '#cbd5e1', text: '#fff' },
                    }
                    const c = styleMap[step.color]
                    const Icon = step.icon
                    return (
                      <div key={step.id} style={{ background: c.light, border: `1.5px solid ${c.border}`, borderRadius: 10, padding: '12px 15px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ background: c.bg, color: '#fff', borderRadius: 7, width: 28, height: 28, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon size={14}/></span>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: 12, color: '#0f172a', margin: '0 0 3px' }}>{step.title}</p>
                          <p style={{ fontSize: 11, color: '#64748b', margin: 0, lineHeight: 1.4 }}>{step.desc}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* NO Branch */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#15803d', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 }}>✅ NO — Normal Flow</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {phase9NormalSteps.map(step => {
                    const c = { bg: '#1d4ed8', light: '#eff6ff', border: '#bfdbfe' }
                    const Icon = step.icon
                    return (
                      <div key={step.id} style={{ background: c.light, border: `1.5px solid ${c.border}`, borderRadius: 10, padding: '12px 15px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ background: c.bg, color: '#fff', borderRadius: 7, width: 28, height: 28, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon size={14}/></span>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: 12, color: '#0f172a', margin: '0 0 3px' }}>{step.title}</p>
                          <p style={{ fontSize: 11, color: '#64748b', margin: 0, lineHeight: 1.4 }}>{step.desc}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Side components */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
            <section className="panel" style={{ borderLeft: '4px solid #475569', padding: '16px 18px' }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Audit Database</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.9 }}>
                <li><CheckCircle2 size={12} style={{ color: '#15803d', marginRight: 6, verticalAlign: 'middle' }}/>Immutable activity records</li>
                <li><CheckCircle2 size={12} style={{ color: '#15803d', marginRight: 6, verticalAlign: 'middle' }}/>Indexed by User ID / Doc ID</li>
                <li><CheckCircle2 size={12} style={{ color: '#15803d', marginRight: 6, verticalAlign: 'middle' }}/>Encrypted at rest</li>
                <li><CheckCircle2 size={12} style={{ color: '#15803d', marginRight: 6, verticalAlign: 'middle' }}/>Full timestamp trail</li>
              </ul>
            </section>
            <section className="panel" style={{ borderLeft: '4px solid #ea580c', padding: '16px 18px' }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Alert Notification</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.9 }}>
                <li><AlertCircle size={12} style={{ color: '#dc2626', marginRight: 6, verticalAlign: 'middle' }}/>Real-time security alerts</li>
                <li><AlertCircle size={12} style={{ color: '#dc2626', marginRight: 6, verticalAlign: 'middle' }}/>Event: User ID + Action</li>
                <li><AlertCircle size={12} style={{ color: '#dc2626', marginRight: 6, verticalAlign: 'middle' }}/>Timestamp + Severity level</li>
              </ul>
            </section>
            <section className="panel" style={{ borderLeft: '4px solid #1d4ed8', padding: '16px 18px' }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Administrator Dashboard</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.9 }}>
                <li><CheckCircle2 size={12} style={{ color: '#1d4ed8', marginRight: 6, verticalAlign: 'middle' }}/>Security alerts panel</li>
                <li><CheckCircle2 size={12} style={{ color: '#1d4ed8', marginRight: 6, verticalAlign: 'middle' }}/>Document access logs</li>
                <li><CheckCircle2 size={12} style={{ color: '#1d4ed8', marginRight: 6, verticalAlign: 'middle' }}/>User activity reports</li>
                <li><CheckCircle2 size={12} style={{ color: '#1d4ed8', marginRight: 6, verticalAlign: 'middle' }}/>System health status</li>
              </ul>
            </section>
          </div>

          {/* Final Output */}
          <section style={{ background: 'linear-gradient(135deg, #0f2d5e 0%, #1d4ed8 100%)', borderRadius: 14, padding: '22px 28px', color: '#fff' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>FINAL OUTPUT</p>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 16px', color: '#fff' }}>Secure Digital Document Management System for Police Records</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {[
                { label: 'Tamper-evident audit trail',              icon: Archive },
                { label: 'Blockchain-verified document integrity',  icon: Link2 },
                { label: 'Role-based access enforcement (RBAC)',    icon: ShieldCheck },
                { label: 'AES-256 encryption at rest',             icon: Lock },
                { label: 'Real-time security monitoring',          icon: Activity },
                { label: 'Transparent reporting for police records',icon: FileText },
              ].map(item => {
                const Icon = item.icon
                return (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px' }}>
                    <CheckCircle2 size={16} style={{ color: '#4ade80', flexShrink: 0 }}/>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#e0f2fe', lineHeight: 1.4 }}>{item.label}</span>
                  </div>
                )
              })}
            </div>
          </section>
        </>
      )}

      {/* PHASE 8 */}
      {activePhase === 'phase8' && (
        <>
          <section className="panel" style={{ padding: '20px 24px', marginBottom: 20, borderLeft: '4px solid #0284c7' }}>
            <p style={{ fontSize: 13, color: '#0369a1', fontWeight: 600, marginBottom: 4 }}>PHASE 8 · SECURE DOCUMENT ACCESS AND RETRIEVAL</p>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>End-to-End Secure Search, Retrieval, Decryption & Display</h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              Authorized officers can search, retrieve, and view police records through a fully secured pipeline. Documents remain AES-256 encrypted in storage. Decryption happens only after RBAC authorization and SHA-256 blockchain integrity verification pass. Every action is permanently logged.
            </p>
          </section>

          {/* Swim-lane workflow */}
          {[
            {
              layer: 'FRONTEND', color: '#eff6ff', border: '#bfdbfe',
              steps: phase8Steps.filter(s => s.layer === 'FRONTEND'),
            },
            {
              layer: 'BACKEND', color: '#e8edf5', border: '#c3d0e3',
              steps: phase8Steps.filter(s => s.layer === 'BACKEND'),
            },
            {
              layer: 'AUDIT', color: '#f0fdf4', border: '#86efac',
              steps: phase8Steps.filter(s => s.layer === 'AUDIT'),
            },
          ].map(lane => (
            <div key={lane.layer} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, border: `1.5px solid ${lane.border}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ background: lane.border, color: '#0f172a', fontWeight: 800, fontSize: 11, letterSpacing: 1, writingMode: 'vertical-lr', textOrientation: 'mixed', transform: 'rotate(180deg)', padding: '14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 36, textTransform: 'uppercase' }}>
                  {lane.layer}
                </div>
                <div style={{ background: lane.color, padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: 12, flex: 1 }}>
                  {lane.steps.map(step => {
                    const c = colorMap[step.color]
                    const Icon = step.icon
                    return (
                      <motion.div
                        key={step.id}
                        whileHover={{ y: -3, boxShadow: '0 8px 20px rgba(15,45,94,0.13)' }}
                        style={{ background: '#fff', border: `1.5px solid ${c.border}`, borderRadius: 10, padding: '13px 15px', flex: '1 1 160px', minWidth: 150 }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                          <span style={{ background: c.bg, color: '#fff', borderRadius: 7, width: 28, height: 28, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                            <Icon size={14} />
                          </span>
                          <span style={{ background: c.light, color: c.bg, fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, letterSpacing: 0.4 }}>{step.tag}</span>
                          <span style={{ marginLeft: 'auto', background: '#f1f5f9', color: '#64748b', fontSize: 10, fontWeight: 700, borderRadius: 20, width: 20, height: 20, display: 'grid', placeItems: 'center' }}>{step.id}</span>
                        </div>
                        <p style={{ fontWeight: 700, fontSize: 12, color: '#0f172a', margin: '0 0 4px' }}>{step.title}</p>
                        <p style={{ fontSize: 11, color: '#64748b', margin: 0, lineHeight: 1.5 }}>{step.desc}</p>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}

          {/* Verification Decision branches */}
          <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '18px 22px', marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Verification Decision — Step 6</p>
            <p style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginBottom: 14 }}>⚠ AES-256 decryption only proceeds after BOTH access authorization AND integrity verification pass</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#ecfeff', border: '1.5px solid #67e8f9', borderRadius: 10, padding: '16px 18px' }}>
                <b style={{ fontSize: 13, color: '#164e63', display: 'block', marginBottom: 10 }}>✅ PASS — Hash Match + Access Authorized</b>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12, color: '#155e75', lineHeight: 1.9 }}>
                  <li>→ AES-256 Decryption triggered</li>
                  <li>→ Decrypted document displayed to officer</li>
                  <li>→ Activity logged: Action = VIEW · Result = SUCCESS</li>
                </ul>
              </div>
              <div style={{ background: '#fff1f2', border: '1.5px solid #fda4af', borderRadius: 10, padding: '16px 18px' }}>
                <b style={{ fontSize: 13, color: '#881337', display: 'block', marginBottom: 10 }}>❌ FAIL — Access Denied or Hash Mismatch</b>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12, color: '#9f1239', lineHeight: 1.9 }}>
                  <li>→ Document access blocked immediately</li>
                  <li>→ Security alert generated (if tampering detected)</li>
                  <li>→ Activity logged: Action = BLOCKED · Result = DENIED</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Storage + Blockchain side panels */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <section className="panel" style={{ borderLeft: '4px solid #64748b', padding: '18px 20px' }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>Secure Storage</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12, color: '#475569', lineHeight: 2 }}>
                <li><CheckCircle2 size={13} style={{ color: '#15803d', marginRight: 6, verticalAlign: 'middle' }}/>AES-256 Encrypted Documents</li>
                <li><CheckCircle2 size={13} style={{ color: '#15803d', marginRight: 6, verticalAlign: 'middle' }}/>Document stored encrypted at rest</li>
                <li><CheckCircle2 size={13} style={{ color: '#15803d', marginRight: 6, verticalAlign: 'middle' }}/>Access: Backend Only</li>
              </ul>
            </section>
            <section className="panel" style={{ borderLeft: '4px solid #1d4ed8', padding: '18px 20px' }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>Blockchain Ledger</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12, color: '#475569', lineHeight: 2 }}>
                <li><CheckCircle2 size={13} style={{ color: '#1d4ed8', marginRight: 6, verticalAlign: 'middle' }}/>Immutable SHA-256 Hash Records</li>
                <li><CheckCircle2 size={13} style={{ color: '#1d4ed8', marginRight: 6, verticalAlign: 'middle' }}/>Original document fingerprint</li>
                <li><CheckCircle2 size={13} style={{ color: '#1d4ed8', marginRight: 6, verticalAlign: 'middle' }}/>Tamper-proof history</li>
              </ul>
            </section>
          </div>

          {/* Audit Log */}
          <section className="panel" style={{ borderLeft: '4px solid #475569', padding: '18px 22px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Archive size={16} style={{ color: '#475569' }}/> Audit Log — All Actions Recorded
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 10 }}>
              {[
                { field: 'Officer ID',          example: 'USR-20942' },
                { field: 'Document ID',          example: 'DOC-78341' },
                { field: 'Case ID',              example: 'CASE-2026-001' },
                { field: 'Action',               example: 'SEARCH / VIEW / BLOCK' },
                { field: 'Timestamp',            example: '26 Sep 2026, 14:28' },
                { field: 'Verification Result',  example: 'SUCCESS / DENIED' },
                { field: 'IP Address',           example: '192.168.1.45' },
              ].map(item => (
                <div key={item.field} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: 0.4 }}>{item.field}</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', margin: 0, fontFamily: 'monospace' }}>{item.example}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* PHASE 7 */}
      {activePhase === 'phase7' && (
        <>
          <section className="panel" style={{ padding: '20px 24px', marginBottom: 20, borderLeft: '4px solid #0891b2' }}>
            <p style={{ fontSize: 13, color: '#0e7490', fontWeight: 600, marginBottom: 4 }}>PHASE 7 · DOCUMENT VERIFICATION & AUDIT TRAIL</p>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>SHA-256 Hash Verification Against Blockchain Ledger</h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              Every document access triggers a real-time hash verification. The retrieved document's SHA-256 hash is compared against the original hash stored on the blockchain. Both use the same canonical document representation. Every action — verified or blocked — is permanently recorded in the Audit Log.
            </p>
          </section>

          {/* Main workflow steps */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
            {phase7Steps.map((step) => {
              const c = colorMap[step.color]
              const Icon = step.icon
              return (
                <motion.div
                  key={step.id}
                  whileHover={{ y: -4, boxShadow: '0 12px 28px rgba(15,45,94,0.15)' }}
                  style={{
                    background: '#fff', border: `1.5px solid ${c.border}`, borderRadius: 12,
                    padding: '16px 18px', flex: '1 1 170px', minWidth: 160,
                    cursor: 'default',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ background: c.bg, color: '#fff', borderRadius: 8, width: 32, height: 32, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <Icon size={16} />
                    </span>
                    <span style={{ background: c.light, color: c.bg, fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, letterSpacing: 0.5 }}>{step.tag}</span>
                    <span style={{ marginLeft: 'auto', background: '#f1f5f9', color: '#64748b', fontSize: 11, fontWeight: 700, borderRadius: 20, width: 22, height: 22, display: 'grid', placeItems: 'center' }}>{step.id}</span>
                  </div>
                  <p style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', margin: '0 0 5px' }}>{step.title}</p>
                  <p style={{ fontSize: 11, color: '#64748b', margin: 0, lineHeight: 1.5 }}>{step.desc}</p>
                </motion.div>
              )
            })}
          </div>

          {/* Side components */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <section className="panel" style={{ borderLeft: '4px solid #64748b', padding: '18px 20px' }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Lock size={15} style={{ color: '#0f2d5e' }} /> Secure Document Storage
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12, color: '#475569', lineHeight: 2 }}>
                <li><CheckCircle2 size={13} style={{ color: '#15803d', marginRight: 6, verticalAlign: 'middle' }}/>AES-256 Encrypted Files</li>
                <li><CheckCircle2 size={13} style={{ color: '#15803d', marginRight: 6, verticalAlign: 'middle' }}/>Indexed by Document ID</li>
                <li><CheckCircle2 size={13} style={{ color: '#15803d', marginRight: 6, verticalAlign: 'middle' }}/>Authorized Access Only</li>
              </ul>
              <p style={{ fontSize: 11, color: '#0891b2', fontWeight: 600, marginTop: 8 }}>↓ Feeds into: Document Retrieval step</p>
            </section>
            <section className="panel" style={{ borderLeft: '4px solid #1d4ed8', padding: '18px 20px' }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link2 size={15} style={{ color: '#1d4ed8' }} /> Blockchain Ledger
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12, color: '#475569', lineHeight: 2 }}>
                <li><CheckCircle2 size={13} style={{ color: '#1d4ed8', marginRight: 6, verticalAlign: 'middle' }}/>Immutable SHA-256 Hash Records</li>
                <li><CheckCircle2 size={13} style={{ color: '#1d4ed8', marginRight: 6, verticalAlign: 'middle' }}/>Transaction Metadata</li>
                <li><CheckCircle2 size={13} style={{ color: '#1d4ed8', marginRight: 6, verticalAlign: 'middle' }}/>Tamper-proof history</li>
              </ul>
              <p style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 600, marginTop: 8 }}>↓ Feeds into: Blockchain Hash Retrieval step</p>
            </section>
          </div>

          {/* Decision branches */}
          <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '18px 22px', marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Hash Comparison — Verification Decision</p>
            <p style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginBottom: 14 }}>⚠ Both hashes must use the same canonical document representation for a valid comparison</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#ecfeff', border: '1.5px solid #67e8f9', borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <CheckCircle2 size={18} style={{ color: '#0891b2' }} />
                  <b style={{ fontSize: 14, color: '#164e63' }}>HASH MATCH — Integrity Verified</b>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12, color: '#155e75', lineHeight: 1.9 }}>
                  <li>✅ Document is untampered and authentic</li>
                  <li>✅ User granted authorized document access</li>
                  <li>✅ Audit Log: Action = ACCESS · Result = VERIFIED</li>
                </ul>
              </div>
              <div style={{ background: '#fff7ed', border: '1.5px solid #fdba74', borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <ShieldAlert size={18} style={{ color: '#dc2626' }} />
                  <b style={{ fontSize: 14, color: '#7c2d12' }}>HASH MISMATCH — Tampering Detected</b>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12, color: '#9a3412', lineHeight: 1.9 }}>
                  <li>❌ Possible tampering detected — hash values differ</li>
                  <li>❌ Document access restricted or flagged immediately</li>
                  <li>🚨 Security Alert sent to Administrator</li>
                  <li>❌ Audit Log: Action = BLOCKED · Result = TAMPERED</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Audit Log */}
          <section className="panel" style={{ borderLeft: '4px solid #475569', padding: '18px 22px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Archive size={16} style={{ color: '#475569' }} /> Audit Log — Immutable Record (Both Branches)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {[
                { field: 'User ID', example: 'USR-20942' },
                { field: 'Document ID', example: 'DOC-78341' },
                { field: 'Timestamp', example: '26 Sep 2026, 14:22' },
                { field: 'Action Performed', example: 'ACCESS / BLOCKED' },
                { field: 'Verification Result', example: 'VERIFIED / TAMPERED' },
                { field: 'IP Address', example: '192.168.1.45' },
              ].map(item => (
                <div key={item.field} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: 0.4 }}>{item.field}</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', margin: 0, fontFamily: 'monospace' }}>{item.example}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* PHASE 6 */}
      {activePhase === 'phase6' && (
        <>
          <section className="panel" style={{ padding: '20px 24px', marginBottom: 20, borderLeft: '4px solid #7c3aed' }}>
            <p style={{ fontSize: 13, color: '#5b21b6', fontWeight: 600, marginBottom: 4 }}>PHASE 6 · ROLE-BASED ACCESS CONTROL</p>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>Hierarchical Permission System for Police Records</h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              All permissions are enforced server-side by the backend before access is granted. User roles are mapped to police ranks (Constable → Commissioner), each with specific allowed actions. Every access attempt — granted or denied — is recorded in the Audit Log.
            </p>
          </section>

          {/* Main flow */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
            {phase6Steps.map((step, i) => {
              const c = colorMap[step.color]
              const Icon = step.icon
              return (
                <motion.div
                  key={step.id}
                  whileHover={{ y: -4, boxShadow: '0 12px 28px rgba(15,45,94,0.15)' }}
                  style={{
                    background: '#fff', border: `1.5px solid ${c.border}`, borderRadius: 12,
                    padding: '16px 18px', flex: '1 1 180px', minWidth: 170,
                    cursor: 'default',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ background: c.bg, color: '#fff', borderRadius: 8, width: 32, height: 32, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <Icon size={16} />
                    </span>
                    <span style={{ background: c.light, color: c.bg, fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, letterSpacing: 0.5 }}>{step.tag}</span>
                    <span style={{ marginLeft: 'auto', background: '#f1f5f9', color: '#64748b', fontSize: 11, fontWeight: 700, borderRadius: 20, width: 22, height: 22, display: 'grid', placeItems: 'center' }}>{step.id}</span>
                  </div>
                  <p style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', margin: '0 0 5px' }}>{step.title}</p>
                  <p style={{ fontSize: 11, color: '#64748b', margin: 0, lineHeight: 1.5 }}>{step.desc}</p>
                </motion.div>
              )
            })}
          </div>

          {/* Decision branches */}
          <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '18px 22px', marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Authorization Decision</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#dcfce7', border: '1.5px solid #86efac', borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <CheckCircle2 size={18} style={{ color: '#15803d' }} />
                  <b style={{ fontSize: 14, color: '#14532d' }}>YES — Grant Access</b>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12, color: '#166534', lineHeight: 1.9 }}>
                  <li>✅ Perform Authorized Action</li>
                  <li>✅ View · Upload · Download · Update</li>
                  <li>✅ Action recorded in Audit Log</li>
                </ul>
              </div>
              <div style={{ background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <XCircle size={18} style={{ color: '#dc2626' }} />
                  <b style={{ fontSize: 14, color: '#7f1d1d' }}>NO — Deny Access</b>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12, color: '#991b1b', lineHeight: 1.9 }}>
                  <li>❌ 403 Forbidden — Insufficient Permissions</li>
                  <li>❌ Error message displayed to user</li>
                  <li>❌ Denied attempt logged to Audit Log</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Role table */}
          <section className="panel documents-panel">
            <div className="panel-heading">
              <h2>Police Ranks &amp; Permission Levels</h2>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Rank / Role</th>
                    <th>Permission Level</th>
                    <th>View</th>
                    <th>Upload</th>
                    <th>Update</th>
                    <th>Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { rank: 'Constable',         level: 'Read Only',              v: true,  u: false, upd: false, a: false },
                    { rank: 'Head Constable',     level: 'Read Only',              v: true,  u: false, upd: false, a: false },
                    { rank: 'Inspector',          level: 'Read + Upload',          v: true,  u: true,  upd: false, a: false },
                    { rank: 'DSP',               level: 'Read + Upload + Update', v: true,  u: true,  upd: true,  a: false },
                    { rank: 'SP / Commissioner', level: 'Full Access (Admin)',     v: true,  u: true,  upd: true,  a: true  },
                  ].map(r => (
                    <tr key={r.rank}>
                      <td><b>{r.rank}</b></td>
                      <td><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#f1f5f9', fontWeight: 700 }}>{r.level}</span></td>
                      {[r.v, r.u, r.upd, r.a].map((val, i) => (
                        <td key={i} style={{ textAlign: 'center' }}>
                          {val
                            ? <CheckCircle2 size={16} style={{ color: '#15803d' }} />
                            : <XCircle     size={16} style={{ color: '#dc2626' }} />}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

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
    'System Phases': <SystemPhasesPage/>,
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
