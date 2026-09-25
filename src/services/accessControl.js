/**
 * DocGuard – Phase 2 Access Control Engine
 * Implements RBAC + ABAC for investigation document management.
 *
 * CRITICAL SECURITY RULE:
 *   The position selected on the login page is NEVER used for authorization.
 *   All access decisions use the authenticated database user record.
 *   Selected position is stored only as a login context hint.
 *
 * Access model:
 *   USER + RANK + SYSTEM ROLE + DEPARTMENT + JURISDICTION +
 *   CASE ASSIGNMENT + DOCUMENT CLASSIFICATION + EXPLICIT PERMISSION
 *   = ACCESS DECISION
 */

// ─────────────────────────────────────────────────────────────────────────────
// RANKS
// ─────────────────────────────────────────────────────────────────────────────
export const RANKS = {
  CONSTABLE: 'Constable',
  HEAD_CONSTABLE: 'Head Constable',
  ASI: 'Assistant Sub-Inspector (ASI)',
  SI: 'Sub-Inspector (SI)',
  INSPECTOR: 'Inspector',
  SHO: 'Station House Officer (SHO)',
  ACP: 'Assistant Commissioner of Police (ACP)',
  DSP: 'Deputy Superintendent of Police (DSP)',
  DCP: 'Deputy Commissioner of Police (DCP)',
  SP: 'Superintendent of Police (SP)',
  SSP: 'Senior Superintendent of Police (SSP)',
  DIG: 'Deputy Inspector General (DIG)',
  IG: 'Inspector General (IG)',
  ADG: 'Additional Director General of Police (ADG)',
  DGP: 'Director General of Police (DGP)',
  // Functional positions
  LEGAL_OFFICER: 'Legal Officer',
  FORENSIC_OFFICER: 'Forensic Officer',
  CYBER_CELL_OFFICER: 'Cyber Cell Officer',
  SYSTEM_ADMINISTRATOR: 'System Administrator',
}

// All selectable positions for the login dropdown
export const ALL_POSITIONS = Object.values(RANKS)

// ─────────────────────────────────────────────────────────────────────────────
// ACCESS LEVELS (1–6)
// ─────────────────────────────────────────────────────────────────────────────
export const ACCESS_LEVELS = {
  FIELD_OFFICER: 1,         // Constable, Head Constable
  INVESTIGATION_OFFICER: 2, // ASI, SI
  STATION_SUPERVISOR: 3,    // Inspector, SHO
  DISTRICT_SUPERVISOR: 4,   // ACP, DSP, DCP, SP
  SENIOR_COMMAND: 5,        // SSP, DIG, IG
  STATE_COMMAND: 6,         // ADG, DGP
}

// Rank → Access Level mapping (backend-enforced; never derived from frontend selection)
const RANK_ACCESS_LEVEL_MAP = {
  [RANKS.CONSTABLE]: ACCESS_LEVELS.FIELD_OFFICER,
  [RANKS.HEAD_CONSTABLE]: ACCESS_LEVELS.FIELD_OFFICER,
  [RANKS.ASI]: ACCESS_LEVELS.INVESTIGATION_OFFICER,
  [RANKS.SI]: ACCESS_LEVELS.INVESTIGATION_OFFICER,
  [RANKS.INSPECTOR]: ACCESS_LEVELS.STATION_SUPERVISOR,
  [RANKS.SHO]: ACCESS_LEVELS.STATION_SUPERVISOR,
  [RANKS.ACP]: ACCESS_LEVELS.DISTRICT_SUPERVISOR,
  [RANKS.DSP]: ACCESS_LEVELS.DISTRICT_SUPERVISOR,
  [RANKS.DCP]: ACCESS_LEVELS.DISTRICT_SUPERVISOR,
  [RANKS.SP]: ACCESS_LEVELS.DISTRICT_SUPERVISOR,
  [RANKS.SSP]: ACCESS_LEVELS.SENIOR_COMMAND,
  [RANKS.DIG]: ACCESS_LEVELS.SENIOR_COMMAND,
  [RANKS.IG]: ACCESS_LEVELS.SENIOR_COMMAND,
  [RANKS.ADG]: ACCESS_LEVELS.STATE_COMMAND,
  [RANKS.DGP]: ACCESS_LEVELS.STATE_COMMAND,
  [RANKS.LEGAL_OFFICER]: ACCESS_LEVELS.STATION_SUPERVISOR,
  [RANKS.FORENSIC_OFFICER]: ACCESS_LEVELS.INVESTIGATION_OFFICER,
  [RANKS.CYBER_CELL_OFFICER]: ACCESS_LEVELS.INVESTIGATION_OFFICER,
  [RANKS.SYSTEM_ADMINISTRATOR]: ACCESS_LEVELS.DISTRICT_SUPERVISOR,
}

