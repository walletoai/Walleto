"""
MemoryExtractor: Extracts learnings from coach conversations.
After each conversation, this service analyzes what was discussed and:
- Creates new memories (user strengths, weaknesses, goals, triggers)
- Updates existing memories (reinforce or contradict)
- Records significant episodes (milestones, breakthroughs, setbacks)
- Logs what was learned for transparency
"""

import logging
import os
import json
from typing import List, Dict, Optional, Any
from datetime import datetime
import httpx

from app.services.memory_manager import MemoryManager, Memory
from app.services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


class MemoryExtractor:
    """
    Extracts and processes memories from coach conversations.
    Uses Claude to analyze conversations and identify learnable moments.
    """

    EXTRACTION_PROMPT = """You are a memory extraction system for an AI trading coach.
Analyze this conversation between a trader and their AI coach. Extract structured learnings.

IMPORTANT: Only extract information that was EXPLICITLY stated or clearly demonstrated.
Do NOT make assumptions or infer things that weren't discussed.

For each learning, provide:
- category: One of [trading_style, strength, weakness, goal, rule, trigger, preference, breakthrough, personality]
- content: The specific learning (be concise and specific)
- confidence: 0.0-1.0 (how confident are you this is true?)
- importance: low, medium, high, or critical
- source_quote: The exact part of conversation that supports this

Also identify if any episodes occurred:
- episode_type: One of [milestone, breakthrough, setback, lesson, commitment, pattern_change, goal_set, goal_achieved]
- title: Short title for the episode
- description: What happened
- significance: low, medium, high, critical

Return JSON in this exact format:
{
    "memories": [
        {
            "category": "weakness",
            "content": "Tends to revenge trade after losses",
            "confidence": 0.85,
            "importance": "high",
            "source_quote": "I always take another trade right after losing..."
        }
    ],
    "episodes": [
        {
            "episode_type": "commitment",
            "title": "Committed to daily journaling",
            "description": "User agreed to journal every trade starting today",
            "significance": "medium"
        }
    ],
    "memory_updates": [
        {
            "type": "reinforce",
            "category": "weakness",
            "content_match": "revenge trading",
            "reason": "User mentioned this pattern again"
        }
    ]
}

If nothing significant was learned, return empty arrays.
"""

    def __init__(self):
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
        self.memory_manager = MemoryManager()
        self.embedding_service = EmbeddingService()

        if not self.anthropic_key:
            logger.warning("Anthropic API key not configured - extraction disabled")

    async def extract_from_conversation(
        self,
        user_id: str,
        conversation_id: str,
        messages: List[Dict[str, str]],
        user_context: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        Extract memories from a completed conversation.

        Args:
            user_id: The user's ID
            conversation_id: ID of the conversation
            messages: List of messages [{"role": "user"|"assistant", "content": "..."}]
            user_context: Optional context about the user (trading stats, etc.)

        Returns:
            Dict with extracted memories, episodes, and updates made
        """
        if not self.anthropic_key:
            return {"error": "Extraction disabled - no API key"}

        if not messages or len(messages) < 2:
            return {"memories": [], "episodes": [], "updates": []}

        try:
            # Format conversation for analysis
            conversation_text = self._format_conversation(messages)

            # Get existing memories for context
            existing_memories = await self.memory_manager.get_memories(user_id)
            existing_summary = self._summarize_existing_memories(existing_memories)

            # Build the extraction prompt
            full_prompt = self._build_extraction_prompt(
                conversation_text, existing_summary, user_context
            )

            # Call Claude to extract learnings
            extraction_result = await self._call_claude_for_extraction(full_prompt)

            if not extraction_result:
                return {"memories": [], "episodes": [], "updates": []}

            # Process the extracted learnings
            result = await self._process_extractions(
                user_id, conversation_id, extraction_result
            )

            # Index messages for semantic search
            await self._index_messages_for_search(
                user_id, conversation_id, messages
            )

            # Log what was learned
            await self._log_learning(user_id, conversation_id, result)

            return result

        except Exception as e:
            logger.error(f"Error extracting memories: {e}")
            return {"error": str(e)}

    def _format_conversation(self, messages: List[Dict[str, str]]) -> str:
        """Format messages into a readable conversation transcript."""
        lines = []
        for msg in messages:
            role = "TRADER" if msg.get("role") == "user" else "COACH"
            content = msg.get("content", "")
            lines.append(f"{role}: {content}")
        return "\n\n".join(lines)

    def _summarize_existing_memories(self, memories: List[Memory]) -> str:
        """Create a summary of existing memories for context."""
        if not memories:
            return "No existing memories for this user."

        by_type = {}
        for mem in memories:
            if mem.memory_type not in by_type:
                by_type[mem.memory_type] = []
            by_type[mem.memory_type].append(mem.content)

        lines = ["Existing knowledge about this trader:"]
        for mtype, contents in by_type.items():
            lines.append(f"\n{mtype.upper()}:")
            for c in contents[:5]:  # Limit to 5 per type
                lines.append(f"  - {c}")

        return "\n".join(lines)

    def _build_extraction_prompt(
        self,
        conversation_text: str,
        existing_summary: str,
        user_context: Optional[Dict],
    ) -> str:
        """Build the full prompt for memory extraction."""
        context_section = ""
        if user_context:
            context_section = f"\n\nTrading Context:\n{json.dumps(user_context, indent=2)}"

        return f"""{self.EXTRACTION_PROMPT}

{existing_summary}
{context_section}

CONVERSATION TO ANALYZE:
{conversation_text}

Extract all learnable information and return as JSON:"""

    async def _call_claude_for_extraction(self, prompt: str) -> Optional[Dict]:
        """Call Claude API to extract memories from conversation."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    json={
                        "model": "claude-sonnet-4-20250514",
                        "max_tokens": 2000,
                        "messages": [{"role": "user", "content": prompt}],
                    },
                    headers={
                        "x-api-key": self.anthropic_key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json",
                    },
                    timeout=60.0,
                )

                if response.status_code != 200:
                    logger.error(f"Claude extraction error: {response.status_code}")
                    return None

                data = response.json()
                content = data.get("content", [{}])[0].get("text", "")

                # Parse JSON from response
                # Handle potential markdown code blocks
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0]
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0]

                return json.loads(content.strip())

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse extraction JSON: {e}")
            return None
        except Exception as e:
            logger.error(f"Error calling Claude for extraction: {e}")
            return None

    async def _process_extractions(
        self,
        user_id: str,
        conversation_id: str,
        extraction: Dict,
    ) -> Dict[str, Any]:
        """Process and store extracted memories and episodes."""
        result = {
            "memories_created": [],
            "episodes_created": [],
            "memories_updated": [],
        }

        # Process new memories
        for mem_data in extraction.get("memories", []):
            try:
                # Create Memory object first
                memory_obj = Memory(
                    memory_type=mem_data.get("category", "preference"),
                    content=mem_data.get("content", ""),
                    confidence=mem_data.get("confidence", 0.5),
                    importance=mem_data.get("importance", "medium"),
                    source_type="conversation",
                    source_id=conversation_id,
                )
                memory = await self.memory_manager.create_memory(user_id, memory_obj)
                if memory:
                    result["memories_created"].append({
                        "type": memory.memory_type,
                        "content": memory.content,
                    })
            except Exception as e:
                logger.error(f"Error creating memory: {e}")

        # Process episodes
        for ep_data in extraction.get("episodes", []):
            try:
                # Create Episode object first
                from app.services.memory_manager import Episode
                episode_obj = Episode(
                    episode_type=ep_data.get("episode_type", "lesson"),
                    title=ep_data.get("title", "Untitled"),
                    description=ep_data.get("description", ""),
                    related_conversation_id=conversation_id,
                    significance=ep_data.get("significance", "medium"),
                )
                episode = await self.memory_manager.create_episode(user_id, episode_obj)
                if episode:
                    result["episodes_created"].append({
                        "type": episode.episode_type,
                        "title": episode.title,
                    })
            except Exception as e:
                logger.error(f"Error creating episode: {e}")

        # Process memory updates (reinforce/contradict)
        for update in extraction.get("memory_updates", []):
            try:
                update_type = update.get("type", "reinforce")
                category = update.get("category")
                content_match = update.get("content_match", "")

                # Find matching memories
                existing = await self.memory_manager.get_memories(
                    user_id, memory_type=category
                )

                for mem in existing:
                    if content_match.lower() in mem.content.lower():
                        if update_type == "reinforce":
                            await self.memory_manager.reinforce_memory(mem.id)
                            result["memories_updated"].append({
                                "action": "reinforced",
                                "content": mem.content,
                            })
                        elif update_type == "contradict":
                            await self.memory_manager.contradict_memory(mem.id)
                            result["memories_updated"].append({
                                "action": "contradicted",
                                "content": mem.content,
                            })
                        break

            except Exception as e:
                logger.error(f"Error updating memory: {e}")

        return result

    async def _index_messages_for_search(
        self,
        user_id: str,
        conversation_id: str,
        messages: List[Dict[str, str]],
    ) -> None:
        """Index conversation messages for semantic search."""
        for i, msg in enumerate(messages):
            try:
                content = msg.get("content", "")
                if len(content) < 20:  # Skip very short messages
                    continue

                message_id = f"{conversation_id}_{i}"
                role = msg.get("role", "user")

                await self.embedding_service.store_message_embedding(
                    user_id=user_id,
                    message_id=message_id,
                    conversation_id=conversation_id,
                    role=role,
                    content=content,
                )
            except Exception as e:
                logger.error(f"Error indexing message: {e}")

    async def _log_learning(
        self,
        user_id: str,
        conversation_id: str,
        result: Dict,
    ) -> None:
        """Log what was learned from this conversation."""
        if not any([
            result.get("memories_created"),
            result.get("episodes_created"),
            result.get("memories_updated"),
        ]):
            return  # Nothing to log

        description_parts = []

        if result.get("memories_created"):
            count = len(result["memories_created"])
            types = ", ".join(set(m["type"] for m in result["memories_created"]))
            description_parts.append(f"Created {count} memories ({types})")

        if result.get("episodes_created"):
            count = len(result["episodes_created"])
            types = ", ".join(set(e["type"] for e in result["episodes_created"]))
            description_parts.append(f"Recorded {count} episodes ({types})")

        if result.get("memories_updated"):
            count = len(result["memories_updated"])
            description_parts.append(f"Updated {count} existing memories")

        description = ". ".join(description_parts)

        await self.memory_manager.log_learning(
            user_id=user_id,
            learning_type="conversation_extraction",
            description=description,
            source_conversation_id=conversation_id,
        )


