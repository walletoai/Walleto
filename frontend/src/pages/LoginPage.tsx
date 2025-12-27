import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Link, useNavigate } from "react-router-dom";

export default function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load remembered email on mount
  useEffect(() => {
    const remembered = localStorage.getItem("walleto_remember_email");
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        if (authError.message.includes("Invalid login")) {
          setError("Invalid email or password. Please try again.");
        } else {
          setError(authError.message);
        }
        setLoading(false);
        return;
      }

      // Save or clear remembered email
      if (rememberMe) {
        localStorage.setItem("walleto_remember_email", email.trim());
      } else {
        localStorage.removeItem("walleto_remember_email");
      }

      nav("/");
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
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
          left: "-50%",
          width: "200%",
          height: "200%",
          background: "radial-gradient(circle at 30% 20%, rgba(245, 199, 109, 0.03) 0%, transparent 50%)",
        }} />
        <div style={{
          position: "absolute",
          bottom: "-30%",
          right: "-30%",
          width: "80%",
          height: "80%",
          background: "radial-gradient(circle at center, rgba(212, 165, 69, 0.02) 0%, transparent 60%)",
        }} />
      </div>

      {/* Login Card */}
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
        {/* Logo & Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "72px",
            height: "72px",
            borderRadius: "16px",
            marginBottom: "20px",
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)"
          }}>
            <img
              src="/walleto-logo.jpg"
              alt="Walleto"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover"
              }}
            />
          </div>
          <h1 style={{
            fontSize: "28px",
            fontWeight: "700",
            color: "#F5C76D",
            margin: "0 0 8px 0",
            fontFamily: "'Playfair Display', serif",
            letterSpacing: "0.02em"
          }}>
            Welcome Back
          </h1>
          <p style={{
            fontSize: "14px",
            color: "#8B7355",
            margin: 0
          }}>
            Sign in to your trading journal
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          {/* Email Field */}
          <div style={{ marginBottom: "20px" }}>
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

          {/* Password Field */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{
              display: "block",
              fontSize: "12px",
              fontWeight: "600",
              color: "#C2B280",
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>
              Password
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
                🔒
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                style={{
                  width: "100%",
                  padding: "14px 48px 14px 42px",
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
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "#8B7355",
                  cursor: "pointer",
                  padding: "4px",
                  fontSize: "14px",
                  opacity: 0.8,
                  transition: "opacity 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                onMouseLeave={(e) => e.currentTarget.style.opacity = "0.8"}
              >
                {showPassword ? "👁" : "👁‍🗨"}
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password Row */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px"
          }}>
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              fontSize: "13px",
              color: "#C2B280"
            }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  width: "16px",
                  height: "16px",
                  accentColor: "#F5C76D",
                  cursor: "pointer"
                }}
              />
              Remember me
            </label>
            <Link
              to="/forgot-password"
              style={{
                fontSize: "13px",
                color: "#F5C76D",
                textDecoration: "none",
                transition: "color 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "#FCD34D"}
              onMouseLeave={(e) => e.currentTarget.style.color = "#F5C76D"}
            >
              Forgot password?
            </Link>
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

          {/* Login Button */}
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
              boxShadow: loading
                ? "none"
                : "0 4px 20px rgba(245, 199, 109, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
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
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={{
          display: "flex",
          alignItems: "center",
          margin: "28px 0",
          gap: "16px"
        }}>
          <div style={{
            flex: 1,
            height: "1px",
            background: "linear-gradient(to right, transparent, rgba(212, 165, 69, 0.3), transparent)"
          }} />
          <span style={{ color: "#8B7355", fontSize: "12px" }}>OR</span>
          <div style={{
            flex: 1,
            height: "1px",
            background: "linear-gradient(to right, transparent, rgba(212, 165, 69, 0.3), transparent)"
          }} />
        </div>

        {/* Sign Up Link */}
        <div style={{ textAlign: "center" }}>
          <p style={{
            margin: 0,
            fontSize: "14px",
            color: "#8B7355"
          }}>
            Don't have an account?{" "}
            <Link
              to="/signup"
              style={{
                color: "#F5C76D",
                fontWeight: "600",
                textDecoration: "none",
                transition: "color 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "#FCD34D"}
              onMouseLeave={(e) => e.currentTarget.style.color = "#F5C76D"}
            >
              Create Account
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: "32px",
          paddingTop: "24px",
          borderTop: "1px solid rgba(212, 165, 69, 0.1)",
          textAlign: "center"
        }}>
          <p style={{
            margin: 0,
            fontSize: "11px",
            color: "#6B5D4D"
          }}>
            By signing in, you agree to our{" "}
            <a href="#" style={{ color: "#8B7355" }}>Terms of Service</a>
            {" "}and{" "}
            <a href="#" style={{ color: "#8B7355" }}>Privacy Policy</a>
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
