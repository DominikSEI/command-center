from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./command_center.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
    # Migration: add priority column if missing (SQLite doesn't support IF NOT EXISTS for columns)
    if DATABASE_URL.startswith("sqlite"):
        with engine.connect() as conn:
            from sqlalchemy import text, inspect
            inspector = inspect(engine)
            cols = [c["name"] for c in inspector.get_columns("tracker_projects")]
            if "priority" not in cols:
                conn.execute(text("ALTER TABLE tracker_projects ADD COLUMN priority INTEGER DEFAULT 2"))
                conn.commit()
