import { useCallback, useEffect, useState } from "react";
import { api } from "../api";

export const DIMENSIONS = [
  { key: "grammar", label: "Grammar & Mechanics", weight: 20 },
  { key: "coherence", label: "Coherence & Structure", weight: 25 },
  { key: "content", label: "Content & Relevance", weight: 35 },
  { key: "vocabulary", label: "Vocabulary & Style", weight: 20 },
];

export const IN_PROGRESS = ["analyzing", "retrieving", "evaluating"];

export const formatDate = (iso) =>
  new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

// 7 -> "7", 7.5 -> "7.5", 7.05 -> "7.05"
export const formatScore = (n) => (n == null ? "–" : Number(n).toFixed(2).replace(/\.?0+$/, ""));

export const scoreTone = (n) => (n >= 7.5 ? "text-accent" : n >= 5 ? "text-warn" : "text-danger");

/** Load `path` once; returns { data, error, loading, reload }. */
export function useFetch(path) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const reload = useCallback(() => {
    api(path)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((e) => setState({ data: null, error: e.message, loading: false }));
  }, [path]);
  useEffect(reload, [reload]);
  return { ...state, reload };
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
      {children}
    </p>
  );
}

export function Loading({ label = "Loading" }) {
  return <p className="py-12 text-center text-sm text-muted" role="status">{label}…</p>;
}

const STATUS = {
  submitted: ["Submitted", "bg-line text-muted"],
  analyzing: ["Evaluating", "bg-warn-soft text-warn"],
  retrieving: ["Evaluating", "bg-warn-soft text-warn"],
  evaluating: ["Evaluating", "bg-warn-soft text-warn"],
  evaluated: ["Awaiting review", "bg-warn-soft text-warn"],
  reviewed: ["Reviewed", "bg-accent-soft text-accent"],
  failed: ["Failed", "bg-danger-soft text-danger"],
};

export function StatusBadge({ status }) {
  const [label, tone] = STATUS[status] ?? [status, "bg-line text-muted"];
  return <span className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${tone}`}>{label}</span>;
}

/** One strip of figures divided by hairlines, instead of a row of identical cards. */
export function StatStrip({ columns, children }) {
  return <dl className={`grid gap-px overflow-hidden rounded-lg border border-line bg-line ${columns}`}>{children}</dl>;
}

export function Stat({ label, value, hint }) {
  return (
    <div className="bg-card px-5 py-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-2 text-3xl leading-none font-medium tabular-nums">{value ?? "–"}</dd>
      <dd className="mt-2 h-4 text-xs text-muted">{hint}</dd>
    </div>
  );
}

/** Segmented filter; the selected option is a raised surface, so the accent stays for primary actions. */
export function Segmented({ label, value, onChange, options }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex gap-0.5 rounded-lg border border-line bg-paper p-0.5">
      {options.map(([key, text]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          onClick={() => onChange(key)}
          className={`h-8 cursor-pointer rounded-md px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
            value === key ? "bg-card font-medium text-ink shadow-[0_1px_2px_rgb(0_0_0/0.06)]" : "text-muted hover:text-ink"
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-medium">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
