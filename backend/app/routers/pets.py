from __future__ import annotations

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Response, status, Query
from sqlmodel import Session, select

from ..db import get_session
from ..models.pet import Pet
from ..schemas.pet import PetCreate, PetUpdate, PetOut

router = APIRouter(prefix="/api/v1/pets", tags=["pets"])


@router.get("", response_model=list[PetOut])
def list_pets(
    session: Session = Depends(get_session),
    q: str | None = Query(default=None, description="Zoek in name/breed"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    stmt = select(Pet)
    if q:
        from sqlalchemy import or_
        like = f"%{q}%"
        stmt = stmt.where(or_(Pet.name.ilike(like), Pet.breed.ilike(like)))

    # sorteer nieuwste eerst
    stmt = stmt.order_by(Pet.created_at.desc())
    stmt = stmt.limit(limit).offset(offset)

    return session.exec(stmt).all()


@router.get("/{pet_id}", response_model=PetOut)
def get_pet(pet_id: int, session: Session = Depends(get_session)):
    pet = session.get(Pet, pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    return pet


@router.post("", response_model=PetOut, status_code=status.HTTP_201_CREATED)
def create_pet(payload: PetCreate, session: Session = Depends(get_session)):
    pet = Pet(**payload.model_dump())
    session.add(pet)
    session.commit()
    session.refresh(pet)
    return pet


@router.patch("/{pet_id}", response_model=PetOut)
def update_pet(pet_id: int, payload: PetUpdate, session: Session = Depends(get_session)):
    pet = session.get(Pet, pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(pet, k, v)

    pet.updated_at = datetime.utcnow()

    session.add(pet)
    session.commit()
    session.refresh(pet)
    return pet


@router.delete("/{pet_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pet(pet_id: int, session: Session = Depends(get_session)):
    pet = session.get(Pet, pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    session.delete(pet)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
