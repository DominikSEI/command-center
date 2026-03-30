import asyncio
import logging
import psutil
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Project, VpsMetric
from services.checker import check_project
from services.telegram import send_daily_summary

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def run_checks():
    db: Session = SessionLocal()
    try:
        projects = db.query(Project).filter(Project.is_active == True).all()
        tasks = [check_project(p, db) for p in projects]
        await asyncio.gather(*tasks, return_exceptions=True)
        logger.info(f"Checked {len(projects)} projects")
    except Exception as e:
        logger.error(f"Scheduler check error: {e}")
    finally:
        db.close()


async def collect_vps_metrics():
    db: Session = SessionLocal()
    try:
        net = psutil.net_io_counters()
        metric = VpsMetric(
            cpu_percent=psutil.cpu_percent(interval=1),
            ram_percent=psutil.virtual_memory().percent,
            disk_percent=psutil.disk_usage("/").percent,
            net_bytes_sent=net.bytes_sent,
            net_bytes_recv=net.bytes_recv,
        )
        db.add(metric)
        db.commit()
    except Exception as e:
        logger.error(f"VPS metrics error: {e}")
    finally:
        db.close()


async def send_daily_report():
    db: Session = SessionLocal()
    try:
        from models import CheckResult
        from sqlalchemy import func
        from datetime import timedelta

        cutoff = datetime.utcnow() - timedelta(days=1)
        projects = db.query(Project).filter(Project.is_active == True).all()
        lines = []
        for p in projects:
            total = db.query(CheckResult).filter(
                CheckResult.project_id == p.id,
                CheckResult.checked_at >= cutoff,
            ).count()
            online = db.query(CheckResult).filter(
                CheckResult.project_id == p.id,
                CheckResult.checked_at >= cutoff,
                CheckResult.status == "online",
            ).count()
            uptime = (online / total * 100) if total > 0 else 0
            icon = "✅" if uptime >= 99 else "⚠️" if uptime >= 80 else "❌"
            lines.append(f"{icon} {p.name}: {uptime:.1f}%")

        summary = "\n".join(lines) if lines else "Keine Projekte konfiguriert."
        send_daily_summary(summary)
    except Exception as e:
        logger.error(f"Daily report error: {e}")
    finally:
        db.close()


def start_scheduler():
    scheduler.add_job(run_checks, "interval", minutes=5, id="health_checks", replace_existing=True)
    scheduler.add_job(collect_vps_metrics, "interval", minutes=5, id="vps_metrics", replace_existing=True)
    scheduler.add_job(send_daily_report, "cron", hour=8, minute=0, id="daily_report", replace_existing=True)
    scheduler.start()
    logger.info("Scheduler started")


def stop_scheduler():
    scheduler.shutdown()
