import pytest
from app.pipeline.classify import to_record_type


@pytest.mark.parametrize("raw,expected", [
    ("Lab Report", "lab_report"),
    ("blood test", "lab_report"),
    ("X-Ray", "scan"),
    ("Rx", "prescription"),
    ("invoice", "bill"),
    ("immunization", "vaccination"),
    ("something weird", "other"),
    (None, "other"),
    ("", "other"),
])
def test_to_record_type(raw, expected):
    assert to_record_type(raw) == expected
