from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
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
    description = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
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
    notes = Column(Text, nullable=True)
    priority = Column(Integer, default=2)  # 1=hoch, 2=mittel, 3=niedrig
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    todos = relationship("TrackerTodo", back_populates="tracker_project", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    tracker_project_id = Column(Integer, ForeignKey("tracker_projects.id", ondelete="SET NULL"), nullable=True)
    bucket = Column(String, default="backlog")  # backlog | today
    done = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    moved_to_today_at = Column(DateTime, nullable=True)

    tracker_project = relationship("TrackerProject")


class Idea(Base):
    __tablename__ = "ideas"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=True)
    status = Column(String, default="new")  # new | reviewing | done | rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    converted_to_project_id = Column(Integer, ForeignKey("tracker_projects.id", ondelete="SET NULL"), nullable=True)

    converted_project = relationship("TrackerProject", foreign_keys=[converted_to_project_id])


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=True)
    category = Column(String, default="sonstiges")  # ki_news / idee / tool / sonstiges
    link = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Briefing(Base):
    __tablename__ = "briefings"

    id = Column(Integer, primary_key=True, index=True)
    summary = Column(Text, nullable=False)
    summary_agent  = Column(Text, nullable=True)  # Persönliche Tagesvorschau (Claude)
    summary_ai = Column(Text, nullable=True)      # KI & Tech (@everlastai)
    summary_stocks = Column(Text, nullable=True)  # Aktien & Märkte (@AktienKanal)
    videos_json = Column(Text, nullable=True)     # JSON array of video metadata
    video_count = Column(Integer, default=0)
    generated_at = Column(DateTime, default=datetime.utcnow)


class TrackerTodo(Base):
    __tablename__ = "tracker_todos"

    id = Column(Integer, primary_key=True, index=True)
    tracker_project_id = Column(Integer, ForeignKey("tracker_projects.id"), nullable=False)
    title = Column(String, nullable=False)
    done = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    tracker_project = relationship("TrackerProject", back_populates="todos")


class AgentRun(Base):
    __tablename__ = "agent_runs"
    __table_args__ = (
        Index("ix_agent_runs_created_at", "created_at"),
    )

    id              = Column(Integer, primary_key=True, index=True)
    title           = Column(String, nullable=True)
    status          = Column(String, nullable=False, default="running")  # running / completed / error
    input_mode      = Column(String, nullable=False, default="text")     # text (voice later)
    initial_prompt  = Column(Text, nullable=False)
    final_response  = Column(Text, nullable=True)
    total_tokens_in  = Column(Integer, default=0)
    total_tokens_out = Column(Integer, default=0)
    total_cost_usd  = Column(Float, nullable=True)
    duration_ms     = Column(Integer, nullable=True)
    error           = Column(Text, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    completed_at    = Column(DateTime, nullable=True)

    messages   = relationship("AgentMessage", back_populates="run", cascade="all, delete-orphan")
    tool_calls = relationship("ToolCall",     back_populates="run", cascade="all, delete-orphan")


class AgentMessage(Base):
    __tablename__ = "agent_messages"

    id         = Column(Integer, primary_key=True, index=True)
    run_id     = Column(Integer, ForeignKey("agent_runs.id", ondelete="CASCADE"), nullable=False)
    role       = Column(String, nullable=False)   # user / assistant
    content    = Column(JSONB, nullable=False)     # string or list of content blocks
    sequence   = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    run        = relationship("AgentRun",  back_populates="messages")
    tool_calls = relationship("ToolCall",  back_populates="message", cascade="all, delete-orphan")


class ToolCall(Base):
    __tablename__ = "tool_calls"
    __table_args__ = (
        Index("ix_tool_calls_run_created", "run_id", "created_at"),
    )

    id          = Column(Integer, primary_key=True, index=True)
    run_id      = Column(Integer, ForeignKey("agent_runs.id",    ondelete="CASCADE"), nullable=False)
    message_id  = Column(Integer, ForeignKey("agent_messages.id", ondelete="CASCADE"), nullable=True)
    tool_name   = Column(String, nullable=False)
    tool_input  = Column(JSONB, nullable=False)
    tool_output = Column(JSONB, nullable=True)
    status      = Column(String, nullable=False, default="running")  # running / completed / error
    duration_ms = Column(Integer, nullable=True)
    error       = Column(Text, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    run     = relationship("AgentRun",     back_populates="tool_calls")
    message = relationship("AgentMessage", back_populates="tool_calls")
