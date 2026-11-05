import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";
import {
  Lock,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Check,
  Dot,
  Loader2,
} from "lucide-react";
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
  // PASSWORD STRENGTH & VALIDATION
  // ============================================
  const hasMinLength = newPassword.length >= 8;
  const hasUpperLower = /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword);
  const hasNumberOrSymbol = /[0-9]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword);
  const isDifferentFromCurrent = currentPassword ? newPassword !== currentPassword : true;
  const isMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

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
    <div className="cp-page-wrapper d-flex align-items-center justify-content-center p-3">
      <ThemeToggle className="theme-toggle-floating" showLabel />

      <div className="cp-card-container w-100">
        <div className="cp-card">

          {/* HEADER & BRANDING */}
          <div className="cp-header text-center mb-4">
            <div className="cp-logo-badge d-inline-flex align-items-center justify-content-center mb-3">
              <Lock size={26} strokeWidth={2.2} />
            </div>

            <h1 className="cp-title mb-2">
              {user.mustChangePassword ? "Set New Password" : "Change Password"}
            </h1>

            <p className="cp-subtitle mb-3">
              {user.mustChangePassword
                ? "You are required to set a new password before accessing your portal."
                : "Update your account password to maintain security."}
            </p>

            {/* USER IDENTITY CHIP */}
            <div className="cp-user-chip d-inline-flex align-items-center gap-2">
              <span className="cp-user-chip-avatar d-flex align-items-center justify-content-center">
                {userInitial}
              </span>
              <span className="text-truncate">{user.email}</span>
              <span className="cp-user-chip-role text-capitalize">({user.role})</span>
            </div>
          </div>

          {/* ERROR ALERT */}
          {error && (
            <div className="cp-alert cp-alert-error d-flex align-items-center gap-2 mb-3" role="alert">
              <AlertCircle size={18} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* SUCCESS ALERT */}
          {success && (
            <div className="cp-alert cp-alert-success d-flex align-items-center gap-2 mb-3" role="status">
              <CheckCircle2 size={18} className="flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit} className="cp-form d-flex flex-column gap-3">

            {/* CURRENT PASSWORD */}
            <div className="cp-field">
              <label htmlFor="currentPassword" className="cp-label d-flex justify-content-between mb-1">
                <span>Current Password</span>
              </label>

              <div className="cp-input-wrapper position-relative">
                <input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  autoComplete="current-password"
                  className="cp-input w-100"
                  disabled={loading}
                />
                <span className="cp-input-icon position-absolute d-flex align-items-center">
                  <Lock size={17} />
                </span>

                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="cp-toggle-password position-absolute d-flex align-items-center justify-content-center p-0 border-0 bg-transparent"
                  aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showCurrentPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* NEW PASSWORD */}
            <div className="cp-field">
              <label htmlFor="newPassword" className="cp-label d-flex justify-content-between align-items-center mb-1">
                <span>New Password</span>
                <span className="cp-label-hint">Min. 8 characters</span>
              </label>

              <div className="cp-input-wrapper position-relative">
                <input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                  autoComplete="new-password"
                  className="cp-input w-100"
                  disabled={loading}
                />
                <span className="cp-input-icon position-absolute d-flex align-items-center">
                  <KeyRound size={17} />
                </span>

                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="cp-toggle-password position-absolute d-flex align-items-center justify-content-center p-0 border-0 bg-transparent"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>

              {/* REAL-TIME STRENGTH METER */}
              {newPassword && (
                <div className="cp-strength-container mt-2">
                  <div className="cp-strength-header d-flex justify-content-between align-items-center mb-1">
                    <span className="cp-strength-text">Password Strength</span>
                    <span className={`cp-strength-value ${strength.level}`}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="cp-strength-bars d-flex gap-1">
                    <div className={`cp-strength-bar flex-grow-1 ${strength.score >= 1 ? `active ${strength.level}` : ""}`} />
                    <div className={`cp-strength-bar flex-grow-1 ${strength.score >= 2 ? `active ${strength.level}` : ""}`} />
                    <div className={`cp-strength-bar flex-grow-1 ${strength.score >= 3 ? `active ${strength.level}` : ""}`} />
                    <div className={`cp-strength-bar flex-grow-1 ${strength.score >= 4 ? `active ${strength.level}` : ""}`} />
                  </div>
                </div>
              )}

              {/* RULES CHECKLIST */}
              {newPassword && (
                <div className="cp-rules-list mt-2">
                  <div className={`cp-rule-item d-flex align-items-center gap-1 ${hasMinLength ? "valid" : ""}`}>
                    <span className="cp-rule-icon d-flex align-items-center justify-content-center">
                      {hasMinLength ? <Check size={13} strokeWidth={2.6} /> : <Dot size={18} />}
                    </span>
                    <span>8+ characters</span>
                  </div>

                  <div className={`cp-rule-item d-flex align-items-center gap-1 ${hasUpperLower ? "valid" : ""}`}>
                    <span className="cp-rule-icon d-flex align-items-center justify-content-center">
                      {hasUpperLower ? <Check size={13} strokeWidth={2.6} /> : <Dot size={18} />}
                    </span>
                    <span>Upper & lowercase</span>
                  </div>

                  <div className={`cp-rule-item d-flex align-items-center gap-1 ${hasNumberOrSymbol ? "valid" : ""}`}>
                    <span className="cp-rule-icon d-flex align-items-center justify-content-center">
                      {hasNumberOrSymbol ? <Check size={13} strokeWidth={2.6} /> : <Dot size={18} />}
                    </span>
                    <span>Number or symbol</span>
                  </div>

                  <div className={`cp-rule-item d-flex align-items-center gap-1 ${currentPassword && isDifferentFromCurrent ? "valid" : ""}`}>
                    <span className="cp-rule-icon d-flex align-items-center justify-content-center">
                      {currentPassword && isDifferentFromCurrent ? <Check size={13} strokeWidth={2.6} /> : <Dot size={18} />}
                    </span>
                    <span>Different from current</span>
                  </div>
                </div>
              )}
            </div>

            {/* CONFIRM NEW PASSWORD */}
            <div className="cp-field">
              <label htmlFor="confirmPassword" className="cp-label d-flex justify-content-between align-items-center mb-1">
                <span>Confirm New Password</span>
                {confirmPassword && (
                  <span className={`cp-label-hint ${isMatch ? "text-success-custom" : "text-danger-custom"}`}>
                    {isMatch ? "✓ Passwords match" : "Does not match"}
                  </span>
                )}
              </label>

              <div className="cp-input-wrapper position-relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  autoComplete="new-password"
                  className="cp-input w-100"
                  disabled={loading}
                />
                <span className="cp-input-icon position-absolute d-flex align-items-center">
                  <ShieldCheck size={17} />
                </span>

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="cp-toggle-password position-absolute d-flex align-items-center justify-content-center p-0 border-0 bg-transparent"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="cp-actions d-flex flex-column gap-2 mt-2">
              <button
                type="submit"
                disabled={loading}
                className="cp-submit-btn d-flex align-items-center justify-content-center gap-2 w-100"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="cp-spinner flex-shrink-0" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Update Password</span>
                    <ArrowRight size={18} className="flex-shrink-0" />
                  </>
                )}
              </button>

              {/* CANCEL / BACK BUTTON (ONLY IF NOT FORCED) */}
              {!user.mustChangePassword && (
                <button
                  type="button"
                  onClick={handleBackToDashboard}
                  className="cp-cancel-btn d-flex align-items-center justify-content-center gap-2 w-100"
                  disabled={loading}
                >
                  <ArrowLeft size={16} className="flex-shrink-0" />
                  <span>Return to Dashboard</span>
                </button>
              )}
            </div>

          </form>

          {/* FOOTER NOTICE */}
          <div className="cp-footer-notice d-flex align-items-center justify-content-center gap-2 text-center mt-3 pt-3">
            <Lock size={14} className="flex-shrink-0" />
            <span>256-bit encrypted authentication</span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
