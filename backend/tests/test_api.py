import pytest
import io
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models.otp import OTPVerification
from app.services.otp_service import hash_otp
from datetime import datetime, timedelta, timezone

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    from app.seeds.seed_data import seed_roles_and_admin
    db = SessionLocal()
    seed_roles_and_admin(db)
    db.close()

def test_admin_login():
    resp = client.post("/auth/login", json={
        "username": "admin@police.gov.in",
        "password": "Admin@DocGuard2026"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["police_rank"] == "System Administrator"

def test_officer_registration_and_login():
    # 1. Simulate verified OTP in database
    db = SessionLocal()
    phone = "9812345678"
    otp = "543210"
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    rec = OTPVerification(
        mobile_number=phone,
        hashed_otp=hash_otp(otp),
        otp_expiration_time=now + timedelta(minutes=5),
        verification_status="verified",
        verified_at=now,
        number_of_attempts=1
    )
    db.add(rec)
    db.commit()
    db.close()

    # 2. Register officer
    reg_resp = client.post("/auth/register", json={
        "full_name": "Inspector Vikram Malhotra",
        "mobile_number": phone,
        "email": "vikram.malhotra@police.gov.in",
        "police_id": "POLICE-DL-9999",
        "police_rank": "Inspector",
        "police_station": "Connaught Place Police Station",
        "district": "New Delhi",
        "state": "Delhi",
        "password": "OfficerSecurePass@123"
    })
    assert reg_resp.status_code == 201

    # 3. Login with mobile number
    login_resp = client.post("/auth/login", json={
        "username": phone,
        "password": "OfficerSecurePass@123"
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    assert token is not None

    # 4. Access /users/me
    me_resp = client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["police_id"] == "POLICE-DL-9999"

def test_case_and_document_workflow():
    # Login as admin to perform actions
    login_resp = client.post("/auth/login", json={
        "username": "admin@police.gov.in",
        "password": "Admin@DocGuard2026"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a Case
    case_resp = client.post("/cases", headers=headers, json={
        "case_number": "FIR-2026-TEST-7788",
        "case_title": "Automated Test Case File",
        "case_description": "Testing secure upload and blockchain anchoring",
        "case_type": "Special Operations",
        "police_station": "Headquarters Central Station",
        "district": "Central",
        "state": "National Capital"
    })
    assert case_resp.status_code == 201
    case_id = case_resp.json()["case_id"]

    # 2. Upload Document
    file_content = b"TOP SECRET POLICE DOSSIER - EVIDENCE ITEM #1092"
    files = {
        "file": ("evidence_report.txt", io.BytesIO(file_content), "text/plain")
    }
    data = {
        "case_id": case_id,
        "document_title": "Primary Evidence Report",
        "document_type": "EVIDENCE",
        "access_classification": "Top Secret"
    }
    upload_resp = client.post("/documents/upload", headers=headers, data=data, files=files)
    assert upload_resp.status_code == 201
    doc_id = upload_resp.json()["document_id"]
    sha256_hash = upload_resp.json()["sha256_document_hash"]
    assert len(sha256_hash) == 64
    assert upload_resp.json()["blockchain_transaction_id"] is not None

    # 3. Verify Document Integrity (AES-GCM decryption + SHA-256 + Blockchain check)
    verify_resp = client.post(f"/documents/{doc_id}/verify", headers=headers)
    assert verify_resp.status_code == 200
    assert verify_resp.json()["status"] == "VERIFIED"
    assert verify_resp.json()["local_integrity_verified"] is True
    assert verify_resp.json()["blockchain_verified"] is True

    # 4. Download and Decrypt Document
    download_resp = client.get(f"/documents/{doc_id}/download", headers=headers)
    assert download_resp.status_code == 200
    assert download_resp.content == file_content
    assert download_resp.headers.get("X-Document-Integrity") == "SHA-256-VERIFIED"

    # 5. Check Audit Log Chain Integrity
    chain_resp = client.get("/audit-logs/verify-chain", headers=headers)
    assert chain_resp.status_code == 200
    assert chain_resp.json()["valid"] is True
    assert chain_resp.json()["total_records"] > 0

def test_complete_registration_endpoint():
    db = SessionLocal()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    db.add(OTPVerification(
        mobile_number="9899112233",
        hashed_otp=hash_otp("123456"),
        otp_expiration_time=now + timedelta(minutes=5),
        verification_status="verified",
        verified_at=now,
        number_of_attempts=1
    ))
    db.commit()
    db.close()

    resp = client.post("/auth/complete-registration", json={
        "full_name": "Constable Amit Sharma",
        "email": "amit.sharma@police.gov.in",
        "phone_number": "9899112233",
        "police_id": "POLICE-DL-5544",
        "rank": "Constable",
        "station": "Central Station",
        "district": "District 1",
        "password": "SecurePassword@123",
        "confirm_password": "SecurePassword@123"
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "success"
    assert data["police_rank"] == "Constable"

def test_complete_registration_requires_recent_verified_phone_otp():
    resp = client.post("/auth/complete-registration", json={
        "full_name": "Officer Without OTP",
        "email": "officer.without.otp@police.gov.in",
        "phone_number": "9899001122",
        "police_id": "POLICE-DL-NO-OTP",
        "rank": "Constable",
        "station": "Central Station",
        "district": "District 1",
        "password": "SecurePassword@123",
        "confirm_password": "SecurePassword@123"
    })
    assert resp.status_code == 400
    assert "OTP verification" in resp.json()["detail"]

def test_demo_phone_otp_registration_flow(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "app_env", "development")
    monkeypatch.setattr(settings, "otp_demo_mode", True)
    send_resp = client.post("/auth/start-registration", json={
        "full_name": "Demo Phone Officer",
        "email": "demo.phone.flow@example.com",
        "phone_number": "9876500077"
    })
    assert send_resp.status_code == 200
    assert send_resp.json()["demo_mode"] is True
    assert send_resp.json()["delivery_status"] == "ready"

    verify_resp = client.post("/auth/verify-otp", json={
        "phone_number": "9876500077",
        "otp": "123456"
    })
    assert verify_resp.status_code == 200
    assert verify_resp.json()["status"] == "success"
