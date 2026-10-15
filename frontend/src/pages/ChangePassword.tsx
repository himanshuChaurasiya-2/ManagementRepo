import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./ChangePassword.css";

const ChangePassword = () => {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ============================================
  // PASSWORD STRENGTH & VALIDATION CALCULATIONS
  // ============================================

  const hasMinLength = newPassword.length >= 8;
  const hasUpperLower = /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword);
  const hasNumberOrSymbol = /[0-9]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword);
  const isDifferentFromCurrent = currentPassword ? newPassword !== currentPassword : true;
  const isMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  // Calculate score 0 to 4
  const calculateStrength = () => {
    if (!newPassword) return { score: 0, label: "None", level: "weak" };
    let score = 0;
    if (newPassword.length >= 8) score += 1;
    if (newPassword.length >= 12) score += 1;
    if (hasUpperLower) score += 1;
    if (hasNumberOrSymbol) score += 1;

    if (score <= 1) return { score: 1, label: "Weak", level: "weak" };
    if (score === 2) return { score: 2, label: "Fair", level: "fair" };
    if (score === 3) return { score: 3, label: "Good", level: "good" };
    return { score: 4, label: "Strong", level: "strong" };
  };

  const strength = calculateStrength();

  // ============================================
  // SUBMISSION
  // ============================================

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from current password");
      return;
    }

    try {
      setLoading(true);

      await changePassword(currentPassword, newPassword);

      setSuccess("Password changed successfully! Redirecting to your dashboard...");

      setTimeout(() => {
        if (user.role === "admin") {
          navigate("/admin/dashboard", { replace: true });
        } else if (user.role === "sales") {
          navigate("/sales/dashboard", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      }, 1200);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        "Unable to change password. Please check your current password."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    if (user.role === "admin") {
      navigate("/admin/dashboard");
    } else if (user.role === "sales") {
      navigate("/sales/dashboard");
    } else {
      navigate("/dashboard");
    }
  };

  const userName = user.name || user.email?.split("@")[0] || "User";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="cp-page-wrapper">
      <div className="cp-card-container">
        <div className="cp-card">
          
          {/* HEADER & BRANDING */}
          <div className="cp-header">
            <div className="cp-logo-badge">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                <circle cx="12" cy="16" r="1.5" />
              </svg>
            </div>

            <h1 className="cp-title">
              {user.mustChangePassword ? "Set New Password" : "Change Password"}
            </h1>
            
            <p className="cp-subtitle">
              {user.mustChangePassword
                ? "You are required to set a new password before accessing your portal."
                : "Update your account password to maintain security."}
            </p>

            {/* USER IDENTITY CHIP */}
            <div className="cp-user-chip">
              <span className="cp-user-chip-avatar">{userInitial}</span>
              <span>{user.email}</span>
              <span className="cp-user-chip-role">({user.role})</span>
            </div>
          </div>

          {/* ERROR ALERT */}
          {error && (
            <div className="cp-alert error" role="alert">
              <svg
                className="cp-alert-icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* SUCCESS ALERT */}
          {success && (
            <div className="cp-alert success" role="status">
              <svg
                className="cp-alert-icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>{success}</span>
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit} className="cp-form">
            
            {/* CURRENT PASSWORD */}
            <div className="cp-field">
              <label htmlFor="currentPassword" className="cp-label">
                <span>Current Password</span>
              </label>

              <div className="cp-input-wrapper">
                <input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  autoComplete="current-password"
                  className="cp-input"
                  disabled={loading}
                />
                <span className="cp-input-icon">
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>

                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="cp-toggle-password"
                  aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showCurrentPassword ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" y1="2" x2="22" y2="22" />
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* NEW PASSWORD */}
            <div className="cp-field">
              <label htmlFor="newPassword" className="cp-label">
                <span>New Password</span>
                <span className="cp-label-hint">Min. 8 characters</span>
              </label>

              <div className="cp-input-wrapper">
                <input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                  autoComplete="new-password"
                  className="cp-input"
                  disabled={loading}
                />
                <span className="cp-input-icon">
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m21 2-2 2m-1.5 1.5L14 9a5 5 0 1 0-2 2l3.5 3.5 1.5-1.5 2 2 4-4-1.5-1.5 2.5-2.5a1 1 0 0 0 0-1.41l-2.09-2.09a1 1 0 0 0-1.41 0Z" />
                  </svg>
                </span>

                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="cp-toggle-password"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showNewPassword ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" y1="2" x2="22" y2="22" />
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              {/* REAL-TIME STRENGTH METER */}
              {newPassword && (
                <div className="cp-strength-container">
                  <div className="cp-strength-header">
                    <span className="cp-strength-text">Password Strength</span>
                    <span className={`cp-strength-value ${strength.level}`}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="cp-strength-bars">
                    <div className={`cp-strength-bar ${strength.score >= 1 ? `active ${strength.level}` : ""}`} />
                    <div className={`cp-strength-bar ${strength.score >= 2 ? `active ${strength.level}` : ""}`} />
                    <div className={`cp-strength-bar ${strength.score >= 3 ? `active ${strength.level}` : ""}`} />
                    <div className={`cp-strength-bar ${strength.score >= 4 ? `active ${strength.level}` : ""}`} />
                  </div>
                </div>
              )}

              {/* RULES CHECKLIST */}
              {newPassword && (
                <div className="cp-rules-list">
                  <div className={`cp-rule-item ${hasMinLength ? "valid" : ""}`}>
                    <span className="cp-rule-icon">
                      {hasMinLength ? "✓" : "•"}
                    </span>
                    <span>8+ characters</span>
                  </div>

                  <div className={`cp-rule-item ${hasUpperLower ? "valid" : ""}`}>
                    <span className="cp-rule-icon">
                      {hasUpperLower ? "✓" : "•"}
                    </span>
                    <span>Upper & lowercase</span>
                  </div>

                  <div className={`cp-rule-item ${hasNumberOrSymbol ? "valid" : ""}`}>
                    <span className="cp-rule-icon">
                      {hasNumberOrSymbol ? "✓" : "•"}
                    </span>
                    <span>Number or symbol</span>
                  </div>

                  <div className={`cp-rule-item ${currentPassword && isDifferentFromCurrent ? "valid" : ""}`}>
                    <span className="cp-rule-icon">
                      {currentPassword && isDifferentFromCurrent ? "✓" : "•"}
                    </span>
                    <span>Different from current</span>
                  </div>
                </div>
              )}
            </div>

            {/* CONFIRM NEW PASSWORD */}
            <div className="cp-field">
              <label htmlFor="confirmPassword" className="cp-label">
                <span>Confirm New Password</span>
                {confirmPassword && (
                  <span className="cp-label-hint" style={{ color: isMatch ? "#4ade80" : "#f87171" }}>
                    {isMatch ? "✓ Passwords match" : "Does not match"}
                  </span>
                )}
              </label>

              <div className="cp-input-wrapper">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  autoComplete="new-password"
                  className="cp-input"
                  disabled={loading}
                />
                <span className="cp-input-icon">
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </span>

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="cp-toggle-password"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" y1="2" x2="22" y2="22" />
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="cp-actions">
              <button
                type="submit"
                disabled={loading}
                className="cp-submit-btn"
              >
                {loading ? (
                  <>
                    <svg
                      className="cp-spinner"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Update Password</span>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>

              {/* CANCEL / BACK BUTTON (ONLY IF NOT FORCED) */}
              {!user.mustChangePassword && (
                <button
                  type="button"
                  onClick={handleBackToDashboard}
                  className="cp-cancel-btn"
                  disabled={loading}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                  <span>Return to Dashboard</span>
                </button>
              )}
            </div>

          </form>

          {/* FOOTER NOTICE */}
          <div className="cp-footer-notice">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>256-bit encrypted authentication</span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ChangePassword;