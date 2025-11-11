from __future__ import annotations

from datetime import date, datetime
from enum import Enum as PyEnum
from typing import Optional

from sqlalchemy import Column, String, Date, DateTime
from sqlalchemy import Enum as SAEnum
from sqlmodel import SQLModel, Field


class PetSize(str, PyEnum):
    small = "small"
    medium = "medium"
    large = "large"


class Pet(SQLModel, table=True):
    __tablename__ = "pets"

    id: Optional[int] = Field(default=None, primary_key=True)

    name: str = Field(sa_column=Column(String, nullable=False))
    breed: str = Field(sa_column=Column(String, nullable=False))
    size: PetSize = Field(
        sa_column=Column(SAEnum(PetSize, name="pet_size", native_enum=False), nullable=False)
    )
    birthdate: date = Field(sa_column=Column(Date, nullable=False))

    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime, nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime, nullable=False),
    )
