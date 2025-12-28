"""
CoachService: Main orchestrator for AI coaching.
Handles conversation flow, context building, LLM calls, and message persistence.
Now uses Supabase for all data storage (100% cloud-based, per-user isolated).
Includes memory extraction to learn from each conversation.
"""

import logging
import asyncio
from typing import List, Dict, Tuple
from sqlalchemy.orm import Session
from datetime import datetime
import uuid
import csv
from io import StringIO

from app.models import Trade
from app.services.claude_service import ClaudeService
from app.services.context_builder import ContextBuilder
from app.services.supabase_client import SupabaseClient
from app.services.memory_extractor import MemoryExtractor, ProgressTracker
from app.services.memory_manager import MemoryManager

logger = logging.getLogger(__name__)

# Coach system prompt template
COACH_SYSTEM_PROMPT_TEMPLATE = """You are an expert crypto trading coach with 10+ years of experience trading perpetuals and spot markets.
Your role is to help traders improve their performance through personalized, actionable coaching.

{user_context}

Your coaching approach:
1. ALWAYS reference the user's actual trades and specific patterns when giving advice
2. Give concrete, actionable advice tailored to their trading style - not generic tips
3. Focus on their identified weaknesses and how to fix them
4. Reinforce their strengths and encourage them to repeat winning patterns
5. Identify emotional trading signs (revenge trading, over-leveraging after losses, FOMO)
6. Use professional trading terminology naturally
7. Ask clarifying questions if you need more context
8. Be direct and honest about what needs improvement

When analyzing trades:
- Look at win/loss streaks for patterns
- Identify common mistakes (bad entries, poor exit discipline, risk management issues)
- Suggest specific improvements with examples from their actual trading
- Connect their trading patterns to their observed edge

Your goal: Help them become a more profitable, disciplined, and consistent trader.

Remember: You have access to all their trade data, notes, and historical advice. Use this to provide increasingly personalized coaching."""


