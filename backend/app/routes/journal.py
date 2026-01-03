"""
Journal API routes for trading journal feature.
Handles journal entries, templates, mood tracking, streaks, and AI integration.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
from datetime import date

from app.services.journal_service import journal_service
from app.auth import get_current_user, verify_user_access, AuthenticatedUser

router = APIRouter(prefix="/api/journal", tags=["journal"])


# ============================================
# Pydantic Models for Request/Response
# ============================================

# Entry Models
class CreateEntryRequest(BaseModel):
    title: Optional[str] = "Untitled Entry"
    content: Optional[List[Dict[str, Any]]] = None
    entry_type: Optional[str] = "general"
    template_id: Optional[str] = None
    pre_trade_mood: Optional[str] = None
    post_trade_mood: Optional[str] = None
    mood_notes: Optional[str] = None
    entry_date: Optional[str] = None


class UpdateEntryRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[List[Dict[str, Any]]] = None
    entry_type: Optional[str] = None
    pre_trade_mood: Optional[str] = None
    post_trade_mood: Optional[str] = None
    mood_notes: Optional[str] = None
    ai_summary: Optional[str] = None


class EntryResponse(BaseModel):
    id: str
    user_id: str
    title: str
    content: List[Dict[str, Any]]
    template_id: Optional[str] = None
    pre_trade_mood: Optional[str] = None
    post_trade_mood: Optional[str] = None
    mood_notes: Optional[str] = None
    entry_type: str
    is_pinned: bool
    is_favorite: bool
    word_count: int
    ai_summary: Optional[str] = None
    entry_date: str
    created_at: str
    updated_at: str
    journal_trade_links: Optional[List[Dict]] = None


class EntryListResponse(BaseModel):
    entries: List[EntryResponse]
    total: int
    limit: int
    offset: int


# Trade Linking Models
class LinkTradesRequest(BaseModel):
    trade_ids: List[str]
    link_context: Optional[str] = None


class TradeLinkResponse(BaseModel):
    id: str
    journal_entry_id: str
    trade_id: str
    link_context: Optional[str] = None
    created_at: str


# Template Models
class CreateTemplateRequest(BaseModel):
    name: str
    content: List[Dict[str, Any]]
    description: Optional[str] = None
    category: Optional[str] = "custom"


class UpdateTemplateRequest(BaseModel):
    name: Optional[str] = None
    content: Optional[List[Dict[str, Any]]] = None
    description: Optional[str] = None
    category: Optional[str] = None


class TemplateResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    content: List[Dict[str, Any]]
    category: str
    is_system: bool
    usage_count: int
    created_at: str


class TemplateListResponse(BaseModel):
    templates: List[TemplateResponse]
    total: int


# Mood Models
class RecordMoodRequest(BaseModel):
    mood: str
    context: Optional[str] = "general"
    entry_id: Optional[str] = None
    intensity: Optional[int] = 3
    notes: Optional[str] = None


class MoodResponse(BaseModel):
    id: str
    user_id: str
    mood: str
    mood_intensity: int
    context: Optional[str] = None
    journal_entry_id: Optional[str] = None
    recorded_at: str


class MoodHeatmapResponse(BaseModel):
    heatmap_data: Dict[str, List[Dict]]
    mood_distribution: Dict[str, int]
    total_records: int
    start_date: str
    end_date: str


class MoodAnalyticsResponse(BaseModel):
    average_mood_score: float
    total_mood_entries: int
    pre_trade_average: float
    post_trade_average: float
    mood_improvement_after_trade: float
    most_common_mood: Optional[str] = None


# Streak Models
class StreakResponse(BaseModel):
    user_id: str
    current_streak: int
    longest_streak: int
    last_entry_date: Optional[str] = None
    total_entries: int
    total_words: int
    is_active: Optional[bool] = None
    days_since_last_entry: Optional[int] = None


# AI Prompts Models
class AIPromptResponse(BaseModel):
    type: str
    prompt: str
    priority: str
    related_trade_id: Optional[str] = None


class AIPromptsListResponse(BaseModel):
    prompts: List[AIPromptResponse]


# ============================================
# Entry CRUD Endpoints
# ============================================

@router.post("/entries", response_model=EntryResponse)
async def create_entry(
    user_id: str,
    req: CreateEntryRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Create a new journal entry.

    Args:
        user_id: User ID (query parameter)
        req: Entry data

    Returns:
        Created entry
    """
    # Verify the authenticated user can only create entries for themselves
    verify_user_access(user_id, current_user)

    try:
        entry = await journal_service.create_entry(
            user_id=user_id,
            title=req.title,
            content=req.content,
            entry_type=req.entry_type,
            template_id=req.template_id,
            pre_trade_mood=req.pre_trade_mood,
            post_trade_mood=req.post_trade_mood,
            mood_notes=req.mood_notes,
            entry_date=req.entry_date,
        )
        return EntryResponse(**entry)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create entry: {str(e)}")


