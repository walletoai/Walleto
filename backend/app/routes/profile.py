from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.db import get_db
from app.models import UserProfile


router = APIRouter(prefix="/api/profile", tags=["profile"])


class ProfileUpdate(BaseModel):
    username: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


@router.get("/{user_id}")
def get_profile(user_id: str, db: Session = Depends(get_db)):
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        # Create default profile
        profile = UserProfile(user_id=user_id, username=f"User_{user_id[:8]}", is_private=0)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.post("/{user_id}")
def update_profile(user_id: str, req: ProfileUpdate, db: Session = Depends(get_db)):
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        profile = UserProfile(user_id=user_id)
        db.add(profile)
    
    if req.username is not None:
        profile.username = req.username
    if req.bio is not None:
        profile.bio = req.bio
    if req.avatar_url is not None:
        profile.avatar_url = req.avatar_url
    
    db.commit()
    db.refresh(profile)
    return profile
