"""
Supabase Client: Direct HTTP client for Supabase REST API
Handles conversations, messages, and insights for the coach system
"""

import logging
import os
import httpx
import json
import uuid
from typing import List, Dict, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class SupabaseClient:
    """Low-level Supabase REST API client for coach data"""

    def __init__(self):
        self.url = os.getenv("SUPABASE_URL", "").rstrip("/")
        self.key = os.getenv("SUPABASE_KEY", "")
        self.available = bool(self.url and self.key)

        if not self.available:
            logger.warning("Supabase credentials not configured")

    async def create_conversation(self, user_id: str, title: Optional[str] = None) -> Dict:
        """Create a new conversation for a user"""
        if not self.available:
            raise RuntimeError("Supabase not available")

        try:
            payload = {
                "user_id": user_id,
                "title": title,
                "created_at": datetime.utcnow().isoformat() + "Z",
                "updated_at": datetime.utcnow().isoformat() + "Z",
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.url}/rest/v1/conversations",
                    json=payload,
                    headers={
                        "apikey": self.key,
                        "Authorization": f"Bearer {self.key}",
                        "Content-Type": "application/json",
                        "Prefer": "return=representation",
                    },
                    timeout=10.0,
                )

                if response.status_code not in (200, 201):
                    logger.error(
                        f"Failed to create conversation: {response.status_code} {response.text}"
                    )
                    raise RuntimeError(f"Supabase error: {response.text}")

                data = response.json()
                if isinstance(data, list):
                    return data[0] if data else {}
                return data

        except Exception as e:
            logger.error(f"Error creating conversation: {e}", exc_info=True)
            raise

    async def get_conversation(self, conversation_id: str, user_id: str) -> Dict:
        """Get a conversation with all messages"""
        if not self.available:
            raise RuntimeError("Supabase not available")

        try:
            # Fetch conversation
            async with httpx.AsyncClient() as client:
                conv_response = await client.get(
                    f"{self.url}/rest/v1/conversations?id=eq.{conversation_id}&user_id=eq.{user_id}",
                    headers={
                        "apikey": self.key,
                        "Authorization": f"Bearer {self.key}",
                        "Content-Type": "application/json",
                    },
                    timeout=10.0,
                )

                if conv_response.status_code != 200:
                    logger.error(
                        f"Failed to get conversation: {conv_response.status_code} {conv_response.text}"
                    )
                    raise RuntimeError("Conversation not found")

                conversations = conv_response.json()
                if not conversations:
                    raise RuntimeError("Conversation not found")

                conversation = conversations[0]

                # Fetch messages for this conversation
                msg_response = await client.get(
                    f"{self.url}/rest/v1/messages?conversation_id=eq.{conversation_id}&order=created_at.asc",
                    headers={
                        "apikey": self.key,
                        "Authorization": f"Bearer {self.key}",
                        "Content-Type": "application/json",
                    },
                    timeout=10.0,
                )

                if msg_response.status_code != 200:
                    logger.error(
                        f"Failed to get messages: {msg_response.status_code} {msg_response.text}"
                    )
                    messages = []
                else:
                    messages = msg_response.json()

                return {
                    "id": conversation["id"],
                    "user_id": conversation["user_id"],
                    "title": conversation.get("title"),
                    "created_at": conversation["created_at"],
                    "updated_at": conversation["updated_at"],
                    "messages": messages,
                }

        except Exception as e:
            logger.error(f"Error getting conversation: {e}", exc_info=True)
            raise

    async def list_conversations(
        self, user_id: str, limit: int = 20, offset: int = 0
    ) -> List[Dict]:
        """List user's conversations"""
        if not self.available:
            raise RuntimeError("Supabase not available")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.url}/rest/v1/conversations?user_id=eq.{user_id}&order=created_at.desc&limit={limit}&offset={offset}",
                    headers={
                        "apikey": self.key,
                        "Authorization": f"Bearer {self.key}",
                        "Content-Type": "application/json",
                    },
                    timeout=10.0,
                )

                if response.status_code != 200:
                    logger.error(
                        f"Failed to list conversations: {response.status_code} {response.text}"
                    )
                    return []

                return response.json()

        except Exception as e:
            logger.error(f"Error listing conversations: {e}", exc_info=True)
            return []

    async def add_message(
        self, conversation_id: str, role: str, content: str, tokens_input: int = 0, tokens_output: int = 0
    ) -> Dict:
        """Add a message to a conversation"""
        if not self.available:
            raise RuntimeError("Supabase not available")

        try:
            payload = {
                "conversation_id": conversation_id,
                "role": role,
                "content": content,
                "input_tokens": tokens_input,
                "output_tokens": tokens_output,
                "created_at": datetime.utcnow().isoformat() + "Z",
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.url}/rest/v1/messages",
                    json=payload,
                    headers={
                        "apikey": self.key,
                        "Authorization": f"Bearer {self.key}",
                        "Content-Type": "application/json",
                        "Prefer": "return=representation",
                    },
                    timeout=10.0,
                )

                if response.status_code not in (200, 201):
                    logger.error(
                        f"Failed to add message: {response.status_code} {response.text}"
                    )
                    raise RuntimeError(f"Supabase error: {response.text}")

                data = response.json()
                if isinstance(data, list):
                    return data[0] if data else {}
                return data

        except Exception as e:
            logger.error(f"Error adding message: {e}", exc_info=True)
            raise

    async def delete_conversation(self, conversation_id: str, user_id: str) -> bool:
        """Soft delete a conversation"""
        if not self.available:
            raise RuntimeError("Supabase not available")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.url}/rest/v1/conversations?id=eq.{conversation_id}&user_id=eq.{user_id}",
                    json={
                        "deleted_at": datetime.utcnow().isoformat() + "Z",
                    },
                    headers={
                        "apikey": self.key,
                        "Authorization": f"Bearer {self.key}",
                        "Content-Type": "application/json",
                    },
                    timeout=10.0,
                )

                if response.status_code not in (200, 204):
                    logger.error(
                        f"Failed to delete conversation: {response.status_code} {response.text}"
                    )
                    raise RuntimeError("Failed to delete conversation")

                return True

        except Exception as e:
            logger.error(f"Error deleting conversation: {e}", exc_info=True)
            raise

    async def upsert_insight(self, user_id: str, insight_data: Dict) -> Dict:
        """Create or update coach insights for a user"""
        if not self.available:
            raise RuntimeError("Supabase not available")

        try:
            payload = {
                "user_id": user_id,
                **insight_data,
                "last_updated": datetime.utcnow().isoformat() + "Z",
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.url}/rest/v1/coach_insights?on_conflict=user_id",
                    json=payload,
                    headers={
                        "apikey": self.key,
                        "Authorization": f"Bearer {self.key}",
                        "Content-Type": "application/json",
                    },
                    timeout=10.0,
                )

                if response.status_code not in (200, 201):
                    logger.error(
                        f"Failed to upsert insight: {response.status_code} {response.text}"
                    )
                    raise RuntimeError(f"Supabase error: {response.text}")

                data = response.json()
                if isinstance(data, list):
                    return data[0] if data else {}
                return data

        except Exception as e:
            logger.error(f"Error upserting insight: {e}", exc_info=True)
            raise

    async def get_insight(self, user_id: str) -> Optional[Dict]:
        """Get coach insights for a user"""
        if not self.available:
            return None

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.url}/rest/v1/coach_insights?user_id=eq.{user_id}",
                    headers={
                        "apikey": self.key,
                        "Authorization": f"Bearer {self.key}",
                        "Content-Type": "application/json",
                    },
                    timeout=10.0,
                )

                if response.status_code != 200:
                    logger.error(
                        f"Failed to get insight: {response.status_code} {response.text}"
                    )
                    return None

                data = response.json()
                if isinstance(data, list):
                    return data[0] if data else None
                return data

        except Exception as e:
            logger.error(f"Error getting insight: {e}", exc_info=True)
            return None

    # ============================================
    # Proactive Insights Methods
    # ============================================

    async def insert_proactive_insight(self, insight_data: Dict) -> Dict:
        """Insert a proactive insight"""
        if not self.available:
            raise RuntimeError("Supabase not available")

        try:
            payload = {
                **insight_data,
                "created_at": insight_data.get("created_at", datetime.utcnow().isoformat() + "Z"),
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.url}/rest/v1/proactive_insights",
                    json=payload,
                    headers={
                        "apikey": self.key,
                        "Authorization": f"Bearer {self.key}",
                        "Content-Type": "application/json",
                        "Prefer": "return=representation",
                    },
                    timeout=10.0,
                )

                if response.status_code not in (200, 201):
                    logger.error(
                        f"Failed to insert proactive insight: {response.status_code} {response.text}"
                    )
                    raise RuntimeError(f"Supabase error: {response.text}")

                data = response.json()
                if isinstance(data, list):
                    return data[0] if data else {}
                return data

        except Exception as e:
            logger.error(f"Error inserting proactive insight: {e}", exc_info=True)
            raise

    async def get_proactive_insights(
        self, user_id: str, limit: int = 20, unread_only: bool = False
    ) -> List[Dict]:
        """Get proactive insights for a user"""
        if not self.available:
            return []

        try:
            url = f"{self.url}/rest/v1/proactive_insights?user_id=eq.{user_id}&order=created_at.desc&limit={limit}"
            if unread_only:
                url += "&is_read=eq.false"

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers={
                        "apikey": self.key,
                        "Authorization": f"Bearer {self.key}",
                        "Content-Type": "application/json",
                    },
                    timeout=10.0,
                )

                if response.status_code != 200:
                    logger.error(
                        f"Failed to get proactive insights: {response.status_code} {response.text}"
                    )
                    return []

                return response.json()

        except Exception as e:
            logger.error(f"Error getting proactive insights: {e}", exc_info=True)
            return []

    async def update_proactive_insight(
        self, insight_id: str, user_id: str, update_data: Dict
    ) -> bool:
        """Update a proactive insight"""
        if not self.available:
            raise RuntimeError("Supabase not available")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.url}/rest/v1/proactive_insights?id=eq.{insight_id}&user_id=eq.{user_id}",
                    json=update_data,
                    headers={
                        "apikey": self.key,
                        "Authorization": f"Bearer {self.key}",
                        "Content-Type": "application/json",
                    },
                    timeout=10.0,
                )

                if response.status_code not in (200, 204):
                    logger.error(
                        f"Failed to update proactive insight: {response.status_code} {response.text}"
                    )
                    return False

                return True

        except Exception as e:
            logger.error(f"Error updating proactive insight: {e}", exc_info=True)
            return False

    async def delete_proactive_insight(self, insight_id: str, user_id: str) -> bool:
        """Delete a proactive insight"""
        if not self.available:
            raise RuntimeError("Supabase not available")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.url}/rest/v1/proactive_insights?id=eq.{insight_id}&user_id=eq.{user_id}",
                    headers={
                        "apikey": self.key,
                        "Authorization": f"Bearer {self.key}",
                        "Content-Type": "application/json",
                    },
                    timeout=10.0,
                )

                if response.status_code not in (200, 204):
                    logger.error(
                        f"Failed to delete proactive insight: {response.status_code} {response.text}"
                    )
                    return False

                return True

        except Exception as e:
            logger.error(f"Error deleting proactive insight: {e}", exc_info=True)
            return False

    # ============================================
    # Notification Preferences Methods
    # ============================================

    async def get_notification_preferences(self, user_id: str) -> Optional[Dict]:
        """Get notification preferences for a user"""
        if not self.available:
            return None

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.url}/rest/v1/notification_preferences?user_id=eq.{user_id}",
                    headers={
                        "apikey": self.key,
                        "Authorization": f"Bearer {self.key}",
                        "Content-Type": "application/json",
                    },
                    timeout=10.0,
                )

                if response.status_code != 200:
                    logger.error(
                        f"Failed to get notification preferences: {response.status_code} {response.text}"
                    )
                    return None

                data = response.json()
                if isinstance(data, list):
                    return data[0] if data else None
                return data

        except Exception as e:
            logger.error(f"Error getting notification preferences: {e}", exc_info=True)
            return None

    async def upsert_notification_preferences(
        self, user_id: str, preferences: Dict
    ) -> Dict:
        """Create or update notification preferences"""
        if not self.available:
            raise RuntimeError("Supabase not available")

        try:
            payload = {
                "user_id": user_id,
                **preferences,
                "updated_at": datetime.utcnow().isoformat() + "Z",
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.url}/rest/v1/notification_preferences",
                    json=payload,
                    headers={
                        "apikey": self.key,
                        "Authorization": f"Bearer {self.key}",
                        "Content-Type": "application/json",
                        "Prefer": "resolution=merge-duplicates,return=representation",
                    },
                    timeout=10.0,
                )

                if response.status_code not in (200, 201):
                    logger.error(
                        f"Failed to upsert notification preferences: {response.status_code} {response.text}"
                    )
                    raise RuntimeError(f"Supabase error: {response.text}")

                data = response.json()
                if isinstance(data, list):
                    return data[0] if data else {}
                return data

        except Exception as e:
            logger.error(f"Error upserting notification preferences: {e}", exc_info=True)
            raise

    # ============================================
    # Reports Methods
    # ============================================

    async def save_report(self, report_data: Dict) -> Dict:
        """Save a generated report"""
        if not self.available:
            raise RuntimeError("Supabase not available")

        try:
            payload = {
                **report_data,
                "created_at": datetime.utcnow().isoformat() + "Z",
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.url}/rest/v1/trading_reports",
                    json=payload,
                    headers={
                        "apikey": self.key,
                        "Authorization": f"Bearer {self.key}",
                        "Content-Type": "application/json",
                        "Prefer": "return=representation",
                    },
                    timeout=10.0,
                )

                if response.status_code not in (200, 201):
                    logger.error(
                        f"Failed to save report: {response.status_code} {response.text}"
                    )
                    raise RuntimeError(f"Supabase error: {response.text}")

                data = response.json()
                if isinstance(data, list):
                    return data[0] if data else {}
                return data

        except Exception as e:
            logger.error(f"Error saving report: {e}", exc_info=True)
            raise

    async def get_reports(
        self, user_id: str, report_type: Optional[str] = None, limit: int = 10
    ) -> List[Dict]:
        """Get reports for a user"""
        if not self.available:
            return []

        try:
            url = f"{self.url}/rest/v1/trading_reports?user_id=eq.{user_id}&order=created_at.desc&limit={limit}"
            if report_type:
                url += f"&report_type=eq.{report_type}"

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers={
                        "apikey": self.key,
                        "Authorization": f"Bearer {self.key}",
                        "Content-Type": "application/json",
                    },
                    timeout=10.0,
                )

                if response.status_code != 200:
                    logger.error(
                        f"Failed to get reports: {response.status_code} {response.text}"
                    )
                    return []

                return response.json()

        except Exception as e:
            logger.error(f"Error getting reports: {e}", exc_info=True)
            return []

    async def get_recent_conversations(
        self, user_id: str, limit: int = 5
    ) -> List[Dict]:
        """Get recent conversations with messages for context"""
        if not self.available:
            return []

        try:
            conversations = await self.list_conversations(user_id, limit)

            result = []
            for conv in conversations:
                conv_with_messages = await self.get_conversation(conv["id"], user_id)
                result.append(conv_with_messages)

            return result

        except Exception as e:
            logger.error(f"Error getting recent conversations: {e}", exc_info=True)
            return []
