from app.pipeline.summarise import append_disclaimer, DISCLAIMER_EN, DISCLAIMER_HI


def test_appends_en_disclaimer_once():
    out = append_disclaimer("HbA1c is 7.2%, slightly high.", "en")
    assert out.endswith(DISCLAIMER_EN)
    assert append_disclaimer(out, "en").count(DISCLAIMER_EN.strip()) == 1


def test_appends_hi_disclaimer():
    out = append_disclaimer("एचबीए1सी 7.2% है।", "hi")
    assert out.endswith(DISCLAIMER_HI)
