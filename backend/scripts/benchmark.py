"""Benchmark the AI pipeline against human scores (PRD sections 21-22), e.g. on the ASAP dataset.

    docker compose exec backend python -m scripts.benchmark /data/training_set_rel3.tsv --essay-set 1 --limit 50

Input: a .tsv/.csv with an essay column and a human score column. The AI's 1-10 overall score is
mapped linearly onto the human score range before computing QWK, MAE, RMSE, Pearson and Spearman.
"""
import argparse
import csv
import json

from app.services import llm, metrics, nlp, rag

# ASAP prompts are not in the data file, so a generic one is used unless --prompt is given
DEFAULT_PROMPT = "Write a well-organised essay responding to the assigned topic."


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("path")
    p.add_argument("--essay-col", default="essay")
    p.add_argument("--score-col", default="domain1_score")
    p.add_argument("--essay-set", help="ASAP essay_set to keep (score ranges differ per set, so benchmark one at a time)")
    p.add_argument("--prompt", default=DEFAULT_PROMPT)
    p.add_argument("--limit", type=int, default=50)
    args = p.parse_args()

    with open(args.path, encoding="latin-1", newline="") as f:  # ASAP ships as latin-1
        rows = list(csv.DictReader(f, delimiter="\t" if args.path.endswith(".tsv") else ","))
    rows = [r for r in rows if r.get(args.score_col) and (not args.essay_set or r.get("essay_set") == args.essay_set)]
    rows = rows[: args.limit]
    if not rows:
        raise SystemExit("No rows matched")

    human = [float(r[args.score_col]) for r in rows]
    lo, hi = int(min(human)), int(max(human))
    rag.ingest_knowledge()
    chunks = rag.retrieve(args.prompt, None)

    ai = []
    for i, row in enumerate(rows, 1):
        essay = row[args.essay_col]
        result, _ = llm.evaluate(args.prompt, essay, chunks, nlp.analyze(essay))
        overall = llm.overall_score({d: getattr(result, d).score for d in ("grammar", "coherence", "content", "vocabulary")})
        ai.append(lo + (overall - 1) / 9 * (hi - lo))  # 1-10 -> human range
        print(f"[{i}/{len(rows)}] human={human[i - 1]:g} ai={ai[-1]:.2f}")

    result = metrics.agreement(ai, human, lo, hi)
    result.pop("pairs")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
