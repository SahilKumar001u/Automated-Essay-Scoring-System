from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import Essay, User
from ..schemas import EssaySummary
from ..security import require_role
from ..services import metrics

router = APIRouter(prefix="/api", tags=["dashboard"])


def _avg(values):
    values = [v for v in values if v is not None]
    return round(sum(values) / len(values), 2) if values else None


@router.get("/config")
def public_config():
    """Submission limits, so the UI validates with the same numbers as the server."""
    return {
        "min_words": settings.min_words,
        "max_words": settings.max_words,
        "max_upload_bytes": settings.max_upload_bytes,
    }


@router.get("/dashboard/student")
def student_dashboard(user: User = Depends(require_role("student")), db: Session = Depends(get_db)):
    essays = db.query(Essay).filter(Essay.student_id == user.id).order_by(Essay.id.desc()).all()
    # a teacher's final score supersedes the AI score once the essay is reviewed
    effective = [e.final_score if e.final_score is not None else e.ai_score for e in essays]
    scored = [s for s in effective if s is not None]
    return {
        "stats": {
            "submissions": len(essays),
            "evaluated": len(scored),
            "average_score": _avg(scored),
            "best_score": max(scored) if scored else None,
        },
        "essays": [EssaySummary.model_validate(e) for e in essays],
    }


@router.get("/dashboard/educator")
def educator_dashboard(_: User = Depends(require_role("educator")), db: Session = Depends(get_db)):
    essays = db.query(Essay).order_by(Essay.id.desc()).all()
    reviewed = [e for e in essays if e.review]
    return {
        "stats": {
            "total": len(essays),
            "pending_review": sum(e.status == "evaluated" for e in essays),
            "reviewed": len(reviewed),
            "overrides": sum(e.is_override for e in reviewed),
            "average_ai_score": _avg(e.ai_score for e in essays),
            "average_eval_seconds": _avg(e.score.eval_seconds for e in essays if e.score),
        },
        # AI vs human agreement over every educator-reviewed essay (PRD section 22)
        "metrics": metrics.agreement([e.review.ai_score for e in reviewed], [e.review.final_score for e in reviewed]),
        "essays": [EssaySummary.model_validate(e) for e in essays],
    }
