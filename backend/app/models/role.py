import enum
from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class PoliceRankEnum(str, enum.Enum):
    CONSTABLE = "Constable"
    HEAD_CONSTABLE = "Head Constable"
    ASI = "ASI"
    SI = "SI"
    INSPECTOR = "Inspector"
    DSP = "DSP"
    SP = "SP"
    DIG = "DIG"
    IG = "IG"
    DGP = "DGP"
    SYSTEM_ADMINISTRATOR = "System Administrator"

class Role(Base):
    __tablename__ = "roles"

    role_id = Column(Integer, primary_key=True, index=True)
    role_name = Column(String(50), unique=True, nullable=False, index=True)
    rank_level = Column(Integer, nullable=False, default=1)  # 1 = Constable, ..., 11 = System Admin
    description = Column(String(255), nullable=True)

    permissions = relationship("Permission", secondary="role_permissions", back_populates="roles")
    users = relationship("User", back_populates="role")

class Permission(Base):
    __tablename__ = "permissions"

    permission_id = Column(Integer, primary_key=True, index=True)
    permission_name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)

    roles = relationship("Role", secondary="role_permissions", back_populates="permissions")

class RolePermission(Base):
    __tablename__ = "role_permissions"

    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.role_id", ondelete="CASCADE"), nullable=False, index=True)
    permission_id = Column(Integer, ForeignKey("permissions.permission_id", ondelete="CASCADE"), nullable=False, index=True)

    __table_args__ = (UniqueConstraint('role_id', 'permission_id', name='uq_role_permission'),)
