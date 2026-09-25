/**
 * DocGuard – Phase 2 Mock Case Data Store
 * In-memory data store simulating PostgreSQL tables.
 * All investigation records are immutable — never deleted, only new versions created.
 *
 * Tables simulated:
 *   users (extended with rank/role/permissions)
 *   cases
 *   case_members
 *   evidence (append-only)
 *   witness_statements (append-only)
 *   case_facts (append-only)
 *   case_investigation_updates (append-only)
 *   documents
 */

import { RANKS, ACCESS_LEVELS, PERMISSIONS, FUNCTIONAL_ROLES } from './accessControl'

// ─────────────────────────────────────────────────────────────────────────────
// EXTENDED USERS (Phase 2 adds rank, accessLevel, permissions, jurisdiction)
// ─────────────────────────────────────────────────────────────────────────────
export const mockUsers = [
  {
    id: 'demo.investigator',
    password: 'Demo@12345',
    name: 'Pranshu Kumar',
    role: 'Investigation Officer',
    functionalRole: FUNCTIONAL_ROLES.INVESTIGATION_OFFICER,
    rank: RANKS.SI,
    accessLevel: ACCESS_LEVELS.INVESTIGATION_OFFICER,
    department: 'Cyber & Legal Investigations',
    policeStation: 'Cyber Cell Division',
    jurisdiction: 'Delhi',
    initials: 'PK',
    enrolledBiometrics: true,
    permissions: [
      PERMISSIONS.VIEW_ASSIGNED_CASES,
      PERMISSIONS.CREATE_INVESTIGATION_RECORDS,
      PERMISSIONS.ADD_EVIDENCE,
      PERMISSIONS.ADD_WITNESS_STATEMENT,
      PERMISSIONS.ADD_CASE_FACT,
      PERMISSIONS.ADD_INVESTIGATION_UPDATE,
      PERMISSIONS.UPLOAD_DOCUMENTS,
      PERMISSIONS.VIEW_DOCUMENTS,
      PERMISSIONS.DOCUMENT_VERSION_CREATE,
      PERMISSIONS.DOCUMENT_VERSION_VIEW,
      PERMISSIONS.INTEGRITY_VERIFY,
      PERMISSIONS.SEARCH_CASE_RECORDS,
    ],
  },
  {
    id: 'pranshu.kumar',
    password: 'Pranshu@123',
    name: 'Pranshu Kumar',
    role: 'Investigation Officer',
    functionalRole: FUNCTIONAL_ROLES.INVESTIGATION_OFFICER,
    rank: RANKS.SI,
    accessLevel: ACCESS_LEVELS.INVESTIGATION_OFFICER,
    department: 'Cyber & Legal Investigations',
    policeStation: 'Cyber Cell Division',
    jurisdiction: 'Delhi',
    initials: 'PK',
    enrolledBiometrics: true,
    permissions: [
      PERMISSIONS.VIEW_ASSIGNED_CASES,
      PERMISSIONS.CREATE_INVESTIGATION_RECORDS,
      PERMISSIONS.ADD_EVIDENCE,
      PERMISSIONS.ADD_WITNESS_STATEMENT,
      PERMISSIONS.ADD_CASE_FACT,
      PERMISSIONS.ADD_INVESTIGATION_UPDATE,
      PERMISSIONS.UPLOAD_DOCUMENTS,
      PERMISSIONS.VIEW_DOCUMENTS,
      PERMISSIONS.DOCUMENT_VERSION_CREATE,
      PERMISSIONS.DOCUMENT_VERSION_VIEW,
      PERMISSIONS.INTEGRITY_VERIFY,
      PERMISSIONS.SEARCH_CASE_RECORDS,
    ],
  },
  {
    id: 'a.singh',
    password: 'Legal@123',
    name: 'A. Singh',
    role: 'Legal Officer',
    functionalRole: FUNCTIONAL_ROLES.LEGAL_OFFICER,
    rank: RANKS.INSPECTOR,
    accessLevel: ACCESS_LEVELS.STATION_SUPERVISOR,
    department: 'Legal Affairs',
    policeStation: 'District Legal Cell',
    jurisdiction: 'Delhi',
    initials: 'AS',
    enrolledBiometrics: true,
    permissions: [
      PERMISSIONS.VIEW_ASSIGNED_CASES,
      PERMISSIONS.VIEW_STATION_CASES,
      PERMISSIONS.CREATE_CASES,
      PERMISSIONS.ASSIGN_OFFICERS,
      PERMISSIONS.ADD_EVIDENCE,
      PERMISSIONS.ADD_WITNESS_STATEMENT,
      PERMISSIONS.ADD_CASE_FACT,
      PERMISSIONS.ADD_INVESTIGATION_UPDATE,
      PERMISSIONS.UPLOAD_DOCUMENTS,
      PERMISSIONS.VIEW_DOCUMENTS,
      PERMISSIONS.DOCUMENT_VERSION_CREATE,
      PERMISSIONS.DOCUMENT_VERSION_VIEW,
      PERMISSIONS.INTEGRITY_VERIFY,
      PERMISSIONS.CASE_RECORD_MARK_SUPERSEDED,
      PERMISSIONS.REVIEW_RECORDS,
      PERMISSIONS.APPROVE_ACCESS,
      PERMISSIONS.UPDATE_CASE_STATUS,
      PERMISSIONS.SEARCH_CASE_RECORDS,
      PERMISSIONS.VIEW_AUDIT_LOG,
      PERMISSIONS.EXPORT_AUDIT_LOG,
    ],
  },
  {
    id: 'r.mehta',
    password: 'Forensic@123',
    name: 'R. Mehta',
    role: 'Forensic Officer',
    functionalRole: FUNCTIONAL_ROLES.FORENSIC_OFFICER,
    rank: RANKS.ASI,
    accessLevel: ACCESS_LEVELS.INVESTIGATION_OFFICER,
    department: 'Forensic Division',
    policeStation: 'Forensic Lab',
    jurisdiction: 'Delhi',
    initials: 'RM',
    enrolledBiometrics: true,
    permissions: [
      PERMISSIONS.VIEW_ASSIGNED_CASES,
      PERMISSIONS.CREATE_INVESTIGATION_RECORDS,
      PERMISSIONS.ADD_EVIDENCE,
      PERMISSIONS.ADD_CASE_FACT,
      PERMISSIONS.ADD_INVESTIGATION_UPDATE,
      PERMISSIONS.UPLOAD_DOCUMENTS,
      PERMISSIONS.VIEW_DOCUMENTS,
      PERMISSIONS.DOCUMENT_VERSION_CREATE,
      PERMISSIONS.DOCUMENT_VERSION_VIEW,
      PERMISSIONS.INTEGRITY_VERIFY,
      PERMISSIONS.SEARCH_CASE_RECORDS,
    ],
  },
  {
    id: 'sp.sharma',
    password: 'District@123',
    name: 'SP Sharma',
    role: 'Superintendent of Police',
    functionalRole: FUNCTIONAL_ROLES.CASE_SUPERVISOR,
    rank: RANKS.SP,
    accessLevel: ACCESS_LEVELS.DISTRICT_SUPERVISOR,
    department: 'District Command',
    policeStation: 'SP Office',
    jurisdiction: 'Delhi',
    initials: 'SS',
    enrolledBiometrics: true,
    permissions: [
      PERMISSIONS.VIEW_ASSIGNED_CASES,
      PERMISSIONS.VIEW_STATION_CASES,
      PERMISSIONS.VIEW_DISTRICT_CASES,
      PERMISSIONS.CREATE_CASES,
      PERMISSIONS.ASSIGN_OFFICERS,
      PERMISSIONS.ADD_EVIDENCE,
      PERMISSIONS.ADD_WITNESS_STATEMENT,
      PERMISSIONS.ADD_CASE_FACT,
      PERMISSIONS.ADD_INVESTIGATION_UPDATE,
      PERMISSIONS.UPLOAD_DOCUMENTS,
      PERMISSIONS.VIEW_DOCUMENTS,
      PERMISSIONS.DOCUMENT_VERSION_CREATE,
      PERMISSIONS.DOCUMENT_VERSION_VIEW,
      PERMISSIONS.INTEGRITY_VERIFY,
      PERMISSIONS.CASE_RECORD_MARK_SUPERSEDED,
      PERMISSIONS.REVIEW_RECORDS,
      PERMISSIONS.APPROVE_ACCESS,
      PERMISSIONS.UPDATE_CASE_STATUS,
      PERMISSIONS.SEARCH_CASE_RECORDS,
      PERMISSIONS.REVIEW_SENSITIVE_RECORDS,
      PERMISSIONS.VIEW_AUDIT_LOG,
      PERMISSIONS.EXPORT_AUDIT_LOG,
    ],
  },
  {
    id: 'constable.test',
    password: 'Constable@123',
    name: 'Vikram Singh',
    role: 'Field Officer',
    functionalRole: FUNCTIONAL_ROLES.INVESTIGATION_OFFICER,
    rank: RANKS.CONSTABLE,
    accessLevel: ACCESS_LEVELS.FIELD_OFFICER,
    department: 'Cyber & Legal Investigations',
    policeStation: 'Cyber Cell Division',
    jurisdiction: 'Delhi',
    initials: 'VS',
    enrolledBiometrics: true,
    permissions: [
      PERMISSIONS.VIEW_ASSIGNED_CASES,
      PERMISSIONS.VIEW_DOCUMENTS,
      PERMISSIONS.DOWNLOAD_DOCUMENTS,
      PERMISSIONS.DOCUMENT_VERSION_VIEW,
      PERMISSIONS.INTEGRITY_VERIFY,
      PERMISSIONS.SEARCH_CASE_RECORDS,
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// CASES
// ─────────────────────────────────────────────────────────────────────────────
let _cases = [
  {
    id: 'case-2026-001',
    caseNumber: 'CASE-2026-001',
    title: 'Financial Fraud Investigation',
    description: 'Investigation into suspected financial misconduct involving fraudulent transactions at multiple banking institutions.',
    caseType: 'Financial Crime',
    department: 'Cyber & Legal Investigations',
    policeStation: 'Cyber Cell Division',
    jurisdiction: 'Delhi',
    status: 'UNDER_INVESTIGATION',
    priority: 'HIGH',
    sensitivity: 'CONFIDENTIAL',
    createdBy: 'demo.investigator',
    createdAt: '2026-09-01T09:00:00.000Z',
    updatedAt: '2026-09-07T14:30:00.000Z',
  },
  {
    id: 'case-2026-002',
    caseNumber: 'CASE-2026-002',
    title: 'Witness Statement Review – Vendor Compliance',
    description: 'Review of witness accounts related to vendor compliance violations in government procurement.',
    caseType: 'Compliance Matter',
    department: 'Legal Affairs',
    policeStation: 'District Legal Cell',
    jurisdiction: 'Delhi',
    status: 'OPEN',
    priority: 'MEDIUM',
    sensitivity: 'RESTRICTED',
    createdBy: 'a.singh',
    createdAt: '2026-09-03T11:15:00.000Z',
    updatedAt: '2026-09-06T09:00:00.000Z',
  },
  {
    id: 'case-2026-003',
    caseNumber: 'CASE-2026-003',
    title: 'Surveillance Evidence Archive',
    description: 'Archival and review of CCTV surveillance evidence from multiple locations.',
    caseType: 'Digital Evidence',
    department: 'Forensic Division',
    policeStation: 'Forensic Lab',
    jurisdiction: 'Delhi',
    status: 'CLOSED',
    priority: 'LOW',
    sensitivity: 'INTERNAL',
    createdBy: 'r.mehta',
    createdAt: '2026-08-15T08:00:00.000Z',
    updatedAt: '2026-09-05T16:00:00.000Z',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// CASE MEMBERS (assignments)
// ─────────────────────────────────────────────────────────────────────────────
let _caseMembers = [
  { id: 'cm-001', caseId: 'case-2026-001', userId: 'demo.investigator', assignmentRole: 'Lead Investigator', assignedBy: 'a.singh', assignedAt: '2026-09-01T09:30:00.000Z', status: 'ACTIVE' },
  { id: 'cm-002', caseId: 'case-2026-001', userId: 'r.mehta', assignmentRole: 'Forensic Analyst', assignedBy: 'a.singh', assignedAt: '2026-09-01T09:30:00.000Z', status: 'ACTIVE' },
  { id: 'cm-003', caseId: 'case-2026-001', userId: 'a.singh', assignmentRole: 'Supervising Officer', assignedBy: 'sp.sharma', assignedAt: '2026-09-01T09:00:00.000Z', status: 'ACTIVE' },
  { id: 'cm-004', caseId: 'case-2026-002', userId: 'a.singh', assignmentRole: 'Lead Legal Officer', assignedBy: 'sp.sharma', assignedAt: '2026-09-03T11:30:00.000Z', status: 'ACTIVE' },
  { id: 'cm-005', caseId: 'case-2026-003', userId: 'r.mehta', assignmentRole: 'Lead Forensic Officer', assignedBy: 'a.singh', assignedAt: '2026-08-15T08:30:00.000Z', status: 'ACTIVE' },
  { id: 'cm-006', caseId: 'case-2026-003', userId: 'demo.investigator', assignmentRole: 'Supporting Investigator', assignedBy: 'a.singh', assignedAt: '2026-08-15T08:30:00.000Z', status: 'ACTIVE' },
  { id: 'cm-007', caseId: 'case-2026-001', userId: 'constable.test', assignmentRole: 'Field Constable', assignedBy: 'a.singh', assignedAt: '2026-09-02T10:00:00.000Z', status: 'ACTIVE' },
]

// ─────────────────────────────────────────────────────────────────────────────
// EVIDENCE (append-only — no delete ever)
// ─────────────────────────────────────────────────────────────────────────────
let _evidence = [
  {
    id: 'ev-001',
    caseId: 'case-2026-001',
    evidenceNumber: 'E-001',
    evidenceType: 'DIGITAL',
    description: 'Mobile phone recovered from suspect\'s residence. IMEI: 867530912345678. Contains encrypted files.',
    source: 'Field recovery – suspect residence search',
    collectedBy: 'demo.investigator',
    collectionDate: '2026-09-02',
    location: 'Suspect Residence, Sector 14, Delhi',
    submittedBy: 'demo.investigator',
    submittedAt: '2026-09-02T11:30:00.000Z',
    classification: 'CONFIDENTIAL',
    storageRef: null,
    status: 'ACTIVE',
    parentEvidenceId: null,
    version: 1,
    changeReason: null,
  },
  {
    id: 'ev-002',
    caseId: 'case-2026-001',
    evidenceNumber: 'E-001',
    evidenceType: 'DIGITAL',
    description: 'Mobile phone recovered from suspect\'s residence. After forensic extraction: IMEI confirmed 867530912345678. Device contains 47 encrypted files and deleted WhatsApp messages relevant to investigation. Forensic image created.',
    source: 'Field recovery – confirmed by forensic examination (Forensic Report FR-2026-089)',
    collectedBy: 'demo.investigator',
    collectionDate: '2026-09-02',
    location: 'Suspect Residence, Sector 14, Delhi',
    submittedBy: 'r.mehta',
    submittedAt: '2026-09-04T14:20:00.000Z',
    classification: 'CONFIDENTIAL',
    storageRef: null,
    status: 'ACTIVE',
    parentEvidenceId: 'ev-001',
    version: 2,
    changeReason: 'Updated description after forensic examination. Original record preserved as V1.',
  },
  {
    id: 'ev-003',
    caseId: 'case-2026-001',
    evidenceNumber: 'E-002',
    evidenceType: 'DOCUMENTARY',
    description: 'Bank transaction records obtained from XYZ Bank showing suspicious transfers totalling ₹47.8 lakhs between 12 Aug 2026 and 31 Aug 2026.',
    source: 'XYZ Bank – official submission under court order',
    collectedBy: 'a.singh',
    collectionDate: '2026-09-03',
    location: 'XYZ Bank HQ, Connaught Place',
    submittedBy: 'a.singh',
    submittedAt: '2026-09-03T16:00:00.000Z',
    classification: 'CONFIDENTIAL',
    storageRef: null,
    status: 'ACTIVE',
    parentEvidenceId: null,
    version: 1,
    changeReason: null,
  },
  {
    id: 'ev-004',
    caseId: 'case-2026-003',
    evidenceNumber: 'E-003',
    evidenceType: 'VIDEO',
    description: 'CCTV footage from Camera CAM-07 at Eastern Gate, covering 06:00-22:00 on 14 Aug 2026.',
    source: 'Municipal CCTV Network – Public Safety Division',
    collectedBy: 'r.mehta',
    collectionDate: '2026-08-16',
    location: 'Eastern Gate CCTV Node',
    submittedBy: 'r.mehta',
    submittedAt: '2026-08-16T10:00:00.000Z',
    classification: 'INTERNAL',
    storageRef: null,
    status: 'ACTIVE',
    parentEvidenceId: null,
    version: 1,
    changeReason: null,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// WITNESS STATEMENTS (append-only — no delete ever)
// ─────────────────────────────────────────────────────────────────────────────
let _statements = [
  {
    id: 'st-001',
    caseId: 'case-2026-001',
    witnessRef: 'WIT-0042',
    statementDate: '2026-09-03',
    statementText: 'I witnessed the suspect enter the bank branch at approximately 10:15 AM. He spoke with the branch manager for around 20 minutes before leaving. He was carrying a black briefcase.',
    recordedBy: 'demo.investigator',
    recordedAt: '2026-09-03T13:00:00.000Z',
    statementType: 'EYEWITNESS',
    classification: 'RESTRICTED',
    status: 'ACTIVE',
    version: 1,
    previousStatementId: null,
    changeReason: null,
  },
  {
    id: 'st-002',
    caseId: 'case-2026-001',
    witnessRef: 'WIT-0042',
    statementDate: '2026-09-07',
    statementText: 'Supplementary statement: Upon reviewing CCTV footage shown to me, I can confirm the person I saw was indeed the suspect. I also recall that he made a phone call outside the bank before entering. The call appeared urgent.',
    recordedBy: 'demo.investigator',
    recordedAt: '2026-09-07T11:30:00.000Z',
    statementType: 'SUPPLEMENTARY',
    classification: 'RESTRICTED',
    status: 'ACTIVE',
    version: 2,
    previousStatementId: 'st-001',
    changeReason: 'Supplementary statement added after witness viewed CCTV footage. Original statement S-001 V1 preserved.',
  },
  {
    id: 'st-003',
    caseId: 'case-2026-001',
    witnessRef: 'WIT-0019',
    statementDate: '2026-09-05',
    statementText: 'I am the branch manager. On the date in question, an individual claiming to represent ABC Investments visited seeking to process a large wire transfer. He presented documents which appeared official but which I now believe were forged.',
    recordedBy: 'a.singh',
    recordedAt: '2026-09-05T15:00:00.000Z',
    statementType: 'WITNESS',
    classification: 'CONFIDENTIAL',
    status: 'ACTIVE',
    version: 1,
    previousStatementId: null,
    changeReason: null,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// CASE FACTS (append-only — no delete, corrections create new records)
// ─────────────────────────────────────────────────────────────────────────────
let _facts = [
  {
    id: 'fact-001',
    caseId: 'case-2026-001',
    factText: 'Suspect vehicle identified as a white sedan, registration DL-01-AA-0001, observed near the bank on the day of incident.',
    createdBy: 'demo.investigator',
    createdAt: '2026-09-02T10:00:00.000Z',
    source: 'Eyewitness account – WIT-0042',
    confidence: 'REPORTED',
    parentFactId: null,
    version: 1,
    changeReason: null,
    recordStatus: 'ACTIVE',
  },
  {
    id: 'fact-002',
    caseId: 'case-2026-001',
    factText: 'CCTV analysis of footage from Camera CAM-14 indicates the vehicle was a silver sedan, not white as initially reported. Registration partially visible: DL-01-A?-????. Vehicle entered the area at 10:08 AM.',
    createdBy: 'r.mehta',
    createdAt: '2026-09-05T09:30:00.000Z',
    source: 'Forensic CCTV analysis – Forensic Report FR-2026-089',
    confidence: 'CONFIRMED',
    parentFactId: 'fact-001',
    version: 2,
    changeReason: 'New CCTV evidence corrects initial eyewitness account on vehicle color. Original Fact F-001 preserved.',
    recordStatus: 'ACTIVE',
  },
  {
    id: 'fact-003',
    caseId: 'case-2026-001',
    factText: 'Bank records confirm fraudulent transfers totalling ₹47.8 lakhs across 12 transactions between 12 Aug and 31 Aug 2026. Transactions traced to 3 shell accounts.',
    createdBy: 'a.singh',
    createdAt: '2026-09-04T14:00:00.000Z',
    source: 'XYZ Bank official records – submitted under court order',
    confidence: 'CONFIRMED',
    parentFactId: null,
    version: 1,
    changeReason: null,
    recordStatus: 'ACTIVE',
  },
  {
    id: 'fact-004',
    caseId: 'case-2026-001',
    factText: 'Shell accounts traced to registered entities in three states. All three companies share a common registered agent.',
    createdBy: 'demo.investigator',
    createdAt: '2026-09-07T10:00:00.000Z',
    source: 'MCA21 records cross-reference',
    confidence: 'UNDER_REVIEW',
    parentFactId: 'fact-003',
    version: 2,
    changeReason: 'New investigation reveals additional details about shell account structure. Builds on Fact F-003.',
    recordStatus: 'ACTIVE',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// INVESTIGATION UPDATES (append-only)
// ─────────────────────────────────────────────────────────────────────────────
let _updates = [
  {
    id: 'upd-001',
    caseId: 'case-2026-001',
    updateText: 'Case formally opened. Initial evidence collection begun. Suspect premises identified.',
    addedBy: 'demo.investigator',
    addedAt: '2026-09-01T09:30:00.000Z',
    status: 'SUBMITTED',
  },
  {
    id: 'upd-002',
    caseId: 'case-2026-001',
    updateText: 'Mobile device (E-001) recovered and submitted for forensic examination. CCTV footage requested from Municipal Authority.',
    addedBy: 'demo.investigator',
    addedAt: '2026-09-02T17:00:00.000Z',
    status: 'SUBMITTED',
  },
  {
    id: 'upd-003',
    caseId: 'case-2026-001',
    updateText: 'Bank records received and reviewed. Fraudulent transaction pattern confirmed. Forensic examination of mobile device ongoing.',
    addedBy: 'a.singh',
    addedAt: '2026-09-04T16:30:00.000Z',
    status: 'REVIEWED',
  },
  {
    id: 'upd-004',
    caseId: 'case-2026-001',
    updateText: 'CCTV footage analyzed by forensics. Vehicle color discrepancy identified and documented. Shell company investigation initiated via MCA21.',
    addedBy: 'r.mehta',
    addedAt: '2026-09-05T14:00:00.000Z',
    status: 'REVIEWED',
  },
  {
    id: 'upd-005',
    caseId: 'case-2026-001',
    updateText: 'Supplementary witness statement recorded from WIT-0042 after showing CCTV footage. Statement corroborates suspect identification.',
    addedBy: 'demo.investigator',
    addedAt: '2026-09-07T12:00:00.000Z',
    status: 'SUBMITTED',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS & DOCUMENT VERSIONS (Phase 3: Immutable Version Control)
// ─────────────────────────────────────────────────────────────────────────────
let _documents = [
  {
    id: 'doc-001',
    caseId: 'case-2026-001',
    originalFilename: 'FIR_0425.pdf',
    storageKey: 'cases/case-2026-001/FIR_0425.pdf',
    mimeType: 'application/pdf',
    fileSize: 248320,
    documentType: 'FIR',
    classification: 'CONFIDENTIAL',
    description: 'First Information Report filed at Cyber Cell Division on 01 Sep 2026.',
    uploadedBy: 'demo.investigator',
    uploadedAt: '2026-09-01T10:00:00.000Z',
    currentVersionId: 'ver-001',
    status: 'ACTIVE',
    integrityStatus: 'VERIFIED',
    integrityCheckedAt: '2026-09-01T10:01:00.000Z',
  },
  {
    id: 'doc-002',
    caseId: 'case-2026-001',
    originalFilename: 'Forensic_Report_FR2026089.pdf',
    storageKey: 'cases/case-2026-001/Forensic_Report_FR2026089.pdf',
    mimeType: 'application/pdf',
    fileSize: 1572864,
    documentType: 'FORENSIC_REPORT',
    classification: 'CONFIDENTIAL',
    description: 'Forensic examination report for mobile device E-001. Includes data extraction summary.',
    uploadedBy: 'r.mehta',
    uploadedAt: '2026-09-04T15:00:00.000Z',
    currentVersionId: 'ver-002',
    status: 'ACTIVE',
    integrityStatus: 'VERIFIED',
    integrityCheckedAt: '2026-09-04T15:01:00.000Z',
  },
  {
    id: 'doc-003',
    caseId: 'case-2026-001',
    originalFilename: 'Bank_Transaction_Records.pdf',
    storageKey: 'cases/case-2026-001/Bank_Transaction_Records.pdf',
    mimeType: 'application/pdf',
    fileSize: 524288,
    documentType: 'EVIDENCE',
    classification: 'CONFIDENTIAL',
    description: 'Certified bank records obtained under court order from XYZ Bank.',
    uploadedBy: 'a.singh',
    uploadedAt: '2026-09-03T17:00:00.000Z',
    currentVersionId: 'ver-003',
    status: 'ACTIVE',
    integrityStatus: 'VERIFIED',
    integrityCheckedAt: '2026-09-03T17:01:00.000Z',
  },
]

let _documentVersions = [
  {
    id: 'ver-001',
    documentId: 'doc-001',
    versionNumber: 1,
    storageKey: 'cases/case-2026-001/docs/doc-001/v1/FIR_0425.pdf',
    originalFilename: 'FIR_0425.pdf',
    fileSize: 248320,
    mimeType: 'application/pdf',
    fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    uploadedBy: 'demo.investigator',
    changeReason: 'Initial FIR submission',
    createdAt: '2026-09-01T10:00:00.000Z',
    status: 'ACTIVE',
  },
  {
    id: 'ver-002',
    documentId: 'doc-002',
    versionNumber: 1,
    storageKey: 'cases/case-2026-001/docs/doc-002/v1/Forensic_Report_FR2026089.pdf',
    originalFilename: 'Forensic_Report_FR2026089.pdf',
    fileSize: 1572864,
    mimeType: 'application/pdf',
    fileHash: '8f91a7c2e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7',
    uploadedBy: 'r.mehta',
    changeReason: 'Initial forensic report submission',
    createdAt: '2026-09-04T15:00:00.000Z',
    status: 'ACTIVE',
  },
  {
    id: 'ver-003',
    documentId: 'doc-003',
    versionNumber: 1,
    storageKey: 'cases/case-2026-001/docs/doc-003/v1/Bank_Transaction_Records.pdf',
    originalFilename: 'Bank_Transaction_Records.pdf',
    fileSize: 524288,
    mimeType: 'application/pdf',
    fileHash: 'b71d4e92a7c2e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b',
    uploadedBy: 'a.singh',
    changeReason: 'Initial bank records submission under court order',
    createdAt: '2026-09-03T17:00:00.000Z',
    status: 'ACTIVE',
  },
]

// Audit events are append-only.  In production this collection maps to a
// write-once audit store; the mock keeps the same contract in memory.
let _auditLogs = [
  {
    id: 'audit-001',
    action: 'DOCUMENT_VIEW',
    category: 'DOCUMENT',
    actorId: 'a.singh',
    actorRank: 'Inspector',
    resourceType: 'DOCUMENT',
    resourceId: 'doc-001',
    resourceLabel: 'FIR_0425.pdf',
    caseId: 'case-2026-001',
    result: 'SUCCESS',
    details: 'Document security profile viewed',
    ipAddress: '10.84.16.31',
    device: 'Edge',
    timestamp: '2026-09-08T09:48:00.000Z',
  },
  {
    id: 'audit-002',
    action: 'INTEGRITY_VERIFIED',
    category: 'DOCUMENT',
    actorId: 'r.mehta',
    actorRank: 'Assistant Sub-Inspector (ASI)',
    resourceType: 'DOCUMENT',
    resourceId: 'doc-002',
    resourceLabel: 'Forensic_Report.pdf',
    caseId: 'case-2026-003',
    result: 'SUCCESS',
    details: 'Stored SHA-256 hash verified',
    ipAddress: '10.84.16.25',
    device: 'Safari',
    timestamp: '2026-09-08T11:12:00.000Z',
  },
  {
    id: 'audit-003',
    action: 'RESTRICTED_ACCESS_ATTEMPT',
    category: 'ACCESS',
    actorId: 'constable.test',
    actorRank: 'Constable',
    resourceType: 'CASE',
    resourceId: 'case-2026-002',
    resourceLabel: 'CASE-2026-002',
    caseId: 'case-2026-002',
    result: 'DENIED',
    details: 'Case access denied by assignment and jurisdiction policy',
    ipAddress: '10.84.16.44',
    device: 'Chrome',
    timestamp: '2026-09-08T12:36:00.000Z',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// ID GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
let _counters = { case: 4, member: 7, evidence: 5, statement: 4, fact: 5, update: 6, document: 4, version: 4, audit: 4 }
const nextId = (prefix, counter) => {
  const n = _counters[counter]++
  return `${prefix}-${String(n).padStart(3, '0')}`
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA ACCESS API (used by service layer)
// ─────────────────────────────────────────────────────────────────────────────
export const db = {
  // Users
  getUserById: (id) => mockUsers.find(u => u.id === id) || null,
  getAllUsers: () => mockUsers,

  // Cases
  getAllCases: () => [..._cases],
  getCaseById: (id) => _cases.find(c => c.id === id) || null,
  createCase: (data) => {
    const newCase = {
      id: nextId('case', 'case'),
      caseNumber: `CASE-${new Date().getFullYear()}-${String(_counters.case - 1).padStart(3, '0')}`,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    _cases.push(newCase)
    return newCase
  },
  updateCaseStatus: (id, status, updatedBy) => {
    const c = _cases.find(c => c.id === id)
    if (c) { c.status = status; c.updatedAt = new Date().toISOString(); c.lastUpdatedBy = updatedBy }
    return c
  },

  // Case Members
  getCaseMembers: (caseId) => _caseMembers.filter(m => m.caseId === caseId),
  getUserCases: (userId) => {
    const memberCaseIds = _caseMembers.filter(m => m.userId === userId && m.status === 'ACTIVE').map(m => m.caseId)
    return _cases.filter(c => memberCaseIds.includes(c.id))
  },
  isUserAssigned: (userId, caseId) => _caseMembers.some(m => m.userId === userId && m.caseId === caseId && m.status === 'ACTIVE'),
  addCaseMember: (data) => {
    const member = { id: nextId('cm', 'member'), ...data, assignedAt: new Date().toISOString(), status: 'ACTIVE' }
    _caseMembers.push(member)
    return member
  },
  removeCaseMember: (memberId) => {
    const m = _caseMembers.find(m => m.id === memberId)
    if (m) m.status = 'REMOVED'
    return m
  },

  // Evidence (IMMUTABLE — no delete)
  getEvidence: (caseId) => _evidence.filter(e => e.caseId === caseId),
  getEvidenceById: (id) => _evidence.find(e => e.id === id) || null,
  addEvidence: (data) => {
    const ev = { id: nextId('ev', 'evidence'), ...data, submittedAt: new Date().toISOString() }
    _evidence.push(ev)
    return ev
  },
  addEvidenceVersion: (parentId, data) => {
    const parent = _evidence.find(e => e.id === parentId)
    if (!parent) throw new Error('Parent evidence record not found')
    const newVersion = {
      id: nextId('ev', 'evidence'),
      caseId: parent.caseId,
      evidenceNumber: parent.evidenceNumber,
      evidenceType: parent.evidenceType,
      ...data,
      submittedAt: new Date().toISOString(),
      parentEvidenceId: parentId,
      version: parent.version + 1,
    }
    _evidence.push(newVersion)
    return newVersion
  },
  getEvidenceHistory: (evidenceNumber, caseId) => _evidence.filter(e => e.evidenceNumber === evidenceNumber && e.caseId === caseId).sort((a, b) => a.version - b.version),
  // NOTE: deleteEvidence does NOT exist by design

  // Witness Statements (IMMUTABLE — no delete)
  getStatements: (caseId) => _statements.filter(s => s.caseId === caseId),
  getStatementById: (id) => _statements.find(s => s.id === id) || null,
  addStatement: (data) => {
    const st = { id: nextId('st', 'statement'), ...data, recordedAt: new Date().toISOString() }
    _statements.push(st)
    return st
  },
  addSupplementaryStatement: (parentId, data) => {
    const parent = _statements.find(s => s.id === parentId)
    if (!parent) throw new Error('Parent statement not found')
    const supp = {
      id: nextId('st', 'statement'),
      caseId: parent.caseId,
      witnessRef: parent.witnessRef,
      ...data,
      recordedAt: new Date().toISOString(),
      statementType: 'SUPPLEMENTARY',
      previousStatementId: parentId,
      version: parent.version + 1,
    }
    _statements.push(supp)
    return supp
  },
  getStatementHistory: (witnessRef, caseId) => _statements.filter(s => s.witnessRef === witnessRef && s.caseId === caseId).sort((a, b) => a.version - b.version),
  // NOTE: deleteStatement does NOT exist by design

  // Case Facts (IMMUTABLE — no delete, corrections create new records)
  getFacts: (caseId) => _facts.filter(f => f.caseId === caseId),
  getFactById: (id) => _facts.find(f => f.id === id) || null,
  addFact: (data) => {
    const fact = { id: nextId('fact', 'fact'), ...data, createdAt: new Date().toISOString(), version: 1, parentFactId: null, recordStatus: 'ACTIVE' }
    _facts.push(fact)
    return fact
  },
  addFactCorrection: (parentId, data) => {
    const parent = _facts.find(f => f.id === parentId)
    if (!parent) throw new Error('Parent fact not found')
    const correction = {
      id: nextId('fact', 'fact'),
      caseId: parent.caseId,
      ...data,
      createdAt: new Date().toISOString(),
      parentFactId: parentId,
      version: parent.version + 1,
      recordStatus: 'ACTIVE',
    }
    _facts.push(correction)
    return correction
  },
  getFactHistory: (factId) => {
    const chain = []
    let current = _facts.find(f => f.id === factId)
    while (current) {
      chain.unshift(current)
      current = current.parentFactId ? _facts.find(f => f.id === current.parentFactId) : null
    }
    return chain
  },
  // NOTE: deleteFact does NOT exist by design

  // Investigation Updates (IMMUTABLE — append only)
  getUpdates: (caseId) => _updates.filter(u => u.caseId === caseId).sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt)),
  addUpdate: (data) => {
    const upd = { id: nextId('upd', 'update'), ...data, addedAt: new Date().toISOString(), status: 'SUBMITTED' }
    _updates.push(upd)
    return upd
  },
  // NOTE: deleteUpdate does NOT exist by design

  // Documents & Versions (IMMUTABLE Phase 3 Model)
  getDocuments: (caseId) => _documents.filter(d => d.caseId === caseId),
  getDocumentById: (id) => _documents.find(d => d.id === id) || null,
  addDocument: (data) => {
    const docId = nextId('doc', 'document')
    const doc = {
      id: docId,
      ...data,
      uploadedAt: new Date().toISOString(),
      currentVersionId: null,
      status: 'ACTIVE',
      integrityStatus: 'PENDING',
    }
    _documents.push(doc)
    return doc
  },
  getDocumentVersions: (documentId) => {
    return _documentVersions
      .filter(v => v.documentId === documentId)
      .sort((a, b) => b.versionNumber - a.versionNumber)
  },
  getVersionById: (versionId) => _documentVersions.find(v => v.id === versionId) || null,
  addDocumentVersion: (data) => {
    const ver = {
      id: nextId('ver', 'version'),
      ...data,
      createdAt: new Date().toISOString(),
      status: 'ACTIVE',
    }
    _documentVersions.push(ver)
    return ver
  },
  updateDocumentCurrentVersion: (documentId, versionId) => {
    const doc = _documents.find(d => d.id === documentId)
    if (doc) {
      doc.currentVersionId = versionId
    }
    return doc
  },
  markDocumentStatus: (documentId, status, reason, updatedBy) => {
    const doc = _documents.find(d => d.id === documentId)
    if (!doc) throw new Error('Document not found')
    doc.status = status
    doc.statusChangeReason = reason
    doc.statusChangedBy = updatedBy
    doc.statusChangedAt = new Date().toISOString()
    return doc
  },
  updateDocumentIntegrity: (documentId, integrityStatus, checkedBy, details = {}) => {
    const doc = _documents.find(d => d.id === documentId)
    if (!doc) throw new Error('Document not found')
    doc.integrityStatus = integrityStatus
    doc.integrityCheckedBy = checkedBy
    doc.integrityCheckedAt = new Date().toISOString()
    doc.integrityDetails = details
    return doc
  },
  // NOTE: Physical deletion of legal documents is strictly forbidden.
  deleteDocument: () => {
    throw new Error('Physical deletion forbidden: Legal documents and historical versions are immutable by law.')
  },

  // Audit trail (append-only)
  addAuditLog: (data) => {
    const event = {
      id: nextId('audit', 'audit'),
      timestamp: new Date().toISOString(),
      result: 'SUCCESS',
      category: 'SYSTEM',
      ...data,
    }
    _auditLogs.push(event)
    return event
  },
  getAuditLogs: (filters = {}) => {
    let events = [..._auditLogs]
    if (filters.action && filters.action !== 'ALL') events = events.filter(e => e.action === filters.action)
    if (filters.category && filters.category !== 'ALL') events = events.filter(e => e.category === filters.category)
    if (filters.result && filters.result !== 'ALL') events = events.filter(e => e.result === filters.result)
    if (filters.actorId && filters.actorId !== 'ALL') events = events.filter(e => e.actorId === filters.actorId)
    if (filters.caseId && filters.caseId !== 'ALL') events = events.filter(e => e.caseId === filters.caseId)
    if (filters.documentId && filters.documentId !== 'ALL') events = events.filter(e => e.resourceId === filters.documentId || e.documentId === filters.documentId)
    if (filters.from) events = events.filter(e => new Date(e.timestamp) >= new Date(filters.from))
    if (filters.to) events = events.filter(e => new Date(e.timestamp) <= new Date(filters.to))
    if (filters.search?.trim()) {
      const query = filters.search.trim().toLowerCase()
      events = events.filter(e => [e.action, e.details, e.resourceLabel, e.actorId, e.ipAddress]
        .filter(Boolean).some(value => String(value).toLowerCase().includes(query)))
    }
    return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  },

  // Investigation History (unified timeline across all record types)
  getCaseHistory: (caseId) => {
    const events = []
    _evidence.filter(e => e.caseId === caseId).forEach(e => events.push({ type: 'EVIDENCE', icon: 'evidence', date: e.submittedAt, label: e.version > 1 ? `Evidence ${e.evidenceNumber} updated (V${e.version})` : `Evidence ${e.evidenceNumber} added`, detail: e.description, by: e.submittedBy, version: e.version, id: e.id }))
    _statements.filter(s => s.caseId === caseId).forEach(s => events.push({ type: 'STATEMENT', icon: 'statement', date: s.recordedAt, label: s.statementType === 'SUPPLEMENTARY' ? `Supplementary statement added – ${s.witnessRef}` : `Witness statement recorded – ${s.witnessRef}`, detail: s.statementText.slice(0, 120) + '...', by: s.recordedBy, version: s.version, id: s.id }))
    _facts.filter(f => f.caseId === caseId).forEach(f => events.push({ type: 'FACT', icon: 'fact', date: f.createdAt, label: f.parentFactId ? `New information added (corrects earlier fact)` : `Investigation fact recorded`, detail: f.factText.slice(0, 120) + '...', by: f.createdBy, version: f.version, id: f.id }))
    _updates.filter(u => u.caseId === caseId).forEach(u => events.push({ type: 'UPDATE', icon: 'update', date: u.addedAt, label: 'Investigation update added', detail: u.updateText.slice(0, 120) + '...', by: u.addedBy, id: u.id }))
    _documents.filter(d => d.caseId === caseId).forEach(d => {
      events.push({ type: 'DOCUMENT', icon: 'document', date: d.uploadedAt, label: `Document registered: ${d.originalFilename}`, detail: d.description, by: d.uploadedBy, id: d.id })
      // Add version creation events
      const versions = _documentVersions.filter(v => v.documentId === d.id)
      versions.forEach(v => {
        events.push({
          type: 'DOCUMENT_VERSION',
          icon: 'version',
          date: v.createdAt,
          label: `Document version created: ${v.originalFilename} (V${v.versionNumber})`,
          detail: `Reason: ${v.changeReason} | SHA-256: ${v.fileHash.slice(0, 16)}...`,
          by: v.uploadedBy,
          version: v.versionNumber,
          id: v.id,
        })
      })
    })
    _auditLogs.filter(e => e.caseId === caseId).forEach(e => events.push({
      type: 'AUDIT',
      icon: 'audit',
      date: e.timestamp,
      label: e.action.replace(/_/g, ' '),
      detail: e.details || `${e.result} · ${e.resourceLabel || e.resourceId || 'case record'}`,
      by: e.actorId,
      id: e.id,
      result: e.result,
    }))
    return events.sort((a, b) => new Date(b.date) - new Date(a.date))
  },
}
