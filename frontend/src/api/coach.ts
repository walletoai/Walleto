/**
 * Coach API client
 * Handles all communication with the backend coach service
 */

import { API_URL } from "../config/api";

const API_BASE = `${API_URL}/api/coach`;

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  tokens_used?: {
    input: number;
    output: number;
  };
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  messages: Message[];
}

export interface ConversationListItem {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  deleted: boolean;
}

export interface ConversationListResponse {
  conversations: ConversationListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface UserInsights {
  status?: string;
  message?: string;
  user_id?: string;
  trading_style?: string;
  risk_profile?: string;
  edge_observed?: string;
  strengths?: string[];
  weaknesses?: string[];
  favorite_symbols?: string[];
  favorite_timeframes?: string[];
  total_trades_analyzed?: number;
  last_updated?: string;
}

export interface TradeImportResult {
  success: boolean;
  trades_imported: number;
  trades_skipped: number;
  errors: string[];
}

// Proactive Insights Types
export interface ProactiveInsight {
  id: string;
  insight_type: string;
  title: string;
  content: string;
  severity: "info" | "warning" | "critical";
  user_id?: string;
  trade_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  is_read: boolean;
}

export interface InsightsListResponse {
  insights: ProactiveInsight[];
  total: number;
  unread_count: number;
}

// Reports Types
export interface TradingReport {
  id: string;
  report_type: "daily" | "weekly" | "trade_review";
  title: string;
  summary: string;
  content: string;
  metrics?: Record<string, unknown>;
  period_start?: string;
  period_end?: string;
  created_at: string;
}

export interface ReportsListResponse {
  reports: TradingReport[];
  total: number;
}

// Patterns Types
export interface TradingPattern {
  pattern_type: string;
  description: string;
  confidence: number;
  impact: "positive" | "negative" | "neutral";
  trade_count: number;
  metadata?: Record<string, unknown>;
}

export interface PatternsListResponse {
  patterns: TradingPattern[];
  total: number;
}

// Preferences Types
export interface NotificationPreferences {
  user_id: string;
  daily_summary_enabled: boolean;
  daily_summary_time: string;
  weekly_report_enabled: boolean;
  trade_review_enabled: boolean;
  pattern_alerts_enabled: boolean;
  mistake_warnings_enabled: boolean;
}

export interface UpdatePreferencesRequest {
  daily_summary_enabled?: boolean;
  daily_summary_time?: string;
  weekly_report_enabled?: boolean;
  trade_review_enabled?: boolean;
  pattern_alerts_enabled?: boolean;
  mistake_warnings_enabled?: boolean;
}

// Trade Review Types
export interface TradeReview {
  trade_id: string;
  trade: Record<string, unknown>;
  review: TradingReport | null;
}

/**
 * Create a new conversation
 */
export async function createConversation(userId: string): Promise<string> {
  try {
    const response = await fetch(`${API_BASE}/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create conversation: ${response.statusText}`);
    }

    const data = await response.json();
    return data.conversation_id;
  } catch (error) {
    console.error("Error creating conversation:", error);
    throw error;
  }
}

/**
 * List user's conversations
 */
