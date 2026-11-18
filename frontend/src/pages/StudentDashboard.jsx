import { Link } from "react-router";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import EssayTable from "../components/EssayTable";
import { ErrorNote, formatScore, Loading, PageHeader, Stat, StatStrip, useFetch } from "../components/ui";

export default function StudentDashboard() {
  const { data, error, loading } = useFetch("/dashboard/student");
  if (loading) return <Loading />;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  const { stats, essays } = data;
  // oldest first; a reviewed essay's final score supersedes its AI score
  const progress = essays
    .filter((e) => e.ai_score != null)
    .reverse()
    .map((e, i) => ({ n: i + 1, score: e.final_score ?? e.ai_score, title: e.assignment_title ?? "Custom prompt" }));

  return (
    <>
      <PageHeader
        title="Your essays"
        subtitle="Scores, feedback and progress across your submissions"
        action={<Link to="/submit" className="btn btn-primary">Submit a new essay</Link>}
      />

      <StatStrip columns="grid-cols-2 lg:grid-cols-4">
        <Stat label="Submissions" value={stats.submissions} />
        <Stat label="Scored" value={stats.evaluated} hint={`Of ${stats.submissions} submitted`} />
        <Stat label="Average score" value={formatScore(stats.average_score)} hint="Out of 10" />
        <Stat label="Best score" value={formatScore(stats.best_score)} hint="Out of 10" />
      </StatStrip>

      {progress.length >= 2 && (
        <section className="card mt-6">
          <h2 className="text-lg font-medium">Progress</h2>
          <p className="mt-1 text-xs text-muted">Overall score for each scored essay, oldest to newest</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <LineChart data={progress} margin={{ top: 5, right: 12, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="var(--color-line)" vertical={false} />
                <XAxis dataKey="n" tickLine={false} axisLine={{ stroke: "var(--color-line)" }} tick={{ fontSize: 12, fill: "var(--color-muted)" }} />
                <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--color-muted)" }} />
                <Tooltip
                  formatter={(value) => [formatScore(value), "Score"]}
                  labelFormatter={(_, items) => items[0]?.payload.title ?? ""}
                  contentStyle={{ borderRadius: 6, borderColor: "var(--color-line)", fontSize: 13 }}
                />
                <Line dataKey="score" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-accent)" }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <h2 className="mt-8 mb-3 text-lg font-medium">Submission history</h2>
      <EssayTable essays={essays} empty="You haven't submitted an essay yet. Submit one to get a score and feedback." />
    </>
  );
}
