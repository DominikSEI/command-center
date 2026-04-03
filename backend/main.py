from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime
from database import init_db
from services.scheduler import start_scheduler, stop_scheduler
from routes import auth, projects, tracker, vps, tasks, ideas, notes, ai, briefing, news

STARTED_AT = datetime.utcnow()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="Command Center API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(tracker.router)
app.include_router(vps.router)
app.include_router(tasks.router)
app.include_router(ideas.router)
app.include_router(notes.router)
app.include_router(ai.router)
app.include_router(briefing.router)
app.include_router(news.router)


@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/version")
def version():
    return {"started_at": STARTED_AT.isoformat() + "Z"}
