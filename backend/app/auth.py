# app/auth.py
"""
Authentication middleware for verifying Supabase JWT tokens.
Ensures users can only access their own data.
"""

import os
import jwt
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

# Supabase JWT settings
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
SUPABASE_URL = os.getenv("SUPABASE_URL")

security = HTTPBearer(auto_error=False)


class AuthenticatedUser:
    """Represents an authenticated user from a verified JWT."""
    def __init__(self, user_id: str, email: Optional[str] = None):
        self.user_id = user_id
        self.email = email


def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> AuthenticatedUser:
    """
    Verify the Supabase JWT token and extract user information.
    Raises HTTPException if token is invalid or missing.
    """
    if not credentials:
        raise HTTPException(status_code=401, detail="Missing authentication token")

    token = credentials.credentials

    if not SUPABASE_JWT_SECRET:
        # If JWT secret not configured, log warning but allow request (for development)
        print("⚠️ WARNING: SUPABASE_JWT_SECRET not set - authentication disabled!")
        # For development, try to decode without verification to get user_id
        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            user_id = payload.get("sub")
            if user_id:
                return AuthenticatedUser(user_id=user_id, email=payload.get("email"))
        except Exception:
            pass
        raise HTTPException(status_code=401, detail="Authentication not configured")

    try:
        # Verify and decode the JWT
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: missing user ID")

        return AuthenticatedUser(
            user_id=user_id,
            email=payload.get("email")
        )

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> AuthenticatedUser:
    """Dependency to get the current authenticated user."""
    return verify_token(credentials)


def get_optional_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> Optional[AuthenticatedUser]:
    """Dependency to optionally get authenticated user (for public endpoints)."""
    if not credentials:
        return None
    try:
        return verify_token(credentials)
    except HTTPException:
        return None


def verify_user_access(user_id_param: str, current_user: AuthenticatedUser) -> bool:
    """
    Verify that the authenticated user matches the requested user_id.
    Raises HTTPException if access is denied.
    """
    if current_user.user_id != user_id_param:
        raise HTTPException(
            status_code=403,
            detail="Access denied: you can only access your own data"
        )
    return True
