"""
Invite System API Routes
- Waitlist signups
- Invite code validation
- Admin code generation
"""

import os
import secrets
import string
import logging
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, EmailStr
from supabase import create_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/invite", tags=["invite"])

# Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")  # Service role key

if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    supabase = None
    logger.warning("Supabase not configured for invite system")


# ============ Models ============

class WaitlistRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    source: Optional[str] = "landing_page"
    referral_code: Optional[str] = None


class ValidateCodeRequest(BaseModel):
    code: str
    email: Optional[EmailStr] = None


class GenerateCodeRequest(BaseModel):
    email: Optional[EmailStr] = None  # Lock to specific email
    max_uses: int = 1
    expires_in_days: Optional[int] = None
    note: Optional[str] = None


class BulkGenerateRequest(BaseModel):
    count: int = 10
    max_uses: int = 1
    expires_in_days: Optional[int] = None
    note: Optional[str] = None


# ============ Helper Functions ============

def generate_invite_code(length: int = 8) -> str:
    """Generate a random invite code like 'WALL-ABCD1234'"""
    chars = string.ascii_uppercase + string.digits
    random_part = ''.join(secrets.choice(chars) for _ in range(length))
    return f"WALL-{random_part}"


def verify_admin(admin_key: str) -> bool:
    """Verify admin access with a simple key check"""
    expected_key = os.getenv("ADMIN_API_KEY", "walleto-admin-secret-2024")
    return admin_key == expected_key


# ============ Public Endpoints ============

@router.post("/waitlist")
async def join_waitlist(request: WaitlistRequest):
    """Add email to waitlist for early access"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        # Check if already on waitlist
        existing = supabase.table("waitlist").select("id").eq("email", request.email.lower()).execute()

        if existing.data:
            return {
                "success": True,
                "message": "You're already on the waitlist! We'll notify you when early access is available.",
                "already_registered": True
            }

        # Add to waitlist
        result = supabase.table("waitlist").insert({
            "email": request.email.lower(),
            "name": request.name,
            "source": request.source,
            "referral_code": request.referral_code
        }).execute()

        # Get waitlist position
        count = supabase.table("waitlist").select("id", count="exact").execute()
        position = count.count if count.count else 1

        logger.info(f"New waitlist signup: {request.email}")

        return {
            "success": True,
            "message": "You're on the list! We'll email you when early access is available.",
            "position": position,
            "already_registered": False
        }

    except Exception as e:
        logger.error(f"Waitlist signup error: {e}")
        # Check for unique constraint violation
        if "duplicate key" in str(e).lower() or "unique" in str(e).lower():
            return {
                "success": True,
                "message": "You're already on the waitlist!",
                "already_registered": True
            }
        raise HTTPException(status_code=500, detail="Failed to join waitlist")


@router.post("/validate")
async def validate_invite_code(request: ValidateCodeRequest):
    """Validate an invite code before signup"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        code = request.code.upper().strip()

        # Look up the code
        result = supabase.table("invite_codes").select("*").eq("code", code).eq("is_active", True).execute()

        if not result.data:
            return {
                "valid": False,
                "message": "Invalid invite code. Please check and try again."
            }

        invite = result.data[0]

        # Check expiration
        if invite.get("expires_at"):
            expires_at = datetime.fromisoformat(invite["expires_at"].replace("Z", "+00:00"))
            if expires_at < datetime.now(expires_at.tzinfo):
                return {
                    "valid": False,
                    "message": "This invite code has expired."
                }

        # Check uses
        if invite["current_uses"] >= invite["max_uses"]:
            return {
                "valid": False,
                "message": "This invite code has reached its usage limit."
            }

        # Check if locked to specific email
        if invite.get("email") and request.email:
            if invite["email"].lower() != request.email.lower():
                return {
                    "valid": False,
                    "message": "This invite code is reserved for a different email address."
                }

        return {
            "valid": True,
            "message": "Valid invite code!",
            "locked_email": invite.get("email")
        }

    except Exception as e:
        logger.error(f"Code validation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to validate code")


