"""
MemoryManager: Core service for managing coach memories.
Handles storage, retrieval, and updating of user memories, episodes, and goals.
This is what makes the coach "remember" each user over time.
"""

import logging
import os
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import httpx
import json
import uuid

logger = logging.getLogger(__name__)


class Memory:
    """Represents a core memory about a user."""

    TYPES = [
        "trading_style",
        "strength",
        "weakness",
        "goal",
        "rule",
        "trigger",
        "preference",
        "breakthrough",
        "personality",
    ]

    def __init__(
        self,
        memory_type: str,
        content: str,
        confidence: float = 0.5,
        importance: str = "medium",
        source_type: Optional[str] = None,
        source_id: Optional[str] = None,
        user_id: Optional[str] = None,
        id: Optional[str] = None,
    ):
        self.id = id or str(uuid.uuid4())
        self.user_id = user_id
        self.memory_type = memory_type
        self.content = content
        self.confidence = min(1.0, max(0.0, confidence))
        self.importance = importance
        self.source_type = source_type
        self.source_id = source_id
        self.times_reinforced = 1
        self.times_contradicted = 0
        self.is_active = True
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "memory_type": self.memory_type,
            "content": self.content,
            "confidence": self.confidence,
            "importance": self.importance,
            "source_type": self.source_type,
            "source_id": self.source_id,
            "times_reinforced": self.times_reinforced,
            "times_contradicted": self.times_contradicted,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at,
            "updated_at": self.updated_at.isoformat() if isinstance(self.updated_at, datetime) else self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: Dict) -> "Memory":
        memory = cls(
            id=data.get("id"),
            user_id=data.get("user_id"),
            memory_type=data.get("memory_type", ""),
            content=data.get("content", ""),
            confidence=data.get("confidence", 0.5),
            importance=data.get("importance", "medium"),
            source_type=data.get("source_type"),
            source_id=data.get("source_id"),
        )
        memory.times_reinforced = data.get("times_reinforced", 1)
        memory.times_contradicted = data.get("times_contradicted", 0)
        memory.is_active = data.get("is_active", True)
        return memory


class Episode:
    """Represents a key moment in the user's trading journey."""

    TYPES = [
        "milestone",
        "breakthrough",
        "setback",
        "lesson",
        "commitment",
        "pattern_change",
        "goal_set",
        "goal_achieved",
    ]

    def __init__(
        self,
        episode_type: str,
        title: str,
        description: str,
        user_id: Optional[str] = None,
        related_trades: Optional[List[str]] = None,
        related_conversation_id: Optional[str] = None,
        advice_given: Optional[str] = None,
        user_response: Optional[str] = None,
        emotional_state: Optional[str] = None,
        significance: str = "medium",
        id: Optional[str] = None,
    ):
        self.id = id or str(uuid.uuid4())
        self.user_id = user_id
        self.episode_type = episode_type
        self.title = title
        self.description = description
        self.related_trades = related_trades or []
        self.related_conversation_id = related_conversation_id
        self.advice_given = advice_given
        self.user_response = user_response
        self.emotional_state = emotional_state
        self.significance = significance
        self.outcome = "pending"
        self.outcome_notes = None
        self.created_at = datetime.utcnow()

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "episode_type": self.episode_type,
            "title": self.title,
            "description": self.description,
            "related_trades": self.related_trades,
            "related_conversation_id": self.related_conversation_id,
            "advice_given": self.advice_given,
            "user_response": self.user_response,
            "emotional_state": self.emotional_state,
            "significance": self.significance,
            "outcome": self.outcome,
            "outcome_notes": self.outcome_notes,
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at,
        }


class UserGoal:
    """Represents a user's trading goal."""

    def __init__(
        self,
        goal_type: str,
        title: str,
        description: Optional[str] = None,
        target_metric: Optional[str] = None,
        target_value: Optional[float] = None,
        baseline_value: Optional[float] = None,
        deadline: Optional[datetime] = None,
        user_id: Optional[str] = None,
        id: Optional[str] = None,
    ):
        self.id = id or str(uuid.uuid4())
        self.user_id = user_id
        self.goal_type = goal_type
        self.title = title
        self.description = description
        self.target_metric = target_metric
        self.target_value = target_value
        self.baseline_value = baseline_value
        self.current_value = baseline_value
        self.deadline = deadline
        self.status = "active"
        self.progress_percent = 0.0
        self.created_at = datetime.utcnow()

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "goal_type": self.goal_type,
            "title": self.title,
            "description": self.description,
            "target_metric": self.target_metric,
            "target_value": self.target_value,
            "baseline_value": self.baseline_value,
            "current_value": self.current_value,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "status": self.status,
            "progress_percent": self.progress_percent,
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at,
        }