@router.get("/entries", response_model=EntryListResponse)
async def get_entries(
    user_id: str,
    entry_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    is_pinned: Optional[bool] = None,
    is_favorite: Optional[bool] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Get journal entries with filters and pagination.

    Args:
        user_id: User ID (query parameter)
        entry_type: Filter by entry type (general, pre_trade, post_trade, weekly)
        start_date: Filter entries from this date (YYYY-MM-DD)
        end_date: Filter entries until this date (YYYY-MM-DD)
        search: Search in entry titles
        is_pinned: Filter by pinned status
        is_favorite: Filter by favorite status
        limit: Number of entries to return (default 50)
        offset: Pagination offset (default 0)

    Returns:
        List of entries with pagination info
    """
    # Verify the authenticated user can only access their own data
    verify_user_access(user_id, current_user)

    try:
        result = await journal_service.get_entries(
            user_id=user_id,
            entry_type=entry_type,
            start_date=start_date,
            end_date=end_date,
            search=search,
            is_pinned=is_pinned,
            is_favorite=is_favorite,
            limit=limit,
            offset=offset,
        )
        return EntryListResponse(
            entries=[EntryResponse(**e) for e in result["entries"]],
            total=result["total"],
            limit=result["limit"],
            offset=result["offset"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get entries: {str(e)}")


@router.get("/entries/{entry_id}", response_model=EntryResponse)
async def get_entry(
    user_id: str,
    entry_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Get a single journal entry with linked trades.

    Args:
        user_id: User ID (query parameter)
        entry_id: Entry ID (path parameter)

    Returns:
        Entry with trade links
    """
    verify_user_access(user_id, current_user)

    try:
        entry = await journal_service.get_entry(user_id, entry_id)
        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")
        return EntryResponse(**entry)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get entry: {str(e)}")


@router.put("/entries/{entry_id}", response_model=EntryResponse)
async def update_entry(
    user_id: str,
    entry_id: str,
    req: UpdateEntryRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Update a journal entry.

    Args:
        user_id: User ID (query parameter)
        entry_id: Entry ID (path parameter)
        req: Update data

    Returns:
        Updated entry
    """
    verify_user_access(user_id, current_user)

    try:
        # Build update dict with only provided fields
        updates = {}
        if req.title is not None:
            updates["title"] = req.title
        if req.content is not None:
            updates["content"] = req.content
        if req.entry_type is not None:
            updates["entry_type"] = req.entry_type
        if req.pre_trade_mood is not None:
            updates["pre_trade_mood"] = req.pre_trade_mood
        if req.post_trade_mood is not None:
            updates["post_trade_mood"] = req.post_trade_mood
        if req.mood_notes is not None:
            updates["mood_notes"] = req.mood_notes
        if req.ai_summary is not None:
            updates["ai_summary"] = req.ai_summary

        entry = await journal_service.update_entry(user_id, entry_id, updates)
        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")
        return EntryResponse(**entry)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update entry: {str(e)}")


@router.delete("/entries/{entry_id}")
async def delete_entry(
    user_id: str,
    entry_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Soft delete a journal entry.

    Args:
        user_id: User ID (query parameter)
        entry_id: Entry ID (path parameter)

    Returns:
        Success status
    """
    verify_user_access(user_id, current_user)

    try:
        success = await journal_service.delete_entry(user_id, entry_id)
        if not success:
            raise HTTPException(status_code=404, detail="Entry not found")
        return {"success": True, "entry_id": entry_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete entry: {str(e)}")


@router.post("/entries/{entry_id}/pin")
async def toggle_pin(
    user_id: str,
    entry_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Toggle pin status of an entry.

    Args:
        user_id: User ID (query parameter)
        entry_id: Entry ID (path parameter)

    Returns:
        Updated entry with new pin status
    """
    verify_user_access(user_id, current_user)

    try:
        entry = await journal_service.toggle_pin(user_id, entry_id)
        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")
        return {"success": True, "is_pinned": entry.get("is_pinned")}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to toggle pin: {str(e)}")


@router.post("/entries/{entry_id}/favorite")
async def toggle_favorite(
    user_id: str,
    entry_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Toggle favorite status of an entry.

    Args:
        user_id: User ID (query parameter)
        entry_id: Entry ID (path parameter)

    Returns:
        Updated entry with new favorite status
    """
    verify_user_access(user_id, current_user)

    try:
        entry = await journal_service.toggle_favorite(user_id, entry_id)
        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")
        return {"success": True, "is_favorite": entry.get("is_favorite")}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to toggle favorite: {str(e)}")


# ============================================
# Trade Linking Endpoints
# ============================================

@router.post("/entries/{entry_id}/trades")
async def link_trades(
    user_id: str,
    entry_id: str,
    req: LinkTradesRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Link trades to a journal entry.

    Args:
        user_id: User ID (query parameter)
        entry_id: Entry ID (path parameter)
        req: Trade IDs to link

    Returns:
        List of created links
    """
    verify_user_access(user_id, current_user)

    try:
        links = await journal_service.link_trades(
            user_id=user_id,
            entry_id=entry_id,
            trade_ids=req.trade_ids,
            link_context=req.link_context,
        )
        return {"success": True, "links": links}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to link trades: {str(e)}")


@router.delete("/entries/{entry_id}/trades/{trade_id}")
async def unlink_trade(
    user_id: str,
    entry_id: str,
    trade_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Unlink a trade from a journal entry.

    Args:
        user_id: User ID (query parameter)
        entry_id: Entry ID (path parameter)
        trade_id: Trade ID (path parameter)

    Returns:
        Success status
    """
    verify_user_access(user_id, current_user)

    try:
        success = await journal_service.unlink_trade(user_id, entry_id, trade_id)
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to unlink trade: {str(e)}")


@router.get("/trades/{trade_id}/entries")
async def get_entries_for_trade(
    user_id: str,
    trade_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Get all journal entries linked to a specific trade.

    Args:
        user_id: User ID (query parameter)
        trade_id: Trade ID (path parameter)

    Returns:
        List of linked entries
    """
    verify_user_access(user_id, current_user)

    try:
        entries = await journal_service.get_entries_for_trade(user_id, trade_id)
        return {"entries": entries}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get entries for trade: {str(e)}")


# ============================================
# Template Endpoints
# ============================================

@router.get("/templates", response_model=TemplateListResponse)
async def get_templates(
    user_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Get all templates (system + user's custom templates).

    Args:
        user_id: User ID (query parameter)

    Returns:
        List of templates
    """
    verify_user_access(user_id, current_user)

    try:
        templates = await journal_service.get_templates(user_id)
        return TemplateListResponse(
            templates=[TemplateResponse(**t) for t in templates],
            total=len(templates),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get templates: {str(e)}")


@router.post("/templates", response_model=TemplateResponse)
async def create_template(
    user_id: str,
    req: CreateTemplateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Create a custom template.

    Args:
        user_id: User ID (query parameter)
        req: Template data

    Returns:
        Created template
    """
    verify_user_access(user_id, current_user)

    try:
        template = await journal_service.create_template(
            user_id=user_id,
            name=req.name,
            content=req.content,
            description=req.description,
            category=req.category,
        )
        return TemplateResponse(**template)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create template: {str(e)}")


@router.put("/templates/{template_id}", response_model=TemplateResponse)
async def update_template(
    user_id: str,
    template_id: str,
    req: UpdateTemplateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Update a custom template (cannot update system templates).

    Args:
        user_id: User ID (query parameter)
        template_id: Template ID (path parameter)
        req: Update data

    Returns:
        Updated template
    """
    verify_user_access(user_id, current_user)

    try:
        updates = {}
        if req.name is not None:
            updates["name"] = req.name
        if req.content is not None:
            updates["content"] = req.content
        if req.description is not None:
            updates["description"] = req.description
        if req.category is not None:
            updates["category"] = req.category

        template = await journal_service.update_template(user_id, template_id, updates)
        if not template:
            raise HTTPException(status_code=404, detail="Template not found or cannot be modified")
        return TemplateResponse(**template)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update template: {str(e)}")


@router.delete("/templates/{template_id}")
async def delete_template(
    user_id: str,
    template_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Delete a custom template.

    Args:
        user_id: User ID (query parameter)
        template_id: Template ID (path parameter)

    Returns:
        Success status
    """
    verify_user_access(user_id, current_user)

    try:
        success = await journal_service.delete_template(user_id, template_id)
        if not success:
            raise HTTPException(status_code=404, detail="Template not found or cannot be deleted")
        return {"success": True, "template_id": template_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete template: {str(e)}")


# ============================================
# Mood Tracking Endpoints
# ============================================

@router.post("/moods", response_model=MoodResponse)
async def record_mood(
    user_id: str,
    req: RecordMoodRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Record a mood entry.

    Args:
        user_id: User ID (query parameter)
        req: Mood data

    Returns:
        Recorded mood
    """
    verify_user_access(user_id, current_user)

    try:
        mood = await journal_service.record_mood(
            user_id=user_id,
            mood=req.mood,
            context=req.context,
            entry_id=req.entry_id,
            intensity=req.intensity,
            notes=req.notes,
        )
        return MoodResponse(**mood)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record mood: {str(e)}")


@router.get("/moods/heatmap", response_model=MoodHeatmapResponse)
async def get_mood_heatmap(
    user_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Get mood data formatted for heatmap visualization.

    Args:
        user_id: User ID (query parameter)
        start_date: Start date (YYYY-MM-DD, default: 90 days ago)
        end_date: End date (YYYY-MM-DD, default: today)

    Returns:
        Heatmap data with mood distribution
    """
    verify_user_access(user_id, current_user)

    try:
        result = await journal_service.get_mood_heatmap(user_id, start_date, end_date)
        return MoodHeatmapResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get mood heatmap: {str(e)}")


@router.get("/moods/analytics", response_model=MoodAnalyticsResponse)
async def get_mood_analytics(
    user_id: str,
    days: int = 30,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Get mood analytics and trends.

    Args:
        user_id: User ID (query parameter)
        days: Number of days to analyze (default: 30)

    Returns:
        Mood analytics including averages and trends
    """
    verify_user_access(user_id, current_user)

    try:
        result = await journal_service.get_mood_analytics(user_id, days)
        return MoodAnalyticsResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get mood analytics: {str(e)}")


# ============================================
# Streak Endpoints
# ============================================

@router.get("/streaks", response_model=StreakResponse)
async def get_streak(
    user_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Get user's journaling streak data.

    Args:
        user_id: User ID (query parameter)

    Returns:
        Streak information
    """
    verify_user_access(user_id, current_user)

    try:
        streak = await journal_service.get_streak(user_id)
        return StreakResponse(**streak)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get streak: {str(e)}")


@router.post("/streaks/check", response_model=StreakResponse)
async def check_streak(
    user_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Check and update streak status.

    Args:
        user_id: User ID (query parameter)

    Returns:
        Updated streak information
    """
    verify_user_access(user_id, current_user)

    try:
        streak = await journal_service.check_and_update_streak(user_id)
        return StreakResponse(**streak)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check streak: {str(e)}")


# ============================================
# AI Integration Endpoints
# ============================================

@router.get("/ai/prompts", response_model=AIPromptsListResponse)
async def get_ai_prompts(
    user_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Get AI-generated journaling prompts based on recent trades.

    Args:
        user_id: User ID (query parameter)

    Returns:
        List of contextual prompts
    """
    verify_user_access(user_id, current_user)

    try:
        prompts = await journal_service.generate_ai_prompts(user_id)
        return AIPromptsListResponse(
            prompts=[AIPromptResponse(**p) for p in prompts]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get AI prompts: {str(e)}")


@router.get("/ai/context")
async def get_journal_context(
    user_id: str,
    limit: int = 5,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Get journal data formatted for AI coach context.

    Args:
        user_id: User ID (query parameter)
        limit: Number of recent entries to include

    Returns:
        Journal context for coach
    """
    verify_user_access(user_id, current_user)

    try:
        context = await journal_service.get_journal_context_for_coach(user_id, limit)
        return context
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get journal context: {str(e)}")


# ============================================
# Health Check
# ============================================

@router.get("/health")
async def health_check():
    """Health check for journal service."""
    return {"status": "ok", "service": "journal"}
