import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Mail, ArrowLeft, MailCheck, AlertCircle, Loader2 } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import "./AuthPages.css";

const API_URL = "http://localhost:5000/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Resend countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/auth/forgot-password`, {
        email: normalizedEmail,
      });

      if (res.data.success) {
        setSuccess(true);
        setCountdown(60); // 60s cooldown for resend
      }
    } catch (err: any) {
      console.error("Forgot password error:", err);
      setError(
        err.response?.data?.message ||
          "Unable to process your request. Please check your network connection."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || loading) return;
    setError("");

    try {
      setLoading(true);
      await axios.post(`${API_URL}/auth/forgot-password`, {
        email: email.trim(),
      });
      setCountdown(60);
    } catch (err: any) {
      console.error("Resend error:", err);
      setError(
        err.response?.data?.message || "Failed to resend. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <ThemeToggle className="theme-toggle-floating" showLabel />

      <div className="auth-card-container">
        <div className="auth-card">
          {success ? (
            /* SUCCESS CONFIRMATION VIEW */
            <div className="auth-success-card">
              <div className="auth-success-icon">
                <MailCheck size={32} />
              </div>

              <h1 className="auth-success-title">Check Your Inbox</h1>
              <p className="auth-success-desc">
                If an active account exists for <strong>{email}</strong>, we've sent
                instructions with a secure link to create a new password.
              </p>

              {error && (
                <div className="auth-alert-error" role="alert">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <div style={{ margin: "20px 0" }}>
                <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.55)", margin: "0 0 8px 0" }}>
                  Didn't receive the email? Check your spam folder or
                </p>
                <button
                  type="button"
                  className="auth-resend-btn"
                  onClick={handleResend}
                  disabled={countdown > 0 || loading}
                >
                  {loading
                    ? "Sending..."
                    : countdown > 0
                    ? `Resend link in ${countdown}s`
                    : "Resend reset link"}
                </button>
              </div>

              <div className="auth-footer-nav">
                <Link to="/login" className="auth-back-link">
                  <ArrowLeft size={16} />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            /* FORGOT PASSWORD FORM VIEW */
            <>
              <div className="auth-header">
                <div className="auth-icon-badge">
                  <Mail size={26} />
                </div>
                <h1 className="auth-title">Forgot Password?</h1>
                <p className="auth-subtitle">
                  Enter your registered email address and we'll send you a secure link to reset your password.
                </p>
              </div>

              {error && (
                <div className="auth-alert-error" role="alert">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="auth-field">
                  <label htmlFor="email" className="auth-label">
                    Email Address
                  </label>
                  <div className="auth-input-wrapper">
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      autoComplete="email"
                      className="auth-input"
                      disabled={loading}
                      autoFocus
                    />
                    <span className="auth-input-icon">
                      <Mail size={18} />
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="auth-submit-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="login-spinner" />
                      <span>Sending reset link...</span>
                    </>
                  ) : (
                    <span>Send Reset Link</span>
                  )}
                </button>
              </form>

              <div className="auth-footer-nav">
                <Link to="/login" className="auth-back-link">
                  <ArrowLeft size={16} />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

