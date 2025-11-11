from sqlmodel import Session, select
from ..db import engine
from ..models.user import User, UserRole
from ..core.security import get_password_hash

def ensure_admin(username: str, password: str) -> None:
    if not username or not password:
        return
    with Session(engine) as session:
        user = session.exec(select(User).where(User.username == username)).first()
        if user:
            # promote bestaande user
            user.role = UserRole.admin
            # (optioneel) wachtwoord updaten:
            # user.hashed_password = get_password_hash(password)
        else:
            # nieuwe admin user
            user = User(
                username=username,
                hashed_password=get_password_hash(password),
                role=UserRole.admin,
                is_active=True,
            )
            session.add(user)
        session.commit()
