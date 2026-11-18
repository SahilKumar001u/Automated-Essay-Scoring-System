import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { api } from "../api";
import { useAuth } from "../auth";
import { DIMENSIONS, ErrorNote, formatDate, formatScore, IN_PROGRESS, Loading, scoreTone, StatusBadge } from "../components/ui";

const STEPS = ["Essay submitted", "Analyzing essay", "Retrieving rubric", "Generating evaluation", "Evaluation complete"];
// index of the step currently running for each status
const ACTIVE_STEP = { submitted: 1, analyzing: 1, retrieving: 2, evaluating: 3, failed: -1 };

function ProcessingStatus({ essay, onStart, busy }) {
  const active = ACTIVE_STEP[essay.status];
  const running = IN_PROGRESS.includes(essay.status);
  return (
    <section className="card" aria-live="polite">
      <h2 className="text-lg font-medium">Processing status</h2>
      <ol className="mt-4 space-y-3">
        {STEPS.map((step, i) => {
          const done = running ? i < active : i === 0;
          const current = running && i === active;
          return (
            <li key={step} className="flex items-center gap-3 text-sm">
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                  done ? "border-accent bg-accent text-white" : current ? "border-accent text-accent" : "border-line text-muted"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className={done || current ? "text-ink" : "text-muted"}>
                {step}
                {current && <span className="ml-2 text-accent">in progress…</span>}
              </span>
            </li>
          );
        })}
      </ol>
      {!running && (
        <div className="mt-5 space-y-3">
          {essay.status === "failed" && <ErrorNote>{essay.error || "Evaluation failed."}</ErrorNote>}
          <button className="btn btn-primary" onClick={onStart} disabled={busy}>
            {essay.status === "failed" ? "Retry evaluation" : "Start evaluation"}
          </button>
        </div>
      )}
    </section>
  );
}

