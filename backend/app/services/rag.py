"""RAG over the scoring rubric and guidelines (PRD section 10): LangChain + ChromaDB.

Knowledge base = markdown files in app/knowledge plus assignment-specific criteria added by educators.
"""
from functools import lru_cache
from pathlib import Path

from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from langchain_text_splitters import Language, RecursiveCharacterTextSplitter

from ..config import settings

KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent / "knowledge"

# One retrieval query per scoring dimension, so every dimension is grounded in its rubric
DIMENSION_QUERIES = {
    "grammar": "Grammar and Mechanics scoring criteria: grammar, spelling, punctuation, sentence correctness",
    "coherence": "Coherence and Structure scoring criteria: organization, paragraph structure, transitions",
    "content": "Content and Relevance scoring criteria: relevance to the prompt, argument quality, evidence",
    "vocabulary": "Vocabulary and Style scoring criteria: word choice, vocabulary richness, tone, style",
}


class MiniLMEmbeddings(Embeddings):
    """Sentence-Transformers all-MiniLM-L6-v2 run locally through ONNX (no torch, no API key)."""

    def __init__(self):
        self._embed = ONNXMiniLM_L6_V2()

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [vector.tolist() for vector in self._embed(texts)]

    def embed_query(self, text: str) -> list[float]:
        return self.embed_documents([text])[0]


@lru_cache
def _store() -> Chroma:
    return Chroma(
        collection_name="rubric_knowledge",
        embedding_function=MiniLMEmbeddings(),
        persist_directory=settings.chroma_dir,
    )


def _splitter():
    return RecursiveCharacterTextSplitter.from_language(Language.MARKDOWN, chunk_size=700, chunk_overlap=80)


def ingest_knowledge() -> int:
    """(Re)build the default knowledge base on startup; the corpus is small so this takes about a second."""
    store = _store()
    store.delete(where={"type": "default"})
    docs = [
        Document(page_content=path.read_text(encoding="utf-8"), metadata={"type": "default", "source": path.stem})
        for path in sorted(KNOWLEDGE_DIR.glob("*.md"))
    ]
    chunks = _splitter().split_documents(docs)
    store.add_documents(chunks)
    return len(chunks)


def add_assignment_criteria(assignment_id: int, title: str, criteria: str) -> None:
    doc = Document(
        page_content=f"Assignment-specific evaluation criteria for '{title}':\n{criteria}",
        metadata={"type": "assignment", "assignment_id": assignment_id, "source": f"assignment-{assignment_id}"},
    )
    _store().add_documents(_splitter().split_documents([doc]))


def retrieve(prompt: str, assignment_id: int | None) -> list[dict]:
    """Return the de-duplicated rubric/guideline chunks to ground the LLM evaluation."""
    store = _store()
    found = []
    for query in DIMENSION_QUERIES.values():
        found += store.similarity_search(query, k=2, filter={"type": "default"})
    found += store.similarity_search(f"How to evaluate an essay on: {prompt}", k=2, filter={"type": "default"})
    if assignment_id is not None:
        found += store.similarity_search(prompt, k=3, filter={"assignment_id": assignment_id})
    unique = {doc.page_content: doc for doc in found}
    return [{"source": d.metadata["source"], "text": d.page_content} for d in unique.values()]
