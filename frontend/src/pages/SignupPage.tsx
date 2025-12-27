import { useState, useMemo, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { validateInviteCode, redeemInviteCode } from "../api/invite";

export default function SignupPage() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Invite code state
  const [inviteCode, setInviteCode] = useState("");
  const [codeValidated, setCodeValidated] = useState(false);
  const [validatingCode, setValidatingCode] = useState(false);
  const [lockedEmail, setLockedEmail] = useState<string | null>(null);

  // Check for invite code in URL
  useEffect(() => {
    const codeFromUrl = searchParams.get("code") || searchParams.get("invite");
    if (codeFromUrl) {
      setInviteCode(codeFromUrl.toUpperCase());
      handleValidateCode(codeFromUrl);
    }
  }, [searchParams]);

  // Password strength validation
  const passwordValidation = useMemo(() => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
    };
    const passed = Object.values(checks).filter(Boolean).length;
    return { checks, passed, total: 4 };
  }, [password]);

  async function handleValidateCode(code?: string) {
    const codeToValidate = code || inviteCode;
    if (!codeToValidate.trim()) {
      setError("Please enter an invite code.");
      return;
    }

    setValidatingCode(true);
    setError("");

    try {
      const result = await validateInviteCode(codeToValidate, email || undefined);

      if (result.valid) {
        setCodeValidated(true);
        if (result.locked_email) {
          setLockedEmail(result.locked_email);
          setEmail(result.locked_email);
        }
      } else {
        setError(result.message);
        setCodeValidated(false);
      }
    } catch {
      setError("Failed to validate invite code. Please try again.");
      setCodeValidated(false);
    } finally {
      setValidatingCode(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Must have validated invite code
    if (!codeValidated) {
      setError("Please enter and validate your invite code first.");
      return;
    }

    // Validation
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (passwordValidation.passed < 3) {
      setError("Please use a stronger password.");
      return;
    }

    if (!acceptTerms) {
      setError("Please accept the Terms of Service and Privacy Policy.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          setError("This email is already registered. Try logging in instead.");
        } else {
          setError(authError.message);
        }
        setLoading(false);
        return;
      }

      // Redeem the invite code
      if (data?.user) {
        try {
          await redeemInviteCode(inviteCode, data.user.id, email.trim());
        } catch (redeemError) {
          console.error("Failed to redeem invite code:", redeemError);
          // Don't block signup if redemption fails
        }
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
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)",
            border: "2px solid rgba(16, 185, 129, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "36px"
          }}>
            ✓
          </div>
          <h1 style={{
            fontSize: "24px",
            fontWeight: "700",
            color: "#10b981",
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
            We've sent a confirmation link to<br />
            <strong style={{ color: "#F5C76D" }}>{email}</strong>
          </p>
          <p style={{
            fontSize: "13px",
            color: "#8B7355",
            margin: "0 0 24px 0"
          }}>
            Click the link in the email to activate your account and start tracking your trades.
          </p>
          <Link
            to="/login"
            style={{
              display: "inline-block",
              padding: "14px 32px",
              background: "linear-gradient(135deg, #D4A545 0%, #F5C76D 50%, #D4A545 100%)",
              border: "none",
              borderRadius: "10px",
              color: "#1D1A16",
              fontSize: "14px",
              fontWeight: "700",
              textDecoration: "none",
              transition: "all 0.3s ease"
            }}
          >
            Return to Login
          </Link>
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
          right: "-50%",
          width: "200%",
          height: "200%",
          background: "radial-gradient(circle at 70% 20%, rgba(245, 199, 109, 0.03) 0%, transparent 50%)",
        }} />
      </div>

      {/* Signup Card */}
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
            Create Account
          </h1>
          <p style={{
            fontSize: "14px",
            color: "#8B7355",
            margin: 0
          }}>
            Start your trading journal today
          </p>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSignup}>
          {/* Invite Code Field */}
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
              Invite Code <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <span style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: codeValidated ? "#10b981" : "#8B7355",
                  fontSize: "16px"
                }}>
                  {codeValidated ? "✓" : "🎟"}
                </span>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value.toUpperCase());
                    setCodeValidated(false);
                  }}
                  placeholder="WALL-XXXXXXXX"
                  disabled={codeValidated}
                  style={{
                    width: "100%",
                    padding: "14px 14px 14px 42px",
                    backgroundColor: codeValidated
                      ? "rgba(16, 185, 129, 0.1)"
                      : "rgba(29, 26, 22, 0.6)",
                    border: codeValidated
                      ? "1px solid rgba(16, 185, 129, 0.5)"
                      : "1px solid rgba(212, 165, 69, 0.15)",
                    borderRadius: "10px",
                    color: "#F7E7C6",
                    fontSize: "15px",
                    fontFamily: "monospace",
                    outline: "none",
                    transition: "all 0.2s ease",
                    boxSizing: "border-box"
                  }}
                />
              </div>
              {!codeValidated && (
                <button
                  type="button"
                  onClick={() => handleValidateCode()}
                  disabled={validatingCode || !inviteCode.trim()}
                  style={{
                    padding: "14px 20px",
                    background: validatingCode
                      ? "rgba(245, 199, 109, 0.5)"
                      : "linear-gradient(135deg, #D4A545 0%, #F5C76D 50%, #D4A545 100%)",
                    border: "none",
                    borderRadius: "10px",
                    color: "#1D1A16",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: validatingCode || !inviteCode.trim() ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap"
                  }}
                >
                  {validatingCode ? "..." : "Verify"}
                </button>
              )}
              {codeValidated && (
                <button
                  type="button"
                  onClick={() => {
                    setCodeValidated(false);
                    setInviteCode("");
                    setLockedEmail(null);
                  }}
                  style={{
                    padding: "14px 16px",
                    backgroundColor: "rgba(139, 115, 85, 0.3)",
                    border: "1px solid rgba(139, 115, 85, 0.5)",
                    borderRadius: "10px",
                    color: "#C2B280",
                    fontSize: "14px",
                    cursor: "pointer"
                  }}
                >
                  Change
                </button>
              )}
            </div>
            {codeValidated && (
              <p style={{
                margin: "8px 0 0 0",
                fontSize: "12px",
                color: "#10b981"
              }}>
                Valid invite code! You can proceed to create your account.
              </p>
            )}
            {!codeValidated && (
              <p style={{
                margin: "8px 0 0 0",
                fontSize: "11px",
                color: "#8B7355"
              }}>
                Early access only. <a href="https://walleto.ai" style={{ color: "#F5C76D" }}>Join the waitlist</a> if you don't have a code.
              </p>
            )}
          </div>

          {/* Email Field */}
          <div style={{ marginBottom: "20px", opacity: codeValidated ? 1 : 0.5, pointerEvents: codeValidated ? "auto" : "none" }}>
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
                disabled={!!lockedEmail}
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
          <div style={{ marginBottom: "12px", opacity: codeValidated ? 1 : 0.5, pointerEvents: codeValidated ? "auto" : "none" }}>
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
                placeholder="Create a strong password"
                required
                autoComplete="new-password"
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
                  fontSize: "14px"
                }}
              >
                {showPassword ? "👁" : "👁‍🗨"}
              </button>
            </div>
          </div>

          {/* Password Strength Indicator */}
          {password && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{
                display: "flex",
                gap: "4px",
                marginBottom: "8px"
              }}>
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    style={{
                      flex: 1,
                      height: "4px",
                      borderRadius: "2px",
                      backgroundColor: passwordValidation.passed >= level
                        ? passwordValidation.passed >= 3 ? "#10b981" : "#f59e0b"
                        : "rgba(139, 115, 85, 0.3)",
                      transition: "background-color 0.2s"
                    }}
                  />
                ))}
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "4px 12px",
                fontSize: "11px"
              }}>
                {[
                  { key: "length", label: "8+ characters" },
                  { key: "uppercase", label: "Uppercase letter" },
                  { key: "lowercase", label: "Lowercase letter" },
                  { key: "number", label: "Number" }
                ].map(({ key, label }) => (
                  <div
                    key={key}
                    style={{
                      color: passwordValidation.checks[key as keyof typeof passwordValidation.checks]
                        ? "#10b981"
                        : "#8B7355",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    <span style={{ fontSize: "10px" }}>
                      {passwordValidation.checks[key as keyof typeof passwordValidation.checks] ? "✓" : "○"}
                    </span>
                    {label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confirm Password Field */}
          <div style={{ marginBottom: "20px", opacity: codeValidated ? 1 : 0.5, pointerEvents: codeValidated ? "auto" : "none" }}>
            <label style={{
              display: "block",
              fontSize: "12px",
              fontWeight: "600",
              color: "#C2B280",
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>
              Confirm Password
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
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                autoComplete="new-password"
                style={{
                  width: "100%",
                  padding: "14px 14px 14px 42px",
                  backgroundColor: "rgba(29, 26, 22, 0.6)",
                  border: confirmPassword && password !== confirmPassword
                    ? "1px solid rgba(239, 68, 68, 0.5)"
                    : confirmPassword && password === confirmPassword
                      ? "1px solid rgba(16, 185, 129, 0.5)"
                      : "1px solid rgba(212, 165, 69, 0.15)",
                  borderRadius: "10px",
                  color: "#F7E7C6",
                  fontSize: "15px",
                  outline: "none",
                  transition: "all 0.2s ease",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => {
                  if (!confirmPassword || password === confirmPassword) {
                    e.target.style.borderColor = "rgba(245, 199, 109, 0.5)";
                  }
                  e.target.style.backgroundColor = "rgba(29, 26, 22, 0.8)";
                }}
                onBlur={(e) => {
                  if (!confirmPassword) {
                    e.target.style.borderColor = "rgba(212, 165, 69, 0.15)";
                  }
                  e.target.style.backgroundColor = "rgba(29, 26, 22, 0.6)";
                }}
              />
              {confirmPassword && (
                <span style={{
                  position: "absolute",
                  right: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "14px"
                }}>
                  {password === confirmPassword ? "✓" : "✗"}
                </span>
              )}
            </div>
          </div>

          {/* Terms Checkbox */}
          <div style={{ marginBottom: "24px", opacity: codeValidated ? 1 : 0.5, pointerEvents: codeValidated ? "auto" : "none" }}>
            <label style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              cursor: "pointer",
              fontSize: "13px",
              color: "#C2B280",
              lineHeight: "1.4"
            }}>
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                style={{
                  width: "18px",
                  height: "18px",
                  marginTop: "2px",
                  accentColor: "#F5C76D",
                  cursor: "pointer",
                  flexShrink: 0
                }}
              />
              <span>
                I agree to the{" "}
                <a href="#" style={{ color: "#F5C76D" }}>Terms of Service</a>
                {" "}and{" "}
                <a href="#" style={{ color: "#F5C76D" }}>Privacy Policy</a>
              </span>
            </label>
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

          {/* Signup Button */}
          <button
            type="submit"
            disabled={loading || !codeValidated}
            style={{
              width: "100%",
              padding: "16px",
              background: (loading || !codeValidated)
                ? "rgba(245, 199, 109, 0.5)"
                : "linear-gradient(135deg, #D4A545 0%, #F5C76D 50%, #D4A545 100%)",
              border: "none",
              borderRadius: "10px",
              color: "#1D1A16",
              fontSize: "15px",
              fontWeight: "700",
              cursor: (loading || !codeValidated) ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              boxShadow: (loading || !codeValidated) ? "none" : "0 4px 20px rgba(245, 199, 109, 0.3)",
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
                Creating account...
              </>
            ) : (
              "Create Account"
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

        {/* Login Link */}
        <div style={{ textAlign: "center" }}>
          <p style={{
            margin: 0,
            fontSize: "14px",
            color: "#8B7355"
          }}>
            Already have an account?{" "}
            <Link
              to="/login"
              style={{
                color: "#F5C76D",
                fontWeight: "600",
                textDecoration: "none",
                transition: "color 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "#FCD34D"}
              onMouseLeave={(e) => e.currentTarget.style.color = "#F5C76D"}
            >
              Sign In
            </Link>
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
