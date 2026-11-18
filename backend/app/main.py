"""FastAPI application entry point."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .controllers import assignments, auth, dashboard, essays
from .database import Base, SessionLocal, engine
from .models import IN_PROGRESS, Essay
from .services import nlp, rag

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # shortcut: create_all instead of migrations; add Alembic before the schema changes with real data in it
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        # evaluations run in-process, so anything mid-pipeline at shutdown was lost: make it retryable
        db.query(Essay).filter(Essay.status.in_(IN_PROGRESS)).update(
            {"status": "failed", "error": "Evaluation was interrupted. Please retry."}, synchronize_session=False
        )
        db.commit()
    log.info("Indexed %d rubric chunks into ChromaDB", rag.ingest_knowledge())
    nlp.warm_up()
    yield


app = FastAPI(title="Automated Essay Scoring API", version="1.0.0", lifespan=lifespan)
for module in (auth, assignments, essays, dashboard):
    app.include_router(module.router)


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}
