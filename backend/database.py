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
    insp = inspect(engine)
    with engine.connect() as conn:
        if DATABASE_URL.startswith("sqlite"):
            # tracker_projects
            tp_cols = [c["name"] for c in insp.get_columns("tracker_projects")]
            if "priority" not in tp_cols:
                conn.execute(text("ALTER TABLE tracker_projects ADD COLUMN priority INTEGER DEFAULT 2"))
            # briefings
            br_cols = [c["name"] for c in insp.get_columns("briefings")]
            if "summary_ai" not in br_cols:
                conn.execute(text("ALTER TABLE briefings ADD COLUMN summary_ai TEXT"))
            if "summary_stocks" not in br_cols:
                conn.execute(text("ALTER TABLE briefings ADD COLUMN summary_stocks TEXT"))
            conn.commit()
        else:
            # PostgreSQL (Supabase) — supports IF NOT EXISTS directly
            conn.execute(text(
                "ALTER TABLE tracker_projects ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 2"
            ))
            conn.execute(text("ALTER TABLE briefings ADD COLUMN IF NOT EXISTS summary_ai TEXT"))
            conn.execute(text("ALTER TABLE briefings ADD COLUMN IF NOT EXISTS summary_stocks TEXT"))
            conn.commit()
