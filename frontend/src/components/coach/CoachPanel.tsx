/**
 * CoachPanel: Redesigned AI Trading Coach with tabbed interface
 * Features: Chat, Insights, Reports tabs with glass morphism design
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import * as coachApi from "../../api/coach";

// Tab types
type TabType = "chat" | "insights" | "reports";

interface CoachPanelProps {
  userId: string;
  onClose: () => void;
  isOpen: boolean;
}

export const CoachPanel: React.FC<CoachPanelProps> = ({
  userId,
  onClose,
  isOpen,
}) => {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("chat");

  // Chat state
  const [messages, setMessages] = useState<coachApi.Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Insights state
  const [insights, setInsights] = useState<coachApi.ProactiveInsight[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Reports state
  const [dailyReports, setDailyReports] = useState<coachApi.TradingReport[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<coachApi.TradingReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  // Patterns state
  const [patterns, setPatterns] = useState<coachApi.TradingPattern[]>([]);
  const [patternsLoading, setPatternsLoading] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Auto-scroll to bottom in chat
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Initialize conversation when panel opens
  useEffect(() => {
    if (isOpen && !currentConversationId) {
      initializeConversation();
    }
  }, [isOpen]);

  // Load insights when tab changes
  useEffect(() => {
    if (activeTab === "insights") {
      loadInsights();
      loadPatterns();
    } else if (activeTab === "reports") {
      loadReports();
    }
  }, [activeTab, userId]);

  // Poll for new insights periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (isOpen) {
        loadInsightsCount();
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [isOpen, userId]);

  // Initialize or create conversation
  const initializeConversation = async () => {
    setError(null);
    try {
      const convId = await coachApi.createConversation(userId);
      setCurrentConversationId(convId);
      setMessages([]);
    } catch (err) {
      console.error("Error creating conversation:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to start conversation";
      setError(`Unable to connect to AI Coach: ${errorMsg}. Make sure the backend is running.`);
    }
  };

  // Load insights
  const loadInsights = async () => {
    setInsightsLoading(true);
    try {
      const result = await coachApi.getPendingInsights(userId, 20);
      setInsights(result.insights);
      setUnreadCount(result.unread_count);
    } catch (err) {
      console.error("Error loading insights:", err);
    } finally {
      setInsightsLoading(false);
    }
  };

  // Load just the count for badge
  const loadInsightsCount = async () => {
    try {
      const result = await coachApi.getPendingInsights(userId, 1, true);
      setUnreadCount(result.unread_count);
    } catch (err) {
      console.error("Error loading insights count:", err);
    }
  };

  // Load patterns
  const loadPatterns = async () => {
    setPatternsLoading(true);
    try {
      const result = await coachApi.getPatterns(userId, 10);
      setPatterns(result.patterns);
    } catch (err) {
      console.error("Error loading patterns:", err);
    } finally {
      setPatternsLoading(false);
    }
  };

  // Load reports
  const loadReports = async () => {
    setReportsLoading(true);
    try {
      const [daily, weekly] = await Promise.all([
        coachApi.getDailyReports(userId, 7),
        coachApi.getWeeklyReports(userId, 4),
      ]);
      setDailyReports(daily.reports);
      setWeeklyReports(weekly.reports);
    } catch (err) {
      console.error("Error loading reports:", err);
    } finally {
      setReportsLoading(false);
    }
  };

  // Send message
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
      const errorMsg = err instanceof Error ? err.message : "Failed to get response";
      setError(errorMsg);
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setLoading(false);
    }
  };

  // Mark insight as read
  const handleMarkInsightRead = async (insightId: string) => {
    try {
      await coachApi.markInsightRead(userId, insightId);
      setInsights((prev) =>
        prev.map((i) => (i.id === insightId ? { ...i, is_read: true } : i))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error marking insight as read:", err);
    }
  };

  // Dismiss insight
  const handleDismissInsight = async (insightId: string) => {
    try {
      await coachApi.dismissInsight(userId, insightId);
      setInsights((prev) => prev.filter((i) => i.id !== insightId));
    } catch (err) {
      console.error("Error dismissing insight:", err);
    }
  };

  // Quick action prompts
  const quickActions = [
    { label: "Analyze my week", prompt: "How did I do this week? What patterns do you see?" },
    { label: "Find mistakes", prompt: "What mistakes am I making? How can I improve?" },
    { label: "Best setups", prompt: "What are my most profitable trading setups?" },
    { label: "Risk check", prompt: "How is my risk management? Am I overleveraging?" },
  ];

  // Severity badge colors
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return { bg: "rgba(239, 68, 68, 0.2)", border: "rgba(239, 68, 68, 0.4)", text: "#ef4444" };
      case "warning":
        return { bg: "rgba(245, 158, 11, 0.2)", border: "rgba(245, 158, 11, 0.4)", text: "#f59e0b" };
      default:
        return { bg: "rgba(59, 130, 246, 0.2)", border: "rgba(59, 130, 246, 0.4)", text: "#3b82f6" };
    }
  };

  // Pattern impact colors
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "positive":
        return "#22c55e";
      case "negative":
        return "#ef4444";
      default:
        return "#8B7355";
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "88px",
        right: "24px",
        width: "420px",
        height: "70vh",
        maxHeight: "700px",
        backgroundColor: "rgba(29, 26, 22, 0.98)",
        border: "1px solid rgba(245, 199, 109, 0.3)",
        borderRadius: "16px",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(20px)",
        zIndex: 998,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        animation: "slideIn 0.3s ease-out",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid rgba(245, 199, 109, 0.2)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "rgba(52, 45, 35, 0.8)",
          backgroundImage: "linear-gradient(135deg, rgba(245, 199, 109, 0.08) 0%, transparent 100%)",
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              color: "#F5C76D",
              fontSize: "18px",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            AI Coach
          </h3>
          <p style={{ margin: "4px 0 0", color: "#8B7355", fontSize: "11px" }}>
            Powered by Claude
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#8B7355",
            cursor: "pointer",
            fontSize: "20px",
            padding: "4px",
            borderRadius: "4px",
            transition: "all 200ms ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#F5C76D")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#8B7355")}
        >
          x
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid rgba(245, 199, 109, 0.15)",
          backgroundColor: "rgba(37, 30, 23, 0.5)",
        }}
      >
        {(["chat", "insights", "reports"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: "12px 16px",
              border: "none",
              background: "none",
              color: activeTab === tab ? "#F5C76D" : "#8B7355",
              fontSize: "13px",
              fontWeight: activeTab === tab ? "600" : "400",
              cursor: "pointer",
              borderBottom: activeTab === tab ? "2px solid #F5C76D" : "2px solid transparent",
              transition: "all 200ms ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            {tab === "chat" && "Chat"}
            {tab === "insights" && (
              <>
                Insights
                {unreadCount > 0 && (
                  <span
                    style={{
                      backgroundColor: "#ef4444",
                      color: "white",
                      fontSize: "10px",
                      fontWeight: "700",
                      padding: "2px 6px",
                      borderRadius: "10px",
                      minWidth: "18px",
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </>
            )}
            {tab === "reports" && "Reports"}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Chat Tab */}
        {activeTab === "chat" && (
          <>
            {/* Quick Actions */}
            {messages.length === 0 && (
              <div
                style={{
                  padding: "16px",
                  borderBottom: "1px solid rgba(245, 199, 109, 0.1)",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => {
                      setInput(action.prompt);
                    }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "16px",
                      border: "1px solid rgba(245, 199, 109, 0.2)",
                      backgroundColor: "rgba(245, 199, 109, 0.1)",
                      color: "#F5C76D",
                      fontSize: "12px",
                      cursor: "pointer",
                      transition: "all 200ms ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(245, 199, 109, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(245, 199, 109, 0.1)";
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            {/* Messages */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {messages.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    color: "#8B7355",
                    padding: "40px 20px",
                    marginTop: "auto",
                    marginBottom: "auto",
                  }}
                >
                  <div style={{ fontSize: "36px", marginBottom: "12px" }}>AI</div>
                  <h4 style={{ margin: "0 0 8px", color: "#F5C76D", fontSize: "16px" }}>
                    Your Personal Trading Coach
                  </h4>
                  <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.5" }}>
                    Ask me anything about your trading performance, patterns, or how to improve.
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "85%",
                      padding: "10px 14px",
                      borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                      backgroundColor:
                        msg.role === "user"
                          ? "rgba(245, 199, 109, 0.2)"
                          : "rgba(52, 211, 153, 0.15)",
                      border:
                        msg.role === "user"
                          ? "1px solid rgba(245, 199, 109, 0.3)"
                          : "1px solid rgba(52, 211, 153, 0.25)",
                      color: msg.role === "user" ? "#F5C76D" : "#D4AF9E",
                      fontSize: "13px",
                      lineHeight: "1.5",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div style={{ display: "flex", gap: "4px", color: "#8B7355", fontSize: "12px" }}>
                  <span>Thinking</span>
                  <span className="dot-animate">...</span>
                </div>
              )}

              {error && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "8px",
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    color: "#ef4444",
                    fontSize: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div>{error}</div>
                  {!currentConversationId && (
                    <button
                      onClick={initializeConversation}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        backgroundColor: "transparent",
                        color: "#ef4444",
                        fontSize: "11px",
                        cursor: "pointer",
                        alignSelf: "flex-start",
                      }}
                    >
                      Retry Connection
                    </button>
                  )}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSendMessage}
              style={{
                padding: "12px 16px",
                borderTop: "1px solid rgba(245, 199, 109, 0.15)",
                backgroundColor: "rgba(37, 30, 23, 0.5)",
                display: "flex",
                gap: "8px",
              }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask your coach..."
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid rgba(245, 199, 109, 0.2)",
                  backgroundColor: "rgba(37, 30, 23, 0.8)",
                  color: "#F5C76D",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={loading || !input.trim() || !currentConversationId}
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: loading || !input.trim() || !currentConversationId ? "rgba(245, 199, 109, 0.1)" : "rgba(245, 199, 109, 0.3)",
                  color: "#F5C76D",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: loading || !input.trim() || !currentConversationId ? "not-allowed" : "pointer",
                  opacity: loading || !input.trim() || !currentConversationId ? 0.5 : 1,
                }}
              >
                {!currentConversationId ? "Connecting..." : loading ? "Sending..." : "Send"}
              </button>
            </form>
          </>
        )}

        {/* Insights Tab */}
        {activeTab === "insights" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
            {insightsLoading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#8B7355" }}>
                Loading insights...
              </div>
            ) : insights.length === 0 && patterns.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#8B7355" }}>
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>i</div>
                <p style={{ fontSize: "13px" }}>No insights yet. Keep trading!</p>
              </div>
            ) : (
              <>
                {/* Patterns Section */}
                {patterns.length > 0 && (
                  <div style={{ marginBottom: "20px" }}>
                    <h4 style={{ margin: "0 0 12px", color: "#F5C76D", fontSize: "13px", fontWeight: "600" }}>
                      Detected Patterns
                    </h4>
                    {patterns.slice(0, 5).map((pattern, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "12px",
                          marginBottom: "8px",
                          borderRadius: "8px",
                          backgroundColor: "rgba(52, 45, 35, 0.5)",
                          border: "1px solid rgba(245, 199, 109, 0.1)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                          <span style={{ fontSize: "12px", color: "#F5C76D", fontWeight: "500" }}>
                            {pattern.pattern_type.replace(/_/g, " ")}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              color: getImpactColor(pattern.impact),
                              fontWeight: "500",
                            }}
                          >
                            {Math.round(pattern.confidence * 100)}% confident
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: "12px", color: "#D4AF9E", lineHeight: "1.4" }}>
                          {pattern.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Insights List */}
                {insights.length > 0 && (
                  <div>
                    <h4 style={{ margin: "0 0 12px", color: "#F5C76D", fontSize: "13px", fontWeight: "600" }}>
                      Recent Insights
                    </h4>
                    {insights.map((insight) => {
                      const colors = getSeverityColor(insight.severity);
                      return (
                        <div
                          key={insight.id}
                          style={{
                            padding: "12px",
                            marginBottom: "8px",
                            borderRadius: "8px",
                            backgroundColor: colors.bg,
                            border: `1px solid ${colors.border}`,
                            opacity: insight.is_read ? 0.7 : 1,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                            <span
                              style={{
                                fontSize: "12px",
                                color: colors.text,
                                fontWeight: "600",
                                textTransform: "uppercase",
                              }}
                            >
                              {insight.insight_type.replace(/_/g, " ")}
                            </span>
                            <div style={{ display: "flex", gap: "8px" }}>
                              {!insight.is_read && (
                                <button
                                  onClick={() => handleMarkInsightRead(insight.id)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "#8B7355",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                  }}
                                >
                                  Mark read
                                </button>
                              )}
                              <button
                                onClick={() => handleDismissInsight(insight.id)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#8B7355",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                }}
                              >
                                x
                              </button>
                            </div>
                          </div>
                          <h5 style={{ margin: "0 0 6px", fontSize: "13px", color: "#F5C76D" }}>
                            {insight.title}
                          </h5>
                          <p style={{ margin: 0, fontSize: "12px", color: "#D4AF9E", lineHeight: "1.4" }}>
                            {insight.content.length > 200
                              ? insight.content.substring(0, 200) + "..."
                              : insight.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
            {reportsLoading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#8B7355" }}>
                Loading reports...
              </div>
            ) : dailyReports.length === 0 && weeklyReports.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#8B7355" }}>
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>R</div>
                <p style={{ fontSize: "13px" }}>No reports generated yet.</p>
                <button
                  onClick={() => coachApi.generateDailyReport(userId)}
                  style={{
                    marginTop: "12px",
                    padding: "10px 16px",
                    borderRadius: "8px",
                    border: "1px solid rgba(245, 199, 109, 0.3)",
                    backgroundColor: "rgba(245, 199, 109, 0.1)",
                    color: "#F5C76D",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Generate Today's Report
                </button>
              </div>
            ) : (
              <>
                {/* Daily Reports */}
                {dailyReports.length > 0 && (
                  <div style={{ marginBottom: "20px" }}>
                    <h4 style={{ margin: "0 0 12px", color: "#F5C76D", fontSize: "13px", fontWeight: "600" }}>
                      Daily Reports
                    </h4>
                    {dailyReports.map((report) => (
                      <div
                        key={report.id}
                        style={{
                          padding: "12px",
                          marginBottom: "8px",
                          borderRadius: "8px",
                          backgroundColor: "rgba(52, 45, 35, 0.5)",
                          border: "1px solid rgba(245, 199, 109, 0.1)",
                          cursor: "pointer",
                        }}
                        onClick={() =>
                          setExpandedReport(expandedReport === report.id ? null : report.id)
                        }
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                          <span style={{ fontSize: "12px", color: "#F5C76D", fontWeight: "500" }}>
                            {report.title}
                          </span>
                          <span style={{ fontSize: "11px", color: "#8B7355" }}>
                            {new Date(report.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: "12px", color: "#D4AF9E", lineHeight: "1.4" }}>
                          {report.summary}
                        </p>
                        {expandedReport === report.id && (
                          <div
                            style={{
                              marginTop: "12px",
                              paddingTop: "12px",
                              borderTop: "1px solid rgba(245, 199, 109, 0.1)",
                              fontSize: "12px",
                              color: "#D4AF9E",
                              lineHeight: "1.5",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {report.content}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Weekly Reports */}
                {weeklyReports.length > 0 && (
                  <div>
                    <h4 style={{ margin: "0 0 12px", color: "#F5C76D", fontSize: "13px", fontWeight: "600" }}>
                      Weekly Reports
                    </h4>
                    {weeklyReports.map((report) => (
                      <div
                        key={report.id}
                        style={{
                          padding: "12px",
                          marginBottom: "8px",
                          borderRadius: "8px",
                          backgroundColor: "rgba(59, 130, 246, 0.1)",
                          border: "1px solid rgba(59, 130, 246, 0.2)",
                          cursor: "pointer",
                        }}
                        onClick={() =>
                          setExpandedReport(expandedReport === report.id ? null : report.id)
                        }
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                          <span style={{ fontSize: "12px", color: "#3b82f6", fontWeight: "500" }}>
                            {report.title}
                          </span>
                          <span style={{ fontSize: "11px", color: "#8B7355" }}>
                            {new Date(report.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: "12px", color: "#D4AF9E", lineHeight: "1.4" }}>
                          {report.summary}
                        </p>
                        {expandedReport === report.id && (
                          <div
                            style={{
                              marginTop: "12px",
                              paddingTop: "12px",
                              borderTop: "1px solid rgba(59, 130, 246, 0.2)",
                              fontSize: "12px",
                              color: "#D4AF9E",
                              lineHeight: "1.5",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {report.content}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .dot-animate {
          animation: dotBlink 1.4s infinite;
        }
        @keyframes dotBlink {
          0%, 20% { opacity: 1; }
          50% { opacity: 0.3; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default CoachPanel;
