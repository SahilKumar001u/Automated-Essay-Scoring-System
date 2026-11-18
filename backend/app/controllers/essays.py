"""Essay submission, evaluation trigger, results and teacher review endpoints."""
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import Assignment, Essay, TeacherReview, User
from ..schemas import EssayOut, EssaySummary, OverrideIn, ScoreResult
from ..security import current_user, require_role
from ..services.evaluation import run_evaluation
from ..services.files import clean_text, extract_text

router = APIRouter(prefix="/api/essays", tags=["essays"])


def _get_essay(essay_id: int, user: User, db: Session) -> Essay:
    essay = db.get(Essay, essay_id)
    # students may only see their own essays; 404 (not 403) so ids can't be probed
    if essay is None or (user.role == "student" and essay.student_id != user.id):
        raise HTTPException(404, "Essay not found")
    return essay


@router.post("/submit", response_model=EssayOut, status_code=201)
async def submit_essay(
    assignment_id: int | None = Form(None),
    prompt: str | None = Form(None),
    essay_text: str | None = Form(None),
    file: UploadFile | None = File(None),
    user: User = Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    if assignment_id is not None:
        assignment = db.get(Assignment, assignment_id)
        if assignment is None:
            raise HTTPException(404, "Assignment not found")
        prompt = assignment.prompt
    else:
        prompt = clean_text(prompt or "")
        if not 10 <= len(prompt) <= 2000:
            raise HTTPException(422, "Select an assignment or provide an essay prompt (10-2000 characters)")

    text = await extract_text(file) if file is not None and file.filename else clean_text(essay_text or "")
    word_count = len(text.split())
    if word_count < settings.min_words:
        raise HTTPException(422, f"Essay is too short: {word_count} words (minimum {settings.min_words})")
    if word_count > settings.max_words:
        raise HTTPException(422, f"Essay is too long: {word_count} words (maximum {settings.max_words})")

    essay = Essay(
        student_id=user.id, assignment_id=assignment_id, prompt=prompt, essay_text=text, word_count=word_count
    )
    db.add(essay)
    db.commit()
    return essay


@router.get("/history", response_model=list[EssaySummary])
def history(user: User = Depends(require_role("student")), db: Session = Depends(get_db)):
    return db.query(Essay).filter(Essay.student_id == user.id).order_by(Essay.id.desc()).all()


@router.get("/{essay_id}", response_model=EssayOut)
def get_essay(essay_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return _get_essay(essay_id, user, db)


@router.post("/{essay_id}/evaluate", response_model=EssayOut, status_code=202)
def evaluate(
    essay_id: int, background: BackgroundTasks, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    essay = _get_essay(essay_id, user, db)
    # atomic claim so a double click can't start two evaluations
    claimed = (
        db.query(Essay)
        .filter(Essay.id == essay.id, Essay.status.in_(("submitted", "failed")))
        .update({"status": "analyzing", "error": None}, synchronize_session=False)
    )
    db.commit()
    if not claimed:
        raise HTTPException(409, "This essay is already being evaluated or has been evaluated")
    background.add_task(run_evaluation, essay.id)
    db.refresh(essay)
    return essay


@router.get("/{essay_id}/score", response_model=ScoreResult)
def get_score(essay_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    essay = _get_essay(essay_id, user, db)
    if essay.score is None:
        raise HTTPException(404, "This essay has not been evaluated yet")
    return essay


def _add_review(essay: Essay, user: User, db: Session, final_score: float, reason: str | None) -> Essay:
    if essay.score is None or essay.status not in ("evaluated", "reviewed"):
        raise HTTPException(409, "Only evaluated essays can be reviewed")
    db.add(
        TeacherReview(
            essay_id=essay.id,
            educator_id=user.id,
            ai_score=essay.score.overall_score,
            final_score=final_score,
            override_reason=reason,
        )
    )
    essay.status = "reviewed"
    db.commit()
    db.refresh(essay)
    return essay


@router.post("/{essay_id}/review", response_model=EssayOut)
def accept_ai_score(essay_id: int, user: User = Depends(require_role("educator")), db: Session = Depends(get_db)):
    """Educator accepts the AI score as the final score."""
    essay = _get_essay(essay_id, user, db)
    return _add_review(essay, user, db, essay.score.overall_score if essay.score else 0, None)


@router.post("/{essay_id}/override", response_model=EssayOut)
def override_score(
    essay_id: int, body: OverrideIn, user: User = Depends(require_role("educator")), db: Session = Depends(get_db)
):
    """Educator replaces the AI score; the reason is mandatory and kept in the audit trail."""
    essay = _get_essay(essay_id, user, db)
    return _add_review(essay, user, db, round(body.final_score, 2), body.override_reason.strip())
