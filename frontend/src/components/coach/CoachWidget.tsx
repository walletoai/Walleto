/**
 * CoachWidget: Main chat interface for AI trading coach
 * Expandable chat window with conversation history and message input
 */

import React, { useState, useEffect, useRef } from "react";
import * as coachApi from "../../api/coach";

interface CoachWidgetProps {
  userId: string;
  conversationId?: string;
  onClose: () => void;
}

export const CoachWidget: React.FC<CoachWidgetProps> = ({
  userId,
  conversationId: initialConversationId,
  onClose,
}) => {
  // Debug log the userId being passed
  console.log("🔍 CoachWidget userId:", userId);

  const [isExpanded, setIsExpanded] = useState(true);
  const [messages, setMessages] = useState<coachApi.Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<coachApi.ConversationListItem[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    initialConversationId || null
  );
  const [showConversationPanel, setShowConversationPanel] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();

    // If no conversation ID provided, create a new one
    if (!initialConversationId) {
      handleNewConversation();
    }
  }, [userId]);

  // Load conversation messages when ID changes
  useEffect(() => {
    if (currentConversationId) {
      loadConversation();
    }
  }, [currentConversationId]);

  const loadConversations = async () => {
    try {
      const result = await coachApi.listConversations(userId, 10);
      setConversations(result.conversations.filter((c) => !c.deleted));
      setError(null);
    } catch (err) {
      console.error("Error loading conversations:", err);
      setError("Failed to load conversations");
    }
  };

  const loadConversation = async () => {
    if (!currentConversationId) return;

    try {
      const conversation = await coachApi.getConversation(userId, currentConversationId);
      setMessages(conversation.messages);
      setError(null);
    } catch (err) {
      console.error("Error loading conversation:", err);
      setError("Failed to load conversation");
    }
  };

  const handleNewConversation = async () => {
    try {
      const convId = await coachApi.createConversation(userId);
      setCurrentConversationId(convId);
      setMessages([]);
      setInput("");
      await loadConversations();
      setError(null);
    } catch (err) {
      console.error("Error creating conversation:", err);
      setError("Failed to create new conversation");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || !currentConversationId) return;

    const userMessage: coachApi.Message = {
      id: "temp-" + Date.now(),
      role: "user",
      content: input,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await coachApi.sendMessage(userId, currentConversationId, input);
      setMessages((prev) => [...prev, response]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to get coach response";
      setError(errorMsg);
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (convId: string) => {
    try {
      await coachApi.deleteConversation(userId, convId);
      await loadConversations();
      if (convId === currentConversationId) {
        setCurrentConversationId(null);
        setMessages([]);
      }
      setError(null);
    } catch (err) {
      console.error("Error deleting conversation:", err);
      setError("Failed to delete conversation");
    }
  };

  const handleImportTrades = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    setImportMessage(null);

    try {
      const result = await coachApi.importTrades(userId, file);
      const message = `✓ Imported ${result.trades_imported} trades${
        result.trades_skipped > 0 ? `, skipped ${result.trades_skipped}` : ""
      }${result.errors.length > 0 ? ` (${result.errors.length} errors)` : ""}`;
      setImportMessage(message);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Clear message after 5 seconds
      setTimeout(() => setImportMessage(null), 5000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to import trades";
      setImportMessage(`✗ ${errorMsg}`);
      setTimeout(() => setImportMessage(null), 5000);
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <>
      {/* Conversation Panel Modal */}
      {showConversationPanel && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 999,
            display: "flex",
            alignItems: "flex-end",
          }}
          onClick={() => setShowConversationPanel(false)}
        >
          <div
            style={{
              position: "fixed",
              right: 0,
              top: 0,
              bottom: 0,
              width: "320px",
              backgroundColor: "rgba(29, 26, 22, 0.98)",
              border: "1px solid rgba(245, 199, 109, 0.3)",
              borderRadius: "12px 0 0 12px",
              boxShadow: "-10px 0 40px rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(15px)",
              display: "flex",
              flexDirection: "column",
              zIndex: 999,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel Header */}
            <div
              style={{
                padding: "20px",
                borderBottom: "1px solid rgba(245, 199, 109, 0.2)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "rgba(52, 45, 35, 0.8)",
              }}
            >
              <h3 style={{ margin: 0, color: "#F5C76D", fontSize: "16px", fontWeight: "700" }}>
                📋 Conversations
              </h3>
              <button
                onClick={() => setShowConversationPanel(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#F5C76D",
                  cursor: "pointer",
                  fontSize: "18px",
                  padding: "0",
                }}
              >
                ✕
              </button>
            </div>

            {/* New Chat Button */}
            <button
              onClick={() => {
                handleNewConversation();
                setShowConversationPanel(false);
              }}
              style={{
                margin: "12px",
                padding: "12px 16px",
                border: "none",
                backgroundColor: "rgba(52, 211, 153, 0.2)",
                color: "#10b981",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "600",
                borderRadius: "8px",
                transition: "all 200ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(52, 211, 153, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(52, 211, 153, 0.2)";
              }}
            >
              ✨ New Chat
            </button>

            {/* Import Trades Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importLoading}
              style={{
                margin: "0 12px 12px 12px",
                padding: "12px 16px",
                border: "none",
                backgroundColor: importLoading
                  ? "rgba(59, 130, 246, 0.1)"
                  : "rgba(59, 130, 246, 0.2)",
                color: importLoading ? "#9ca3af" : "#3b82f6",
                cursor: importLoading ? "default" : "pointer",
                fontSize: "13px",
                fontWeight: "600",
                borderRadius: "8px",
                transition: "all 200ms ease",
              }}
              onMouseEnter={(e) => {
                if (!importLoading) {
                  e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.3)";
                }
              }}
              onMouseLeave={(e) => {
                if (!importLoading) {
                  e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.2)";
                }
              }}
            >
              {importLoading ? "⏳ Importing..." : "📤 Import Trades"}
            </button>

            {/* Import Status Message */}
            {importMessage && (
              <div
                style={{
                  margin: "0 12px 12px 12px",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  backgroundColor: importMessage.startsWith("✓")
                    ? "rgba(34, 197, 94, 0.1)"
                    : "rgba(239, 68, 68, 0.1)",
                  color: importMessage.startsWith("✓") ? "#22c55e" : "#ef4444",
                  border:
                    importMessage.startsWith("✓") ?
                    "1px solid rgba(34, 197, 94, 0.3)"
                    : "1px solid rgba(239, 68, 68, 0.3)",
                }}
              >
                {importMessage}
              </div>
            )}

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImportTrades}
              style={{ display: "none" }}
            />

            {/* Conversations List */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "0 8px 12px 8px",
              }}
            >
              {conversations.length === 0 ? (
                <div
                  style={{
                    padding: "20px 12px",
                    textAlign: "center",
                    color: "#8B7355",
                    fontSize: "13px",
                  }}
                >
                  No conversations yet
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    style={{
                      padding: "12px",
                      margin: "4px 0",
                      borderRadius: "8px",
                      backgroundColor:
                        currentConversationId === conv.id
                          ? "rgba(245, 199, 109, 0.15)"
                          : "rgba(52, 45, 35, 0.5)",
                      cursor: "pointer",
                      transition: "all 200ms ease",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "8px",
                    }}
                    onClick={() => {
                      setCurrentConversationId(conv.id);
                      setShowConversationPanel(false);
                    }}
                    onMouseEnter={(e) => {
                      if (currentConversationId !== conv.id) {
                        e.currentTarget.style.backgroundColor = "rgba(52, 45, 35, 0.8)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentConversationId !== conv.id) {
                        e.currentTarget.style.backgroundColor = "rgba(52, 45, 35, 0.5)";
                      }
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#F5C76D",
                          fontWeight: "500",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          marginBottom: "4px",
                        }}
                      >
                        {conv.title}
                      </div>
                      <div
                        style={{
                          fontSize: "10px",
                          color: "#8B7355",
                        }}
                      >
                        {conv.message_count} msg{conv.message_count !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(conv.id);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        fontSize: "14px",
                        padding: "0",
                        flexShrink: 0,
                      }}
                      title="Delete conversation"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Widget */}
      <div
        style={{
          position: "fixed",
          bottom: "88px",
          right: "24px",
          width: isExpanded ? "520px" : "300px",
          maxHeight: "680px",
          height: "680px",
          backgroundColor: "rgba(29, 26, 22, 0.98)",
          border: "1px solid rgba(245, 199, 109, 0.3)",
          borderRadius: "16px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(15px)",
          zIndex: 998,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
      {/* Header */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid rgba(245, 199, 109, 0.2)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "rgba(52, 45, 35, 0.8)",
          backgroundImage: "linear-gradient(135deg, rgba(245, 199, 109, 0.08) 0%, transparent 100%)",
        }}
      >
        <div>
          <h3 style={{ margin: 0, color: "#F5C76D", fontSize: "20px", fontWeight: "700", marginBottom: "4px" }}>
            🤖 Trading Coach
          </h3>
          <p style={{ margin: 0, color: "#8B7355", fontSize: "12px" }}>AI-powered trading insights</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setShowConversationPanel(!showConversationPanel)}
            style={{
              background: "none",
              border: "none",
              color: "#F5C76D",
              cursor: "pointer",
              fontSize: "16px",
              padding: "4px 8px",
              borderRadius: "4px",
              backgroundColor: "rgba(245, 199, 109, 0.1)",
              transition: "all 200ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(245, 199, 109, 0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(245, 199, 109, 0.1)";
            }}
            title="View all conversations"
          >
            📋
          </button>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#F5C76D",
              cursor: "pointer",
              fontSize: "20px",
              padding: "0 4px",
            }}
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>


      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          backgroundColor: "rgba(29, 26, 22, 0.6)",
        }}
      >
        {messages.length === 0 && !error && (
          <div
            style={{
              textAlign: "center",
              color: "#8B7355",
              fontSize: "14px",
              marginTop: "auto",
              marginBottom: "auto",
              padding: "40px 20px",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🤖</div>
            <h4 style={{ margin: "0 0 12px 0", color: "#F5C76D", fontSize: "18px", fontWeight: "600" }}>
              Welcome to your AI Trading Coach
            </h4>
            <p style={{ margin: "0 0 20px 0", lineHeight: "1.6", fontSize: "13px" }}>
              I analyze your trades and provide personalized coaching to help you improve.
            </p>
            <div style={{ textAlign: "left", display: "inline-block" }}>
              <p style={{ margin: "0 0 12px 0", fontSize: "12px", fontWeight: "600", color: "#F5C76D" }}>💡 Try asking:</p>
              <p style={{ margin: "6px 0", fontSize: "12px" }}>• Why am I losing money?</p>
              <p style={{ margin: "6px 0", fontSize: "12px" }}>• What patterns do I have?</p>
              <p style={{ margin: "6px 0", fontSize: "12px" }}>• How can I improve my win rate?</p>
              <p style={{ margin: "6px 0", fontSize: "12px" }}>• Analyze my best/worst trades</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              gap: "8px",
            }}
          >
            <div
              style={{
                maxWidth: "85%",
                padding: "12px 16px",
                borderRadius: "12px",
                backgroundColor:
                  msg.role === "user"
                    ? "rgba(245, 199, 109, 0.25)"
                    : "rgba(52, 211, 153, 0.18)",
                border: msg.role === "user"
                  ? "1px solid rgba(245, 199, 109, 0.3)"
                  : "1px solid rgba(52, 211, 153, 0.25)",
                color: msg.role === "user" ? "#F5C76D" : "#D4AF9E",
                fontSize: "14px",
                lineHeight: "1.5",
                wordWrap: "break-word",
              }}
            >
              {msg.content}
              {msg.tokens_used && msg.role === "assistant" && (
                <div
                  style={{
                    fontSize: "10px",
                    color: "#8B7355",
                    marginTop: "6px",
                    paddingTop: "6px",
                    borderTop: "1px solid rgba(139, 115, 85, 0.3)",
                  }}
                >
                  {msg.tokens_used.input + msg.tokens_used.output} tokens
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div
            style={{
              display: "flex",
              gap: "4px",
              alignItems: "center",
              color: "#8B7355",
              fontSize: "13px",
            }}
          >
            <span>Coach is thinking</span>
            <span style={{ animation: "blink 1.4s infinite" }}>●</span>
            <span style={{ animation: "blink 1.4s infinite", animationDelay: "0.2s" }}>
              ●
            </span>
            <span style={{ animation: "blink 1.4s infinite", animationDelay: "0.4s" }}>
              ●
            </span>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              color: "#ef4444",
              fontSize: "12px",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSendMessage}
        style={{
          padding: "16px 20px",
          borderTop: "1px solid rgba(245, 199, 109, 0.15)",
          backgroundColor: "rgba(42, 37, 31, 0.8)",
          display: "flex",
          gap: "10px",
          alignItems: "flex-end",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your coach something..."
          disabled={loading}
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: "10px",
            border: "1px solid rgba(245, 199, 109, 0.2)",
            backgroundColor: "rgba(37, 30, 23, 0.9)",
            color: "#F5C76D",
            fontSize: "14px",
            outline: "none",
            opacity: loading ? 0.5 : 1,
            cursor: loading ? "not-allowed" : "text",
            transition: "all 200ms ease",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "rgba(245, 199, 109, 0.4)";
            e.currentTarget.style.boxShadow = "0 0 8px rgba(245, 199, 109, 0.1)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "rgba(245, 199, 109, 0.2)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            border: "1px solid rgba(245, 199, 109, 0.3)",
            backgroundColor: "rgba(245, 199, 109, 0.2)",
            color: "#F5C76D",
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            fontSize: "16px",
            fontWeight: "700",
            opacity: loading || !input.trim() ? 0.5 : 1,
            transition: "all 200ms ease",
            minWidth: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            if (!loading && input.trim()) {
              e.currentTarget.style.backgroundColor = "rgba(245, 199, 109, 0.3)";
              e.currentTarget.style.borderColor = "rgba(245, 199, 109, 0.5)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(245, 199, 109, 0.2)";
            e.currentTarget.style.borderColor = "rgba(245, 199, 109, 0.3)";
          }}
          title="Send message"
        >
          {loading ? "⏳" : "→"}
        </button>
      </form>

      {/* CSS for blinking animation */}
      <style>{`
        @keyframes blink {
          0%, 20%, 50%, 80%, 100% {
            opacity: 1;
          }
          40% {
            opacity: 0.5;
          }
          60% {
            opacity: 0.3;
          }
        }
      `}</style>
      </div>
    </>
  );
};

export default CoachWidget;
