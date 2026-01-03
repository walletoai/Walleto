from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, validator
from typing import List, Optional
from datetime import datetime

from app.db import get_db
from app.models import CalendarEvent
from app.auth import get_current_user, verify_user_access, AuthenticatedUser


router = APIRouter(prefix="/api/calendar", tags=["calendar"])


class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_date: str  # ISO date YYYY-MM-DD

    @validator('title')
    def validate_title(cls, v):
        if not v or len(v) > 200:
            raise ValueError('Title must be 1-200 characters')
        return v.strip()

    @validator('description')
    def validate_description(cls, v):
        if v and len(v) > 1000:
            raise ValueError('Description must be under 1000 characters')
        return v


SYSTEM_EVENTS = [
    {"title": "Bitcoin Halving", "date": "2024-04-19", "is_system": True, "description": "Block reward halved"},
    {"title": "Ethereum Merge", "date": "2022-09-15", "is_system": True, "description": "Switch to PoS"},
    {"title": "FTX Collapse", "date": "2022-11-11", "is_system": True, "description": "Exchange insolvency"},
    {"title": "Luna Crash", "date": "2022-05-09", "is_system": True, "description": "UST depeg"},
    {"title": "Black Thursday", "date": "2020-03-12", "is_system": True, "description": "Covid crash"},
]


@router.get("/events")
def get_events(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    # Verify the authenticated user can only access their own data
    verify_user_access(user_id, current_user)

    # Get custom events
    custom_events = db.query(CalendarEvent).filter(CalendarEvent.user_id == user_id).all()

    # Format custom events
    formatted_custom = []
    for e in custom_events:
        formatted_custom.append({
            "id": e.id,
            "title": e.title,
            "date": e.event_date.isoformat(),
            "description": e.description,
            "is_system": False
        })

    # Combine with system events
    return {"events": formatted_custom + SYSTEM_EVENTS}


@router.post("/events")
def create_event(
    req: EventCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    dt = datetime.fromisoformat(req.event_date)
    new_event = CalendarEvent(
        user_id=current_user.id,  # Use authenticated user's ID
        title=req.title,
        description=req.description,
        event_date=dt
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return {"ok": True, "id": new_event.id}


@router.delete("/events/{event_id}")
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    event = db.query(CalendarEvent).filter(
        CalendarEvent.id == event_id,
        CalendarEvent.user_id == current_user.id
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    db.delete(event)
    db.commit()
    return {"ok": True}
