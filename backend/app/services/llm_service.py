"""
LLMService: OpenAI API integration for coaching responses.
Handles token counting, cost tracking, and error handling.
"""

import os
import logging
from typing import List, Dict, Optional, Tuple
import tiktoken

try:
    from openai import AsyncOpenAI, RateLimitError, APIError
except ImportError:
    AsyncOpenAI = None
    RateLimitError = Exception
    APIError = Exception

logger = logging.getLogger(__name__)

# Initialize OpenAI client
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    logger.warning("OPENAI_API_KEY not set. Coach features will not work.")
    client = None
else:
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)


class LLMService:
    """Service for interacting with OpenAI API for trading coach responses."""

    MODEL = "gpt-4o"  # Using GPT-4o for best quality and wider availability
    ENCODING = "cl100k_base"  # Encoding for GPT-4

    # Cost per 1K tokens (2024 pricing)
    COST_PER_1K_INPUT = 0.005  # $0.005 per 1K input tokens for gpt-4o
    COST_PER_1K_OUTPUT = 0.015  # $0.015 per 1K output tokens for gpt-4o

    def __init__(self):
        if not client:
            raise RuntimeError("OpenAI API key not configured. Set OPENAI_API_KEY environment variable.")
        self.client = client

    @staticmethod
    def count_tokens(text: str) -> int:
        """Count tokens in a string using tiktoken."""
        try:
            enc = tiktoken.get_encoding(LLMService.ENCODING)
            tokens = enc.encode(text)
            return len(tokens)
        except Exception as e:
            logger.error(f"Error counting tokens: {e}")
            # Rough estimate: ~4 characters per token
            return len(text) // 4

    async def get_coach_response(
        self,
        system_prompt: str,
        messages: List[Dict],
        max_retries: int = 3,
    ) -> Tuple[str, int, int]:
        """
        Get response from OpenAI API.

        Args:
            system_prompt: System prompt for the coach
            messages: Message history in OpenAI format [{"role": "user"/"assistant", "content": "..."}]
            max_retries: Number of retries on rate limit

        Returns:
            Tuple of (response_text, input_tokens_used, output_tokens_used)

        Raises:
            RuntimeError: If API call fails after retries
        """
        if not client:
            raise RuntimeError("OpenAI API key not configured.")

        messages_with_system = [{"role": "system", "content": system_prompt}] + messages

        retries = 0
        while retries < max_retries:
            try:
                response = await client.chat.completions.create(
                    model=self.MODEL,
                    messages=messages_with_system,
                    temperature=0.7,
                    max_tokens=500,
                    timeout=30,
                )

                # Extract response
                response_text = response.choices[0].message.content
                input_tokens = response.usage.prompt_tokens
                output_tokens = response.usage.completion_tokens

                logger.info(
                    f"Coach response generated: {input_tokens} input tokens, {output_tokens} output tokens"
                )

                return response_text, input_tokens, output_tokens

            except RateLimitError as e:
                retries += 1
                if retries >= max_retries:
                    logger.error(f"Rate limit exceeded after {max_retries} retries: {e}")
                    raise RuntimeError(f"OpenAI API rate limit exceeded. Please try again in a moment.")
                wait_time = min(2 ** retries, 30)
                logger.warning(f"Rate limit hit. Retrying in {wait_time}s (attempt {retries}/{max_retries})")
                import asyncio

                await asyncio.sleep(wait_time)

            except APIError as e:
                logger.error(f"OpenAI API error: {e}")
                if "context_length_exceeded" in str(e):
                    raise RuntimeError("Conversation too long. Please start a new chat.")
                raise RuntimeError(f"OpenAI API error: {str(e)[:100]}")

            except Exception as e:
                logger.error(f"Unexpected error calling OpenAI API: {e}")
                raise RuntimeError(f"Failed to get coach response: {str(e)[:100]}")

        raise RuntimeError("Failed to get response after maximum retries")

    @staticmethod
    def calculate_cost(input_tokens: int, output_tokens: int) -> float:
        """Calculate cost for token usage."""
        input_cost = (input_tokens / 1000) * LLMService.COST_PER_1K_INPUT
        output_cost = (output_tokens / 1000) * LLMService.COST_PER_1K_OUTPUT
        return input_cost + output_cost

    @staticmethod
    def format_message_for_api(role: str, content: str) -> Dict:
        """Format a message for OpenAI API."""
        return {"role": role, "content": content}


async def test_llm_service():
    """Test LLM service connectivity."""
    try:
        service = LLMService()
        system_prompt = "You are a helpful assistant."
        messages = [{"role": "user", "content": "Hello! Are you working?"}]

        response, input_tokens, output_tokens = await service.get_coach_response(system_prompt, messages)
        print(f"✓ LLM Service working!")
        print(f"  Response: {response[:100]}...")
        print(f"  Tokens: {input_tokens} input, {output_tokens} output")
        print(f"  Cost: ${service.calculate_cost(input_tokens, output_tokens):.4f}")
    except RuntimeError as e:
        print(f"✗ LLM Service error: {e}")
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
