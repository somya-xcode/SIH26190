from app.routes.auth import router as auth_router
from app.routes.users import router as users_router
from app.routes.cases import router as cases_router
from app.routes.documents import router as documents_router
from app.routes.audit import router as audit_router
from app.routes.admin import router as admin_router

__all__ = [
    "auth_router",
    "users_router",
    "cases_router",
    "documents_router",
    "audit_router",
    "admin_router",
]
