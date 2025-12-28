"""
Journal Service - Core business logic for trading journal feature
Handles CRUD operations, mood tracking, streaks, and AI integration
"""

import os
from typing import List, Dict, Optional, Any
from datetime import datetime, date, timedelta
from supabase import create_client, Client
import json

# Initialize Supabase client
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY")

if supabase_url and supabase_key:
    supabase: Client = create_client(supabase_url, supabase_key)
else:
    supabase = None


class JournalService:
    """Service for managing trading journal entries"""

    # ================================================
    # ENTRY CRUD OPERATIONS
    # ================================================

    async def create_entry(
        self,
        user_id: str,
        title: str = "Untitled Entry",
        content: List[Dict] = None,
        entry_type: str = "general",
        template_id: str = None,
        pre_trade_mood: str = None,
        post_trade_mood: str = None,
        mood_notes: str = None,
        entry_date: str = None
    ) -> Dict:
        """Create a new journal entry"""
        if not supabase:
            raise Exception("Supabase client not initialized")

        # Calculate word count from content blocks
        word_count = self._calculate_word_count(content or [])

        entry_data = {
            "user_id": user_id,
            "title": title,
            "content": content or [],
            "entry_type": entry_type,
            "template_id": template_id,
            "pre_trade_mood": pre_trade_mood,
            "post_trade_mood": post_trade_mood,
            "mood_notes": mood_notes,
            "word_count": word_count,
            "entry_date": entry_date or date.today().isoformat()
        }

        response = supabase.table("journal_entries").insert(entry_data).execute()

        if response.data:
            entry = response.data[0]
            # Record mood if provided
            if pre_trade_mood:
                await self.record_mood(user_id, pre_trade_mood, "pre_trade", entry["id"])
            if post_trade_mood:
                await self.record_mood(user_id, post_trade_mood, "post_trade", entry["id"])

            # Update template usage count
            if template_id:
                await self._increment_template_usage(template_id)

            return entry
        raise Exception("Failed to create journal entry")

    async def get_entry(self, user_id: str, entry_id: str) -> Optional[Dict]:
        """Get a single journal entry with linked trades"""
        if not supabase:
            raise Exception("Supabase client not initialized")

        response = supabase.table("journal_entries") \
            .select("*, journal_trade_links(trade_id, link_context)") \
            .eq("id", entry_id) \
            .eq("user_id", user_id) \
            .is_("deleted_at", "null") \
            .single() \
            .execute()

        return response.data if response.data else None

    async def get_entries(
        self,
        user_id: str,
        entry_type: str = None,
        start_date: str = None,
        end_date: str = None,
        search: str = None,
        is_pinned: bool = None,
        is_favorite: bool = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict:
        """Get journal entries with filters and pagination"""
        if not supabase:
            raise Exception("Supabase client not initialized")

        query = supabase.table("journal_entries") \
            .select("*, journal_trade_links(trade_id, link_context)", count="exact") \
            .eq("user_id", user_id) \
            .is_("deleted_at", "null") \
            .order("entry_date", desc=True) \
            .order("created_at", desc=True)

        if entry_type:
            query = query.eq("entry_type", entry_type)
        if start_date:
            query = query.gte("entry_date", start_date)
        if end_date:
            query = query.lte("entry_date", end_date)
        if is_pinned is not None:
            query = query.eq("is_pinned", is_pinned)
        if is_favorite is not None:
            query = query.eq("is_favorite", is_favorite)
        if search:
            query = query.ilike("title", f"%{search}%")

        query = query.range(offset, offset + limit - 1)
        response = query.execute()

        return {
            "entries": response.data or [],
            "total": response.count or 0,
            "limit": limit,
            "offset": offset
        }

    async def update_entry(
        self,
        user_id: str,
        entry_id: str,
        updates: Dict
    ) -> Optional[Dict]:
        """Update a journal entry"""
        if not supabase:
            raise Exception("Supabase client not initialized")

        # Recalculate word count if content is updated
        if "content" in updates:
            updates["word_count"] = self._calculate_word_count(updates["content"])

        updates["updated_at"] = datetime.utcnow().isoformat()

        response = supabase.table("journal_entries") \
            .update(updates) \
            .eq("id", entry_id) \
            .eq("user_id", user_id) \
            .execute()

        return response.data[0] if response.data else None

    async def delete_entry(self, user_id: str, entry_id: str) -> bool:
        """Soft delete a journal entry"""
        if not supabase:
            raise Exception("Supabase client not initialized")

        response = supabase.table("journal_entries") \
            .update({"deleted_at": datetime.utcnow().isoformat()}) \
            .eq("id", entry_id) \
            .eq("user_id", user_id) \
            .execute()

        return bool(response.data)

    async def toggle_pin(self, user_id: str, entry_id: str) -> Optional[Dict]:
        """Toggle pin status of an entry"""
        entry = await self.get_entry(user_id, entry_id)
        if entry:
            return await self.update_entry(user_id, entry_id, {"is_pinned": not entry.get("is_pinned", False)})
        return None

    async def toggle_favorite(self, user_id: str, entry_id: str) -> Optional[Dict]:
        """Toggle favorite status of an entry"""
        entry = await self.get_entry(user_id, entry_id)
        if entry:
            return await self.update_entry(user_id, entry_id, {"is_favorite": not entry.get("is_favorite", False)})
        return None

    # ================================================
    # TRADE LINKING
    # ================================================

    async def link_trades(
        self,
        user_id: str,
        entry_id: str,
        trade_ids: List[str],
        link_context: str = None
    ) -> List[Dict]:
        """Link multiple trades to a journal entry"""
        if not supabase:
            raise Exception("Supabase client not initialized")

        # Verify entry belongs to user
        entry = await self.get_entry(user_id, entry_id)
        if not entry:
            raise Exception("Entry not found")

        links = []
        for trade_id in trade_ids:
            link_data = {
                "journal_entry_id": entry_id,
                "trade_id": trade_id,
                "link_context": link_context
            }
            try:
                response = supabase.table("journal_trade_links").upsert(link_data).execute()
                if response.data:
                    links.append(response.data[0])
            except Exception as e:
                print(f"Error linking trade {trade_id}: {e}")

        return links

    async def unlink_trade(self, user_id: str, entry_id: str, trade_id: str) -> bool:
        """Unlink a trade from a journal entry"""
        if not supabase:
            raise Exception("Supabase client not initialized")

        # Verify entry belongs to user
        entry = await self.get_entry(user_id, entry_id)
        if not entry:
            raise Exception("Entry not found")

        response = supabase.table("journal_trade_links") \
            .delete() \
            .eq("journal_entry_id", entry_id) \
            .eq("trade_id", trade_id) \
            .execute()

        return bool(response.data)

    async def get_entries_for_trade(self, user_id: str, trade_id: str) -> List[Dict]:
        """Get all journal entries linked to a specific trade"""
        if not supabase:
            raise Exception("Supabase client not initialized")

        response = supabase.table("journal_trade_links") \
            .select("journal_entries(*)") \
            .eq("trade_id", trade_id) \
            .execute()

        entries = []
        for link in response.data or []:
            if link.get("journal_entries"):
                entry = link["journal_entries"]
                if entry.get("user_id") == user_id and not entry.get("deleted_at"):
                    entries.append(entry)

        return entries

    # ================================================
    # TEMPLATE OPERATIONS
    # ================================================

    async def get_templates(self, user_id: str) -> List[Dict]:
        """Get all templates (system + user's custom)"""
        if not supabase:
            raise Exception("Supabase client not initialized")

        response = supabase.table("journal_templates") \
            .select("*") \
            .or_(f"is_system.eq.true,user_id.eq.{user_id}") \
            .order("is_system", desc=True) \
            .order("usage_count", desc=True) \
            .execute()

        return response.data or []

    async def create_template(
        self,
        user_id: str,
        name: str,
        content: List[Dict],
        description: str = None,
        category: str = "custom"
    ) -> Dict:
        """Create a custom template"""
        if not supabase:
            raise Exception("Supabase client not initialized")

        template_data = {
            "user_id": user_id,
            "name": name,
            "description": description,
            "content": content,
            "category": category,
            "is_system": False
        }

        response = supabase.table("journal_templates").insert(template_data).execute()
        return response.data[0] if response.data else None

    async def update_template(self, user_id: str, template_id: str, updates: Dict) -> Optional[Dict]:
        """Update a custom template (cannot update system templates)"""
        if not supabase:
            raise Exception("Supabase client not initialized")

        response = supabase.table("journal_templates") \
            .update(updates) \
            .eq("id", template_id) \
            .eq("user_id", user_id) \
            .eq("is_system", False) \
            .execute()

        return response.data[0] if response.data else None

    async def delete_template(self, user_id: str, template_id: str) -> bool:
        """Delete a custom template"""
        if not supabase:
            raise Exception("Supabase client not initialized")

        response = supabase.table("journal_templates") \
            .delete() \
            .eq("id", template_id) \
            .eq("user_id", user_id) \
            .eq("is_system", False) \
            .execute()

        return bool(response.data)

    async def _increment_template_usage(self, template_id: str) -> None:
        """Increment template usage count"""
        if not supabase:
            return

        try:
            supabase.rpc("increment_template_usage", {"template_id": template_id}).execute()
        except:
            # Fallback if RPC doesn't exist
            response = supabase.table("journal_templates") \
                .select("usage_count") \
                .eq("id", template_id) \
                .single() \
                .execute()

            if response.data:
                current_count = response.data.get("usage_count", 0)
                supabase.table("journal_templates") \
                    .update({"usage_count": current_count + 1}) \
                    .eq("id", template_id) \
                    .execute()

    # ================================================
    # MOOD TRACKING
    # ================================================

    async def record_mood(
        self,
        user_id: str,
        mood: str,
        context: str = "general",
        entry_id: str = None,
        intensity: int = 3,
        notes: str = None
    ) -> Dict:
        """Record a mood entry"""
        if not supabase:
            raise Exception("Supabase client not initialized")

        mood_data = {
            "user_id": user_id,
            "mood": mood,
            "context": context,
            "journal_entry_id": entry_id,
            "mood_intensity": intensity,
            "notes": notes
        }

        response = supabase.table("journal_moods").insert(mood_data).execute()
        return response.data[0] if response.data else None

    async def get_mood_heatmap(
        self,
        user_id: str,
        start_date: str = None,
        end_date: str = None
    ) -> Dict:
        """Get mood data formatted for heatmap visualization"""
        if not supabase:
            raise Exception("Supabase client not initialized")

        # Default to last 90 days if no dates provided
        if not end_date:
            end_date = date.today().isoformat()
        if not start_date:
            start_date = (date.today() - timedelta(days=90)).isoformat()

        response = supabase.table("journal_moods") \
            .select("*") \
            .eq("user_id", user_id) \
            .gte("recorded_at", start_date) \
            .lte("recorded_at", end_date) \
            .order("recorded_at", desc=False) \
            .execute()

        # Process data for heatmap
        mood_by_date = {}
        mood_counts = {}

        for mood_record in response.data or []:
            recorded_date = mood_record["recorded_at"][:10]  # Get date part
            mood = mood_record["mood"]

            if recorded_date not in mood_by_date:
                mood_by_date[recorded_date] = []

            mood_by_date[recorded_date].append({
                "mood": mood,
                "intensity": mood_record.get("mood_intensity", 3),
                "context": mood_record.get("context")
            })

            mood_counts[mood] = mood_counts.get(mood, 0) + 1

        return {
            "heatmap_data": mood_by_date,
            "mood_distribution": mood_counts,
            "total_records": len(response.data or []),
            "start_date": start_date,
            "end_date": end_date
        }

    async def get_mood_analytics(self, user_id: str, days: int = 30) -> Dict:
        """Get mood analytics and trends"""
        if not supabase:
            raise Exception("Supabase client not initialized")

        start_date = (date.today() - timedelta(days=days)).isoformat()

        response = supabase.table("journal_moods") \
            .select("*") \
            .eq("user_id", user_id) \
            .gte("recorded_at", start_date) \
            .execute()

        moods = response.data or []

        # Calculate analytics
        mood_scores = {
            "confident": 5, "excited": 4, "neutral": 3,
            "anxious": 2, "fearful": 1, "fomo": 2, "revenge": 1
        }

        total_score = sum(mood_scores.get(m["mood"], 3) for m in moods)
        avg_score = total_score / len(moods) if moods else 3

        # Pre-trade vs post-trade mood comparison
        pre_trade = [m for m in moods if m.get("context") == "pre_trade"]
        post_trade = [m for m in moods if m.get("context") == "post_trade"]

        pre_avg = sum(mood_scores.get(m["mood"], 3) for m in pre_trade) / len(pre_trade) if pre_trade else 3
        post_avg = sum(mood_scores.get(m["mood"], 3) for m in post_trade) / len(post_trade) if post_trade else 3

        return {
            "average_mood_score": round(avg_score, 2),
            "total_mood_entries": len(moods),
            "pre_trade_average": round(pre_avg, 2),
            "post_trade_average": round(post_avg, 2),
            "mood_improvement_after_trade": round(post_avg - pre_avg, 2),
            "most_common_mood": max(set(m["mood"] for m in moods), key=lambda x: sum(1 for m in moods if m["mood"] == x)) if moods else None
        }

    # ================================================
    # STREAKS
    # ================================================

    async def get_streak(self, user_id: str) -> Dict:
        """Get user's journaling streak data"""
        if not supabase:
            raise Exception("Supabase client not initialized")

        response = supabase.table("journal_streaks") \
            .select("*") \
            .eq("user_id", user_id) \
            .single() \
            .execute()

        if response.data:
            streak = response.data
            # Check if streak is still active
            last_entry = streak.get("last_entry_date")
            if last_entry:
                days_since = (date.today() - date.fromisoformat(last_entry)).days
                streak["is_active"] = days_since <= 1
                streak["days_since_last_entry"] = days_since
            return streak

        # Return default streak data if none exists
        return {
            "user_id": user_id,
            "current_streak": 0,
            "longest_streak": 0,
            "total_entries": 0,
            "total_words": 0,
            "is_active": False,
            "days_since_last_entry": None
        }

    async def check_and_update_streak(self, user_id: str) -> Dict:
        """Check streak status and update if needed (called daily)"""
        streak = await self.get_streak(user_id)

        if streak.get("last_entry_date"):
            days_since = (date.today() - date.fromisoformat(streak["last_entry_date"])).days

            # If more than 1 day since last entry, streak is broken
            if days_since > 1 and streak.get("current_streak", 0) > 0:
                supabase.table("journal_streaks") \
                    .update({"current_streak": 0}) \
                    .eq("user_id", user_id) \
                    .execute()

                streak["current_streak"] = 0
                streak["is_active"] = False

        return streak

    # ================================================
    # AI INTEGRATION
    # ================================================

    async def generate_ai_prompts(self, user_id: str, recent_trades: List[Dict] = None) -> List[Dict]:
        """Generate contextual journaling prompts based on recent trades"""
        prompts = []

        if not recent_trades:
            # Fetch recent trades from Supabase
            if supabase:
                response = supabase.table("trades") \
                    .select("*") \
                    .eq("user_id", user_id) \
                    .order("entry_time", desc=True) \
                    .limit(10) \
                    .execute()
                recent_trades = response.data or []

        # Analyze trades and generate prompts
        if recent_trades:
            # Check for big wins
            big_wins = [t for t in recent_trades if (t.get("pnl_usd") or 0) > 100]
            if big_wins:
                prompts.append({
                    "type": "big_win",
                    "prompt": f"You had a great win on {big_wins[0].get('symbol', 'a trade')}! What setup led to this success?",
                    "priority": "high",
                    "related_trade_id": big_wins[0].get("id")
                })

            # Check for losing streak
            recent_pnls = [(t.get("pnl_usd") or 0) for t in recent_trades[:5]]
            if all(pnl < 0 for pnl in recent_pnls[:3]) and len(recent_pnls) >= 3:
                prompts.append({
                    "type": "losing_streak",
                    "prompt": "After a few consecutive losses, what emotions are you experiencing? How can you reset?",
                    "priority": "high"
                })

            # Check for new symbols
            all_symbols = set(t.get("symbol") for t in recent_trades)
            if len(recent_trades) > 0:
                latest_symbol = recent_trades[0].get("symbol")
                if sum(1 for t in recent_trades if t.get("symbol") == latest_symbol) == 1:
                    prompts.append({
                        "type": "new_symbol",
                        "prompt": f"First time trading {latest_symbol}. What's your thesis on this asset?",
                        "priority": "medium"
                    })

            # Check for high leverage
            high_leverage = [t for t in recent_trades if (t.get("leverage") or 1) > 10]
            if high_leverage:
                prompts.append({
                    "type": "high_leverage",
                    "prompt": f"You used {high_leverage[0].get('leverage')}x leverage. What was your risk management plan?",
                    "priority": "medium",
                    "related_trade_id": high_leverage[0].get("id")
                })

        # Always add some general prompts
        today = date.today()
        if today.weekday() == 6:  # Sunday
            prompts.append({
                "type": "weekly_review",
                "prompt": "It's Sunday! Time to review your trading week. What worked? What didn't?",
                "priority": "high"
            })

        if today.weekday() == 0:  # Monday
            prompts.append({
                "type": "weekly_planning",
                "prompt": "New week ahead! What are your trading goals and focus areas?",
                "priority": "medium"
            })

        # Morning prompt
        if datetime.now().hour < 12:
            prompts.append({
                "type": "morning_routine",
                "prompt": "Good morning! How are you feeling? Ready to trade today?",
                "priority": "low"
            })

        return prompts

    async def get_journal_context_for_coach(self, user_id: str, limit: int = 5) -> Dict:
        """Get journal data formatted for AI coach context"""
        entries_response = await self.get_entries(user_id, limit=limit)
        streak = await self.get_streak(user_id)
        mood_analytics = await self.get_mood_analytics(user_id, days=14)

        return {
            "recent_entries": [
                {
                    "title": e.get("title"),
                    "entry_type": e.get("entry_type"),
                    "entry_date": e.get("entry_date"),
                    "pre_trade_mood": e.get("pre_trade_mood"),
                    "post_trade_mood": e.get("post_trade_mood"),
                    "word_count": e.get("word_count"),
                    "content_preview": self._get_content_preview(e.get("content", []))
                }
                for e in entries_response.get("entries", [])
            ],
            "mood_patterns": mood_analytics,
            "journaling_streak": streak.get("current_streak", 0),
            "longest_streak": streak.get("longest_streak", 0),
            "total_entries": streak.get("total_entries", 0),
            "is_active_journaler": streak.get("is_active", False)
        }

    # ================================================
    # HELPER METHODS
    # ================================================

    def _calculate_word_count(self, content: List[Dict]) -> int:
        """Calculate word count from block content"""
        total_words = 0
        for block in content:
            if isinstance(block.get("content"), str):
                total_words += len(block["content"].split())
            elif isinstance(block.get("content"), list):
                for item in block["content"]:
                    if isinstance(item, dict) and "text" in item:
                        total_words += len(item["text"].split())
                    elif isinstance(item, str):
                        total_words += len(item.split())
            if block.get("children"):
                total_words += self._calculate_word_count(block["children"])
        return total_words

    def _get_content_preview(self, content: List[Dict], max_length: int = 200) -> str:
        """Get a text preview of journal content"""
        preview_parts = []
        for block in content:
            if isinstance(block.get("content"), str) and block["content"].strip():
                preview_parts.append(block["content"])
            if len(" ".join(preview_parts)) > max_length:
                break

        preview = " ".join(preview_parts)
        if len(preview) > max_length:
            preview = preview[:max_length] + "..."
        return preview


# Create singleton instance
journal_service = JournalService()
