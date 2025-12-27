/**
 * CoachButton: Fixed position button for opening the AI coach chat
 * Located at bottom-right on every page
 */

import React from "react";

interface CoachButtonProps {
  onClick: () => void;
  unreadCount?: number;
}

export const CoachButton: React.FC<CoachButtonProps> = ({ onClick, unreadCount = 0 }) => {
  return (
    <button
      onClick={onClick}
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 999,
        width: "56px",
        height: "56px",
        borderRadius: "50%",
        backgroundColor: "#F5C76D",
        border: "none",
        boxShadow: "0 4px 12px rgba(245, 199, 109, 0.3)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "24px",
        transition: "all 0.3s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.1)";
        e.currentTarget.style.boxShadow = "0 6px 20px rgba(245, 199, 109, 0.5)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(245, 199, 109, 0.3)";
      }}
      title="Need assistance? Chat with your AI trading coach"
    >
      {/* Chat icon */}
      <span>💬</span>

      {/* Unread count badge */}
      {unreadCount > 0 && (
        <div
          style={{
            position: "absolute",
            top: "-4px",
            right: "-4px",
            backgroundColor: "#ef4444",
            color: "white",
            borderRadius: "50%",
            width: "20px",
            height: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            fontWeight: "600",
          }}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </div>
      )}
    </button>
  );
};

export default CoachButton;
