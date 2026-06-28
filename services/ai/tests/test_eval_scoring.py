from app.schemas import LabValue
from eval.run_eval import score


def test_scoring_counts_matches_within_tolerance():
    """From the brief: hba1c 7.2 vs 7.25 is within tol; tsh 3.0 vs 9.9 is not."""
    pred = [LabValue(analyte="hba1c", value=7.2), LabValue(analyte="tsh", value=3.0)]
    exp = [{"analyte": "hba1c", "value": 7.25}, {"analyte": "tsh", "value": 9.9}]
    r = score(pred, exp)
    assert r["matched"] == 1 and r["total"] == 2


def test_scoring_perfect_match():
    pred = [LabValue(analyte="tsh", value=2.5), LabValue(analyte="hba1c", value=5.8)]
    exp = [{"analyte": "tsh", "value": 2.5}, {"analyte": "hba1c", "value": 5.8}]
    r = score(pred, exp)
    assert r["matched"] == 2 and r["total"] == 2
    assert r["field_accuracy"] == 1.0


def test_scoring_zero_expected_returns_zero_accuracy():
    r = score([], [])
    assert r["matched"] == 0 and r["total"] == 0 and r["field_accuracy"] == 0.0


def test_scoring_no_matching_analytes():
    pred = [LabValue(analyte="creatinine", value=1.0)]
    exp = [{"analyte": "hba1c", "value": 7.0}]
    r = score(pred, exp)
    assert r["matched"] == 0 and r["total"] == 1
    assert r["field_accuracy"] == 0.0


def test_scoring_tolerance_boundary():
    # abs(7.0 - 7.14) = 0.14; max(0.1, 0.02*7.14) = max(0.1, 0.1428) = 0.1428 → matched
    pred = [LabValue(analyte="hba1c", value=7.0)]
    exp = [{"analyte": "hba1c", "value": 7.14}]
    r = score(pred, exp)
    assert r["matched"] == 1

    # abs(7.0 - 7.20) = 0.20; max(0.1, 0.02*7.20) = max(0.1, 0.144) = 0.144 → NOT matched
    pred2 = [LabValue(analyte="hba1c", value=7.0)]
    exp2 = [{"analyte": "hba1c", "value": 7.20}]
    r2 = score(pred2, exp2)
    assert r2["matched"] == 0


def test_scoring_field_accuracy_fraction():
    pred = [LabValue(analyte="hba1c", value=7.0), LabValue(analyte="tsh", value=2.0)]
    exp = [
        {"analyte": "hba1c", "value": 7.0},
        {"analyte": "tsh", "value": 99.0},  # far off
        {"analyte": "creatinine", "value": 0.9},  # not in pred
    ]
    r = score(pred, exp)
    assert r["matched"] == 1 and r["total"] == 3
    assert abs(r["field_accuracy"] - 1 / 3) < 1e-9