class CoachService:
    """Service for managing trading coach conversations and responses."""

    def __init__(self):
        try:
            self.llm = ClaudeService()
        except RuntimeError as e:
            logger.warning(f"ClaudeService not available: {e}")
            self.llm = None

        self.supabase = SupabaseClient()
        self.memory_extractor = MemoryExtractor()
        self.memory_manager = MemoryManager()
        self.progress_tracker = ProgressTracker()
        self.context_builder = ContextBuilder()

    async def create_conversation(self, user_id: str, db: Session) -> str:
        """
        Create a new conversation for a user in Supabase.

        Args:
            user_id: User ID
            db: Database session (kept for compatibility, not used)

        Returns:
            Conversation ID
        """
        try:
            result = await self.supabase.create_conversation(user_id)
            logger.info(f"Created conversation {result['id']} for user {user_id} in Supabase")
            return result["id"]
        except Exception as e:
            logger.error(f"Error creating conversation: {e}")
            raise

    async def send_message(
        self, user_id: str, conversation_id: str, user_message: str, db: Session
    ) -> Tuple[str, Dict]:
        """
        Send a message and get coach response.
        Stores everything in Supabase (conversations, messages).

        Args:
            user_id: User ID
            conversation_id: Conversation ID
            user_message: User's message text
            db: Database session

        Returns:
            Tuple of (response_text, response_metadata)

        Raises:
            ValueError: If conversation not found or doesn't belong to user
            RuntimeError: If LLM fails
        """
        if not self.llm:
            raise RuntimeError("AI Coach is not available. Anthropic API key not configured.")

        try:
            # Get conversation from Supabase to verify it belongs to user
            conversation = await self.supabase.get_conversation(conversation_id, user_id)

            # Save user message to Supabase
            user_msg_tokens = ClaudeService.estimate_tokens(user_message)
            user_msg_obj = await self.supabase.add_message(
                conversation_id=conversation_id,
                role="user",
                content=user_message,
                tokens_input=user_msg_tokens,
                tokens_output=0,
            )
            logger.info(f"User message saved to Supabase: {user_msg_obj['id']}")

            # Build user context with semantic search for relevance
            # This now includes memories, goals, episodes, and related past conversations
            context = await self.context_builder.get_relevant_context_for_message(
                user_id=user_id,
                message=user_message,
                db=db,
            )

            # Format message history from Supabase messages
            message_history = [
                {"role": msg["role"], "content": msg["content"]} for msg in conversation["messages"]
            ]
            message_history.append({"role": "user", "content": user_message})

            # Get coach response from Claude (system prompt and context handled internally)
            response_text, input_tokens, output_tokens = await self.llm.get_coach_response(
                system_prompt=None,  # Use ClaudeService's built-in elite coach prompt
                messages=message_history,
                user_context=context,  # Pass context directly, ClaudeService formats it
            )

            # Save assistant response to Supabase
            assistant_msg_obj = await self.supabase.add_message(
                conversation_id=conversation_id,
                role="assistant",
                content=response_text,
                tokens_input=input_tokens,
                tokens_output=output_tokens,
            )
            logger.info(f"Coach response saved to Supabase: {assistant_msg_obj['id']}")

            # Calculate cost
            cost = ClaudeService.calculate_cost(input_tokens, output_tokens)

            # Trigger memory extraction in background (don't wait for it)
            asyncio.create_task(
                self._extract_memories_from_exchange(
                    user_id=user_id,
                    conversation_id=conversation_id,
                    user_message=user_message,
                    coach_response=response_text,
                    context=context,
                )
            )

            return response_text, {
                "message_id": assistant_msg_obj["id"],
                "tokens_used": {
                    "input": input_tokens,
                    "output": output_tokens,
                },
                "cost_usd": round(cost, 6),
            }

        except Exception as e:
            logger.error(f"Error sending message: {e}")
            raise

    async def get_conversation(self, user_id: str, conversation_id: str, db: Session) -> Dict:
        """
        Get conversation with all messages from Supabase.

        Args:
            user_id: User ID
            conversation_id: Conversation ID
            db: Database session

        Returns:
            Conversation dictionary with messages
        """
        try:
            conversation = await self.supabase.get_conversation(conversation_id, user_id)

            return {
                "id": conversation["id"],
                "title": conversation.get("title") or "Untitled",
                "created_at": conversation["created_at"],
                "updated_at": conversation["updated_at"],
                "message_count": len(conversation.get("messages", [])),
                "messages": [
                    {
                        "id": msg["id"],
                        "role": msg["role"],
                        "content": msg["content"],
                        "tokens_used": {
                            "input": msg.get("input_tokens", 0),
                            "output": msg.get("output_tokens", 0),
                        },
                        "created_at": msg["created_at"],
                    }
                    for msg in conversation.get("messages", [])
                ],
            }

        except Exception as e:
            logger.error(f"Error getting conversation: {e}")
            raise

    async def list_conversations(
        self, user_id: str, db: Session, limit: int = 20, offset: int = 0, include_deleted: bool = False
    ) -> Dict:
        """
        List user's conversations from Supabase.

        Args:
            user_id: User ID
            db: Database session
            limit: Number of conversations to return
            offset: Offset for pagination
            include_deleted: Whether to include soft-deleted conversations

        Returns:
            Dictionary with conversations list and total count
        """
        try:
            conversations = await self.supabase.list_conversations(user_id, limit, offset)

            # Filter out deleted conversations if needed
            if not include_deleted:
                conversations = [c for c in conversations if not c.get("deleted_at")]

            return {
                "conversations": [
                    {
                        "id": c["id"],
                        "title": c.get("title") or "Untitled",
                        "created_at": c["created_at"],
                        "updated_at": c["updated_at"],
                        "message_count": 0,  # Could fetch from Supabase if needed
                        "deleted": bool(c.get("deleted_at")),
                    }
                    for c in conversations
                ],
                "total": len(conversations),
                "limit": limit,
                "offset": offset,
            }

        except Exception as e:
            logger.error(f"Error listing conversations: {e}")
            raise

    async def delete_conversation(self, user_id: str, conversation_id: str, db: Session) -> bool:
        """
        Soft delete a conversation in Supabase.

        Args:
            user_id: User ID
            conversation_id: Conversation ID
            db: Database session

        Returns:
            True if successful
        """
        try:
            await self.supabase.delete_conversation(conversation_id, user_id)
            logger.info(f"Soft deleted conversation {conversation_id} in Supabase")
            return True

        except Exception as e:
            logger.error(f"Error deleting conversation: {e}")
            raise

    async def get_user_insights(self, user_id: str, db: Session) -> Dict:
        """
        Get coach's learned insights about user from Supabase.

        Args:
            user_id: User ID
            db: Database session

        Returns:
            CoachInsight dictionary or empty if not yet created
        """
        try:
            insight = await self.supabase.get_insight(user_id)

            if not insight:
                return {
                    "status": "no_insights",
                    "message": "Coach is still learning about your trading. Keep trading and chatting!",
                }

            return {
                "user_id": user_id,
                "trading_style": insight.get("trading_style"),
                "risk_profile": insight.get("risk_profile"),
                "edge_observed": insight.get("edge_observed"),
                "strengths": insight.get("strengths") or [],
                "weaknesses": insight.get("weaknesses") or [],
                "favorite_symbols": insight.get("favorite_symbols") or [],
                "favorite_timeframes": insight.get("favorite_timeframes") or [],
                "total_trades_analyzed": insight.get("total_trades_analyzed", 0),
                "last_updated": insight.get("last_updated"),
            }

        except Exception as e:
            logger.error(f"Error getting user insights: {e}")
            raise

    async def import_trades(self, user_id: str, csv_content: str, db: Session) -> Dict:
        """
        Import trades from CSV content into Supabase.

        Args:
            user_id: User ID to associate trades with
            csv_content: CSV file content as string
            db: Database session

        Returns:
            Dictionary with import results

        Raises:
            ValueError: If CSV format is invalid
        """
        try:
            # Parse CSV
            csv_reader = csv.DictReader(StringIO(csv_content))
            trades_imported = 0
            trades_skipped = 0
            errors = []

            for row_idx, row in enumerate(csv_reader, start=2):  # Start at 2 (header is row 1)
                try:
                    # Parse trade data (use new field names for Supabase)
                    entry_time_str = row.get("entry_time", row.get("date", "")).strip()
                    exit_time_str = row.get("exit_time", "").strip()
                    symbol = row.get("symbol", "").strip()
                    side = row.get("side", "").strip().upper()
                    entry_price = float(row.get("entry_price", row.get("entry", 0)))
                    exit_price = float(row.get("exit_price", row.get("exit", 0)))
                    quantity = float(row.get("quantity", row.get("size", 0)))
                    leverage = float(row.get("leverage", 1)) if row.get("leverage") else None
                    fees = float(row.get("fees", 0)) if row.get("fees") else None
                    pnl_usd = float(row.get("pnl_usd", 0)) if row.get("pnl_usd") else None
                    pnl_percent = float(row.get("pnl_percent", row.get("pnl_pct", 0))) if row.get("pnl_percent") or row.get("pnl_pct") else None
                    notes = row.get("notes", "").strip() or None
                    exchange = row.get("exchange", "").strip() or None

                    # Validate required fields
                    if not all([entry_time_str, symbol, side, entry_price, quantity]):
                        errors.append(f"Row {row_idx}: Missing required fields")
                        trades_skipped += 1
                        continue

                    # Parse dates
                    try:
                        entry_time = datetime.fromisoformat(entry_time_str)
                    except ValueError:
                        errors.append(f"Row {row_idx}: Invalid entry_time format: {entry_time_str}")
                        trades_skipped += 1
                        continue

                    exit_time = None
                    if exit_time_str:
                        try:
                            exit_time = datetime.fromisoformat(exit_time_str)
                        except ValueError:
                            logger.warning(f"Row {row_idx}: Invalid exit_time format: {exit_time_str}")

                    # Create trade in Supabase
                    trade = Trade(
                        id=str(uuid.uuid4()),
                        user_id=user_id,
                        symbol=symbol,
                        side=side,
                        entry_price=entry_price,
                        exit_price=exit_price if exit_price > 0 else None,
                        entry_time=entry_time,
                        exit_time=exit_time,
                        quantity=quantity,
                        leverage=leverage,
                        fees=fees,
                        pnl_usd=pnl_usd,
                        pnl_percent=pnl_percent,
                        notes=notes,
                        exchange=exchange,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow(),
                    )
                    db.add(trade)
                    trades_imported += 1

                except (ValueError, KeyError) as e:
                    errors.append(f"Row {row_idx}: {str(e)}")
                    trades_skipped += 1
                    continue

            db.commit()
            logger.info(f"Imported {trades_imported} trades for user {user_id}")

            return {
                "success": True,
                "trades_imported": trades_imported,
                "trades_skipped": trades_skipped,
                "errors": errors[:10],  # Return first 10 errors
            }

        except Exception as e:
            logger.error(f"Error importing trades: {e}")
            db.rollback()
            raise

    async def _extract_memories_from_exchange(
        self,
        user_id: str,
        conversation_id: str,
        user_message: str,
        coach_response: str,
        context: Dict,
    ) -> None:
        """
        Extract memories from a message exchange in the background.
        This runs asynchronously after each coach response.
        """
        try:
            # Build messages list for extraction
            messages = [
                {"role": "user", "content": user_message},
                {"role": "assistant", "content": coach_response},
            ]

            # Extract user context for the extraction
            user_context = {
                "statistics": context.get("statistics", {}),
                "recent_patterns": context.get("patterns", [])[:3],
            }

            # Run extraction
            result = await self.memory_extractor.extract_from_conversation(
                user_id=user_id,
                conversation_id=conversation_id,
                messages=messages,
                user_context=user_context,
            )

            if result.get("error"):
                logger.warning(f"Memory extraction error: {result['error']}")
            else:
                memories_created = len(result.get("memories_created", []))
                episodes_created = len(result.get("episodes_created", []))
                memories_updated = len(result.get("memories_updated", []))

                if memories_created or episodes_created or memories_updated:
                    logger.info(
                        f"Memory extraction for {user_id}: "
                        f"{memories_created} memories, "
                        f"{episodes_created} episodes, "
                        f"{memories_updated} updates"
                    )

        except Exception as e:
            logger.error(f"Error in background memory extraction: {e}")

    async def get_user_progress(self, user_id: str, db: Session) -> Dict:
        """
        Get user's learning progress summary from the memory system.

        Args:
            user_id: User ID
            db: Database session

        Returns:
            Progress summary including strengths, weaknesses, goals, etc.
        """
        try:
            progress = await self.progress_tracker.get_progress_summary(user_id)
            return progress
        except Exception as e:
            logger.error(f"Error getting user progress: {e}")
            return {"error": str(e)}

    async def get_user_memories(self, user_id: str, db: Session) -> Dict:
        """
        Get all memories the coach has learned about the user.

        Args:
            user_id: User ID
            db: Database session

        Returns:
            Dictionary of memories organized by type
        """
        try:
            memories = await self.memory_manager.get_memory_context(user_id)
            return memories
        except Exception as e:
            logger.error(f"Error getting user memories: {e}")
            return {"error": str(e)}

    async def add_user_goal(
        self,
        user_id: str,
        goal_type: str,
        title: str,
        description: str = None,
        target_value: float = None,
        baseline_value: float = None,
        deadline: datetime = None,
        db: Session = None,
    ) -> Dict:
        """
        Add a new trading goal for the user.

        Args:
            user_id: User ID
            goal_type: Type of goal (win_rate, pnl, risk, etc.)
            title: Goal title
            description: Optional description
            target_value: Target value to achieve
            baseline_value: Starting value
            deadline: Optional deadline
            db: Database session

        Returns:
            Created goal data
        """
        try:
            goal = await self.memory_manager.create_goal(
                user_id=user_id,
                goal_type=goal_type,
                title=title,
                description=description,
                target_value=target_value,
                baseline_value=baseline_value,
                deadline=deadline,
            )

            if goal:
                return {
                    "id": goal.id,
                    "goal_type": goal.goal_type,
                    "title": goal.title,
                    "description": goal.description,
                    "target_value": goal.target_value,
                    "baseline_value": goal.baseline_value,
                    "deadline": str(goal.deadline) if goal.deadline else None,
                    "status": goal.status,
                }

            return {"error": "Failed to create goal"}

        except Exception as e:
            logger.error(f"Error adding user goal: {e}")
            return {"error": str(e)}

    async def update_goal_progress(
        self,
        user_id: str,
        goal_id: str,
        current_value: float,
        notes: str = None,
        db: Session = None,
    ) -> Dict:
        """
        Update progress on a user's goal.

        Args:
            user_id: User ID
            goal_id: Goal ID
            current_value: Current progress value
            notes: Optional notes
            db: Database session

        Returns:
            Updated goal data
        """
        try:
            success = await self.memory_manager.update_goal(
                goal_id=goal_id,
                current_value=current_value,
                notes=notes,
            )

            if success:
                return {"success": True, "goal_id": goal_id}

            return {"error": "Failed to update goal"}

        except Exception as e:
            logger.error(f"Error updating goal progress: {e}")
            return {"error": str(e)}
