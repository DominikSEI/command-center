from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    cluster = Column(String, nullable=False)  # Webapps / Bots / APIs / Infrastruktur
    check_type = Column(String, nullable=False)  # http / heartbeat / custom_json / ssl
    url = Column(String, nullable=True)
    interval_minutes = Column(Integer, default=5)
    expected_interval_minutes = Column(Integer, nullable=True)  # für heartbeat
    alert_telegram = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    check_results = relationship("CheckResult", back_populates="project", cascade="all, delete-orphan")


class CheckResult(Base):
    __tablename__ = "check_results"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    status = Column(String, nullable=False)  # online / warning / down
    response_time_ms = Column(Float, nullable=True)
    status_code = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    checked_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="check_results")


class VpsMetric(Base):
    __tablename__ = "vps_metrics"

    id = Column(Integer, primary_key=True, index=True)
    cpu_percent = Column(Float, nullable=True)
    ram_percent = Column(Float, nullable=True)
    disk_percent = Column(Float, nullable=True)
    net_bytes_sent = Column(Float, nullable=True)
    net_bytes_recv = Column(Float, nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow)


class TrackerProject(Base):
    __tablename__ = "tracker_projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="idea")  # idea / in_progress / review / live
    progress_percent = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    todos = relationship("TrackerTodo", back_populates="tracker_project", cascade="all, delete-orphan")


class TrackerTodo(Base):
    __tablename__ = "tracker_todos"

    id = Column(Integer, primary_key=True, index=True)
    tracker_project_id = Column(Integer, ForeignKey("tracker_projects.id"), nullable=False)
    title = Column(String, nullable=False)
    done = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    tracker_project = relationship("TrackerProject", back_populates="todos")
