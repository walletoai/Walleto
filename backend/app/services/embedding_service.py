"""
EmbeddingService: Handles vector embeddings for semantic search.
Uses OpenAI's ada-002 or Anthropic's embeddings for text similarity.
Enables the coach to search through past conversations semantically.
"""

import logging
import os
from typing import List, Dict, Optional, Tuple
import httpx
import json
from datetime import datetime

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service for generating and searching vector embeddings."""

    # OpenAI embedding model (most common, 1536 dimensions)
    OPENAI_MODEL = "text-embedding-ada-002"
    EMBEDDING_DIMENSIONS = 1536

    def __init__(self):
        self.openai_key = os.getenv("OPENAI_API_KEY", "")
        self.supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
        self.supabase_key = os.getenv("SUPABASE_KEY", "")

        self.openai_available = bool(self.openai_key)
        self.supabase_available = bool(self.supabase_url and self.supabase_key)

        if not self.openai_available:
            logger.warning("OpenAI API key not configured - embeddings disabled")

    async def generate_embedding(self, text: str) -> Optional[List[float]]:
        """
        Generate an embedding vector for the given text.

        Args:
            text: The text to embed

        Returns:
            List of floats representing the embedding vector, or None if failed
        """
        if not self.openai_available:
            logger.warning("OpenAI not available for embeddings")
            return None

        if not text or not text.strip():
            return None

        try:
            # Truncate if too long (ada-002 has 8191 token limit)
            text = text[:8000]

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.openai.com/v1/embeddings",
                    json={
                        "model": self.OPENAI_MODEL,
                        "input": text,
                    },
                    headers={
                        "Authorization": f"Bearer {self.openai_key}",
                        "Content-Type": "application/json",
                    },
                    timeout=30.0,
                )

                if response.status_code != 200:
                    logger.error(f"OpenAI embedding error: {response.status_code} {response.text}")
                    return None

                data = response.json()
                embedding = data["data"][0]["embedding"]

                return embedding

        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return None

    async def store_message_embedding(
        self,
        user_id: str,
        message_id: str,
        conversation_id: str,
        role: str,
        content: str,
        topics: Optional[List[str]] = None,
        sentiment: Optional[str] = None,
    ) -> bool:
        """
        Generate and store an embedding for a message.

        Args:
            user_id: User ID
            message_id: Message ID
            conversation_id: Conversation ID
            role: 'user' or 'assistant'
            content: Message content
            topics: Extracted topics
            sentiment: Message sentiment

        Returns:
            True if successful
        """
        if not self.supabase_available:
            return False

        try:
            # Generate embedding
            embedding = await self.generate_embedding(content)
            if not embedding:
                return False

            # Create content summary (first 200 chars)
            content_summary = content[:200] + "..." if len(content) > 200 else content

            payload = {
                "user_id": user_id,
                "message_id": message_id,
                "conversation_id": conversation_id,
                "role": role,
                "content_summary": content_summary,
                "embedding": embedding,
                "topics": topics or [],
                "sentiment": sentiment,
                "created_at": datetime.utcnow().isoformat() + "Z",
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.supabase_url}/rest/v1/coach_message_embeddings",
                    json=payload,
                    headers={
                        "apikey": self.supabase_key,
                        "Authorization": f"Bearer {self.supabase_key}",
                        "Content-Type": "application/json",
                    },
                    timeout=10.0,
                )

                if response.status_code not in (200, 201):
                    logger.error(f"Failed to store embedding: {response.status_code}")
                    return False

                return True

        except Exception as e:
            logger.error(f"Error storing message embedding: {e}")
            return False

    async def search_similar_messages(
        self,
        user_id: str,
        query: str,
        limit: int = 10,
        min_similarity: float = 0.7,
    ) -> List[Dict]:
        """
        Search for messages similar to the query.

        Args:
            user_id: User ID to search within
            query: Search query text
            limit: Maximum results to return
            min_similarity: Minimum similarity threshold (0-1)

        Returns:
            List of similar messages with similarity scores
        """
        if not self.supabase_available or not self.openai_available:
            return []

        try:
            # Generate embedding for the query
            query_embedding = await self.generate_embedding(query)
            if not query_embedding:
                return []

            # Use Supabase RPC function for vector search
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.supabase_url}/rest/v1/rpc/search_coach_memories",
                    json={
                        "p_user_id": user_id,
                        "p_query_embedding": query_embedding,
                        "p_limit": limit,
                    },
                    headers={
                        "apikey": self.supabase_key,
                        "Authorization": f"Bearer {self.supabase_key}",
                        "Content-Type": "application/json",
                    },
                    timeout=10.0,
                )

                if response.status_code != 200:
                    logger.error(f"Vector search failed: {response.status_code}")
                    return []

                results = response.json()

                # Filter by minimum similarity
                filtered = [r for r in results if r.get("similarity", 0) >= min_similarity]

                return filtered

        except Exception as e:
            logger.error(f"Error searching similar messages: {e}")
            return []

    async def find_relevant_context(
        self,
        user_id: str,
        current_message: str,
        limit: int = 5,
    ) -> List[Dict]:
        """
        Find relevant past conversations for the current message.
        This helps the coach reference relevant past discussions.

        Args:
            user_id: User ID
            current_message: The current user message
            limit: Maximum number of relevant contexts to return

        Returns:
            List of relevant past message contexts
        """
        similar = await self.search_similar_messages(
            user_id=user_id,
            query=current_message,
            limit=limit,
            min_similarity=0.75,
        )

        return similar

    async def extract_topics(self, text: str) -> List[str]:
        """
        Extract key topics from text for metadata tagging.
        Uses simple keyword extraction (could be enhanced with Claude).

        Args:
            text: The text to extract topics from

        Returns:
            List of topic keywords
        """
        # Common trading topics to look for
        topic_keywords = {
            "btc": ["btc", "bitcoin"],
            "eth": ["eth", "ethereum"],
            "leverage": ["leverage", "leveraged", "margin"],
            "risk": ["risk", "stop loss", "stop-loss", "risk management"],
            "psychology": ["emotional", "emotion", "psychology", "mental", "fear", "greed", "fomo"],
            "entry": ["entry", "enter", "entered", "buy"],
            "exit": ["exit", "sell", "sold", "close"],
            "loss": ["loss", "losing", "lost", "red"],
            "profit": ["profit", "gain", "winning", "green", "pnl"],
            "strategy": ["strategy", "setup", "pattern", "system"],
            "size": ["size", "position size", "sizing"],
            "revenge": ["revenge", "revenge trading", "tilt"],
            "overtrading": ["overtrading", "too many trades"],
        }

        text_lower = text.lower()
        found_topics = []

        for topic, keywords in topic_keywords.items():
            for keyword in keywords:
                if keyword in text_lower:
                    found_topics.append(topic)
                    break

        return list(set(found_topics))

    async def analyze_sentiment(self, text: str) -> str:
        """
        Simple sentiment analysis for messages.

        Args:
            text: The text to analyze

        Returns:
            'positive', 'negative', or 'neutral'
        """
        text_lower = text.lower()

        positive_words = [
            "good", "great", "profit", "winning", "improved", "better",
            "thanks", "helpful", "perfect", "excellent", "success",
        ]
        negative_words = [
            "bad", "loss", "losing", "worse", "frustrated", "angry",
            "failed", "mistake", "wrong", "stupid", "blew",
        ]

        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)

        if positive_count > negative_count:
            return "positive"
        elif negative_count > positive_count:
            return "negative"
        else:
            return "neutral"


class SemanticMemorySearch:
    """
    High-level interface for semantic memory search.
    Combines embeddings with memory context.
    """

    def __init__(self):
        self.embedding_service = EmbeddingService()

    async def get_relevant_memories_for_query(
        self,
        user_id: str,
        query: str,
        include_conversations: bool = True,
        max_results: int = 5,
    ) -> Dict:
        """
        Get relevant memories and past conversations for a query.

        Args:
            user_id: User ID
            query: The query to find relevant context for
            include_conversations: Whether to include past conversation snippets
            max_results: Maximum results per category

        Returns:
            Dict with relevant memories and conversations
        """
        result = {
            "relevant_conversations": [],
            "topics_detected": [],
        }

        # Extract topics from query
        topics = await self.embedding_service.extract_topics(query)
        result["topics_detected"] = topics

        # Find semantically similar past messages
        if include_conversations:
            similar = await self.embedding_service.find_relevant_context(
                user_id=user_id,
                current_message=query,
                limit=max_results,
            )
            result["relevant_conversations"] = similar

        return result

    async def index_conversation_message(
        self,
        user_id: str,
        message_id: str,
        conversation_id: str,
        role: str,
        content: str,
    ) -> bool:
        """
        Index a conversation message for future semantic search.

        Args:
            user_id: User ID
            message_id: Message ID
            conversation_id: Conversation ID
            role: 'user' or 'assistant'
            content: Message content

        Returns:
            True if successfully indexed
        """
        # Extract metadata
        topics = await self.embedding_service.extract_topics(content)
        sentiment = await self.embedding_service.analyze_sentiment(content)

        # Store with embedding
        return await self.embedding_service.store_message_embedding(
            user_id=user_id,
            message_id=message_id,
            conversation_id=conversation_id,
            role=role,
            content=content,
            topics=topics,
            sentiment=sentiment,
        )
