from app.pipeline.normalise import normalise_values


def test_maps_known_analyte_and_flags_high():
    out = normalise_values(
        [{"name": "HbA1c", "value": "7.2", "unit": "%", "ref_range": "4-5.6"}],
        "2026-06-01",
    )
    assert len(out) == 1
    lv = out[0]
    assert lv.analyte == "hba1c" and lv.value == 7.2 and lv.flag == "high"
    assert lv.measured_at == "2026-06-01"


def test_drops_unrecognised():
    assert normalise_values([{"name": "zzz", "value": "1"}], None) == []


def test_skips_nonnumeric_value():
    assert normalise_values([{"name": "TSH", "value": "n/a"}], None) == []
