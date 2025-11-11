from __future__ import annotations

from datetime import datetime, timedelta, date
from fastapi import APIRouter, Depends, HTTPException, Response, status, Query
from sqlmodel import Session, select

from ..db import get_session
from ..models.pet import Pet
from ..models.appointment import Appointment
from ..schemas.appointment import AppointmentCreate, AppointmentOut

router = APIRouter(prefix="/api/v1/appointments", tags=["appointments"])


@router.get("", response_model=list[AppointmentOut])
def list_appointments(
    session: Session = Depends(get_session),
    pet_id: int | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    if date_from and date_to and date_to < date_from:
        raise HTTPException(status_code=400, detail="date_to must be >= date_from")

    stmt = select(Appointment)
    if pet_id is not None:
        stmt = stmt.where(Appointment.pet_id == pet_id)
    if date_from is not None:
        stmt = stmt.where(Appointment.sitting_date >= date_from)
    if date_to is not None:
        stmt = stmt.where(Appointment.sitting_date <= date_to)

    # sorteer op datum+tijd oplopend
    stmt = stmt.order_by(Appointment.sitting_date, Appointment.sitting_time)
    stmt = stmt.limit(limit).offset(offset)

    return session.exec(stmt).all()


@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def create_appointment(payload: AppointmentCreate, session: Session = Depends(get_session)):
    # check pet
    pet = session.get(Pet, payload.pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")

    # Bereken start/end (datetime) voor overlap-check
    start_dt = datetime.combine(payload.sitting_date, payload.sitting_time)
    end_dt = start_dt + timedelta(minutes=payload.duration_minutes)

    # Zelfde dag + zelfde pet -> eenvoudige overlapcontrole (sqlite-proof)
    existing = session.exec(
        select(Appointment).where(
            Appointment.pet_id == payload.pet_id,
            Appointment.sitting_date == payload.sitting_date,
        )
    ).all()

    def _range_overlap(a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime) -> bool:
        return a_start < b_end and b_start < a_end

    for appt in existing:
        other_start = datetime.combine(appt.sitting_date, appt.sitting_time)
        other_end = other_start + timedelta(minutes=appt.duration_minutes)
        if _range_overlap(start_dt, end_dt, other_start, other_end):
            raise HTTPException(
                status_code=409,
                detail="Appointment overlaps with an existing one",
            )

    appt = Appointment(**payload.model_dump())
    session.add(appt)
    session.commit()
    session.refresh(appt)
    return appt


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment(appointment_id: int, session: Session = Depends(get_session)):
    appt = session.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    session.delete(appt)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
