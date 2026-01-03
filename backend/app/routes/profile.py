from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, validator
from typing import Optional
import re

from app.db import get_db
from app.models import UserProfile
from app.auth import get_current_user, verify_user_access, AuthenticatedUser


router = APIRouter(prefix="/api/profile", tags=["profile"])


class ProfileUpdate(BaseModel):
    username: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

    @validator('username')
    def validate_username(cls, v):
        if v is not None:
            if len(v) < 3 or len(v) > 30:
                raise ValueError('Username must be 3-30 characters')
            if not re.match(r'^[a-zA-Z0-9_]+$', v):
                raise ValueError('Username can only contain letters, numbers, and underscores')
        return v

    @validator('bio')
    def validate_bio(cls, v):
        if v is not None and len(v) > 500:
            raise ValueError('Bio must be under 500 characters')
        return v

    @validator('avatar_url')
    def validate_avatar_url(cls, v):
        if v is not None:
            if len(v) > 500:
                raise ValueError('Avatar URL too long')
            # Basic URL validation
            if not v.startswith(('http://', 'https://')):
                raise ValueError('Avatar URL must be a valid HTTP/HTTPS URL')
        return v


@router.get("/{user_id}")
def get_profile(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    # Verify the authenticated user can only access their own data
    verify_user_access(user_id, current_user)

    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        # Create default profile
        profile = UserProfile(user_id=user_id, username=f"User_{user_id[:8]}", is_private=0)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.post("/{user_id}")
def update_profile(
    user_id: str,
    req: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    # Verify the authenticated user can only update their own profile
    verify_user_access(user_id, current_user)

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