export async function listConversations(
  userId: string,
  limit: number = 20,
  offset: number = 0,
  includeDeleted: boolean = false
): Promise<ConversationListResponse> {
  try {
    const params = new URLSearchParams({
      user_id: userId,
      limit: limit.toString(),
      offset: offset.toString(),
      include_deleted: includeDeleted.toString(),
    });

    const response = await fetch(`${API_BASE}/conversations?${params}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Failed to list conversations: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error listing conversations:", error);
    throw error;
  }
}

/**
 * Get a conversation with all messages
 */
export async function getConversation(
  userId: string,
  conversationId: string
): Promise<Conversation> {
  try {
    const params = new URLSearchParams({ user_id: userId });
    const response = await fetch(
      `${API_BASE}/conversations/${conversationId}?${params}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get conversation: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting conversation:", error);
    throw error;
  }
}

/**
 * Send a message and get coach response
 */
export async function sendMessage(
  userId: string,
  conversationId: string,
  content: string
): Promise<Message> {
  try {
    const params = new URLSearchParams({ user_id: userId });
    const response = await fetch(
      `${API_BASE}/conversations/${conversationId}/messages?${params}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          content,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `Failed to send message: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

/**
 * Delete a conversation (soft delete)
 */
export async function deleteConversation(
  userId: string,
  conversationId: string
): Promise<boolean> {
  try {
    const params = new URLSearchParams({ user_id: userId });
    const response = await fetch(
      `${API_BASE}/conversations/${conversationId}?${params}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to delete conversation: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error("Error deleting conversation:", error);
    throw error;
  }
}

/**
 * Get coach's insights about the user
 */
export async function getUserInsights(userId: string): Promise<UserInsights> {
  try {
    const response = await fetch(`${API_BASE}/insights/${userId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Failed to get insights: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting insights:", error);
    throw error;
  }
}

/**
 * Import trades from a CSV file
 */
export async function importTrades(
  userId: string,
  file: File
): Promise<TradeImportResult> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", userId);

    const response = await fetch(`${API_BASE}/import-trades?user_id=${userId}`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `Failed to import trades: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error importing trades:", error);
    throw error;
  }
}

// ============================================
// Proactive Insights API
// ============================================

/**
 * Get pending proactive insights for a user
 */
export async function getPendingInsights(
  userId: string,
  limit: number = 20,
  unreadOnly: boolean = false
): Promise<InsightsListResponse> {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      unread_only: unreadOnly.toString(),
    });

    const response = await fetch(
      `${API_BASE}/insights/pending/${userId}?${params}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get insights: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting insights:", error);
    throw error;
  }
}

/**
 * Mark an insight as read
 */
export async function markInsightRead(
  userId: string,
  insightId: string
): Promise<boolean> {
  try {
    const params = new URLSearchParams({ user_id: userId });
    const response = await fetch(
      `${API_BASE}/insights/${insightId}/read?${params}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to mark insight as read: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error("Error marking insight as read:", error);
    throw error;
  }
}

/**
 * Dismiss (delete) an insight
 */
export async function dismissInsight(
  userId: string,
  insightId: string
): Promise<boolean> {
  try {
    const params = new URLSearchParams({ user_id: userId });
    const response = await fetch(
      `${API_BASE}/insights/${insightId}?${params}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to dismiss insight: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error("Error dismissing insight:", error);
    throw error;
  }
}

// ============================================
// Reports API
// ============================================

/**
 * Get daily trading reports
 */
export async function getDailyReports(
  userId: string,
  limit: number = 7
): Promise<ReportsListResponse> {
  try {
    const params = new URLSearchParams({ limit: limit.toString() });
    const response = await fetch(
      `${API_BASE}/reports/daily/${userId}?${params}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get daily reports: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting daily reports:", error);
    throw error;
  }
}

/**
 * Get weekly trading reports
 */
export async function getWeeklyReports(
  userId: string,
  limit: number = 4
): Promise<ReportsListResponse> {
  try {
    const params = new URLSearchParams({ limit: limit.toString() });
    const response = await fetch(
      `${API_BASE}/reports/weekly/${userId}?${params}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get weekly reports: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting weekly reports:", error);
    throw error;
  }
}

/**
 * Generate a daily report for a specific date
 */
export async function generateDailyReport(
  userId: string,
  date?: string
): Promise<{ success: boolean; report?: TradingReport; message?: string }> {
  try {
    const params = new URLSearchParams();
    if (date) {
      params.append("date", date);
    }

    const response = await fetch(
      `${API_BASE}/reports/generate/daily/${userId}?${params}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to generate daily report: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error generating daily report:", error);
    throw error;
  }
}

// ============================================
// Trade Review API
// ============================================

/**
 * Get AI review for a specific trade
 */
export async function getTradeReview(
  userId: string,
  tradeId: string
): Promise<TradeReview> {
  try {
    const params = new URLSearchParams({ user_id: userId });
    const response = await fetch(
      `${API_BASE}/trades/${tradeId}/review?${params}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get trade review: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting trade review:", error);
    throw error;
  }
}

// ============================================
// Patterns API
// ============================================

/**
 * Get detected trading patterns for a user
 */
export async function getPatterns(
  userId: string,
  limit: number = 20
): Promise<PatternsListResponse> {
  try {
    const params = new URLSearchParams({ limit: limit.toString() });
    const response = await fetch(
      `${API_BASE}/patterns/${userId}?${params}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get patterns: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting patterns:", error);
    throw error;
  }
}

// ============================================
// Preferences API
// ============================================

/**
 * Get notification preferences for a user
 */
export async function getPreferences(
  userId: string
): Promise<NotificationPreferences> {
  try {
    const response = await fetch(`${API_BASE}/preferences/${userId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Failed to get preferences: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting preferences:", error);
    throw error;
  }
}

/**
 * Update notification preferences for a user
 */
export async function updatePreferences(
  userId: string,
  preferences: UpdatePreferencesRequest
): Promise<NotificationPreferences> {
  try {
    const response = await fetch(`${API_BASE}/preferences/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preferences),
    });

    if (!response.ok) {
      throw new Error(`Failed to update preferences: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating preferences:", error);
    throw error;
  }
}

// ============================================
// Context API (for debugging)
// ============================================

/**
 * Get the full user context (for debugging/testing)
 */
export async function getUserContext(
  userId: string
): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(`${API_BASE}/context/${userId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Failed to get context: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting context:", error);
    throw error;
  }
}
