from __future__ import annotations

from typing import Optional
from enum import Enum as PyEnum

from sqlalchemy import Column, String
from sqlalchemy import Enum as SAEnum
from sqlmodel import SQLModel, Field

class User(SQLModel, table=True):
    __tablename__ = "user"

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(sa_column=Column(String, unique=True, index=True, nullable=False))
    hashed_password: str = Field(nullable=False)
    is_active: bool = Field(default=True, nullable=False)
    token_version: int = Field(default=0, nullable=False)
