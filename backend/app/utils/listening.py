from typing import Iterable, List, Optional, Tuple
from sqlmodel import SQLModel, select
from sqlalchemy import func

def build_list_stmt(
    model: type[SQLModel],
    q: Optional[str],
    string_fields: Iterable[str],
    order_by: str,
    order_dir: str,
    skip: int,
    limit: int,
):
    stmt = select(model)

    # Zoeken (case-insensitive) over opgegeven stringvelden
    if q:
        q_like = f"%{q.strip().lower()}%"
        conds = []
        for fname in string_fields:
            field = getattr(model, fname, None)
            if field is not None:
                conds.append(func.lower(field).like(q_like))
        if conds:
            from sqlalchemy import or_
            stmt = stmt.where(or_(*conds))

    # Sorteren met whitelist
    allowed = {"id", "created_at"} | set(string_fields)
    ob = order_by if order_by in allowed else "created_at"
    field = getattr(model, ob)
    stmt = stmt.order_by(field.desc() if order_dir.lower() == "desc" else field.asc())

    # Pagineren
    stmt = stmt.offset(max(0, skip)).limit(min(max(1, limit), 200))
    return stmt
