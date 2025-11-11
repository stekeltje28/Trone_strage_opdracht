from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator

from ..models.pet import PetSize


class PetCreate(BaseModel):
    name: str
    breed: str
    size: PetSize
    birthdate: date

    @field_validator("name", "breed")
    @classmethod
    def _text_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("field may not be empty")
        if len(v) > 100:
            raise ValueError("field is too long")
        return v


class PetUpdate(BaseModel):
    name: Optional[str] = None
    breed: Optional[str] = None
    size: Optional[PetSize] = None
    birthdate: Optional[date] = None

    @field_validator("name", "breed")
    @classmethod
    def _text_not_empty_or_none(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v2 = v.strip()
        if not v2:
            raise ValueError("field may not be empty")
        if len(v2) > 100:
            raise ValueError("field is too long")
        return v2


class PetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    breed: str
    size: PetSize
    birthdate: date
    created_at: datetime
    updated_at: datetime
