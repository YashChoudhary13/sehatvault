from typing import Literal, Optional
from pydantic import BaseModel, Field


class LabValue(BaseModel):
    analyte: str
    value: float
    unit: Optional[str] = None
    measured_at: Optional[str] = None  # ISO date
    ref_low: Optional[float] = None
    ref_high: Optional[float] = None
    flag: Optional[str] = None  # 'low' | 'high' | 'normal' | None


class Medication(BaseModel):
    name: str
    dose: Optional[str] = None
    frequency: Optional[str] = None
    active: bool = True
    started_at: Optional[str] = None


class Embedding(BaseModel):
    chunk: str
    vector: list[float]


class CallbackPayload(BaseModel):
    record_id: str
    status: Literal["done", "needs_review", "failed"]
    extracted: Optional[dict] = None
    lab_values: list[LabValue] = Field(default_factory=list)
    medications: list[Medication] = Field(default_factory=list)
    embeddings: list[Embedding] = Field(default_factory=list)
    summary: Optional[str] = None
    summary_hi: Optional[str] = None


class Extracted(BaseModel):
    type: str = "other"
    title: Optional[str] = None
    doc_date: Optional[str] = None
    facility: Optional[str] = None
    doctor: Optional[str] = None
    raw_values: list[dict] = Field(default_factory=list)
    confidence: float = 0.0
