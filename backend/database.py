from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from models import Base
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./command_center.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
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
    # Migrate existing tables: add new columns if they don't exist yet
    with engine.connect() as conn:
        migrations = [
            ("projects", "description", "TEXT"),
            ("projects", "notes", "TEXT"),
            ("tracker_projects", "notes", "TEXT"),
        ]
        for table, col, typedef in migrations:
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {typedef}"))
                conn.commit()
            except Exception:
                pass