function ScoreCard({ essay }) {
  const { score, feedback, reviews } = essay;
  const review = reviews.at(-1);
  return (
    <section className="card grid gap-8 md:grid-cols-[220px_1fr]">
      <div className="md:border-r md:border-line md:pr-8">
        <p className="text-sm text-muted">{review ? "Final score" : "AI score"}</p>
        <p className={`font-serif text-6xl font-medium tabular-nums ${scoreTone(review?.final_score ?? score.overall_score)}`}>
          {formatScore(review?.final_score ?? score.overall_score)}
          <span className="text-xl text-muted">/10</span>
        </p>
        {review ? (
          <p className="mt-2 text-sm text-muted">
            {review.is_override ? `Set by ${review.educator_name}. The AI scored it ${formatScore(review.ai_score)}.` : `AI score accepted by ${review.educator_name}.`}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted">Provisional. An educator has not reviewed this score yet.</p>
        )}
        {review?.is_override && (
          <p className="mt-3 border-l-2 border-warn pl-3 text-sm">
            <span className="block text-xs text-muted">Reason for the change</span>
            {review.override_reason}
          </p>
        )}
      </div>
      <div>
        <h2 className="text-lg font-medium">Dimension scores</h2>
        <ul className="mt-4 space-y-5">
          {DIMENSIONS.map((d) => {
            const value = score[`${d.key}_score`];
            return (
              <li key={d.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium">
                    {d.label} <span className="font-normal text-muted">· {d.weight}% of total</span>
                  </p>
                  <p className={`font-serif text-xl font-medium tabular-nums ${scoreTone(value)}`}>{value}<span className="text-sm text-muted">/10</span></p>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-line" role="presentation">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${value * 10}%` }} />
                </div>
                <p className="mt-2 text-sm text-muted">{feedback.reasoning[d.key]}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function FeedbackList({ title, items, mark, tone }) {
  return (
    <section className="card">
      <h2 className="text-lg font-medium">{title}</h2>
      <ul className="mt-3 space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-sm">
            <span className={`mt-px shrink-0 font-medium ${tone}`} aria-hidden="true">{mark}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NlpSignals({ f }) {
  const g = f.grammar;
  const facts = [
    ["Words", f.word_count],
    ["Sentences", f.sentence_count],
    ["Paragraphs", f.paragraphs.count],
    ["Avg. sentence length", `${f.avg_sentence_length} words`],
    ["Vocabulary richness", `${Math.round(f.vocabulary.type_token_ratio * 100)}% unique`],
    ["Reading grade level", f.readability.flesch_kincaid_grade],
    ["Reading ease (Flesch)", f.readability.flesch_reading_ease],
    ["Grammar errors", g ? g.grammar_errors : "n/a"],
    ["Spelling errors", g ? g.spelling_errors : "n/a"],
    ["Punctuation issues", g ? g.punctuation_issues : "n/a"],
    ["Commas per sentence", f.punctuation.commas_per_sentence],
    ["Longest sentence", `${f.longest_sentence_words} words`],
  ];
  const repeated = [...f.repeated_phrases.map((p) => [p.phrase, p.count]), ...f.repeated_words.map((w) => [w.word, w.count])];
  return (
    <section className="card">
      <h2 className="text-lg font-medium">Language analysis</h2>
      <p className="text-xs text-muted">Measured by spaCy, NLTK and LanguageTool. Supporting evidence for the scores above, not the scores themselves.</p>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {repeated.length > 0 && (
        <div className="mt-5">
          <h3 className="font-sans text-sm font-medium tracking-normal">Most repeated words and phrases</h3>
          <p className="mt-1.5 flex flex-wrap gap-1.5">
            {repeated.map(([text, count]) => (
              <span key={text} className="rounded bg-paper px-2 py-0.5 text-sm">{text} <span className="text-muted">×{count}</span></span>
            ))}
          </p>
        </div>
      )}
      {g?.samples.length > 0 && (
        <div className="mt-5">
          <h3 className="font-sans text-sm font-medium tracking-normal">Issues found by the grammar checker</h3>
          <ul className="mt-1.5 divide-y divide-line text-sm">
            {g.samples.map((s, i) => (
              <li key={i} className="py-1.5">
                <span className="rounded bg-danger-soft px-1 text-danger">{s.text || "…"}</span>
                {s.suggestion && <span className="text-muted"> → <span className="text-accent">{s.suggestion}</span></span>}
                <span className="text-muted"> · {s.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ReviewPanel({ essay, onDone }) {
  const [finalScore, setFinalScore] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function send(path, body) {
    setBusy(true);
    setError(null);
    try {
      onDone(await api(`/essays/${essay.id}/${path}`, { method: "POST", body }));
      setFinalScore("");
      setReason("");
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  return (
    <section className="card border-accent">
      <h2 className="text-lg font-medium">Educator review</h2>
      <p className="text-sm text-muted">
        The AI scored this essay {formatScore(essay.score.overall_score)}/10.
        {essay.reviews.length > 0 && " It has already been reviewed; a new decision replaces the current final score and is added to the audit trail."}
      </p>
      <div className="mt-4 grid gap-6 md:grid-cols-[1fr_2fr]">
        <div>
          <h3 className="font-sans text-sm font-medium tracking-normal">Agree with the AI</h3>
          <p className="mt-1 text-sm text-muted">Makes {formatScore(essay.score.overall_score)} the final score.</p>
          <button className="btn btn-primary mt-3" disabled={busy} onClick={() => send("review")}>Accept AI score</button>
        </div>
        <form
          className="space-y-3 md:border-l md:border-line md:pl-6"
          onSubmit={(e) => {
            e.preventDefault();
            send("override", { final_score: Number(finalScore), override_reason: reason });
          }}
        >
          <h3 className="font-sans text-sm font-medium tracking-normal">Override the score</h3>
          <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
            <div>
              <label className="label" htmlFor="final">Final score</label>
              <input id="final" type="number" className="input" required min={1} max={10} step={0.1} value={finalScore} onChange={(e) => setFinalScore(e.target.value)} placeholder="1–10" />
            </div>
            <div>
              <label className="label" htmlFor="reason">Reason for overriding</label>
              <textarea id="reason" className="input" rows={2} required minLength={5} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Shown to the student and kept in the audit trail" />
            </div>
          </div>
          <button className="btn" disabled={busy}>Save override</button>
        </form>
      </div>
      <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>
    </section>
  );
}

function AuditTrail({ reviews }) {
  return (
    <section className="card">
      <h2 className="text-lg font-medium">Review audit trail</h2>
      <ol className="mt-3 divide-y divide-line text-sm">
        {reviews.toReversed().map((r) => (
          <li key={r.id} className="py-2.5">
            <p>
              <span className="font-medium">{r.educator_name}</span>{" "}
              {r.is_override ? `overrode the AI score ${formatScore(r.ai_score)} → ${formatScore(r.final_score)}` : `accepted the AI score ${formatScore(r.ai_score)}`}
              <span className="text-muted"> · {formatDate(r.reviewed_at)}</span>
            </p>
            {r.override_reason && <p className="mt-0.5 text-muted">Reason: {r.override_reason}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function EssayDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [essay, setEssay] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api(`/essays/${id}`).then(setEssay).catch((e) => setError(e.message)), [id]);
  useEffect(() => {
    load();
  }, [load]);

  // poll while the pipeline is running so the status steps advance live
  const running = essay && IN_PROGRESS.includes(essay.status);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(load, 1500);
    return () => clearInterval(timer);
  }, [running, load]);

  async function startEvaluation() {
    setBusy(true);
    setError(null);
    try {
      setEssay(await api(`/essays/${id}/evaluate`, { method: "POST" }));
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  if (!essay) return error ? <ErrorNote>{error}</ErrorNote> : <Loading />;
  const { score, feedback } = essay;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <Link to="/dashboard" className="text-sm text-muted hover:text-ink">← Back to dashboard</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-medium">{essay.assignment_title ?? "Custom prompt"}</h1>
          <StatusBadge status={essay.status} />
        </div>
        <p className="mt-1 text-sm text-muted">
          {user.role === "educator" && `${essay.student_name} · `}
          Submitted {formatDate(essay.submitted_at)} · {essay.word_count} words
        </p>
        <blockquote className="mt-3 border-l-2 border-accent pl-4 font-serif text-lg whitespace-pre-wrap">{essay.prompt}</blockquote>
      </div>

      <ErrorNote>{error}</ErrorNote>

      {!score && <ProcessingStatus essay={essay} onStart={startEvaluation} busy={busy} />}

      {score && (
        <>
          <ScoreCard essay={essay} />
          {user.role === "educator" && <ReviewPanel essay={essay} onDone={setEssay} />}
          <div className="grid gap-4 md:grid-cols-2">
            <FeedbackList title="Strengths" items={feedback.strengths} mark="+" tone="text-accent" />
            <FeedbackList title="Weaknesses" items={feedback.weaknesses} mark="−" tone="text-danger" />
            <FeedbackList title="Suggestions" items={feedback.suggestions} mark="→" tone="text-warn" />
            <FeedbackList title="Evidence from the essay" items={feedback.evidence} mark="“" tone="text-muted" />
          </div>
        </>
      )}

      {essay.nlp_features && <NlpSignals f={essay.nlp_features} />}

      {score && (
        <details className="card">
          <summary className="cursor-pointer font-serif text-lg font-medium">
            Rubric the AI was given <span className="font-sans text-sm font-normal text-muted">· {score.rubric_context.length} passages retrieved</span>
          </summary>
          <ul className="mt-4 space-y-3">
            {score.rubric_context.map((chunk, i) => (
              <li key={i} className="rounded border border-line bg-paper/60 p-3 text-sm">
                <p className="text-xs text-muted">{chunk.source.replaceAll("_", " ")}</p>
                <p className="mt-1 whitespace-pre-wrap">{chunk.text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            Evaluated by {score.model_version} in {score.eval_seconds}s on {formatDate(score.created_at)}.
          </p>
        </details>
      )}

      {essay.reviews.length > 0 && <AuditTrail reviews={essay.reviews} />}

      <section className="card">
        <h2 className="text-lg font-medium">Essay</h2>
        <div className="mt-3 max-w-prose font-serif text-base leading-relaxed whitespace-pre-wrap">{essay.essay_text}</div>
      </section>
    </div>
  );
}
