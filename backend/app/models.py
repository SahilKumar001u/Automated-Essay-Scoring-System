"""SQLAlchemy models (PRD section 16)."""
from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

# Essay lifecycle; the middle three drive the "Processing Status" screen
IN_PROGRESS = ("analyzing", "retrieving", "evaluating")


def _now():
    return mapped_column(DateTime(timezone=True), server_default=func.now())


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20))  # student | educator
    created_at: Mapped[datetime] = _now()


class Assignment(Base):
    __tablename__ = "assignments"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    prompt: Mapped[str] = mapped_column(Text)
    criteria: Mapped[str | None] = mapped_column(Text)  # assignment-specific criteria, indexed in ChromaDB
    rubric_id: Mapped[str] = mapped_column(String(50), default="default")
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = _now()

    creator: Mapped[User] = relationship()

    @property
    def created_by_name(self):
        return self.creator.name


class Essay(Base):
    __tablename__ = "essays"
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    assignment_id: Mapped[int | None] = mapped_column(ForeignKey("assignments.id"))
    prompt: Mapped[str] = mapped_column(Text)
    essay_text: Mapped[str] = mapped_column(Text)
    word_count: Mapped[int] = mapped_column(Integer)
    submitted_at: Mapped[datetime] = _now()
    # submitted -> analyzing -> retrieving -> evaluating -> evaluated -> reviewed (or failed)
    status: Mapped[str] = mapped_column(String(20), default="submitted", index=True)
    error: Mapped[str | None] = mapped_column(Text)
    nlp_features: Mapped[dict | None] = mapped_column(JSON)

    student: Mapped[User] = relationship()
    assignment: Mapped[Assignment | None] = relationship()
    score: Mapped["Score | None"] = relationship(cascade="all, delete-orphan", uselist=False)
    feedback: Mapped["Feedback | None"] = relationship(cascade="all, delete-orphan", uselist=False)
    reviews: Mapped[list["TeacherReview"]] = relationship(order_by="TeacherReview.id")

    @property
    def review(self):
        """Latest review is the effective one; earlier rows remain as the audit trail."""
        return self.reviews[-1] if self.reviews else None

    @property
    def ai_score(self):
        return self.score.overall_score if self.score else None

    @property
    def final_score(self):
        return self.review.final_score if self.review else None

    @property
    def is_override(self):
        return bool(self.review and self.review.is_override)

    @property
    def student_name(self):
        return self.student.name

    @property
    def assignment_title(self):
        return self.assignment.title if self.assignment else None


class Score(Base):
    __tablename__ = "scores"
    id: Mapped[int] = mapped_column(primary_key=True)
    essay_id: Mapped[int] = mapped_column(ForeignKey("essays.id"), unique=True)
    grammar_score: Mapped[int] = mapped_column(Integer)
    coherence_score: Mapped[int] = mapped_column(Integer)
    content_score: Mapped[int] = mapped_column(Integer)
    vocabulary_score: Mapped[int] = mapped_column(Integer)
    overall_score: Mapped[float] = mapped_column(Float)
    model_version: Mapped[str] = mapped_column(String(100))
    rubric_context: Mapped[list] = mapped_column(JSON)  # RAG chunks the LLM was grounded on
    eval_seconds: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = _now()


class Feedback(Base):
    __tablename__ = "feedback"
    id: Mapped[int] = mapped_column(primary_key=True)
    essay_id: Mapped[int] = mapped_column(ForeignKey("essays.id"), unique=True)
    strengths: Mapped[list] = mapped_column(JSON)
    weaknesses: Mapped[list] = mapped_column(JSON)
    suggestions: Mapped[list] = mapped_column(JSON)
    evidence: Mapped[list] = mapped_column(JSON)
    reasoning: Mapped[dict] = mapped_column(JSON)  # per-dimension reason for the score
    created_at: Mapped[datetime] = _now()


class TeacherReview(Base):
    __tablename__ = "teacher_reviews"
    id: Mapped[int] = mapped_column(primary_key=True)
    essay_id: Mapped[int] = mapped_column(ForeignKey("essays.id"), index=True)
    educator_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    ai_score: Mapped[float] = mapped_column(Float)
    final_score: Mapped[float] = mapped_column(Float)
    override_reason: Mapped[str | None] = mapped_column(Text)  # null = AI score accepted
    reviewed_at: Mapped[datetime] = _now()

    educator: Mapped[User] = relationship()

    @property
    def educator_name(self):
        return self.educator.name

    @property
    def is_override(self):
        return self.override_reason is not None
