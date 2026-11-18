import { Link } from "react-router";
import { formatDate, formatScore, StatusBadge } from "./ui";

/** Shared submissions table; `showStudent` adds the student column for educators. */
export default function EssayTable({ essays, showStudent = false, empty }) {
  if (!essays.length) return <p className="card py-10 text-center text-sm text-muted">{empty}</p>;
  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr>
            <th className="th">Essay</th>
            {showStudent && <th className="th">Student</th>}
            <th className="th">Submitted</th>
            <th className="th text-right">Words</th>
            <th className="th text-right">AI score</th>
            <th className="th text-right">Final score</th>
            <th className="th">Status</th>
          </tr>
        </thead>
        <tbody>
          {essays.map((e) => (
            <tr key={e.id} className="transition-colors hover:bg-paper/60">
              <td className="td max-w-xs">
                <Link to={`/essays/${e.id}`} className="font-medium text-accent underline-offset-2 hover:underline">
                  {e.assignment_title ?? "Custom prompt"}
                </Link>
                <p className="truncate text-xs text-muted">{e.prompt}</p>
              </td>
              {showStudent && <td className="td">{e.student_name}</td>}
              <td className="td whitespace-nowrap text-muted">{formatDate(e.submitted_at)}</td>
              <td className="td text-right tabular-nums">{e.word_count}</td>
              <td className="td text-right tabular-nums">
                {e.is_override ? (
                  <s className="text-muted" title="Overridden by the educator">
                    <span className="sr-only">Overridden: </span>
                    {formatScore(e.ai_score)}
                  </s>
                ) : (
                  formatScore(e.ai_score)
                )}
              </td>
              <td className="td text-right font-medium tabular-nums">{formatScore(e.final_score)}</td>
              <td className="td"><StatusBadge status={e.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
