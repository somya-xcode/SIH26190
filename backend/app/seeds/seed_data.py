from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.role import Role, Permission, RolePermission
from app.models.user import User
from app.models.case import Case, CaseAccess
from app.security.password import hash_password

DEFAULT_PERMISSIONS = [
    ("document:view", "View document metadata and contents"),
    ("document:upload", "Upload new police documents"),
    ("document:download", "Download and decrypt authorized documents"),
    ("document:edit", "Edit document metadata and attributes"),
    ("document:approve", "Approve pending documents and charge sheets"),
    ("document:share", "Share documents with other officers"),
    ("document:delete", "Soft delete or purge documents"),
    ("document:archive", "Archive documents"),
    ("document:verify", "Verify cryptographic integrity and blockchain status"),
    ("case:create", "Register a new case or FIR"),
    ("case:view", "View case details"),
    ("case:edit", "Update case details and status"),
    ("case:assign", "Assign cases to officers"),
    ("audit:view", "Inspect immutable audit log trail"),
    ("admin:manage_users", "Manage officers and roles"),
    ("admin:view_dashboard", "View system dashboard metrics"),
]

# Ranks mapped to rank level and permission subsets
POLICE_RANKS = [
    ("Constable", 1, ["document:view", "document:verify", "case:view"]),
    ("Head Constable", 2, ["document:view", "document:verify", "case:view", "document:upload"]),
    ("ASI", 3, ["document:view", "document:verify", "case:view", "document:upload", "document:download"]),
    ("SI", 4, ["document:view", "document:verify", "case:view", "document:upload", "document:download", "document:edit", "document:share", "case:create", "case:edit"]),
    ("Inspector", 5, ["document:view", "document:verify", "case:view", "document:upload", "document:download", "document:edit", "document:share", "document:approve", "case:create", "case:edit", "case:assign"]),
    ("DSP", 6, ["document:view", "document:verify", "case:view", "document:upload", "document:download", "document:edit", "document:share", "document:approve", "document:archive", "case:create", "case:edit", "case:assign", "audit:view"]),
    ("SP", 7, ["document:view", "document:verify", "case:view", "document:upload", "document:download", "document:edit", "document:share", "document:approve", "document:archive", "document:delete", "case:create", "case:edit", "case:assign", "audit:view", "admin:view_dashboard"]),
    ("DIG", 8, ["document:view", "document:verify", "case:view", "document:upload", "document:download", "document:edit", "document:share", "document:approve", "document:archive", "document:delete", "case:create", "case:edit", "case:assign", "audit:view", "admin:view_dashboard"]),
    ("IG", 9, ["document:view", "document:verify", "case:view", "document:upload", "document:download", "document:edit", "document:share", "document:approve", "document:archive", "document:delete", "case:create", "case:edit", "case:assign", "audit:view", "admin:view_dashboard"]),
    ("DGP", 10, ["document:view", "document:verify", "case:view", "document:upload", "document:download", "document:edit", "document:share", "document:approve", "document:archive", "document:delete", "case:create", "case:edit", "case:assign", "audit:view", "admin:view_dashboard"]),
    ("System Administrator", 11, [p[0] for p in DEFAULT_PERMISSIONS]),
]

def seed_roles_and_admin(db: Session):
    """Seed initial police roles, permissions, and default administrator."""
    # 1. Seed Permissions
    perm_map = {}
    for name, desc in DEFAULT_PERMISSIONS:
        perm = db.query(Permission).filter(Permission.permission_name == name).first()
        if not perm:
            perm = Permission(permission_name=name, description=desc)
            db.add(perm)
            db.commit()
            db.refresh(perm)
        perm_map[name] = perm

    # 2. Seed Roles and assign permissions
    role_map = {}
    for rank_name, level, perms in POLICE_RANKS:
        role = db.query(Role).filter(Role.role_name == rank_name).first()
        if not role:
            role = Role(
                role_name=rank_name,
                rank_level=level,
                description=f"Police department rank: {rank_name}"
            )
            db.add(role)
            db.commit()
            db.refresh(role)

            for p_name in perms:
                if p_name in perm_map:
                    rp = RolePermission(role_id=role.role_id, permission_id=perm_map[p_name].permission_id)
                    db.add(rp)
            db.commit()
        role_map[rank_name] = role

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # 3. Seed System Administrator account if not present
    admin_user = db.query(User).filter(User.police_id == "ADMIN-001").first()
    if not admin_user:
        admin_role = role_map.get("System Administrator")
        admin_user = User(
            full_name="System Administrator",
            mobile_number="9876543210",
            email="admin@police.gov.in",
            password_hash=hash_password("Admin@DocGuard2026"),
            police_id="ADMIN-001",
            police_rank="System Administrator",
            role_id=admin_role.role_id if admin_role else 11,
            police_station="Headquarters Central Station",
            district="Central",
            state="National Capital",
            account_status="active",
            mobile_verification_status=True,
            created_date=now,
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

    # 4. Seed a Sample Investigating Officer (SI) and sample Case
    demo_io = db.query(User).filter(User.police_id == "POLICE-DL-1042").first()
    if not demo_io:
        si_role = role_map.get("SI")
        demo_io = User(
            full_name="Sub-Inspector Rajesh Kumar",
            mobile_number="9811122233",
            email="rajesh.kumar@police.gov.in",
            password_hash=hash_password("Officer@12345"),
            police_id="POLICE-DL-1042",
            police_rank="SI",
            role_id=si_role.role_id if si_role else 4,
            police_station="Connaught Place Police Station",
            district="New Delhi",
            state="Delhi",
            account_status="active",
            mobile_verification_status=True,
            created_date=now,
        )
        db.add(demo_io)
        db.commit()
        db.refresh(demo_io)

    demo_case = db.query(Case).filter(Case.case_number == "FIR-2026-DEL-0042").first()
    if not demo_case and demo_io:
        demo_case = Case(
            case_number="FIR-2026-DEL-0042",
            case_title="Cyber Financial Fraud & Identity Theft Investigation",
            case_description="Investigation into unauthorized digital ledger transfers and fraudulent bank communications.",
            case_type="Cybercrime",
            assigned_officer_id=demo_io.user_id,
            police_station="Connaught Place Police Station",
            district="New Delhi",
            state="Delhi",
            case_status="Under Investigation",
            created_by=demo_io.user_id,
            created_date=now,
            last_updated_date=now,
        )
        db.add(demo_case)
        db.commit()