class MemoryManager:
    """Service for managing all coach memories."""

    def __init__(self):
        self.url = os.getenv("SUPABASE_URL", "").rstrip("/")
        self.key = os.getenv("SUPABASE_KEY", "")
        self.available = bool(self.url and self.key)

        if not self.available:
            logger.warning("Supabase not configured for MemoryManager")

    def _get_headers(self) -> Dict:
        return {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    # ============================================
    # CORE MEMORIES
    # ============================================

    async def create_memory(self, user_id: str, memory: Memory) -> Optional[Memory]:
        """Create a new memory for a user."""
        if not self.available:
            logger.warning("Supabase not available for memory creation")
            return None

        try:
            memory.user_id = user_id
            payload = memory.to_dict()

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.url}/rest/v1/coach_memories",
                    json=payload,
                    headers=self._get_headers(),
                    timeout=10.0,
                )

                if response.status_code not in (200, 201):
                    logger.error(f"Failed to create memory: {response.status_code} {response.text}")
                    return None

                data = response.json()
                if isinstance(data, list) and data:
                    return Memory.from_dict(data[0])
                return Memory.from_dict(data) if data else None

        except Exception as e:
            logger.error(f"Error creating memory: {e}")
            return None

    async def get_memories(
        self,
        user_id: str,
        memory_type: Optional[str] = None,
        active_only: bool = True,
        min_confidence: float = 0.0,
        limit: int = 50,
    ) -> List[Memory]:
        """Get memories for a user."""
        if not self.available:
            return []

        try:
            url = f"{self.url}/rest/v1/coach_memories?user_id=eq.{user_id}"

            if memory_type:
                url += f"&memory_type=eq.{memory_type}"
            if active_only:
                url += "&is_active=eq.true"
            if min_confidence > 0:
                url += f"&confidence=gte.{min_confidence}"

            url += f"&order=confidence.desc,times_reinforced.desc&limit={limit}"

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers=self._get_headers(),
                    timeout=10.0,
                )

                if response.status_code != 200:
                    logger.error(f"Failed to get memories: {response.status_code}")
                    return []

                data = response.json()
                return [Memory.from_dict(m) for m in data]

        except Exception as e:
            logger.error(f"Error getting memories: {e}")
            return []

    async def get_all_memories_for_context(self, user_id: str) -> Dict[str, List[Memory]]:
        """Get all active memories organized by type for context building."""
        memories = await self.get_memories(user_id, active_only=True, limit=100)

        organized = {}
        for memory in memories:
            if memory.memory_type not in organized:
                organized[memory.memory_type] = []
            organized[memory.memory_type].append(memory)

        return organized

    async def reinforce_memory(self, memory_id: str, user_id: str) -> bool:
        """Reinforce a memory (increase confidence when confirmed)."""
        if not self.available:
            return False

        try:
            # First get current memory
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.url}/rest/v1/coach_memories?id=eq.{memory_id}&user_id=eq.{user_id}",
                    headers=self._get_headers(),
                    timeout=10.0,
                )

                if response.status_code != 200:
                    return False

                data = response.json()
                if not data:
                    return False

                current = data[0]
                new_reinforced = current.get("times_reinforced", 1) + 1
                new_confidence = min(1.0, current.get("confidence", 0.5) + 0.05)

                # Update memory
                update_response = await client.patch(
                    f"{self.url}/rest/v1/coach_memories?id=eq.{memory_id}&user_id=eq.{user_id}",
                    json={
                        "times_reinforced": new_reinforced,
                        "confidence": new_confidence,
                        "last_reinforced_at": datetime.utcnow().isoformat() + "Z",
                        "updated_at": datetime.utcnow().isoformat() + "Z",
                    },
                    headers=self._get_headers(),
                    timeout=10.0,
                )

                return update_response.status_code in (200, 204)

        except Exception as e:
            logger.error(f"Error reinforcing memory: {e}")
            return False

    async def contradict_memory(self, memory_id: str, user_id: str) -> bool:
        """Contradict a memory (decrease confidence when proven wrong)."""
        if not self.available:
            return False

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.url}/rest/v1/coach_memories?id=eq.{memory_id}&user_id=eq.{user_id}",
                    headers=self._get_headers(),
                    timeout=10.0,
                )

                if response.status_code != 200:
                    return False

                data = response.json()
                if not data:
                    return False

                current = data[0]
                new_contradicted = current.get("times_contradicted", 0) + 1
                new_confidence = max(0.0, current.get("confidence", 0.5) - 0.1)

                # If contradicted too many times, deactivate
                is_active = new_confidence > 0.2

                update_response = await client.patch(
                    f"{self.url}/rest/v1/coach_memories?id=eq.{memory_id}&user_id=eq.{user_id}",
                    json={
                        "times_contradicted": new_contradicted,
                        "confidence": new_confidence,
                        "is_active": is_active,
                        "updated_at": datetime.utcnow().isoformat() + "Z",
                    },
                    headers=self._get_headers(),
                    timeout=10.0,
                )

                return update_response.status_code in (200, 204)

        except Exception as e:
            logger.error(f"Error contradicting memory: {e}")
            return False

    async def find_similar_memory(self, user_id: str, memory_type: str, content: str) -> Optional[Memory]:
        """Find if a similar memory already exists (to avoid duplicates)."""
        memories = await self.get_memories(user_id, memory_type=memory_type, limit=20)

        # Simple similarity check - could be enhanced with embeddings
        content_lower = content.lower()
        for memory in memories:
            if (
                memory.content.lower() in content_lower
                or content_lower in memory.content.lower()
                or self._calculate_overlap(memory.content, content) > 0.6
            ):
                return memory

        return None

    def _calculate_overlap(self, text1: str, text2: str) -> float:
        """Calculate word overlap between two texts."""
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())

        if not words1 or not words2:
            return 0.0

        intersection = words1 & words2
        union = words1 | words2

        return len(intersection) / len(union)

    # ============================================
    # EPISODES
    # ============================================

    async def create_episode(self, user_id: str, episode: Episode) -> Optional[Episode]:
        """Create a new episode for a user."""
        if not self.available:
            return None

        try:
            episode.user_id = user_id
            payload = episode.to_dict()

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.url}/rest/v1/coach_episodes",
                    json=payload,
                    headers=self._get_headers(),
                    timeout=10.0,
                )

                if response.status_code not in (200, 201):
                    logger.error(f"Failed to create episode: {response.status_code} {response.text}")
                    return None

                data = response.json()
                return episode

        except Exception as e:
            logger.error(f"Error creating episode: {e}")
            return None

    async def get_episodes(
        self,
        user_id: str,
        episode_type: Optional[str] = None,
        limit: int = 20,
        days_back: Optional[int] = None,
    ) -> List[Dict]:
        """Get episodes for a user."""
        if not self.available:
            return []

        try:
            url = f"{self.url}/rest/v1/coach_episodes?user_id=eq.{user_id}"

            if episode_type:
                url += f"&episode_type=eq.{episode_type}"
            if days_back:
                cutoff = (datetime.utcnow() - timedelta(days=days_back)).isoformat() + "Z"
                url += f"&created_at=gte.{cutoff}"

            url += f"&order=created_at.desc&limit={limit}"

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers=self._get_headers(),
                    timeout=10.0,
                )

                if response.status_code != 200:
                    logger.error(f"Failed to get episodes: {response.status_code}")
                    return []

                return response.json()

        except Exception as e:
            logger.error(f"Error getting episodes: {e}")
            return []

    async def get_recent_significant_episodes(self, user_id: str, limit: int = 5) -> List[Dict]:
        """Get recent significant episodes for context."""
        if not self.available:
            return []

        try:
            url = (
                f"{self.url}/rest/v1/coach_episodes?"
                f"user_id=eq.{user_id}&"
                f"significance=in.(high,critical)&"
                f"order=created_at.desc&limit={limit}"
            )

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers=self._get_headers(),
                    timeout=10.0,
                )

                if response.status_code != 200:
                    return []

                return response.json()

        except Exception as e:
            logger.error(f"Error getting significant episodes: {e}")
            return []

    async def update_episode_outcome(
        self,
        episode_id: str,
        user_id: str,
        outcome: str,
        notes: Optional[str] = None,
    ) -> bool:
        """Update the outcome of an episode."""
        if not self.available:
            return False

        try:
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.url}/rest/v1/coach_episodes?id=eq.{episode_id}&user_id=eq.{user_id}",
                    json={
                        "outcome": outcome,
                        "outcome_notes": notes,
                        "outcome_measured_at": datetime.utcnow().isoformat() + "Z",
                        "updated_at": datetime.utcnow().isoformat() + "Z",
                    },
                    headers=self._get_headers(),
                    timeout=10.0,
                )

                return response.status_code in (200, 204)

        except Exception as e:
            logger.error(f"Error updating episode outcome: {e}")
            return False

    # ============================================
    # GOALS
    # ============================================

    async def create_goal(self, user_id: str, goal: UserGoal) -> Optional[UserGoal]:
        """Create a new goal for a user."""
        if not self.available:
            return None

        try:
            goal.user_id = user_id
            payload = goal.to_dict()

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.url}/rest/v1/coach_user_goals",
                    json=payload,
                    headers=self._get_headers(),
                    timeout=10.0,
                )

                if response.status_code not in (200, 201):
                    logger.error(f"Failed to create goal: {response.status_code}")
                    return None

                return goal

        except Exception as e:
            logger.error(f"Error creating goal: {e}")
            return None

    async def get_active_goals(self, user_id: str) -> List[Dict]:
        """Get active goals for a user."""
        if not self.available:
            return []

        try:
            url = (
                f"{self.url}/rest/v1/coach_user_goals?"
                f"user_id=eq.{user_id}&status=eq.active&"
                f"order=created_at.desc"
            )

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers=self._get_headers(),
                    timeout=10.0,
                )

                if response.status_code != 200:
                    return []

                return response.json()

        except Exception as e:
            logger.error(f"Error getting goals: {e}")
            return []

    async def update_goal_progress(
        self,
        goal_id: str,
        user_id: str,
        current_value: float,
        notes: Optional[str] = None,
    ) -> bool:
        """Update progress on a goal."""
        if not self.available:
            return False

        try:
            # First get the goal to calculate progress
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.url}/rest/v1/coach_user_goals?id=eq.{goal_id}&user_id=eq.{user_id}",
                    headers=self._get_headers(),
                    timeout=10.0,
                )

                if response.status_code != 200:
                    return False

                data = response.json()
                if not data:
                    return False

                goal = data[0]
                baseline = goal.get("baseline_value", 0) or 0
                target = goal.get("target_value", 0) or 0

                # Calculate progress
                if target != baseline:
                    progress = ((current_value - baseline) / (target - baseline)) * 100
                    progress = min(100, max(0, progress))
                else:
                    progress = 100 if current_value >= target else 0

                # Check if goal achieved
                status = "active"
                achieved_at = None
                if progress >= 100:
                    status = "achieved"
                    achieved_at = datetime.utcnow().isoformat() + "Z"

                update_response = await client.patch(
                    f"{self.url}/rest/v1/coach_user_goals?id=eq.{goal_id}&user_id=eq.{user_id}",
                    json={
                        "current_value": current_value,
                        "progress_percent": progress,
                        "status": status,
                        "achieved_at": achieved_at,
                        "last_check_in": datetime.utcnow().isoformat() + "Z",
                        "check_in_notes": notes,
                        "updated_at": datetime.utcnow().isoformat() + "Z",
                    },
                    headers=self._get_headers(),
                    timeout=10.0,
                )

                return update_response.status_code in (200, 204)

        except Exception as e:
            logger.error(f"Error updating goal progress: {e}")
            return False

    # ============================================
    # LEARNING LOG
    # ============================================

    async def log_learning(
        self,
        user_id: str,
        learning_type: str,
        description: str,
        source_conversation_id: Optional[str] = None,
        source_trade_ids: Optional[List[str]] = None,
        confidence: float = 0.5,
    ) -> bool:
        """Log a learning event."""
        if not self.available:
            return False

        try:
            payload = {
                "user_id": user_id,
                "learning_type": learning_type,
                "description": description,
                "source_conversation_id": source_conversation_id,
                "source_trade_ids": source_trade_ids,
                "confidence": confidence,
                "created_at": datetime.utcnow().isoformat() + "Z",
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.url}/rest/v1/coach_learning_log",
                    json=payload,
                    headers=self._get_headers(),
                    timeout=10.0,
                )

                return response.status_code in (200, 201)

        except Exception as e:
            logger.error(f"Error logging learning: {e}")
            return False

    # ============================================
    # MEMORY SUMMARY FOR CONTEXT
    # ============================================

    async def get_memory_context(self, user_id: str) -> Dict:
        """Get a complete memory context for Claude prompts."""
        try:
            # Get all types of memory data in parallel
            memories = await self.get_all_memories_for_context(user_id)
            episodes = await self.get_recent_significant_episodes(user_id, limit=5)
            goals = await self.get_active_goals(user_id)

            return {
                "memories": {
                    memory_type: [m.to_dict() for m in mems]
                    for memory_type, mems in memories.items()
                },
                "recent_episodes": episodes,
                "active_goals": goals,
                "has_memories": bool(memories),
                "memory_count": sum(len(mems) for mems in memories.values()),
            }

        except Exception as e:
            logger.error(f"Error getting memory context: {e}")
            return {
                "memories": {},
                "recent_episodes": [],
                "active_goals": [],
                "has_memories": False,
                "memory_count": 0,
            }
