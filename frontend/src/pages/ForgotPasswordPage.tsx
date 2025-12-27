import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Link } from "react-router-dom";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  // Success state
  if (success) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background: "linear-gradient(135deg, #1D1A16 0%, #2A1F0F 50%, #1D1A16 100%)"
      }}>
        <div style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "rgba(37, 30, 23, 0.95)",
          border: "1px solid rgba(212, 165, 69, 0.2)",
          borderRadius: "20px",
          padding: "40px",
          boxShadow: "0 25px 80px rgba(0, 0, 0, 0.5)",
          textAlign: "center"
        }}>
          <div style={{
            width: "80px",
            height: "80px",
            margin: "0 auto 24px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(245, 199, 109, 0.2) 0%, rgba(245, 199, 109, 0.1) 100%)",
            border: "2px solid rgba(245, 199, 109, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "36px"
          }}>
            ✉
          </div>
          <h1 style={{
            fontSize: "24px",
            fontWeight: "700",
            color: "#F5C76D",
            margin: "0 0 12px 0",
            fontFamily: "'Playfair Display', serif"
          }}>
            Check Your Email
          </h1>
          <p style={{
            fontSize: "14px",
            color: "#C2B280",
            margin: "0 0 24px 0",
            lineHeight: "1.6"
          }}>
            We've sent a password reset link to<br />
            <strong style={{ color: "#F5C76D" }}>{email}</strong>
          </p>
          <p style={{
            fontSize: "13px",
            color: "#8B7355",
            margin: "0 0 32px 0",
            lineHeight: "1.5"
          }}>
            Click the link in the email to reset your password. The link will expire in 1 hour.
          </p>

          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px"
          }}>
            <button
              onClick={() => {
                setSuccess(false);
                setEmail("");
              }}
              style={{
                padding: "14px 24px",
                backgroundColor: "rgba(37, 30, 23, 0.6)",
                border: "1px solid rgba(212, 165, 69, 0.2)",
                borderRadius: "10px",
                color: "#C2B280",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(212, 165, 69, 0.4)";
                e.currentTarget.style.backgroundColor = "rgba(37, 30, 23, 0.8)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(212, 165, 69, 0.2)";
                e.currentTarget.style.backgroundColor = "rgba(37, 30, 23, 0.6)";
              }}
            >
              Try a different email
            </button>
            <Link
              to="/login"
              style={{
                display: "block",
                padding: "14px 24px",
                background: "linear-gradient(135deg, #D4A545 0%, #F5C76D 50%, #D4A545 100%)",
                borderRadius: "10px",
                color: "#1D1A16",
                fontSize: "14px",
                fontWeight: "700",
                textDecoration: "none",
                textAlign: "center",
                transition: "all 0.3s ease"
              }}
            >
              Return to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      background: "linear-gradient(135deg, #1D1A16 0%, #2A1F0F 50%, #1D1A16 100%)"
    }}>
      {/* Background decorative elements */}
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0
      }}>
        <div style={{
          position: "absolute",
          top: "-50%",
          left: "-30%",
          width: "150%",
          height: "150%",
          background: "radial-gradient(circle at 40% 30%, rgba(245, 199, 109, 0.03) 0%, transparent 50%)",
        }} />
      </div>

      {/* Forgot Password Card */}
      <div style={{
        position: "relative",
        zIndex: 1,
        width: "100%",
        maxWidth: "420px",
        backgroundColor: "rgba(37, 30, 23, 0.95)",
        border: "1px solid rgba(212, 165, 69, 0.2)",
        borderRadius: "20px",
        padding: "40px",
        boxShadow: "0 25px 80px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 165, 69, 0.1) inset",
        backdropFilter: "blur(20px)"
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            marginBottom: "20px",
            background: "linear-gradient(135deg, rgba(245, 199, 109, 0.15) 0%, rgba(245, 199, 109, 0.05) 100%)",
            border: "1px solid rgba(245, 199, 109, 0.2)"
          }}>
            <span style={{ fontSize: "32px" }}>🔐</span>
          </div>
          <h1 style={{
            fontSize: "28px",
            fontWeight: "700",
            color: "#F5C76D",
            margin: "0 0 8px 0",
            fontFamily: "'Playfair Display', serif",
            letterSpacing: "0.02em"
          }}>
            Forgot Password?
          </h1>
          <p style={{
            fontSize: "14px",
            color: "#8B7355",
            margin: 0,
            lineHeight: "1.5"
          }}>
            No worries! Enter your email and we'll send you a reset link.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Email Field */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{
              display: "block",
              fontSize: "12px",
              fontWeight: "600",
              color: "#C2B280",
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>
              Email Address
            </label>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#8B7355",
                fontSize: "16px"
              }}>
                ✉
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                autoFocus
                style={{
                  width: "100%",
                  padding: "14px 14px 14px 42px",
                  backgroundColor: "rgba(29, 26, 22, 0.6)",
                  border: "1px solid rgba(212, 165, 69, 0.15)",
                  borderRadius: "10px",
                  color: "#F7E7C6",
                  fontSize: "15px",
                  outline: "none",
                  transition: "all 0.2s ease",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(245, 199, 109, 0.5)";
                  e.target.style.backgroundColor = "rgba(29, 26, 22, 0.8)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(212, 165, 69, 0.15)";
                  e.target.style.backgroundColor = "rgba(29, 26, 22, 0.6)";
                }}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              padding: "12px 16px",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "10px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              <span style={{ color: "#ef4444", fontSize: "16px" }}>⚠</span>
              <span style={{ color: "#ef4444", fontSize: "13px" }}>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "16px",
              background: loading
                ? "rgba(245, 199, 109, 0.5)"
                : "linear-gradient(135deg, #D4A545 0%, #F5C76D 50%, #D4A545 100%)",
              border: "none",
              borderRadius: "10px",
              color: "#1D1A16",
              fontSize: "15px",
              fontWeight: "700",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              boxShadow: loading ? "none" : "0 4px 20px rgba(245, 199, 109, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginBottom: "16px"
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 25px rgba(245, 199, 109, 0.4)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 20px rgba(245, 199, 109, 0.3)";
            }}
          >
            {loading ? (
              <>
                <span style={{
                  width: "18px",
                  height: "18px",
                  border: "2px solid transparent",
                  borderTopColor: "#1D1A16",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite"
                }} />
                Sending...
              </>
            ) : (
              "Send Reset Link"
            )}
          </button>

          {/* Back to Login */}
          <Link
            to="/login"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
              padding: "14px",
              backgroundColor: "rgba(37, 30, 23, 0.6)",
              border: "1px solid rgba(212, 165, 69, 0.15)",
              borderRadius: "10px",
              color: "#C2B280",
              fontSize: "14px",
              fontWeight: "600",
              textDecoration: "none",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(212, 165, 69, 0.3)";
              e.currentTarget.style.backgroundColor = "rgba(37, 30, 23, 0.8)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(212, 165, 69, 0.15)";
              e.currentTarget.style.backgroundColor = "rgba(37, 30, 23, 0.6)";
            }}
          >
            <span>←</span>
            Back to Login
          </Link>
        </form>

        {/* Help Text */}
        <div style={{
          marginTop: "32px",
          paddingTop: "24px",
          borderTop: "1px solid rgba(212, 165, 69, 0.1)",
          textAlign: "center"
        }}>
          <p style={{
            margin: 0,
            fontSize: "12px",
            color: "#6B5D4D",
            lineHeight: "1.5"
          }}>
            Remember your password?{" "}
            <Link to="/login" style={{ color: "#8B7355" }}>Sign in</Link>
            <br />
            Don't have an account?{" "}
            <Link to="/signup" style={{ color: "#8B7355" }}>Create one</Link>
          </p>
        </div>
      </div>

      {/* CSS Animation for spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
