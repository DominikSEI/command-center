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
    _run_migrations()


def _run_migrations():
    from sqlalchemy import text, inspect
    with engine.connect() as conn:
        if DATABASE_URL.startswith("sqlite"):
            # SQLite doesn't support IF NOT EXISTS for columns
            cols = [c["name"] for c in inspect(engine).get_columns("tracker_projects")]
            if "priority" not in cols:
                conn.execute(text("ALTER TABLE tracker_projects ADD COLUMN priority INTEGER DEFAULT 2"))
                conn.commit()
        else:
            # PostgreSQL (Supabase) — supports IF NOT EXISTS directly
            conn.execute(text(
                "ALTER TABLE tracker_projects ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 2"
            ))
            conn.commit()