@router.post("/redeem")
async def redeem_invite_code(
    code: str,
    user_id: str,
    email: str
):
    """Mark an invite code as used after successful signup"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        code = code.upper().strip()

        # Get the invite code
        result = supabase.table("invite_codes").select("*").eq("code", code).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Code not found")

        invite = result.data[0]

        # Increment usage count
        supabase.table("invite_codes").update({
            "current_uses": invite["current_uses"] + 1
        }).eq("id", invite["id"]).execute()

        # Record redemption
        supabase.table("invite_redemptions").insert({
            "invite_code_id": invite["id"],
            "user_id": user_id,
            "email": email.lower()
        }).execute()

        logger.info(f"Invite code {code} redeemed by {email}")

        return {"success": True, "message": "Invite code redeemed"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Code redemption error: {e}")
        raise HTTPException(status_code=500, detail="Failed to redeem code")


# ============ Admin Endpoints ============

@router.post("/admin/generate")
async def generate_invite_code_admin(
    request: GenerateCodeRequest,
    x_admin_key: str = Header(None)
):
    """Generate a new invite code (admin only)"""
    if not verify_admin(x_admin_key):
        raise HTTPException(status_code=403, detail="Invalid admin key")

    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        code = generate_invite_code()

        expires_at = None
        if request.expires_in_days:
            expires_at = (datetime.utcnow() + timedelta(days=request.expires_in_days)).isoformat()

        result = supabase.table("invite_codes").insert({
            "code": code,
            "email": request.email.lower() if request.email else None,
            "max_uses": request.max_uses,
            "expires_at": expires_at,
            "note": request.note,
            "created_by": "admin"
        }).execute()

        logger.info(f"Generated invite code: {code}")

        return {
            "success": True,
            "code": code,
            "email": request.email,
            "max_uses": request.max_uses,
            "expires_at": expires_at,
            "note": request.note
        }

    except Exception as e:
        logger.error(f"Code generation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate code")


@router.post("/admin/generate-bulk")
async def generate_bulk_codes(
    request: BulkGenerateRequest,
    x_admin_key: str = Header(None)
):
    """Generate multiple invite codes at once (admin only)"""
    if not verify_admin(x_admin_key):
        raise HTTPException(status_code=403, detail="Invalid admin key")

    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    if request.count > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 codes at once")

    try:
        codes = []
        expires_at = None
        if request.expires_in_days:
            expires_at = (datetime.utcnow() + timedelta(days=request.expires_in_days)).isoformat()

        for _ in range(request.count):
            code = generate_invite_code()
            codes.append({
                "code": code,
                "max_uses": request.max_uses,
                "expires_at": expires_at,
                "note": request.note,
                "created_by": "admin"
            })

        supabase.table("invite_codes").insert(codes).execute()

        logger.info(f"Generated {len(codes)} invite codes")

        return {
            "success": True,
            "count": len(codes),
            "codes": [c["code"] for c in codes]
        }

    except Exception as e:
        logger.error(f"Bulk code generation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate codes")


@router.get("/admin/codes")
async def list_invite_codes(
    x_admin_key: str = Header(None),
    active_only: bool = True,
    limit: int = 50
):
    """List all invite codes (admin only)"""
    if not verify_admin(x_admin_key):
        raise HTTPException(status_code=403, detail="Invalid admin key")

    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        query = supabase.table("invite_codes").select("*").order("created_at", desc=True).limit(limit)

        if active_only:
            query = query.eq("is_active", True)

        result = query.execute()

        return {
            "success": True,
            "codes": result.data,
            "total": len(result.data)
        }

    except Exception as e:
        logger.error(f"List codes error: {e}")
        raise HTTPException(status_code=500, detail="Failed to list codes")


@router.get("/admin/waitlist")
async def list_waitlist(
    x_admin_key: str = Header(None),
    limit: int = 100
):
    """List waitlist signups (admin only)"""
    if not verify_admin(x_admin_key):
        raise HTTPException(status_code=403, detail="Invalid admin key")

    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        result = supabase.table("waitlist").select("*").order("created_at", desc=True).limit(limit).execute()

        # Get total count
        count = supabase.table("waitlist").select("id", count="exact").execute()

        return {
            "success": True,
            "waitlist": result.data,
            "total": count.count,
            "showing": len(result.data)
        }

    except Exception as e:
        logger.error(f"List waitlist error: {e}")
        raise HTTPException(status_code=500, detail="Failed to list waitlist")


@router.delete("/admin/codes/{code}")
async def deactivate_code(
    code: str,
    x_admin_key: str = Header(None)
):
    """Deactivate an invite code (admin only)"""
    if not verify_admin(x_admin_key):
        raise HTTPException(status_code=403, detail="Invalid admin key")

    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        result = supabase.table("invite_codes").update({
            "is_active": False
        }).eq("code", code.upper()).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Code not found")

        return {"success": True, "message": f"Code {code} deactivated"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Deactivate code error: {e}")
        raise HTTPException(status_code=500, detail="Failed to deactivate code")
