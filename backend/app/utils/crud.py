from typing import Generic, List, Optional, Type, TypeVar
from sqlmodel import SQLModel, Session, select

ModelT = TypeVar("ModelT", bound=SQLModel)
CreateT = TypeVar("CreateT", bound=SQLModel)
UpdateT = TypeVar("UpdateT", bound=SQLModel)

class CRUD(Generic[ModelT, CreateT, UpdateT]):
    def __init__(self, model: Type[ModelT]):
        self.model = model

    def list(self, session: Session, skip: int = 0, limit: int = 50) -> List[ModelT]:
        return session.exec(select(self.model).offset(skip).limit(limit)).all()

    def get(self, session: Session, id: int) -> Optional[ModelT]:
        return session.get(self.model, id)

    def create(self, session: Session, payload: CreateT) -> ModelT:
        obj = self.model(**payload.model_dump())
        session.add(obj)
        session.commit()
        session.refresh(obj)
        return obj

    def update(self, session: Session, db_obj: ModelT, payload: UpdateT) -> ModelT:
        data = payload.model_dump(exclude_unset=True)
        for k, v in data.items():
            setattr(db_obj, k, v)
        session.add(db_obj)
        session.commit()
        session.refresh(db_obj)
        return db_obj

    def delete(self, session: Session, db_obj: ModelT) -> None:
        session.delete(db_obj)
        session.commit()
