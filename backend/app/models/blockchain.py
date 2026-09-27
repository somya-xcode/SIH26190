from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base

class BlockchainTransaction(Base):
    __tablename__ = "blockchain_transactions"

    transaction_id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False, index=True)
    transaction_hash = Column(String(128), unique=True, nullable=False, index=True)
    block_number = Column(Integer, nullable=True, index=True)
    document_hash = Column(String(64), nullable=False, index=True)
    network = Column(String(50), default="Ethereum-Private", nullable=False)
    transaction_status = Column(String(50), default="pending", nullable=False)  # pending, confirmed, failed
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    confirmed_at = Column(DateTime, nullable=True)

    document = relationship("Document")
