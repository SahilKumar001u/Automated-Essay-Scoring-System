"""The evaluation pipeline (PRD section 8): NLP -> RAG -> LLM -> scores + feedback, run as a background task."""
import logging
import time

from ..config import WEIGHTS, settings
from ..database import SessionLocal
from ..models import Essay, Feedback, Score
from . import llm, nlp, rag

log = logging.getLogger(__name__)


def run_evaluation(essay_id: int) -> None:
    with SessionLocal() as db:
        essay = db.get(Essay, essay_id)
        started = time.perf_counter()
        try:
            features = nlp.analyze(essay.essay_text)
            essay.nlp_features = features
            essay.status = "retrieving"
            db.commit()

            chunks = rag.retrieve(essay.prompt, essay.assignment_id)
            essay.status = "evaluating"
            db.commit()

            result, model_name = llm.evaluate(essay.prompt, essay.essay_text, chunks, features)
            scores = {d: getattr(result, d).score for d in WEIGHTS}

            essay.score = Score(
                **{f"{d}_score": s for d, s in scores.items()},
                overall_score=llm.overall_score(scores),
                model_version=f"{settings.llm_provider}/{model_name}",
                rubric_context=chunks,
                eval_seconds=round(time.perf_counter() - started, 2),
            )
            essay.feedback = Feedback(
                strengths=result.strengths,
                weaknesses=result.weaknesses,
                suggestions=result.suggestions,
                evidence=result.evidence,
                reasoning={d: getattr(result, d).reasoning for d in WEIGHTS},
            )
            essay.status = "evaluated"
            db.commit()
        except Exception as exc:
            # NFR-05: never leave an essay stuck; record a retryable failure with a user-safe message
            log.exception("Evaluation failed for essay %s", essay_id)
            db.rollback()
            essay.status = "failed"
            essay.error = (
                str(exc)
                if isinstance(exc, llm.EvaluationError)
                else "The AI model did not respond (it may be busy or unavailable). Please retry in a moment."
            )
            db.commit()
