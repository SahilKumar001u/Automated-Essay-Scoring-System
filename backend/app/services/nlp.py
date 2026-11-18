"""NLP analysis (PRD section 9): measurable signals that support, but never decide, the LLM score.

spaCy: tokens, sentences, lemmas. NLTK: frequency and n-gram counts. LanguageTool: grammar/spelling.
"""
import logging
import re
from functools import lru_cache

import nltk
import spacy

log = logging.getLogger(__name__)


@lru_cache
def _spacy():
    return spacy.load("en_core_web_sm", disable=["ner"])


@lru_cache
def _language_tool():
    import language_tool_python

    return language_tool_python.LanguageTool("en-US")


def warm_up():
    """Load models at startup so the first evaluation stays inside the 15 s target."""
    _spacy()
    try:
        _language_tool()
    except Exception:
        log.exception("LanguageTool unavailable; grammar error counts will be omitted")


def _syllables(word: str) -> int:
    # shortcut: vowel-group heuristic, not a pronunciation dictionary; fine for a readability estimate
    word = word.lower()
    count = len(re.findall(r"[aeiouy]+", word))
    if word.endswith("e") and not word.endswith(("le", "ee")) and count > 1:
        count -= 1
    return max(count, 1)


def _grammar(text: str) -> dict | None:
    try:
        matches = _language_tool().check(text)
    except Exception:
        log.exception("LanguageTool check failed")
        return None
    counts = {"grammar_errors": 0, "spelling_errors": 0, "punctuation_issues": 0, "style_issues": 0}
    bucket = {"misspelling": "spelling_errors", "typographical": "punctuation_issues",
              "whitespace": "punctuation_issues", "style": "style_issues"}
    samples = []
    for m in matches:
        if "British English" in m.message:  # valid British spellings (centre, colour) are not errors
            continue
        # attribute names differ between language-tool-python 2.x (camelCase) and 3.x (snake_case)
        issue_type = getattr(m, "rule_issue_type", None) or getattr(m, "ruleIssueType", "")
        length = getattr(m, "error_length", None) or getattr(m, "errorLength", 0)
        counts[bucket.get(issue_type, "grammar_errors")] += 1
        if len(samples) < 8:
            samples.append({
                "text": text[m.offset : m.offset + length],
                "message": m.message,
                "suggestion": m.replacements[0] if m.replacements else None,
            })
    return {**counts, "samples": samples}


def analyze(text: str) -> dict:
    doc = _spacy()(text)
    words = [t for t in doc if t.is_alpha]
    sentences = [s for s in doc.sents if any(t.is_alpha for t in s)]
    n_words, n_sents = max(len(words), 1), max(len(sentences), 1)

    # shortcut: blank lines mark paragraphs, else single newlines; PDF text with hard line wraps
    # will over-count. Upgrade to layout-aware extraction if PDF uploads become the main path.
    paragraphs = [p for p in re.split(r"\n\s*\n" if re.search(r"\n\s*\n", text) else r"\n", text) if p.strip()]
    paragraph_words = [len(p.split()) for p in paragraphs]

    lemmas = [t.lemma_.lower() for t in words]
    content_lemmas = [t.lemma_.lower() for t in words if not t.is_stop and len(t) > 2]
    repeated_words = [
        {"word": w, "count": c} for w, c in nltk.FreqDist(content_lemmas).most_common(8) if c >= 3
    ]
    stop = {t.lower_ for t in words if t.is_stop}
    lowered = [t.lower_ for t in words]
    phrases = nltk.FreqDist(
        " ".join(g) for n in (2, 3) for g in nltk.ngrams(lowered, n) if not all(w in stop for w in g)
    )
    repeated_phrases = [{"phrase": p, "count": c} for p, c in phrases.most_common(6) if c >= 3]

    syllables = sum(_syllables(t.text) for t in words)
    words_per_sentence = n_words / n_sents
    marks = {m: text.count(m) for m in ",;:!?"}

    return {
        "word_count": len(words),
        "sentence_count": len(sentences),
        "avg_sentence_length": round(words_per_sentence, 1),
        "longest_sentence_words": max((sum(t.is_alpha for t in s) for s in sentences), default=0),
        "vocabulary": {
            "unique_words": len(set(lemmas)),
            "type_token_ratio": round(len(set(lemmas)) / n_words, 3),
            "avg_word_length": round(sum(len(t) for t in words) / n_words, 2),
            "long_word_ratio": round(sum(len(t) > 6 for t in words) / n_words, 3),
        },
        "grammar": _grammar(text),  # None when LanguageTool is unavailable
        "punctuation": {**marks, "commas_per_sentence": round(marks[","] / n_sents, 2)},
        "paragraphs": {
            "count": len(paragraphs),
            "avg_words": round(sum(paragraph_words) / max(len(paragraphs), 1), 1),
            "words_per_paragraph": paragraph_words,
        },
        "readability": {
            "flesch_reading_ease": round(206.835 - 1.015 * words_per_sentence - 84.6 * syllables / n_words, 1),
            "flesch_kincaid_grade": round(0.39 * words_per_sentence + 11.8 * syllables / n_words - 15.59, 1),
        },
        "repeated_words": repeated_words,
        "repeated_phrases": repeated_phrases,
    }
