/**
 * DocGuard – Case Service (Phase 2)
 * Handles case CRUD operations with RBAC + ABAC enforcement.
 */

import { db } from './mockCaseData'
import { canAccessCase, canCreateCase, canAssignOfficers, canUpdateCaseStatus, hasPermission, PERMISSIONS } from './accessControl'
import { auditService, AUDIT_ACTIONS } from './auditService'

export const caseService = {
  /**
   * Get all cases the user is authorized to view.
   * ABAC: filtered by assignment + jurisdiction + sensitivity.
   */
  getAccessibleCases(user) {
    if (!user) return []
    const allCases = db.getAllCases()
    return allCases.filter(c => {
      const isAssigned = db.isUserAssigned(user.id, c.id)
      return canAccessCase(user, c, isAssigned)
    })
  },

  /**
   * Get a single case by ID with authorization check.
   */
  getCaseById(user, caseId) {
    if (!user) throw new Error('Authentication required')
    const caseObj = db.getCaseById(caseId)
    if (!caseObj) throw new Error('Case not found')
    const isAssigned = db.isUserAssigned(user.id, caseId)
    if (!canAccessCase(user, caseObj, isAssigned)) {
      auditService.recordDenied({
        user,
        action: AUDIT_ACTIONS.RESTRICTED_ACCESS_ATTEMPT,
        resourceType: 'CASE',
        resourceId: caseId,
        resourceLabel: caseObj.caseNumber,
        caseId,
        reason: 'Case access denied by assignment, jurisdiction, or sensitivity policy.',
      })
      throw new Error('Access denied: You do not have authorization to access this case.')
    }
    return caseObj
  },

  /**
   * Create a new case (Level 3+ or explicit permission).
   */
  createCase(user, data) {
    if (!user) throw new Error('Authentication required')
    if (!canCreateCase(user)) {
      auditService.recordDenied({ user, action: AUDIT_ACTIONS.RESTRICTED_ACCESS_ATTEMPT, resourceType: 'CASE', reason: 'Case creation requires station supervisor or higher authorization.' })
      throw new Error('Access denied: Insufficient rank/permissions to create cases. Inspector/SHO or above required.')
    }
    const { title, description, caseType, department, policeStation, jurisdiction, priority, sensitivity } = data
    if (!title?.trim()) throw new Error('Case title is required')
    if (!caseType?.trim()) throw new Error('Case type is required')
    if (!jurisdiction?.trim()) throw new Error('Jurisdiction is required')

    const newCase = db.createCase({
      title: title.trim(),
      description: description?.trim() || '',
      caseType: caseType.trim(),
      department: department || user.department,
      policeStation: policeStation || user.policeStation,
      jurisdiction: jurisdiction.trim(),
      status: 'OPEN',
      priority: priority || 'MEDIUM',
      sensitivity: sensitivity || 'INTERNAL',
      createdBy: user.id,
    })

    // Auto-assign the creator
    db.addCaseMember({ caseId: newCase.id, userId: user.id, assignmentRole: 'Case Creator', assignedBy: user.id })
    auditService.record({
      action: AUDIT_ACTIONS.CASE_CREATED,
      user,
      resourceType: 'CASE',
      resourceId: newCase.id,
      resourceLabel: newCase.caseNumber,
      caseId: newCase.id,
      details: `Case created: ${newCase.title}`,
    })

    return newCase
  },

  /**
   * Get case members.
   */
  getCaseMembers(user, caseId) {
    this.getCaseById(user, caseId) // authorization check
    const members = db.getCaseMembers(caseId)
    const allUsers = db.getAllUsers()
    return members.map(m => {
      const memberUser = allUsers.find(u => u.id === m.userId)
      return { ...m, userName: memberUser?.name || m.userId, userRank: memberUser?.rank || '', userDept: memberUser?.department || '' }
    })
  },

  /**
   * Assign an officer to a case.
   */
  assignOfficer(user, caseId, targetUserId, assignmentRole) {
    if (!canAssignOfficers(user)) {
      auditService.recordDenied({ user, action: AUDIT_ACTIONS.RESTRICTED_ACCESS_ATTEMPT, resourceType: 'CASE_MEMBER', resourceId: caseId, caseId, reason: 'Officer assignment requires supervisor authorization.' })
      throw new Error('Access denied: Inspector/SHO or above can assign officers.')
    }
    this.getCaseById(user, caseId) // authorization check
    const targetUser = db.getUserById(targetUserId)
    if (!targetUser) throw new Error('Target user not found')
    const alreadyAssigned = db.isUserAssigned(targetUserId, caseId)
    if (alreadyAssigned) throw new Error('Officer is already assigned to this case.')
    const member = db.addCaseMember({ caseId, userId: targetUserId, assignmentRole: assignmentRole || 'Assigned Officer', assignedBy: user.id })
    auditService.record({
      action: AUDIT_ACTIONS.CASE_OFFICER_ASSIGNED,
      user,
      resourceType: 'CASE_MEMBER',
      resourceId: member.id,
      resourceLabel: targetUser.name,
      caseId,
      details: `${targetUser.name} assigned as ${member.assignmentRole}.`,
    })
    return member
  },

  /**
   * Update case status.
   */
  updateCaseStatus(user, caseId, newStatus) {
    if (!canUpdateCaseStatus(user)) {
      auditService.recordDenied({ user, action: AUDIT_ACTIONS.RESTRICTED_ACCESS_ATTEMPT, resourceType: 'CASE', resourceId: caseId, caseId, reason: 'Case status changes require supervisor authorization.' })
      throw new Error('Access denied: Insufficient permissions to update case status.')
    }
    this.getCaseById(user, caseId)
    const updated = db.updateCaseStatus(caseId, newStatus, user.id)
    auditService.record({
      action: AUDIT_ACTIONS.CASE_STATUS_CHANGED,
      user,
      resourceType: 'CASE',
      resourceId: caseId,
      resourceLabel: updated.caseNumber,
      caseId,
      details: `Case status changed to ${newStatus}.`,
    })
    return updated
  },

  addInvestigationUpdate(user, caseId, data) {
    if (!user) throw new Error('Authentication required')
    if (!hasPermission(user, PERMISSIONS.ADD_INVESTIGATION_UPDATE)) {
      auditService.recordDenied({
        user,
        action: AUDIT_ACTIONS.RESTRICTED_ACCESS_ATTEMPT,
        resourceType: 'INVESTIGATION_UPDATE',
        caseId,
        reason: 'Investigation updates require explicit case-journal permission.',
      })
      throw new Error('Access denied: You are not permitted to add investigation updates.')
    }
    this.getCaseById(user, caseId)
    if (!data?.updateText?.trim()) throw new Error('Update description is required')
    const update = db.addUpdate({
      ...data,
      caseId,
      updateText: data.updateText.trim(),
      addedBy: user.id,
    })
    auditService.record({
      action: AUDIT_ACTIONS.INVESTIGATION_UPDATE_ADDED,
      user,
      resourceType: 'INVESTIGATION_UPDATE',
      resourceId: update.id,
      caseId,
      details: 'Investigation update appended to the case journal.',
    })
    return update
  },

  getCaseActivity(user, caseId, filters = {}) {
    this.getCaseById(user, caseId)
    const events = db.getCaseHistory(caseId)
    if (!filters.type || filters.type === 'ALL') return events
    return events.filter(event => event.type === filters.type)
  },

  getCaseHistory(user, caseId, filters = {}) {
    return this.getCaseActivity(user, caseId, filters)
  },

  /**
   * Get all users available for assignment.
   */
  getAssignableUsers(user) {
    if (!canAssignOfficers(user)) return []
    return db.getAllUsers().map(u => {
      const { password: _, ...safe } = u
      return safe
    })
  },
}
