import { Link } from "react-router";
import { DIMENSIONS } from "../components/ui";

const STEPS = [
  ["Language analysis", "spaCy, NLTK and LanguageTool measure grammar errors, vocabulary range, sentence and paragraph structure and readability."],
  ["Rubric retrieval", "The scoring rubric and marking guidelines that apply to the essay are retrieved from a ChromaDB knowledge base."],
  ["LLM evaluation", "A language model scores the essay against the retrieved rubric and explains every score with evidence from the text."],
  ["Educator review", "An educator reads the AI's reasoning, then accepts the score or overrides it with a recorded reason."],
];

export default function Landing() {
  return (
    <div className="mx-auto max-w-6xl space-y-16 py-6">
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="text-sm font-medium text-accent">Automated Essay Scoring</p>
          <h1 className="mt-3 text-5xl leading-[1.05] font-medium sm:text-6xl">
            Every essay read closely, and every score explained.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            Students get a rubric-based score with reasons, strengths and next steps in seconds.
            Educators review the AI's reading and keep the final say.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="btn btn-primary px-5 py-2.5 text-base">Create an account</Link>
            <Link to="/login" className="btn px-5 py-2.5 text-base">Sign in</Link>
          </div>
        </div>

        {/* A marked paper: the product's output, shown rather than described */}
        <div className="card rotate-1 p-7 shadow-[6px_6px_0_var(--color-line)]" aria-label="Example of a scored essay">
          <div className="flex items-start justify-between border-b border-line pb-4">
            <div>
              <p className="text-xs text-muted">Essay prompt</p>
              <p className="mt-1 font-serif text-lg">Should cities ban private cars from their centres?</p>
            </div>
            <p className="font-serif text-4xl font-medium text-accent">7.05<span className="text-base text-muted">/10</span></p>
          </div>
          <ul className="mt-4 space-y-3">
            {[7, 8, 7, 6].map((score, i) => (
              <li key={DIMENSIONS[i].key} className="text-sm">
                <div className="flex justify-between">
                  <span>{DIMENSIONS[i].label}</span>
                  <span className="tabular-nums text-muted">{score}/10</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-line">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${score * 10}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-5 border-l-2 border-accent pl-3 font-serif text-sm text-muted italic">
            "The second paragraph states that buses are cheaper but gives no figure. Add one specific example to support the claim."
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-medium">How an essay is scored</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="card">
              <p className="font-serif text-3xl text-accent">{i + 1}</p>
              <h3 className="mt-2 text-lg font-medium">{title}</h3>
              <p className="mt-2 text-sm text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-medium">What the score is made of</h2>
        <p className="mt-2 text-sm text-muted">Each dimension is scored from 1 to 10. The overall score is their weighted sum.</p>
        <div className="mt-6 flex h-12 overflow-hidden rounded-lg border border-line text-sm">
          {DIMENSIONS.map((d, i) => (
            <div
              key={d.key}
              className={`flex items-center justify-center px-2 font-medium ${i % 2 ? "bg-accent-soft text-accent" : "bg-accent text-white"}`}
              style={{ width: `${d.weight}%` }}
            >
              {d.weight}%
            </div>
          ))}
        </div>
        <div className="mt-2 flex text-xs text-muted">
          {DIMENSIONS.map((d) => (
            <p key={d.key} className="px-1 text-center" style={{ width: `${d.weight}%` }}>{d.label}</p>
          ))}
        </div>
      </section>
    </div>
  );
}
