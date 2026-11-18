import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../api";
import { ErrorNote, Loading, PageHeader, Segmented, useFetch } from "../components/ui";

const countWords = (text) => text.trim().split(/\s+/).filter(Boolean).length;

export default function SubmitEssay() {
  const navigate = useNavigate();
  const assignments = useFetch("/assignments");
  const limits = useFetch("/config");

  const [source, setSource] = useState("assignment");
  const [assignmentId, setAssignmentId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState("write");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!assignments.data) return;
    if (assignments.data.length) setAssignmentId(String(assignments.data[0].id));
    else setSource("custom");
  }, [assignments.data]);

  if (assignments.loading || limits.loading) return <Loading />;
  if (assignments.error || limits.error) return <ErrorNote>{assignments.error || limits.error}</ErrorNote>;

  const { min_words: min, max_words: max, max_upload_bytes: maxBytes } = limits.data;
  const selected = assignments.data.find((a) => String(a.id) === assignmentId);
  const words = countWords(text);
  const lengthOk = words >= min && words <= max;
  const fileTooBig = file && file.size > maxBytes;
  const canSubmit =
    !busy && (source === "assignment" ? selected : prompt.trim().length >= 10) && (mode === "write" ? lengthOk : file && !fileTooBig);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData();
    if (source === "assignment") form.append("assignment_id", assignmentId);
    else form.append("prompt", prompt);
    if (mode === "write") form.append("essay_text", text);
    else form.append("file", file);
    try {
      const essay = await api("/essays/submit", { method: "POST", form });
      // the essay is saved; if starting evaluation fails, the essay page offers a retry
      await api(`/essays/${essay.id}/evaluate`, { method: "POST" }).catch(() => {});
      navigate(`/essays/${essay.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl">
      <PageHeader title="Submit an essay" subtitle="Your essay is scored against the rubric as soon as you submit it." />

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium">1. Essay prompt</h2>
          {assignments.data.length > 0 && (
            <Segmented label="Prompt source" value={source} onChange={setSource} options={[["assignment", "Assignment"], ["custom", "My own prompt"]]} />
          )}
        </div>
        {source === "assignment" ? (
          <>
            <div>
              <label className="label" htmlFor="assignment">Assignment</label>
              <select id="assignment" className="input" value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)}>
                {assignments.data.map((a) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>
            {selected && (
              <blockquote className="border-l-2 border-accent pl-4 font-serif text-lg whitespace-pre-wrap">{selected.prompt}</blockquote>
            )}
          </>
        ) : (
          <div>
            <label className="label" htmlFor="prompt">What question or topic does your essay answer?</label>
            <textarea id="prompt" className="input" rows={3} maxLength={2000} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. Should cities ban private cars from their centres?" />
            <p className="mt-1 text-xs text-muted">At least 10 characters. Your essay is scored on how well it answers this.</p>
          </div>
        )}
      </section>

      <section className="card mt-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium">2. Your essay</h2>
          <Segmented label="Input method" value={mode} onChange={setMode} options={[["write", "Write or paste"], ["upload", "Upload a file"]]} />
        </div>
        {mode === "write" ? (
          <div>
            <label className="sr-only" htmlFor="essay">Essay text</label>
            <textarea
              id="essay"
              className="input min-h-80 font-serif text-base leading-relaxed"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Start writing, or paste your essay here. Leave a blank line between paragraphs."
            />
            <p className={`mt-1 text-sm tabular-nums ${words === 0 || lengthOk ? "text-muted" : "text-danger"}`} aria-live="polite">
              {words} {words === 1 ? "word" : "words"}
              {words < min && ` · ${min - words} more to reach the ${min}-word minimum`}
              {words > max && ` · ${words - max} over the ${max}-word limit`}
            </p>
          </div>
        ) : (
          <div>
            <label className="label" htmlFor="file">Essay file (.txt, .pdf or .docx, up to {maxBytes / 1_000_000} MB)</label>
            <input
              id="file"
              type="file"
              accept=".txt,.pdf,.docx"
              className="input file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-accent-soft file:px-3 file:py-1 file:text-sm file:font-medium file:text-accent"
              onChange={(e) => setFile(e.target.files[0] ?? null)}
            />
            <p className={`mt-1 text-xs ${fileTooBig ? "text-danger" : "text-muted"}`}>
              {fileTooBig ? "This file is too large." : `The essay must be between ${min} and ${max} words. Scanned PDFs without selectable text can't be read.`}
            </p>
          </div>
        )}
      </section>

      <div className="mt-4 space-y-3">
        <ErrorNote>{error}</ErrorNote>
        <button className="btn btn-primary px-6 py-2.5" disabled={!canSubmit}>
          {busy ? "Submitting…" : "Submit for scoring"}
        </button>
      </div>
    </form>
  );
}
