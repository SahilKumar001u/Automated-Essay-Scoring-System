import { useState } from "react";
import { CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import EssayTable from "../components/EssayTable";
import { ErrorNote, formatScore, Loading, PageHeader, Segmented, Stat, StatStrip, useFetch } from "../components/ui";

const FILTERS = [
  ["evaluated", "Awaiting review"],
  ["reviewed", "Reviewed"],
  ["all", "All essays"],
];

const axis = { tickLine: false, tick: { fontSize: 12, fill: "var(--color-muted)" }, type: "number", domain: [0, 10], ticks: [0, 2, 4, 6, 8, 10] };
const axisLabel = { fontSize: 12, fill: "var(--color-muted)" };

function Metrics({ m }) {
  if (m.n === 0)
    return (
      <section className="card mt-6">
        <h2 className="text-lg font-medium">AI and educator agreement</h2>
        <p className="mt-2 text-sm text-muted">QWK, MAE and RMSE appear here once the first essay has been reviewed</p>
      </section>
    );
  const value = (v) => (v == null ? "n/a" : v.toFixed(2));
  const met = m.qwk != null && m.qwk >= 0.7;
  return (
    <section className="card mt-6">
      <h2 className="text-lg font-medium">AI and educator agreement</h2>
      <p className="mt-1 text-xs text-muted">
        AI score against the educator's final score on {m.n} reviewed {m.n === 1 ? "essay" : "essays"}. An accepted score counts as full agreement.
      </p>
      <div className="mt-6 grid gap-8 lg:grid-cols-[2fr_1fr]">
        {/* the one chart on this screen: each reviewed essay, AI score against final score */}
        <figure>
          <div className="h-80">
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 8, right: 12, bottom: 20, left: -4 }}>
                <CartesianGrid stroke="var(--color-line)" />
                <XAxis {...axis} dataKey="ai" name="AI score" axisLine={{ stroke: "var(--color-line)" }} label={{ ...axisLabel, value: "AI score", position: "insideBottom", offset: -12 }} />
                <YAxis {...axis} dataKey="human" name="Final score" axisLine={false} label={{ ...axisLabel, value: "Final score", angle: -90, position: "insideLeft", offset: 16 }} />
                <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 10, y: 10 }]} stroke="var(--color-muted)" strokeOpacity={0.6} strokeDasharray="4 4" />
                <Tooltip formatter={(v) => formatScore(v)} cursor={false} contentStyle={{ borderRadius: 8, borderColor: "var(--color-line)", fontSize: 13 }} />
                <Scatter data={m.pairs} fill="var(--color-accent)" fillOpacity={0.8} isAnimationActive={false} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <figcaption className="mt-2 text-xs text-muted">Each dot is one reviewed essay. Dots on the dashed line are scores the educator agreed with.</figcaption>
        </figure>

        <div className="lg:border-l lg:border-line lg:pl-8">
          <p className="text-sm text-muted">Quadratic Weighted Kappa</p>
          <p className={`mt-2 text-5xl leading-none font-medium tabular-nums ${m.qwk == null ? "text-muted" : met ? "text-accent" : "text-warn"}`}>{value(m.qwk)}</p>
          <p className="mt-2 text-xs text-muted">
            {m.qwk == null ? "Needs reviewed essays with more than one distinct score" : met ? "Meets the 0.70 target" : "Below the 0.70 target"}
          </p>
          <dl className="mt-6 divide-y divide-line border-t border-line text-sm">
            {[["Mean absolute error", m.mae], ["Root mean squared error", m.rmse], ["Pearson correlation", m.pearson], ["Spearman correlation", m.spearman]].map(([label, v]) => (
              <div key={label} className="flex h-10 items-center justify-between">
                <dt className="text-muted">{label}</dt>
                <dd className="font-medium tabular-nums">{value(v)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

export default function EducatorDashboard() {
  const { data, error, loading } = useFetch("/dashboard/educator");
  const [filter, setFilter] = useState("evaluated");
  if (loading) return <Loading />;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  const { stats, metrics, essays } = data;
  const shown = filter === "all" ? essays : essays.filter((e) => e.status === filter);

  return (
    <>
      <PageHeader title="Educator dashboard" subtitle="Review AI evaluations and set final scores" />

      <StatStrip columns="grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Essays submitted" value={stats.total} />
        <Stat label="Awaiting review" value={stats.pending_review} />
        <Stat label="Reviewed" value={stats.reviewed} hint={`Of ${stats.total} submitted`} />
        <Stat label="Scores overridden" value={stats.overrides} hint={`Of ${stats.reviewed} reviewed`} />
        <Stat label="Average AI score" value={formatScore(stats.average_ai_score)} hint="Out of 10" />
        <Stat label="Average evaluation time" value={stats.average_eval_seconds == null ? null : `${stats.average_eval_seconds.toFixed(1)}s`} hint="Target 15s or less" />
      </StatStrip>

      <Metrics m={metrics} />

      <div className="mt-8 mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium">Submitted essays</h2>
        <Segmented label="Filter essays" value={filter} onChange={setFilter} options={FILTERS} />
      </div>
      <EssayTable essays={shown} showStudent empty={filter === "evaluated" ? "Nothing is waiting for review" : "No essays here yet"} />
    </>
  );
}
