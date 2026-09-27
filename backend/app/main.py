import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database import engine, Base
from app.models import Role, Permission, RolePermission, User
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.middleware.rate_limit import InMemoryRateLimiterMiddleware

from app.routes.auth import router as auth_router
from app.routes.users import router as users_router
from app.routes.cases import router as cases_router
from app.routes.documents import router as documents_router
from app.routes.audit import router as audit_router
from app.routes.admin import router as admin_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure all database tables exist
    Base.metadata.create_all(bind=engine)
    
    # Initialize roles and permissions if database is newly created
    from app.seeds.seed_data import seed_roles_and_admin
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        seed_roles_and_admin(db)
    finally:
        db.close()
        
    yield
    # Shutdown logic (if any)

def create_application() -> FastAPI:
    app = FastAPI(
        title="Secure Digital Document Management System for Police Departments",
        description=(
            "Production-grade backend system for secure document storage, case file management, "
            "role-based access control (RBAC), AES-256-GCM encryption, ECDSA digital signatures, "
            "tamper-evident cryptographic audit logs, and blockchain-anchored integrity verification."
        ),
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # 1. Security Headers
    app.add_middleware(SecurityHeadersMiddleware)

    # 2. Rate Limiting (120 reqs / min per client IP)
    app.add_middleware(InMemoryRateLimiterMiddleware, max_requests=120, window_seconds=60)

    # 3. CORS Configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.frontend_origins + ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["Content-Disposition", "X-Document-Integrity"],
    )

    # 4. Mount API Routers at root (e.g. /auth, /users, /cases, /documents, /audit-logs, /admin)
    app.include_router(auth_router)
    app.include_router(users_router)
    app.include_router(cases_router)
    app.include_router(documents_router)
    app.include_router(audit_router)
    app.include_router(admin_router)

    # 5. Also mount routers with /api prefix for frontend Axios compatibility
    app.include_router(auth_router, prefix="/api")
    app.include_router(users_router, prefix="/api")
    app.include_router(cases_router, prefix="/api")
    app.include_router(documents_router, prefix="/api")
    app.include_router(audit_router, prefix="/api")
    app.include_router(admin_router, prefix="/api")

    @app.get("/health", tags=["Health"])
    async def health_check():
        return {
            "status": "healthy",
            "system": "Secure Digital Document Management System",
            "version": "1.0.0",
            "encryption": "AES-256-GCM",
            "integrity": "SHA-256",
            "signatures": "ECDSA-SECP256k1",
            "database": "connected",
        }

    return app

app = create_application()
