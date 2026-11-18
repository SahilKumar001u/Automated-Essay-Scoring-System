# Automated Essay Scoring System

Students submit essays; an NLP + RAG + LLM pipeline scores them on a four-dimension rubric with
evidence and feedback; educators review the AI's evaluation and accept or override the score.

| Layer | Technology |
|---|---|
| Frontend | React, Tailwind CSS, Recharts (Vite) |
| Backend | Python, FastAPI, SQLAlchemy |
| NLP | spaCy, NLTK, LanguageTool (local server) |
| RAG | LangChain, ChromaDB, all-MiniLM-L6-v2 embeddings (local, ONNX) |
| LLM | Google Gemini or OpenAI, via LangChain structured output |
| Database | PostgreSQL |
| Auth | JWT, bcrypt password hashing, role-based access |
| Deployment | Docker Compose |

## Run it

1. Create `.env` from `.env.example` and set:
   - `GOOGLE_API_KEY` (free key from <https://aistudio.google.com/apikey>), **or** set
     `LLM_PROVIDER=openai`, `LLM_MODEL=gpt-4o-mini` and `OPENAI_API_KEY`
   - `JWT_SECRET` and `POSTGRES_PASSWORD` (any long random strings)
2. Start everything:

   ```bash
   docker compose up -d --build
   ```

   The first build downloads the NLP models and takes several minutes.
3. Open <http://localhost:8080>. API docs: <http://localhost:8010/docs>.

Google retires and overloads models regularly. `LLM_MODEL` is tried first, then each model in
`LLM_FALLBACK_MODELS`; if evaluations fail with "busy or unavailable", change these in `.env`.

After changing `.env`, apply it with `docker compose up -d backend`.

## Demo walkthrough

1. Register an **educator**, open *Assignments* and create one (optionally with assignment-specific criteria).
2. Register a **student** (use a private window), choose *New essay*, pick the assignment or write your own
   prompt, then type/paste the essay or upload a `.txt`, `.pdf` or `.docx`.
3. Watch the processing status, then read the overall score, dimension scores with reasons, strengths,
   weaknesses, suggestions, evidence, the language analysis and the rubric passages the AI was given.
4. As the educator, open the essay from the dashboard and **accept** the AI score or **override** it with a reason.
   The dashboard then shows QWK, MAE, RMSE, Pearson and Spearman between AI and final scores.

## Evaluation pipeline

`backend/app/services/evaluation.py` runs as a background task and updates the essay status at each stage:

1. **NLP analysis** (`nlp.py`): word/sentence counts, average sentence length, vocabulary richness,
   grammar/spelling/punctuation error counts, paragraph structure, readability, repeated words and phrases.
2. **RAG retrieval** (`rag.py`): the rubric and guideline documents in `backend/app/knowledge/` are chunked,
   embedded and stored in ChromaDB at startup. One query per scoring dimension retrieves the relevant rubric
   bands; assignment-specific criteria are retrieved by assignment id.
3. **LLM evaluation** (`llm.py`): prompt + essay + retrieved rubric + NLP signals go to the LLM, which must
   return output matching a strict schema (scores 1-10, reasoning, evidence, strengths, weaknesses, suggestions).
   If a model errors or returns invalid output, the next fallback model is tried.
4. **Scoring**: overall = 0.20·grammar + 0.25·coherence + 0.35·content + 0.20·vocabulary, computed in code.
5. **Teacher review**: every accept/override is stored as a new `teacher_reviews` row (AI score, final score,
   reviewer, timestamp, reason), which forms the audit trail.

Safety: essays are length-limited, stripped of control characters and passed to the LLM inside a delimited
data block with instructions to treat them as untrusted text. File uploads are limited to 2 MB and three types.

## API

| Method | Endpoint | Role |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | public |
| POST / GET | `/api/assignments` | educator / any |
| POST | `/api/essays/submit` (multipart: `assignment_id` or `prompt`, `essay_text` or `file`) | student |
| GET | `/api/essays/history` | student |
| GET | `/api/essays/{id}`, `/api/essays/{id}/score` | owner or educator |
| POST | `/api/essays/{id}/evaluate` | owner or educator |
| POST | `/api/essays/{id}/review`, `/api/essays/{id}/override` | educator |
| GET | `/api/dashboard/student`, `/api/dashboard/educator` | student / educator |

## Tests and benchmarking

```bash
docker compose exec backend pytest -q
```

To benchmark against human scores (e.g. the ASAP dataset's `training_set_rel3.tsv` from Kaggle):

```bash
docker compose cp training_set_rel3.tsv backend:/tmp/asap.tsv
```

```bash
docker compose exec backend python -m scripts.benchmark /tmp/asap.tsv --essay-set 1 --limit 50
```

It prints QWK, MAE, RMSE, Pearson and Spearman between the AI and human scores.

## Project structure

```
backend/
  app/
    main.py            app entry, startup (tables, rubric indexing, model warm-up)
    config.py          settings from environment variables
    models.py          SQLAlchemy tables: users, assignments, essays, scores, feedback, teacher_reviews
    schemas.py         Pydantic request/response models
    security.py        bcrypt, JWT, role dependencies
    controllers/       auth, assignments, essays (submit/evaluate/review), dashboard
    services/          nlp, rag, llm, evaluation (pipeline), metrics, files
    knowledge/         rubric and guideline documents indexed into ChromaDB
  scripts/benchmark.py
  tests/
frontend/
  src/pages/           Landing, AuthPage, StudentDashboard, SubmitEssay, EssayDetail, EducatorDashboard, Assignments
  src/components/      Layout, EssayTable, shared UI
docker-compose.yml
```

## Deployment notes

- Serve the frontend container behind a TLS-terminating proxy (Caddy, Traefik, or a cloud load balancer) so
  all traffic is HTTPS. Compose publishes plain HTTP on port 8080 for local use.
- Tables are created on startup with `create_all`; add Alembic migrations before changing the schema on a
  database that holds real data.