class TradeAnalysisExtractor:
    """
    Extracts learnings from trade analysis.
    When the coach reviews a trade, this extracts patterns and insights.
    """

    def __init__(self):
        self.memory_manager = MemoryManager()
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")

    async def extract_from_trade_review(
        self,
        user_id: str,
        trade_data: Dict,
        coach_analysis: str,
    ) -> Dict[str, Any]:
        """
        Extract learnings from a trade review.

        Args:
            user_id: User ID
            trade_data: The trade data (symbol, pnl, entry, exit, etc.)
            coach_analysis: The coach's analysis of the trade

        Returns:
            Extracted memories and patterns
        """
        if not self.anthropic_key:
            return {"error": "Extraction disabled"}

        try:
            prompt = self._build_trade_analysis_prompt(trade_data, coach_analysis)

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    json={
                        "model": "claude-sonnet-4-20250514",
                        "max_tokens": 1000,
                        "messages": [{"role": "user", "content": prompt}],
                    },
                    headers={
                        "x-api-key": self.anthropic_key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json",
                    },
                    timeout=30.0,
                )

                if response.status_code != 200:
                    return {"error": f"API error: {response.status_code}"}

                data = response.json()
                content = data.get("content", [{}])[0].get("text", "")

                # Parse and process
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0]
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0]

                extraction = json.loads(content.strip())

                # Store any extracted patterns
                result = {"patterns": [], "insights": []}

                for pattern in extraction.get("patterns", []):
                    await self.memory_manager.create_memory(
                        user_id=user_id,
                        memory_type=pattern.get("type", "trading_style"),
                        content=pattern.get("content", ""),
                        confidence=pattern.get("confidence", 0.5),
                        importance=pattern.get("importance", "medium"),
                        source_type="trade_analysis",
                        source_id=trade_data.get("id", ""),
                    )
                    result["patterns"].append(pattern)

                return result

        except Exception as e:
            logger.error(f"Error extracting from trade review: {e}")
            return {"error": str(e)}

    def _build_trade_analysis_prompt(
        self, trade_data: Dict, coach_analysis: str
    ) -> str:
        """Build prompt for trade analysis extraction."""
        return f"""Analyze this trade review and extract learnable patterns.

TRADE DATA:
{json.dumps(trade_data, indent=2)}

COACH ANALYSIS:
{coach_analysis}

Extract patterns about this trader's behavior. Return JSON:
{{
    "patterns": [
        {{
            "type": "trading_style|strength|weakness|trigger",
            "content": "Specific observation",
            "confidence": 0.0-1.0,
            "importance": "low|medium|high"
        }}
    ]
}}

Only extract clear patterns, not speculation. Return empty array if nothing notable."""


