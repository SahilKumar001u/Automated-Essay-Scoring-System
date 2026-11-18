"""Agreement metrics between AI and human scores (PRD section 22)."""
import numpy as np


def qwk(a, b, lo: int, hi: int) -> float | None:
    """Quadratic Weighted Kappa over integer ratings in [lo, hi]."""
    a = np.clip(np.rint(a).astype(int), lo, hi) - lo
    b = np.clip(np.rint(b).astype(int), lo, hi) - lo
    n = hi - lo + 1
    observed = np.zeros((n, n))
    np.add.at(observed, (a, b), 1)
    idx = np.arange(n)
    weights = (idx[:, None] - idx[None, :]) ** 2 / (n - 1) ** 2
    expected = np.outer(observed.sum(1), observed.sum(0)) / observed.sum()
    denominator = (weights * expected).sum()
    if denominator == 0:  # both raters gave one identical score to everything
        return None
    return float(1 - (weights * observed).sum() / denominator)


def _ranks(x):
    """Average ranks, so ties are handled the way Spearman requires."""
    order = np.argsort(x, kind="stable")
    ranks = np.empty(len(x))
    ranks[order] = np.arange(1, len(x) + 1)
    for value in np.unique(x):
        ranks[x == value] = ranks[x == value].mean()
    return ranks


def pearson(a, b) -> float | None:
    if len(a) < 2 or np.std(a) == 0 or np.std(b) == 0:
        return None
    return float(np.corrcoef(a, b)[0, 1])


def agreement(ai_scores, human_scores, lo: int = 1, hi: int = 10) -> dict:
    a, b = np.asarray(ai_scores, dtype=float), np.asarray(human_scores, dtype=float)
    if len(a) == 0:
        return {"n": 0, "qwk": None, "mae": None, "rmse": None, "pearson": None, "spearman": None, "pairs": []}

    def r(v):
        return None if v is None else round(v, 3)

    return {
        "n": len(a),
        "qwk": r(qwk(a, b, lo, hi)),
        "mae": r(float(np.abs(a - b).mean())),
        "rmse": r(float(np.sqrt(((a - b) ** 2).mean()))),
        "pearson": r(pearson(a, b)),
        "spearman": r(pearson(_ranks(a), _ranks(b))),
        "pairs": [{"ai": x, "human": y} for x, y in zip(a.tolist(), b.tolist())],
    }
