"""Pydantic request/response schemas."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---- auth ----
class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8)
    role: Literal["student", "educator"]

    @field_validator("password")
    @classmethod
    def bcrypt_limit(cls, v):
        if len(v.encode()) > 72:  # bcrypt ignores/rejects anything past 72 bytes
            raise ValueError("Password must be at most 72 bytes")
        return v

    @field_validator("name")
    @classmethod
    def strip_name(cls, v):
        return v.strip()


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=200)


class UserOut(ORM):
    id: int
    name: str
    email: str
    role: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---- assignments ----
class AssignmentIn(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    prompt: str = Field(min_length=10, max_length=2000)
    criteria: str | None = Field(default=None, max_length=5000)


class AssignmentOut(ORM):
    id: int
    title: str
    prompt: str
    criteria: str | None
    rubric_id: str
    created_by_name: str
    created_at: datetime


# ---- essays ----
class ScoreOut(ORM):
    grammar_score: int
    coherence_score: int
    content_score: int
    vocabulary_score: int
    overall_score: float
    model_version: str
    rubric_context: list
    eval_seconds: float
    created_at: datetime


class FeedbackOut(ORM):
    strengths: list[str]
    weaknesses: list[str]
    suggestions: list[str]
    evidence: list[str]
    reasoning: dict[str, str]


class ReviewOut(ORM):
    id: int
    educator_name: str
    ai_score: float
    final_score: float
    override_reason: str | None
    is_override: bool
    reviewed_at: datetime


class EssaySummary(ORM):
    id: int
    student_name: str
    assignment_title: str | None
    prompt: str
    word_count: int
    submitted_at: datetime
    status: str
    ai_score: float | None
    final_score: float | None
    is_override: bool


class EssayOut(EssaySummary):
    essay_text: str
    error: str | None
    nlp_features: dict | None
    score: ScoreOut | None
    feedback: FeedbackOut | None
    reviews: list[ReviewOut]


class ScoreResult(ORM):
    score: ScoreOut
    feedback: FeedbackOut
    review: ReviewOut | None


class OverrideIn(BaseModel):
    final_score: float = Field(ge=1, le=10)
    override_reason: str = Field(min_length=5, max_length=1000)
