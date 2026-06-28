# Extraction Eval Harness

Offline accuracy harness for the AI extraction pipeline. Measures typed lab-value
field accuracy against a golden set. Target: **≥ 90% field accuracy**.

## golden.jsonl — line schema

Each line is one document:

```jsonc
{
  "file": "lab01.pdf",          // filename inside eval/docs/
  "lab_values": [
    {"analyte": "hba1c",        // canonical analyte key (see normalise.py ANALYTES)
     "value": 7.2},             // expected numeric value
    {"analyte": "fasting_glucose", "value": 118.0}
  ]
}
```

The three rows already in `golden.jsonl` are **illustrative synthetic examples** — they
reference `lab01.pdf`, `lab02.pdf`, `lab03.pdf` which do not exist yet.

## Adding documents

1. Place de-identified **synthetic** (never real patient) lab report PDFs or images in
   `eval/docs/`. Filenames must match the `"file"` field in `golden.jsonl`.
2. Add the corresponding expected lab values as a new line in `golden.jsonl`.
3. Grow the set toward ~50 documents before treating the accuracy number as reliable.

Accepted formats: `.pdf`, `.jpg`, `.jpeg`, `.png`.

## Running the harness

```bash
cd services/ai
OPENAI_API_KEY=sk-...  .venv/bin/python -m eval.run_eval
```

The script prints a per-document accuracy table, then exits 0 (PASS) or 1 (FAIL).
It requires a live LLM key and real documents — **do not run in CI without both**.

## Scoring logic

A predicted `LabValue` counts as matched for an expected entry when:
- `predicted.analyte == expected["analyte"]`
- `abs(predicted.value - expected["value"]) <= max(0.1, 0.02 * expected["value"])`

The tolerance is ±2% of the expected value (floor 0.1 absolute) to allow for
minor OCR and unit-conversion variance.

`field_accuracy = matched / total_expected` across all documents.

## Unit tests

`services/ai/tests/test_eval_scoring.py` tests `score()` in isolation — no LLM key
needed. These run in CI as part of the standard `pytest` suite.
