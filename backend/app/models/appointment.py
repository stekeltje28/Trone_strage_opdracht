from __future__ import annotations

from datetime import date, time, datetime
from typing import Optional

from sqlalchemy import Column, Date, Time, Integer, String, ForeignKey, DateTime
from sqlmodel import SQLModel, Field


class Appointment(SQLModel, table=True):
    __tablename__ = "appointments"

    id: Optional[int] = Field(default=None, primary_key=True)

    pet_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("pets.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )

    sitter_name: str = Field(sa_column=Column(String, nullable=False))
    sitting_date: date = Field(sa_column=Column(Date, nullable=False))
    sitting_time: time = Field(sa_column=Column(Time, nullable=False))
    duration_minutes: int = Field(sa_column=Column(Integer, nullable=False))

    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime, nullable=False),
    )
