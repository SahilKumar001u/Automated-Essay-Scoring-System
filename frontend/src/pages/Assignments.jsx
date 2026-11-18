import { useState } from "react";
import { api } from "../api";
import { ErrorNote, formatDate, Loading, PageHeader, useFetch } from "../components/ui";

const EMPTY = { title: "", prompt: "", criteria: "" };

export default function Assignments() {
  const { data, error, loading, reload } = useFetch("/assignments");
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      await api("/assignments", { method: "POST", body: { ...form, criteria: form.criteria.trim() || null } });
      setForm(EMPTY);
      reload();
    } catch (err) {
      setFormError(err.message);
    }
    setBusy(false);
  }

  return (
    <>
      <PageHeader title="Assignments" subtitle="Essay prompts students can choose when they submit." />
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.3fr]">
        <form onSubmit={create} className="card space-y-4">
          <h2 className="text-lg font-medium">New assignment</h2>
          <div>
            <label className="label" htmlFor="title">Title</label>
            <input id="title" className="input" required minLength={3} maxLength={200} value={form.title} onChange={set("title")} />
          </div>
          <div>
            <label className="label" htmlFor="prompt">Essay prompt</label>
            <textarea id="prompt" className="input" rows={3} required minLength={10} maxLength={2000} value={form.prompt} onChange={set("prompt")} />
          </div>
          <div>
            <label className="label" htmlFor="criteria">Assignment-specific criteria (optional)</label>
            <textarea id="criteria" className="input" rows={4} maxLength={5000} value={form.criteria} onChange={set("criteria")} placeholder="e.g. Must discuss at least one counter-argument. Must refer to a real city as an example." />
            <p className="mt-1 text-xs text-muted">Added to the rubric knowledge base and used by the AI when scoring essays for this assignment.</p>
          </div>
          <ErrorNote>{formError}</ErrorNote>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Creating…" : "Create assignment"}</button>
        </form>

        <div className="space-y-3">
          {loading && <Loading />}
          <ErrorNote>{error}</ErrorNote>
          {data?.length === 0 && <p className="card text-center text-sm text-muted">No assignments yet. Create the first one.</p>}
          {data?.map((a) => (
            <article key={a.id} className="card">
              <h3 className="text-lg font-medium">{a.title}</h3>
              <p className="text-xs text-muted">Created by {a.created_by_name} · {formatDate(a.created_at)}</p>
              <p className="mt-3 font-serif whitespace-pre-wrap">{a.prompt}</p>
              {a.criteria && (
                <p className="mt-3 border-l-2 border-line pl-3 text-sm whitespace-pre-wrap text-muted">
                  <span className="block text-xs font-medium text-ink">Specific criteria</span>
                  {a.criteria}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
