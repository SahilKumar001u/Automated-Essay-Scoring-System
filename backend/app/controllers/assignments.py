from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Assignment, User
from ..schemas import AssignmentIn, AssignmentOut
from ..security import current_user, require_role
from ..services import rag

router = APIRouter(prefix="/api/assignments", tags=["assignments"])


@router.post("", response_model=AssignmentOut, status_code=201)
def create_assignment(
    body: AssignmentIn, user: User = Depends(require_role("educator")), db: Session = Depends(get_db)
):
    criteria = (body.criteria or "").strip() or None
    assignment = Assignment(title=body.title.strip(), prompt=body.prompt.strip(), criteria=criteria, created_by=user.id)
    db.add(assignment)
    db.flush()
    if criteria:
        # index before commit: a failed embedding rolls the assignment back instead of losing its criteria
        rag.add_assignment_criteria(assignment.id, assignment.title, criteria)
    db.commit()
    return assignment


@router.get("", response_model=list[AssignmentOut])
def list_assignments(_: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.query(Assignment).order_by(Assignment.id.desc()).all()
