from __future__ import annotations
import logging
from contextlib import contextmanager
from typing import Generator, Optional
from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlmodel import SQLModel, Session, create_engine
from .core.settings import settings

logger = logging.getLogger(__name__)

def _is_sqlite(url: str) -> bool:
    return url.startswith("sqlite://")

def _build_engine(url: Optional[str] = None) -> Engine:
    url = url or settings.DATABASE_URL
    connect_args: dict = {}
    pool_kwargs = dict(pool_pre_ping=True)
    if _is_sqlite(url):
        connect_args = {"check_same_thread": False}
    engine = create_engine(
        url,
        echo=getattr(settings, "DB_ECHO", False),
        connect_args=connect_args,
        **pool_kwargs,
    )
    return engine

engine: Engine = _build_engine()

if _is_sqlite(settings.DATABASE_URL):
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):  # type: ignore[no-redef]
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

def create_db_and_tables() -> None:
    from .models import Pet, Appointment  # noqa: F401
    try:
        from .models import User  # noqa: F401
    except Exception:
        logger.debug("User model niet gevonden; sla het aanmaken van user-tabellen over.")
    SQLModel.metadata.create_all(engine)

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session

@contextmanager
def session_scope() -> Generator[Session, None, None]:
    with Session(engine) as session:
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
