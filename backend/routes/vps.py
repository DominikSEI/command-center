from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import psutil
from database import get_db
from models import VpsMetric
from routes.deps import get_current_user

router = APIRouter(prefix="/vps", tags=["vps"])


@router.get("/metrics/current")
def get_current_metrics(_: str = Depends(get_current_user)):
    """Live system metrics read directly via psutil — no DB required."""
    net = psutil.net_io_counters()
    return {
        "cpu_percent": psutil.cpu_percent(interval=0.5),
        "ram_percent": psutil.virtual_memory().percent,
        "disk_percent": psutil.disk_usage("/").percent,
        "net_bytes_sent": net.bytes_sent,
        "net_bytes_recv": net.bytes_recv,
        "recorded_at": datetime.utcnow(),
    }


@router.get("/metrics")
def get_vps_metrics(hours: int = 24, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    metrics = (
        db.query(VpsMetric)
        .filter(VpsMetric.recorded_at >= cutoff)
        .order_by(VpsMetric.recorded_at.desc())
        .all()
    )
    return [
        {
            "cpu_percent": m.cpu_percent,
            "ram_percent": m.ram_percent,
            "disk_percent": m.disk_percent,
            "net_bytes_sent": m.net_bytes_sent,
            "net_bytes_recv": m.net_bytes_recv,
            "recorded_at": m.recorded_at,
        }
        for m in metrics
    ]


@router.get("/metrics/latest")
def get_latest_metrics(db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    metric = db.query(VpsMetric).order_by(VpsMetric.recorded_at.desc()).first()
    if not metric:
        return {}
    return {
        "cpu_percent": metric.cpu_percent,
        "ram_percent": metric.ram_percent,
        "disk_percent": metric.disk_percent,
        "net_bytes_sent": metric.net_bytes_sent,
        "net_bytes_recv": metric.net_bytes_recv,
        "recorded_at": metric.recorded_at,
    }
