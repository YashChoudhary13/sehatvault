"""
Extraction eval harness — run manually once a key + synthetic docs are present.

Usage:
    cd services/ai
    OPENAI_API_KEY=sk-... .venv/bin/python -m eval.run_eval

This module is imported by tests/test_eval_scoring.py for pure unit tests of
score().  main() is guarded so it never fires during pytest collection.
"""
from __future__ import annotations

import asyncio
import io
import json
import pathlib
import sys
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    pass

_EVAL_DIR = pathlib.Path(__file__).parent
_DOCS_DIR = _EVAL_DIR / "docs"
_GOLDEN = _EVAL_DIR / "golden.jsonl"


# ---------------------------------------------------------------------------
# Pure scoring function — unit-tested; no I/O, no LLM calls
# ---------------------------------------------------------------------------

def score(predicted: list, expected: list[dict]) -> dict:
    """Return {"matched": int, "total": int, "field_accuracy": float}.

    A prediction is matched when:
      - predicted contains a LabValue with the same .analyte as exp["analyte"]
      - abs(pred.value - exp["value"]) <= max(0.1, 0.02 * exp["value"])

    Only the first matching prediction is counted per expected entry.
    """
    total = len(expected)
    if total == 0:
        return {"matched": 0, "total": 0, "field_accuracy": 0.0}

    matched = 0
    pred_by_analyte: dict[str, list] = {}
    for p in predicted:
        pred_by_analyte.setdefault(p.analyte, []).append(p)

    for exp in expected:
        analyte = exp["analyte"]
        exp_val = float(exp["value"])
        tol = max(0.1, 0.02 * exp_val)
        candidates = pred_by_analyte.get(analyte, [])
        for p in candidates:
            if abs(p.value - exp_val) <= tol:
                matched += 1
                break

    return {
        "matched": matched,
        "total": total,
        "field_accuracy": matched / total,
    }


# ---------------------------------------------------------------------------
# main() — loads local docs, runs full pipeline, prints accuracy table
# ---------------------------------------------------------------------------

async def _run_main() -> None:
    # Deferred imports so pytest collection never triggers LLM / config init
    import base64

    from PIL import Image
    from pdf2image import convert_from_bytes

    from app.pipeline.extract import run as extract_run
    from app.pipeline.normalise import normalise_values
    from app.pipeline.preprocess import _to_data_uri

    if not _GOLDEN.exists():
        print(f"[eval] golden.jsonl not found at {_GOLDEN}", file=sys.stderr)
        sys.exit(1)

    rows = []
    with _GOLDEN.open() as fh:
        for line in fh:
            line = line.strip()
            if line:
                rows.append(json.loads(line))

    if not rows:
        print("[eval] golden.jsonl is empty — add synthetic docs first.", file=sys.stderr)
        sys.exit(1)

    results = []
    header = f"{'File':<25} {'Matched':>7} {'Total':>6} {'Accuracy':>9}"
    print(header)
    print("-" * len(header))

    for row in rows:
        filename = row["file"]
        doc_path = _DOCS_DIR / filename
        if not doc_path.exists():
            print(f"  {filename:<23}  MISSING — skipped")
            continue

        raw = doc_path.read_bytes()
        ext = doc_path.suffix.lower()
        if ext == ".pdf":
            pages = convert_from_bytes(raw, fmt="jpeg", dpi=150)[:5]
            images = [_to_data_uri(p) for p in pages]
        else:
            images = [_to_data_uri(Image.open(io.BytesIO(raw)))]

        extracted = await extract_run(images)
        lab_values = normalise_values(extracted.raw_values, extracted.doc_date)

        r = score(lab_values, row.get("lab_values", []))
        results.append(r)

        acc_pct = f"{r['field_accuracy']:.0%}"
        print(f"  {filename:<23} {r['matched']:>7} {r['total']:>6} {acc_pct:>9}")

    if not results:
        print("\n[eval] No documents were scored.")
        sys.exit(1)

    total_matched = sum(r["matched"] for r in results)
    total_expected = sum(r["total"] for r in results)
    agg_accuracy = total_matched / total_expected if total_expected else 0.0

    print("-" * len(header))
    print(f"  {'TOTAL':<23} {total_matched:>7} {total_expected:>6} {agg_accuracy:.0%}")
    print()
    if agg_accuracy < 0.9:
        print(
            f"[eval] FAIL — aggregate field accuracy {agg_accuracy:.1%} < 90% target.",
            file=sys.stderr,
        )
        sys.exit(1)
    print(f"[eval] PASS — aggregate field accuracy {agg_accuracy:.1%} >= 90% target.")


def main() -> None:
    asyncio.run(_run_main())


if __name__ == "__main__":
    main()
