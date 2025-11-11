from __future__ import annotations

from datetime import date, time, datetime
from pydantic import BaseModel, ConfigDict, field_validator


class AppointmentCreate(BaseModel):
    pet_id: int
    sitter_name: str
    sitting_date: date
    sitting_time: time
    duration_minutes: int

    @field_validator("sitter_name")
    @classmethod
    def _name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("sitter_name may not be empty")
        if len(v) > 100:
            raise ValueError("sitter_name is too long")
        return v

    @field_validator("duration_minutes")
    @classmethod
    def _duration_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("duration_minutes must be positive")
        if v > 24 * 60:
            raise ValueError("duration_minutes too large")
        return v


class AppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pet_id: int
    sitter_name: str
    sitting_date: date
    sitting_time: time
    duration_minutes: int
    created_at: datetime
