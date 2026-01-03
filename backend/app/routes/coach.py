"""
Coach API routes for trading coach conversations, insights, reports, and patterns.
Enhanced for the AI Trading Coach with proactive features.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime, timedelta

from app.db import get_db
from app.services.coach_service import CoachService
from app.services.proactive_coach import ProactiveCoach
from app.services.report_generator import ReportGenerator
from app.services.pattern_detector import PatternDetector
from app.services.supabase_client import SupabaseClient
from app.services.supabase_service import SupabaseService
from app.auth import get_current_user, verify_user_access, AuthenticatedUser

router = APIRouter(prefix="/api/coach", tags=["coach"])

# Pydantic models for request/response
class CreateConversationRequest(BaseModel):
    user_id: str


class CreateConversationResponse(BaseModel):
    conversation_id: str
    created_at: str


class SendMessageRequest(BaseModel):
    content: str
    user_id: Optional[str] = None  # Optional - user_id comes from query param


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    tokens_used: Optional[dict] = None
    created_at: str


class ConversationResponse(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int
    messages: List[MessageResponse]


class ConversationListItem(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int
    deleted: bool = False


class ConversationListResponse(BaseModel):
    conversations: List[ConversationListItem]
    total: int
    limit: int
    offset: int


class DeleteConversationResponse(BaseModel):
    success: bool
    deleted_at: str


class UserInsightsResponse(BaseModel):
    status: Optional[str] = None
    message: Optional[str] = None
    user_id: Optional[str] = None
    trading_style: Optional[str] = None
    risk_profile: Optional[str] = None
    edge_observed: Optional[str] = None
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None
    favorite_symbols: Optional[List[str]] = None
    favorite_timeframes: Optional[List[str]] = None
    total_trades_analyzed: Optional[int] = None
    last_updated: Optional[str] = None


class TradeImportResponse(BaseModel):
    success: bool
    trades_imported: int
    trades_skipped: int
    errors: List[str]


# Proactive Insights Models
class ProactiveInsightResponse(BaseModel):
    id: str
    insight_type: str
    title: str
    content: str
    severity: str
    user_id: Optional[str] = None
    trade_id: Optional[str] = None
    metadata: Optional[dict] = None
    created_at: str
    is_read: bool


class InsightsListResponse(BaseModel):
    insights: List[ProactiveInsightResponse]
    total: int
    unread_count: int


class MarkInsightReadResponse(BaseModel):
    success: bool
    insight_id: str


# Reports Models
class ReportResponse(BaseModel):
    id: str
    report_type: str
    title: str
    summary: str
    content: str
    metrics: Optional[dict] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    created_at: str


class ReportsListResponse(BaseModel):
    reports: List[ReportResponse]
    total: int


# Patterns Models
class PatternResponse(BaseModel):
    pattern_type: str
    description: str
    confidence: float
    impact: str
    trade_count: int
    metadata: Optional[dict] = None


class PatternsListResponse(BaseModel):
    patterns: List[PatternResponse]
    total: int


# Preferences Models
class NotificationPreferencesRequest(BaseModel):
    daily_summary_enabled: Optional[bool] = None
    daily_summary_time: Optional[str] = None
    weekly_report_enabled: Optional[bool] = None
    trade_review_enabled: Optional[bool] = None
    pattern_alerts_enabled: Optional[bool] = None
    mistake_warnings_enabled: Optional[bool] = None


class NotificationPreferencesResponse(BaseModel):
    user_id: str
    daily_summary_enabled: bool = True
    daily_summary_time: str = "21:00"
    weekly_report_enabled: bool = True
    trade_review_enabled: bool = True
    pattern_alerts_enabled: bool = True
    mistake_warnings_enabled: bool = True


# Trade Review Models
class TradeReviewRequest(BaseModel):
    trade_id: str


class TradeReviewResponse(BaseModel):
    trade_id: str
    review: str
    patterns_identified: List[str]
    suggestions: List[str]
    score: Optional[float] = None


# Initialize services
coach_service = CoachService()
proactive_coach = ProactiveCoach()
report_generator = ReportGenerator()
pattern_detector = PatternDetector()
supabase_client = SupabaseClient()
supabase_service = SupabaseService()


@router.post("/conversations", response_model=CreateConversationResponse)
async def create_conversation(
    req: CreateConversationRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Create a new conversation for a user.

    Args:
        req: Request with user_id

    Returns:
        Conversation ID and creation timestamp
    """
    # Verify the authenticated user can only create conversations for themselves
    verify_user_access(req.user_id, current_user)

    try:
        conversation_id = await coach_service.create_conversation(req.user_id, db)

        return CreateConversationResponse(
            conversation_id=conversation_id,
            created_at=datetime.utcnow().isoformat(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create conversation: {str(e)}")


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    user_id: str,
    limit: int = 20,
    offset: int = 0,
    include_deleted: bool = False,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    List user's conversations.

    Args:
        user_id: User ID (query parameter)
        limit: Number of conversations to return (default 20)
        offset: Pagination offset (default 0)
        include_deleted: Include soft-deleted conversations (default false)

    Returns:
        List of conversations with metadata
    """
    verify_user_access(user_id, current_user)

    try:
        result = await coach_service.list_conversations(user_id, db, limit, offset, include_deleted)
        return ConversationListResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list conversations: {str(e)}")


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    user_id: str,
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Get a conversation with all its messages.

    Args:
        user_id: User ID (query parameter)
        conversation_id: Conversation ID (path parameter)

    Returns:
        Conversation with full message history
    """
    verify_user_access(user_id, current_user)

    try:
        result = await coach_service.get_conversation(user_id, conversation_id, db)
        return ConversationResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get conversation: {str(e)}")


@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse)
async def send_message(
    user_id: str,
    conversation_id: str,
    req: SendMessageRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Send a message in a conversation and get coach response.

    Args:
        user_id: User ID (query parameter)
        conversation_id: Conversation ID (path parameter)
        req: Request with message content

    Returns:
        Coach response message
    """
    verify_user_access(user_id, current_user)

    try:
        response_text, metadata = await coach_service.send_message(
            user_id, conversation_id, req.content, db
        )

        return MessageResponse(
            id=metadata["message_id"],
            role="assistant",
            content=response_text,
            tokens_used=metadata["tokens_used"],
            created_at=metadata.get("created_at", datetime.utcnow().isoformat()),
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")


@router.delete("/conversations/{conversation_id}", response_model=DeleteConversationResponse)
async def delete_conversation(
    user_id: str,
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Soft delete a conversation.

    Args:
        user_id: User ID (query parameter)
        conversation_id: Conversation ID (path parameter)

    Returns:
        Success status and deletion timestamp
    """
    verify_user_access(user_id, current_user)

    try:
        await coach_service.delete_conversation(user_id, conversation_id, db)

        return DeleteConversationResponse(
            success=True,
            deleted_at=datetime.utcnow().isoformat(),
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete conversation: {str(e)}")


@router.get("/insights/{user_id}", response_model=UserInsightsResponse)
async def get_user_insights(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Get coach's learned insights about the user.

    Args:
        user_id: User ID

    Returns:
        Coach insights including trading style, patterns, strengths, weaknesses
    """
    verify_user_access(user_id, current_user)

    try:
        result = await coach_service.get_user_insights(user_id, db)
        return UserInsightsResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get insights: {str(e)}")


@router.post("/import-trades", response_model=TradeImportResponse)
async def import_trades(
    user_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Import trades from a CSV file.

    Args:
        user_id: User ID to associate trades with
        file: CSV file to import

    Returns:
        Trade import results with counts and errors
    """
    try:
        # Read file content
        content = await file.read()
        csv_content = content.decode("utf-8")

        # Import trades
        result = await coach_service.import_trades(user_id, csv_content, db)
        return TradeImportResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to import trades: {str(e)}")


@router.get("/health")
async def health_check():
    """Health check for coach service."""
    return {"status": "ok", "service": "coach"}


# ============================================
# Proactive Insights Endpoints
# ============================================

@router.get("/insights/pending/{user_id}", response_model=InsightsListResponse)
async def get_pending_insights(
    user_id: str,
    limit: int = 20,
    unread_only: bool = False,
    db: Session = Depends(get_db),
):
    """
    Get pending proactive insights for a user.

    Args:
        user_id: User ID
        limit: Maximum number of insights to return
        unread_only: Only return unread insights

    Returns:
        List of proactive insights with counts
    """
    try:
        insights = await supabase_client.get_proactive_insights(user_id, limit, unread_only)
        unread = [i for i in insights if not i.get("is_read", False)]

        return InsightsListResponse(
            insights=[
                ProactiveInsightResponse(
                    id=i["id"],
                    insight_type=i["insight_type"],
                    title=i["title"],
                    content=i["content"],
                    severity=i.get("severity", "info"),
                    user_id=i.get("user_id"),
                    trade_id=i.get("trade_id"),
                    metadata=i.get("metadata"),
                    created_at=i["created_at"],
                    is_read=i.get("is_read", False),
                )
                for i in insights
            ],
            total=len(insights),
            unread_count=len(unread),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get insights: {str(e)}")


@router.post("/insights/{insight_id}/read", response_model=MarkInsightReadResponse)
async def mark_insight_read(
    user_id: str,
    insight_id: str,
    db: Session = Depends(get_db),
):
    """
    Mark a proactive insight as read.

    Args:
        user_id: User ID
        insight_id: Insight ID

    Returns:
        Success status
    """
    try:
        success = await supabase_client.update_proactive_insight(
            insight_id, user_id, {"is_read": True}
        )

        if not success:
            raise HTTPException(status_code=404, detail="Insight not found")

        return MarkInsightReadResponse(success=True, insight_id=insight_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark insight as read: {str(e)}")


@router.delete("/insights/{insight_id}")
async def dismiss_insight(
    user_id: str,
    insight_id: str,
    db: Session = Depends(get_db),
):
    """
    Dismiss (delete) a proactive insight.

    Args:
        user_id: User ID
        insight_id: Insight ID

    Returns:
        Success status
    """
    try:
        success = await supabase_client.delete_proactive_insight(insight_id, user_id)

        if not success:
            raise HTTPException(status_code=404, detail="Insight not found")

        return {"success": True, "insight_id": insight_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to dismiss insight: {str(e)}")


# ============================================
# Reports Endpoints
# ============================================

@router.get("/reports/daily/{user_id}", response_model=ReportsListResponse)
async def get_daily_reports(
    user_id: str,
    limit: int = 7,
    db: Session = Depends(get_db),
):
    """
    Get daily trading reports for a user.

    Args:
        user_id: User ID
        limit: Number of reports to return (default 7 = last week)

    Returns:
        List of daily reports
    """
    try:
        reports = await supabase_client.get_reports(user_id, "daily", limit)

        return ReportsListResponse(
            reports=[
                ReportResponse(
                    id=r.get("id", ""),
                    report_type=r.get("report_type", "daily"),
                    title=r.get("title", ""),
                    summary=r.get("summary", ""),
                    content=r.get("content", ""),
                    metrics=r.get("metrics"),
                    period_start=r.get("period_start"),
                    period_end=r.get("period_end"),
                    created_at=r.get("created_at", ""),
                )
                for r in reports
            ],
            total=len(reports),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get daily reports: {str(e)}")


@router.get("/reports/weekly/{user_id}", response_model=ReportsListResponse)
async def get_weekly_reports(
    user_id: str,
    limit: int = 4,
    db: Session = Depends(get_db),
):
    """
    Get weekly trading reports for a user.

    Args:
        user_id: User ID
        limit: Number of reports to return (default 4 = last month)

    Returns:
        List of weekly reports
    """
    try:
        reports = await supabase_client.get_reports(user_id, "weekly", limit)

        return ReportsListResponse(
            reports=[
                ReportResponse(
                    id=r.get("id", ""),
                    report_type=r.get("report_type", "weekly"),
                    title=r.get("title", ""),
                    summary=r.get("summary", ""),
                    content=r.get("content", ""),
                    metrics=r.get("metrics"),
                    period_start=r.get("period_start"),
                    period_end=r.get("period_end"),
                    created_at=r.get("created_at", ""),
                )
                for r in reports
            ],
            total=len(reports),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get weekly reports: {str(e)}")


@router.post("/reports/generate/daily/{user_id}")
async def generate_daily_report(
    user_id: str,
    date: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Generate a daily report for a specific date.

    Args:
        user_id: User ID
        date: Date in YYYY-MM-DD format (default: today)

    Returns:
        Generated report
    """
    try:
        # Parse date or use today
        if date:
            report_date = datetime.fromisoformat(date)
        else:
            report_date = datetime.utcnow()

        # Get trades for the day
        trades = await supabase_service.get_user_trades(user_id, limit=1000)

        # Filter to the specific day
        day_trades = [
            t for t in trades
            if t.get("date", "").startswith(report_date.strftime("%Y-%m-%d"))
        ]

        if not day_trades:
            return {
                "success": False,
                "message": f"No trades found for {report_date.strftime('%Y-%m-%d')}"
            }

        # Generate report
        report = await report_generator.generate_daily_report(
            user_id=user_id,
            trades=day_trades,
            date=report_date,
        )

        return {
            "success": True,
            "report": report.to_dict() if report else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate daily report: {str(e)}")


# ============================================
# Trade Review Endpoints
# ============================================

@router.get("/trades/{trade_id}/review")
async def get_trade_review(
    user_id: str,
    trade_id: str,
    db: Session = Depends(get_db),
):
    """
    Get AI review for a specific trade.

    Args:
        user_id: User ID
        trade_id: Trade ID to review

    Returns:
        Trade review with analysis and suggestions
    """
    try:
        # Get the trade
        trades = await supabase_service.get_user_trades(user_id, limit=500)

        trade = None
        trade_index = -1
        for i, t in enumerate(trades):
            if t.get("id") == trade_id:
                trade = t
                trade_index = i
                break

        if not trade:
            raise HTTPException(status_code=404, detail="Trade not found")

        # Get context trades (before and after)
        context_trades = trades[max(0, trade_index-10):trade_index+10]

        # Generate review
        report = await report_generator.generate_trade_review(
            user_id=user_id,
            trade=trade,
            context_trades=context_trades,
        )

        return {
            "trade_id": trade_id,
            "trade": trade,
            "review": report.to_dict() if report else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get trade review: {str(e)}")


# ============================================
# Patterns Endpoints
# ============================================

@router.get("/patterns/{user_id}", response_model=PatternsListResponse)
async def get_user_patterns(
    user_id: str,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """
    Get detected trading patterns for a user.

    Args:
        user_id: User ID
        limit: Maximum number of patterns to return

    Returns:
        List of detected patterns
    """
    try:
        # Get trades for pattern analysis
        trades = await supabase_service.get_user_trades(user_id, limit=500)

        if not trades:
            return PatternsListResponse(patterns=[], total=0)

        # Detect patterns
        patterns = await pattern_detector.analyze_patterns(trades)

        return PatternsListResponse(
            patterns=[
                PatternResponse(
                    pattern_type=p.pattern_type,
                    description=p.description,
                    confidence=p.confidence,
                    impact=p.impact,
                    trade_count=p.trade_count,
                    metadata=p.metadata,
                )
                for p in patterns[:limit]
            ],
            total=len(patterns),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get patterns: {str(e)}")


# ============================================
# Preferences Endpoints
# ============================================

@router.get("/preferences/{user_id}", response_model=NotificationPreferencesResponse)
async def get_preferences(
    user_id: str,
    db: Session = Depends(get_db),
):
    """
    Get notification preferences for a user.

    Args:
        user_id: User ID

    Returns:
        User's notification preferences
    """
    try:
        prefs = await supabase_client.get_notification_preferences(user_id)

        if not prefs:
            # Return defaults if no preferences set
            return NotificationPreferencesResponse(user_id=user_id)

        return NotificationPreferencesResponse(
            user_id=user_id,
            daily_summary_enabled=prefs.get("daily_summary_enabled", True),
            daily_summary_time=prefs.get("daily_summary_time", "21:00"),
            weekly_report_enabled=prefs.get("weekly_report_enabled", True),
            trade_review_enabled=prefs.get("trade_review_enabled", True),
            pattern_alerts_enabled=prefs.get("pattern_alerts_enabled", True),
            mistake_warnings_enabled=prefs.get("mistake_warnings_enabled", True),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get preferences: {str(e)}")


@router.put("/preferences/{user_id}", response_model=NotificationPreferencesResponse)
async def update_preferences(
    user_id: str,
    req: NotificationPreferencesRequest,
    db: Session = Depends(get_db),
):
    """
    Update notification preferences for a user.

    Args:
        user_id: User ID
        req: Preferences to update

    Returns:
        Updated preferences
    """
    try:
        # Build update dict with only provided fields
        update_data = {}
        if req.daily_summary_enabled is not None:
            update_data["daily_summary_enabled"] = req.daily_summary_enabled
        if req.daily_summary_time is not None:
            update_data["daily_summary_time"] = req.daily_summary_time
        if req.weekly_report_enabled is not None:
            update_data["weekly_report_enabled"] = req.weekly_report_enabled
        if req.trade_review_enabled is not None:
            update_data["trade_review_enabled"] = req.trade_review_enabled
        if req.pattern_alerts_enabled is not None:
            update_data["pattern_alerts_enabled"] = req.pattern_alerts_enabled
        if req.mistake_warnings_enabled is not None:
            update_data["mistake_warnings_enabled"] = req.mistake_warnings_enabled

        result = await supabase_client.upsert_notification_preferences(user_id, update_data)

        return NotificationPreferencesResponse(
            user_id=user_id,
            daily_summary_enabled=result.get("daily_summary_enabled", True),
            daily_summary_time=result.get("daily_summary_time", "21:00"),
            weekly_report_enabled=result.get("weekly_report_enabled", True),
            trade_review_enabled=result.get("trade_review_enabled", True),
            pattern_alerts_enabled=result.get("pattern_alerts_enabled", True),
            mistake_warnings_enabled=result.get("mistake_warnings_enabled", True),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update preferences: {str(e)}")


# ============================================
# Context Endpoint (for debugging/testing)
# ============================================

@router.get("/context/{user_id}")
async def get_user_context(
    user_id: str,
    db: Session = Depends(get_db),
):
    """
    Get the full user context that would be sent to the AI coach.
    Useful for debugging and understanding what data the coach has access to.

    Args:
        user_id: User ID

    Returns:
        Full user context dictionary
    """
    try:
        from app.services.context_builder import ContextBuilder
        context = await ContextBuilder.build_user_context(user_id, db)
        return context
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to build context: {str(e)}")


# ============================================
# Memory System Endpoints (NEW)
# ============================================

@router.get("/memories/{user_id}")
async def get_user_memories(
    user_id: str,
    db: Session = Depends(get_db),
):
    """
    Get all memories the coach has learned about the user.

    Memories include:
    - Trading style observations
    - Strengths and weaknesses
    - Goals and rules
    - Emotional triggers
    - Preferences
    - Key breakthroughs

    Args:
        user_id: User ID

    Returns:
        Dictionary of memories organized by type
    """
    try:
        memories = await coach_service.get_user_memories(user_id, db)
        return memories
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get memories: {str(e)}")


@router.get("/progress/{user_id}")
async def get_user_progress(
    user_id: str,
    db: Session = Depends(get_db),
):
    """
    Get user's learning progress summary from the memory system.

    Includes:
    - Total memories and episodes
    - Active goals
    - Strengths (sorted by confidence)
    - Areas improving
    - Areas needing work
    - Recent breakthroughs
    - Recent key episodes

    Args:
        user_id: User ID

    Returns:
        Progress summary
    """
    try:
        progress = await coach_service.get_user_progress(user_id, db)
        return progress
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get progress: {str(e)}")


class CreateGoalRequest(BaseModel):
    goal_type: str  # win_rate, pnl, risk, consistency, psychology, habit, skill, custom
    title: str
    description: Optional[str] = None
    target_value: Optional[float] = None
    baseline_value: Optional[float] = None
    deadline: Optional[str] = None  # ISO format date


@router.post("/goals/{user_id}")
async def create_user_goal(
    user_id: str,
    req: CreateGoalRequest,
    db: Session = Depends(get_db),
):
    """
    Create a new trading goal for the user.

    Goal types:
    - win_rate: Improve win rate
    - pnl: Achieve PnL target
    - risk: Reduce risk/leverage
    - consistency: Trade more consistently
    - psychology: Improve emotional control
    - habit: Build/break a habit
    - skill: Learn a skill
    - custom: User-defined

    Args:
        user_id: User ID
        req: Goal details

    Returns:
        Created goal data
    """
    try:
        deadline = None
        if req.deadline:
            deadline = datetime.fromisoformat(req.deadline)

        result = await coach_service.add_user_goal(
            user_id=user_id,
            goal_type=req.goal_type,
            title=req.title,
            description=req.description,
            target_value=req.target_value,
            baseline_value=req.baseline_value,
            deadline=deadline,
            db=db,
        )

        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create goal: {str(e)}")


class UpdateGoalRequest(BaseModel):
    current_value: float
    notes: Optional[str] = None


@router.put("/goals/{user_id}/{goal_id}")
async def update_goal_progress(
    user_id: str,
    goal_id: str,
    req: UpdateGoalRequest,
    db: Session = Depends(get_db),
):
    """
    Update progress on a user's goal.

    Args:
        user_id: User ID
        goal_id: Goal ID
        req: Progress update

    Returns:
        Updated goal status
    """
    try:
        result = await coach_service.update_goal_progress(
            user_id=user_id,
            goal_id=goal_id,
            current_value=req.current_value,
            notes=req.notes,
            db=db,
        )

        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update goal: {str(e)}")


# ============================================
# Outcome Tracking Endpoints (NEW)
# ============================================

@router.get("/outcomes/{user_id}")
async def get_outcome_statistics(
    user_id: str,
    db: Session = Depends(get_db),
):
    """
    Get statistics about how effective the coach's advice has been.

    Tracks whether advice led to improvements in trading metrics.

    Args:
        user_id: User ID

    Returns:
        Outcome statistics including effectiveness rates
    """
    try:
        from app.services.outcome_tracker import OutcomeTracker
        tracker = OutcomeTracker()
        stats = await tracker.get_outcome_statistics(user_id)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get outcome statistics: {str(e)}")


@router.get("/outcomes/{user_id}/effective")
async def get_most_effective_advice(
    user_id: str,
    db: Session = Depends(get_db),
):
    """
    Get the types of advice that have been most effective for this user.

    Helps understand which categories of advice work best.

    Args:
        user_id: User ID

    Returns:
        List of advice categories sorted by effectiveness
    """
    try:
        from app.services.outcome_tracker import OutcomeTracker
        tracker = OutcomeTracker()
        effective = await tracker.get_most_effective_advice_types(user_id)
        return {"effective_categories": effective}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get effective advice: {str(e)}")