class ProgressTracker:
    """
    Tracks user progress over time based on memories.
    Identifies improvements and areas needing work.
    """

    def __init__(self):
        self.memory_manager = MemoryManager()

    async def get_progress_summary(self, user_id: str) -> Dict:
        """
        Generate a progress summary for the user.

        Returns summary of:
        - Goals and their progress
        - Improvements in weaknesses
        - Consistency of strengths
        - Episode history
        """
        try:
            # Get all relevant data
            memories = await self.memory_manager.get_memories(user_id)
            episodes = await self.memory_manager.get_episodes(user_id, limit=20)
            goals = await self.memory_manager.get_active_goals(user_id)

            # Categorize memories
            strengths = [m for m in memories if m.memory_type == "strength"]
            weaknesses = [m for m in memories if m.memory_type == "weakness"]
            breakthroughs = [m for m in memories if m.memory_type == "breakthrough"]

            # Identify improving weaknesses (high contradiction count)
            improving = [
                w for w in weaknesses
                if w.times_contradicted > 0 and w.times_contradicted >= w.times_reinforced
            ]

            # Identify persistent weaknesses (high reinforcement)
            persistent = [
                w for w in weaknesses
                if w.times_reinforced > 2 and w.times_contradicted < w.times_reinforced
            ]

            return {
                "total_memories": len(memories),
                "total_episodes": len(episodes),
                "active_goals": len(goals),
                "strengths": [
                    {"content": s.content, "confidence": s.confidence}
                    for s in sorted(strengths, key=lambda x: -x.confidence)[:5]
                ],
                "improving_areas": [
                    {"content": w.content, "progress": w.times_contradicted}
                    for w in improving
                ],
                "needs_work": [
                    {"content": w.content, "occurrences": w.times_reinforced}
                    for w in persistent
                ],
                "recent_breakthroughs": [
                    {"content": b.content, "date": str(b.created_at)}
                    for b in breakthroughs[:3]
                ],
                "recent_episodes": [
                    {
                        "type": e.get("episode_type"),
                        "title": e.get("title"),
                        "date": e.get("created_at"),
                    }
                    for e in episodes[:5]
                ],
                "goals": [
                    {
                        "title": g.get("title"),
                        "progress": g.get("progress_percent"),
                        "status": g.get("status"),
                    }
                    for g in goals
                ],
            }

        except Exception as e:
            logger.error(f"Error generating progress summary: {e}")
            return {"error": str(e)}