export function getRankAccessLevel(rank) {
  return RANK_ACCESS_LEVEL_MAP[rank] || ACCESS_LEVELS.FIELD_OFFICER
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION TIERS (Investigation Record vs Create vs Higher Authority + Create)
// ─────────────────────────────────────────────────────────────────────────────
export const ACTION_TIERS = {
  INVESTIGATION_RECORD: 'Investigation Record', // View/Verify only (Constable, Head Constable)
  CREATE: 'Create',                             // View + Create records & upload docs (ASI, SI, Specialists)
  HIGHER_AUTHORITY: 'Higher Authority + Create' // View + Create + Manage cases & status & assignment (Inspector, Command, Legal)
}

// Rank → Action Tier mapping
const RANK_ACTION_TIER_MAP = {
  [RANKS.CONSTABLE]: ACTION_TIERS.INVESTIGATION_RECORD,
  [RANKS.HEAD_CONSTABLE]: ACTION_TIERS.INVESTIGATION_RECORD,
  [RANKS.ASI]: ACTION_TIERS.CREATE,
  [RANKS.SI]: ACTION_TIERS.CREATE,
  [RANKS.FORENSIC_OFFICER]: ACTION_TIERS.CREATE,
  [RANKS.CYBER_CELL_OFFICER]: ACTION_TIERS.CREATE,
  [RANKS.INSPECTOR]: ACTION_TIERS.HIGHER_AUTHORITY,
  [RANKS.SHO]: ACTION_TIERS.HIGHER_AUTHORITY,
  [RANKS.ACP]: ACTION_TIERS.HIGHER_AUTHORITY,
  [RANKS.DSP]: ACTION_TIERS.HIGHER_AUTHORITY,
  [RANKS.DCP]: ACTION_TIERS.HIGHER_AUTHORITY,
  [RANKS.SP]: ACTION_TIERS.HIGHER_AUTHORITY,
  [RANKS.SSP]: ACTION_TIERS.HIGHER_AUTHORITY,
  [RANKS.DIG]: ACTION_TIERS.HIGHER_AUTHORITY,
  [RANKS.IG]: ACTION_TIERS.HIGHER_AUTHORITY,
  [RANKS.ADG]: ACTION_TIERS.HIGHER_AUTHORITY,
  [RANKS.DGP]: ACTION_TIERS.HIGHER_AUTHORITY,
  [RANKS.LEGAL_OFFICER]: ACTION_TIERS.HIGHER_AUTHORITY,
  [RANKS.SYSTEM_ADMINISTRATOR]: ACTION_TIERS.HIGHER_AUTHORITY,
}

export function getActionTier(rank) {
  return RANK_ACTION_TIER_MAP[rank] || ACTION_TIERS.INVESTIGATION_RECORD
}

/**
 * Returns standard permissions array for a given rank according to its action tier.
 */
export function getPermissionsForRank(rank) {
  if (rank === RANKS.SYSTEM_ADMINISTRATOR) {
    return [
      PERMISSIONS.MANAGE_USERS,
      PERMISSIONS.MANAGE_ROLES,
      PERMISSIONS.SYSTEM_CONFIGURATION,
      PERMISSIONS.VIEW_TECHNICAL_LOGS,
      PERMISSIONS.VIEW_AUDIT_LOG,
      PERMISSIONS.EXPORT_AUDIT_LOG,
    ]
  }

  const tier = getActionTier(rank)
  const basePermissions = [
    PERMISSIONS.VIEW_ASSIGNED_CASES,
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.DOWNLOAD_DOCUMENTS,
    PERMISSIONS.DOCUMENT_VERSION_VIEW,
    PERMISSIONS.INTEGRITY_VERIFY,
    PERMISSIONS.SEARCH_CASE_RECORDS,
  ]

  if (rank === RANKS.CONSTABLE || rank === RANKS.HEAD_CONSTABLE) {
    return [
      PERMISSIONS.VIEW_ASSIGNED_CASES,
      PERMISSIONS.VIEW_DOCUMENTS,
      PERMISSIONS.DOWNLOAD_DOCUMENTS,
      PERMISSIONS.ADD_EVIDENCE,
      PERMISSIONS.SEARCH_CASE_RECORDS,
    ]
  }

  if (rank === RANKS.ASI) {
    return [
      ...basePermissions,
      PERMISSIONS.ADD_EVIDENCE,
      PERMISSIONS.UPLOAD_DOCUMENTS,
      PERMISSIONS.ADD_INVESTIGATION_UPDATE,
    ]
  }

  if (rank === RANKS.SI) {
    return [
      ...basePermissions,
      PERMISSIONS.CREATE_CASES,
      PERMISSIONS.ADD_EVIDENCE,
      PERMISSIONS.UPLOAD_DOCUMENTS,
      PERMISSIONS.DOCUMENT_VERSION_CREATE,
      PERMISSIONS.ADD_INVESTIGATION_UPDATE,
      PERMISSIONS.REQUEST_ACCESS,
    ]
  }

  if (rank === RANKS.LEGAL_OFFICER) {
    return [
      ...basePermissions,
      PERMISSIONS.VIEW_LEGAL_CASES,
      PERMISSIONS.REVIEW_RECORDS,
      PERMISSIONS.REVIEW_SENSITIVE_RECORDS,
    ]
  }

  if (rank === RANKS.FORENSIC_OFFICER) {
    return [
      ...basePermissions,
      PERMISSIONS.VIEW_FORENSIC_EVIDENCE,
      PERMISSIONS.ADD_EVIDENCE,
      PERMISSIONS.UPLOAD_DOCUMENTS,
      PERMISSIONS.ADD_INVESTIGATION_UPDATE,
    ]
  }

  if (rank === RANKS.CYBER_CELL_OFFICER) {
    return [
      ...basePermissions,
      PERMISSIONS.VIEW_CYBER_CASES,
      PERMISSIONS.ADD_EVIDENCE,
      PERMISSIONS.UPLOAD_DOCUMENTS,
      PERMISSIONS.ADD_INVESTIGATION_UPDATE,
    ]
  }

  const createPermissions = [
    ...basePermissions,
    PERMISSIONS.VIEW_STATION_CASES,
    PERMISSIONS.CREATE_INVESTIGATION_RECORDS,
    PERMISSIONS.ADD_EVIDENCE,
    PERMISSIONS.ADD_WITNESS_STATEMENT,
    PERMISSIONS.ADD_CASE_FACT,
    PERMISSIONS.ADD_INVESTIGATION_UPDATE,
    PERMISSIONS.UPLOAD_DOCUMENTS,
    PERMISSIONS.DOCUMENT_VERSION_CREATE,
  ]

  if (tier === ACTION_TIERS.CREATE) {
    return createPermissions
  }

  // HIGHER_AUTHORITY
  const authorityPermissions = [
    ...createPermissions,
    PERMISSIONS.VIEW_DISTRICT_CASES,
    PERMISSIONS.VIEW_STATE_CASES,
    PERMISSIONS.CREATE_CASES,
    PERMISSIONS.UPDATE_CASE_STATUS,
    PERMISSIONS.ASSIGN_OFFICERS,
    PERMISSIONS.CASE_RECORD_MARK_SUPERSEDED,
    PERMISSIONS.REVIEW_RECORDS,
    PERMISSIONS.REVIEW_SENSITIVE_RECORDS,
    PERMISSIONS.APPROVE_ACCESS,
    PERMISSIONS.VIEW_AUDIT_LOG,
    PERMISSIONS.EXPORT_AUDIT_LOG,
  ]

  if ([RANKS.INSPECTOR, RANKS.SHO].includes(rank)) {
    return authorityPermissions
  }

  if ([RANKS.DSP, RANKS.ACP].includes(rank)) {
    return [...authorityPermissions, PERMISSIONS.VIEW_SENSITIVE_DOCUMENTS]
  }

  if ([RANKS.SP, RANKS.DCP].includes(rank)) {
    return [...authorityPermissions, PERMISSIONS.VIEW_SENSITIVE_DOCUMENTS]
  }

  if ([RANKS.DIG, RANKS.IG].includes(rank)) {
    return [...authorityPermissions, PERMISSIONS.VIEW_SENSITIVE_DOCUMENTS, PERMISSIONS.VIEW_HIGH_SECURITY_DOCUMENTS]
  }

  if ([RANKS.ADG, RANKS.DGP].includes(rank)) {
    return [
      ...authorityPermissions,
      PERMISSIONS.VIEW_SENSITIVE_DOCUMENTS,
      PERMISSIONS.VIEW_HIGH_SECURITY_DOCUMENTS,
      PERMISSIONS.VIEW_HIGHLY_SENSITIVE_DOCUMENTS,
    ]
  }

  return authorityPermissions
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTIONAL ROLES
// ─────────────────────────────────────────────────────────────────────────────
export const FUNCTIONAL_ROLES = {
  INVESTIGATION_OFFICER: 'INVESTIGATION_OFFICER',
  CASE_SUPERVISOR: 'CASE_SUPERVISOR',
  LEGAL_OFFICER: 'LEGAL_OFFICER',
  FORENSIC_OFFICER: 'FORENSIC_OFFICER',
  CYBER_CELL_OFFICER: 'CYBER_CELL_OFFICER',
  AUDITOR: 'AUDITOR',
  SYSTEM_ADMINISTRATOR: 'SYSTEM_ADMINISTRATOR',
}

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────
export const PERMISSIONS = {
  // Case access
  VIEW_ASSIGNED_CASES: 'VIEW_ASSIGNED_CASES',
  VIEW_STATION_CASES: 'VIEW_STATION_CASES',
  VIEW_DISTRICT_CASES: 'VIEW_DISTRICT_CASES',
  VIEW_STATE_CASES: 'VIEW_STATE_CASES',

  // Case management
  CREATE_CASES: 'CREATE_CASES',
  UPDATE_CASE_STATUS: 'UPDATE_CASE_STATUS',
  ASSIGN_OFFICERS: 'ASSIGN_OFFICERS',

  // Investigation records
  CREATE_INVESTIGATION_RECORDS: 'CREATE_INVESTIGATION_RECORDS',
  ADD_EVIDENCE: 'ADD_EVIDENCE',
  ADD_WITNESS_STATEMENT: 'ADD_WITNESS_STATEMENT',
  ADD_CASE_FACT: 'ADD_CASE_FACT',
  ADD_INVESTIGATION_UPDATE: 'ADD_INVESTIGATION_UPDATE',

  // Documents & Versioning (Phase 3)
  UPLOAD_DOCUMENTS: 'UPLOAD_DOCUMENTS',
  VIEW_DOCUMENTS: 'VIEW_DOCUMENTS',
  DOWNLOAD_DOCUMENTS: 'DOWNLOAD_DOCUMENTS',
  DOCUMENT_VERSION_CREATE: 'DOCUMENT_VERSION_CREATE',
  DOCUMENT_VERSION_VIEW: 'DOCUMENT_VERSION_VIEW',
  INTEGRITY_VERIFY: 'INTEGRITY_VERIFY',
  CASE_RECORD_MARK_SUPERSEDED: 'CASE_RECORD_MARK_SUPERSEDED',

  // Review & supervision
  REVIEW_RECORDS: 'REVIEW_RECORDS',
  REVIEW_SENSITIVE_RECORDS: 'REVIEW_SENSITIVE_RECORDS',
  APPROVE_ACCESS: 'APPROVE_ACCESS',
  VIEW_AUDIT_LOG: 'VIEW_AUDIT_LOG',
  EXPORT_AUDIT_LOG: 'EXPORT_AUDIT_LOG',

  // Search
  SEARCH_CASE_RECORDS: 'SEARCH_CASE_RECORDS',

  // Rank-specific capabilities
  REQUEST_ACCESS: 'REQUEST_ACCESS',
  VIEW_LEGAL_CASES: 'VIEW_LEGAL_CASES',
  VIEW_FORENSIC_EVIDENCE: 'VIEW_FORENSIC_EVIDENCE',
  VIEW_CYBER_CASES: 'VIEW_CYBER_CASES',
  VIEW_SENSITIVE_DOCUMENTS: 'VIEW_SENSITIVE_DOCUMENTS',
  VIEW_HIGH_SECURITY_DOCUMENTS: 'VIEW_HIGH_SECURITY_DOCUMENTS',
  VIEW_HIGHLY_SENSITIVE_DOCUMENTS: 'VIEW_HIGHLY_SENSITIVE_DOCUMENTS',
  MANAGE_USERS: 'MANAGE_USERS',
  MANAGE_ROLES: 'MANAGE_ROLES',
  SYSTEM_CONFIGURATION: 'SYSTEM_CONFIGURATION',
  VIEW_TECHNICAL_LOGS: 'VIEW_TECHNICAL_LOGS',
}

// Sensitivity levels — higher number = more restricted
const SENSITIVITY_LEVELS = {
  INTERNAL: 1,
  RESTRICTED: 2,
  CONFIDENTIAL: 3,
  SECRET: 4,
  HIGHLY_SENSITIVE: 5,
}

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSION CHECKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a user has a specific permission.
 * Uses the authenticated database user record — NEVER frontend-selected position.
 */
export function hasPermission(user, permission) {
  if (!user || !user.permissions) return false
  return user.permissions.includes(permission)
}

/**
 * CRITICAL SECURITY CHECK:
 * Verify that the position selected on login page matches the authenticated user's rank.
 * If it doesn't match, the selected position is ignored — database rank is authoritative.
 * Returns { verified: boolean, authorizedRank: string, selectedRank: string }
 */
export function verifySelectedPosition(authenticatedUser, selectedPosition) {
  if (!authenticatedUser) {
    return { verified: false, authorizedRank: null, selectedPosition }
  }

  const dbRank = authenticatedUser.rank
  const dbAccessLevel = authenticatedUser.accessLevel

  // Strict rank match check
  const matched = dbRank === selectedPosition

  return {
    verified: matched, // Auth succeeds ONLY if selected position matches registered DB rank
    dbRank,
    dbAccessLevel,
    selectedPosition,
    positionMatched: matched,
    authoritativeAccessLevel: dbAccessLevel,
    error: !matched ? `Rank Verification Failed: Selected position "${selectedPosition}" does not match your registered rank "${dbRank}". Access Denied.` : null,
  }
}

/**
 * ABAC: Check if a user can access a specific case.
 * Combines: rank level + case assignment + jurisdiction + sensitivity.
 */
export function canAccessCase(user, caseObj, isAssigned) {
  if (!user || !caseObj) return false

  const userLevel = user.accessLevel || 0
  const sensitivityLevel = SENSITIVITY_LEVELS[caseObj.sensitivity] || 1

  // Level 6 (State Command) — authorized state-level access
  if (userLevel >= ACCESS_LEVELS.STATE_COMMAND) {
    return hasPermission(user, PERMISSIONS.VIEW_STATE_CASES) ||
           hasPermission(user, PERMISSIONS.VIEW_DISTRICT_CASES) ||
           isAssigned
  }

  // Level 5 (Senior Command) — multi-district access
  if (userLevel >= ACCESS_LEVELS.SENIOR_COMMAND) {
    if (sensitivityLevel >= SENSITIVITY_LEVELS.SECRET) {
      return isAssigned || hasPermission(user, PERMISSIONS.REVIEW_SENSITIVE_RECORDS)
    }
    return hasPermission(user, PERMISSIONS.VIEW_DISTRICT_CASES) || isAssigned
  }

  // Level 4 (District Supervisor)
  if (userLevel >= ACCESS_LEVELS.DISTRICT_SUPERVISOR) {
    if (sensitivityLevel >= SENSITIVITY_LEVELS.HIGHLY_SENSITIVE) {
      return isAssigned
    }
    const sameJurisdiction = user.jurisdiction === caseObj.jurisdiction
    return sameJurisdiction && hasPermission(user, PERMISSIONS.VIEW_DISTRICT_CASES) || isAssigned
  }

  // Level 3 (Station Supervisor)
  if (userLevel >= ACCESS_LEVELS.STATION_SUPERVISOR) {
    if (sensitivityLevel >= SENSITIVITY_LEVELS.SECRET) {
      return isAssigned
    }
    const sameStation = user.policeStation === caseObj.policeStation
    return (sameStation && hasPermission(user, PERMISSIONS.VIEW_STATION_CASES)) || isAssigned
  }

  // Level 1-2 (Field/Investigation Officers) — only assigned cases
  return isAssigned && hasPermission(user, PERMISSIONS.VIEW_ASSIGNED_CASES)
}

/**
 * Check if user can create a case.
 * Level 3+ (Station Supervisor and above) or explicit CREATE_CASES permission.
 */
export function canCreateCase(user) {
  if (!user) return false
  if (user.accessLevel >= ACCESS_LEVELS.STATION_SUPERVISOR) return true
  return hasPermission(user, PERMISSIONS.CREATE_CASES)
}

/**
 * Check if user can create investigation records or upload documents (Action Tier: Create or Higher Authority)
 */
export function canCreateRecords(user) {
  if (!user) return false
  return hasPermission(user, PERMISSIONS.CREATE_INVESTIGATION_RECORDS) ||
         hasPermission(user, PERMISSIONS.UPLOAD_DOCUMENTS) ||
         hasPermission(user, PERMISSIONS.DOCUMENT_VERSION_CREATE)
}

/**
 * Check if user can assign officers to a case.
 */
export function canAssignOfficers(user) {
  if (!user) return false
  if (user.accessLevel >= ACCESS_LEVELS.STATION_SUPERVISOR) return true
  return hasPermission(user, PERMISSIONS.ASSIGN_OFFICERS)
}

/**
 * Check if user can update case status.
 */
export function canUpdateCaseStatus(user) {
  if (!user) return false
  if (user.accessLevel >= ACCESS_LEVELS.STATION_SUPERVISOR) return true
  return hasPermission(user, PERMISSIONS.UPDATE_CASE_STATUS)
}

/**
 * Security telemetry is deliberately restricted to supervisors and auditors.
 * The check uses the authenticated profile, never the login-page selection.
 */
export function canViewSecurityDashboard(user) {
  if (!user) return false
  return hasPermission(user, PERMISSIONS.VIEW_AUDIT_LOG) ||
    hasPermission(user, PERMISSIONS.REVIEW_RECORDS) ||
    user.functionalRole === FUNCTIONAL_ROLES.AUDITOR ||
    user.accessLevel >= ACCESS_LEVELS.DISTRICT_SUPERVISOR
}

/**
 * Get access level label for display.
 */
export function getAccessLevelLabel(level) {
  const labels = {
    [ACCESS_LEVELS.FIELD_OFFICER]: 'Field Officer',
    [ACCESS_LEVELS.INVESTIGATION_OFFICER]: 'Investigation Officer',
    [ACCESS_LEVELS.STATION_SUPERVISOR]: 'Station Supervisor',
    [ACCESS_LEVELS.DISTRICT_SUPERVISOR]: 'District Supervisor',
    [ACCESS_LEVELS.SENIOR_COMMAND]: 'Senior Command',
    [ACCESS_LEVELS.STATE_COMMAND]: 'State Command',
  }
  return labels[level] || 'Unknown'
}

/**
 * Get display label for sensitivity.
 */
export function getSensitivityLabel(sensitivity) {
  const labels = {
    INTERNAL: 'Internal',
    RESTRICTED: 'Restricted',
    CONFIDENTIAL: 'Confidential',
    SECRET: 'Secret',
    HIGHLY_SENSITIVE: 'Highly Sensitive',
  }
  return labels[sensitivity] || sensitivity
}

/**
 * Get badge color class for sensitivity level.
 */
export function getSensitivityColor(sensitivity) {
  const colors = {
    INTERNAL: 'badge-info',
    RESTRICTED: 'badge-warning',
    CONFIDENTIAL: 'badge-orange',
    SECRET: 'badge-danger',
    HIGHLY_SENSITIVE: 'badge-critical',
  }
  return colors[sensitivity] || 'badge-info'
}
