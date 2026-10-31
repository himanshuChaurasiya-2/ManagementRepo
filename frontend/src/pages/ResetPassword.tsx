import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Loader2,
  XCircle,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import "./AuthPages.css";

const API_URL = "http://localhost:5000/api";

const ResetPassword = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isInvitation = location.pathname.startsWith("/set-password");

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [jobPosition, setJobPosition] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setTokenError("No verification token provided in the link.");
        setVerifying(false);
        return;
      }

      try {
        setVerifying(true);
        const endpoint = isInvitation
          ? `${API_URL}/auth/verify-invitation-token/${token}`
          : `${API_URL}/auth/verify-reset-token/${token}`;

        const res = await axios.get(endpoint);

        if (res.data.success) {
          setTokenValid(true);
          setUserName(res.data.name || "");
          setUserEmail(res.data.email || "");
          setJobPosition(res.data.jobPosition || "");
        }
      } catch (err: any) {
        console.error("Token verification failed:", err);
        setTokenValid(false);
        setTokenError(
          err.response?.data?.message ||
            "This link is invalid or has expired. Please request a new link."
        );
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token, isInvitation]);

  // Requirement checks
  const hasMinLength = password.length >= 8;
  const hasUpperLower = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNumberOrSymbol = /[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password);
  const isMatch = confirmPassword.length > 0 && password === confirmPassword;
  const isFormValid = hasMinLength && hasUpperLower && hasNumberOrSymbol && isMatch;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!hasMinLength) {
      setSubmitError("Password must be at least 8 characters long.");
      return;
    }

    if (!isMatch) {
      setSubmitError("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      const endpoint = isInvitation
        ? `${API_URL}/auth/set-password/${token}`
        : `${API_URL}/auth/reset-password/${token}`;

      const res = await axios.post(endpoint, {
        password,
      });

      if (res.data.success) {
        setSubmitSuccess(true);
        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 2200);
      }
    } catch (err: any) {
      console.error("Set password error:", err);
      setSubmitError(
        err.response?.data?.message || "Failed to update password. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <ThemeToggle className="theme-toggle-floating" showLabel />

      <div className="auth-card-container">
        <div className="auth-card">
          {verifying ? (
            /* LOADING STATE */
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Loader2 size={36} className="login-spinner" style={{ color: "#818cf8", marginBottom: "16px" }} />
              <h2 className="auth-title" style={{ fontSize: "18px" }}>
                Verifying your secure link...
              </h2>
              <p className="auth-subtitle">Please wait a moment while we validate your token.</p>
            </div>
          ) : !tokenValid ? (
            /* INVALID OR EXPIRED TOKEN VIEW */
            <div className="auth-success-card">
              <div className="auth-success-icon" style={{ background: "rgba(239, 68, 68, 0.15)", borderColor: "rgba(239, 68, 68, 0.35)", color: "#f87171" }}>
                <XCircle size={32} />
              </div>

              <h1 className="auth-success-title">Link Expired or Invalid</h1>
              <p className="auth-success-desc">
                {tokenError || "This security link has expired or has already been used."}
              </p>

              <div style={{ margin: "24px 0" }}>
                <Link to="/forgot-password" className="auth-submit-btn" style={{ textDecoration: "none" }}>
                  <span>Request a New Reset Link</span>
                  <ArrowRight size={16} />
                </Link>
              </div>

              <div className="auth-footer-nav">
                <Link to="/login" className="auth-back-link">
                  <span>Return to Sign In</span>
                </Link>
              </div>
            </div>
          ) : submitSuccess ? (
            /* SUCCESS VIEW */
            <div className="auth-success-card">
              <div className="auth-success-icon">
                <CheckCircle2 size={32} />
              </div>

              <h1 className="auth-success-title">
                {isInvitation ? "Account Activated!" : "Password Reset Complete!"}
              </h1>
              <p className="auth-success-desc">
                Your new password has been set securely. Redirecting you to sign in...
              </p>

              <div style={{ display: "flex", justifyContent: "center", margin: "16px 0" }}>
                <Loader2 size={24} className="login-spinner" style={{ color: "#34d399" }} />
              </div>

              <div className="auth-footer-nav">
                <Link to="/login" className="auth-back-link">
                  <span>Click here if not redirected automatically</span>
                </Link>
              </div>
            </div>
          ) : (
            /* SET / RESET PASSWORD FORM */
            <>
              <div className="auth-header">
                <div className="auth-icon-badge">
                  {isInvitation ? <UserCheck size={26} /> : <ShieldCheck size={26} />}
                </div>

                <h1 className="auth-title">
                  {isInvitation ? "Create Your Password" : "Reset Your Password"}
                </h1>

                <p className="auth-subtitle">
                  {isInvitation
                    ? "Welcome to the team! Choose a secure password to access your account."
                    : "Please create a new, strong password to secure your account."}
                </p>

                {userEmail && (
                  <div className="auth-user-pill">
                    <span>
                      {userName
                        ? `${userName}${jobPosition ? ` • ${jobPosition}` : ""} (${userEmail})`
                        : userEmail}
                    </span>
                  </div>
                )}
              </div>

              {submitError && (
                <div className="auth-alert-error" role="alert">
                  <AlertCircle size={18} />
                  <span>{submitError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form">
                {/* NEW PASSWORD */}
                <div className="auth-field">
                  <label htmlFor="new-password" className="auth-label">
                    New Password
                  </label>
                  <div className="auth-input-wrapper">
                    <input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password"
                      autoComplete="new-password"
                      className="auth-input has-toggle"
                      disabled={submitting}
                      autoFocus
                    />
                    <span className="auth-input-icon">
                      <Lock size={18} />
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="auth-toggle-password"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* CONFIRM PASSWORD */}
                <div className="auth-field">
                  <label htmlFor="confirm-password" className="auth-label">
                    Confirm Password
                  </label>
                  <div className="auth-input-wrapper">
                    <input
                      id="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                      className="auth-input has-toggle"
                      disabled={submitting}
                    />
                    <span className="auth-input-icon">
                      <Lock size={18} />
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="auth-toggle-password"
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* REQUIREMENTS CHECKLIST */}
                <div className="password-requirements-card">
                  <div className="password-req-title">Password Security Requirements</div>
                  <div className={`password-req-item ${hasMinLength ? "met" : "unmet"}`}>
                    <CheckCircle2 size={14} />
                    <span>At least 8 characters long</span>
                  </div>
                  <div className={`password-req-item ${hasUpperLower ? "met" : "unmet"}`}>
                    <CheckCircle2 size={14} />
                    <span>Both uppercase and lowercase letters</span>
                  </div>
                  <div className={`password-req-item ${hasNumberOrSymbol ? "met" : "unmet"}`}>
                    <CheckCircle2 size={14} />
                    <span>At least one number or symbol</span>
                  </div>
                  <div className={`password-req-item ${isMatch ? "met" : "unmet"}`}>
                    <CheckCircle2 size={14} />
                    <span>Passwords match</span>
                  </div>
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={submitting || !isFormValid}
                  className="auth-submit-btn"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="login-spinner" />
                      <span>Saving password...</span>
                    </>
                  ) : (
                    <>
                      <span>{isInvitation ? "Activate Account" : "Update Password"}</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              <div className="auth-footer-nav">
                <Link to="/login" className="auth-back-link">
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

export default ResetPassword;
