import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";
import {
  TrendingUp,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import "./Login.css";
import "./AuthPages.css";

const Login = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // ============================================
  // REDIRECT ALREADY LOGGED-IN USER
  // ============================================
  if (user) {
    if (user.mustChangePassword) {
      return <Navigate to="/change-password" replace />;
    }

    if (user.role === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }

    if (user.role === "sales") {
      return <Navigate to="/sales/dashboard" replace />;
    }

    return <Navigate to="/dashboard" replace />;
  }

  // ============================================
  // LOGIN SUBMISSION
  // ============================================
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    try {
      setLoading(true);
      const loggedInUser = await login(email, password);

      if (loggedInUser.mustChangePassword) {
        navigate("/change-password", { replace: true });
        return;
      }

      if (loggedInUser.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
        return;
      }

      if (loggedInUser.role === "sales") {
        navigate("/sales/dashboard", { replace: true });
        return;
      }

      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      if (error?.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error?.message === "Network Error" || !error?.response) {
        setError("Cannot connect to server. Please ensure the backend is running on port 5000.");
      } else {
        setError("Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper d-flex align-items-center justify-content-center p-3">
      <ThemeToggle className="theme-toggle-floating" showLabel />

      <div className="login-card-container w-100">
        <div className="login-card">

          {/* HEADER & BRANDING */}
          <div className="login-header text-center mb-4">
            <div className="login-logo-badge d-inline-flex align-items-center justify-content-center mb-3">
              <TrendingUp size={28} strokeWidth={2.2} />
            </div>

            <h1 className="login-title mb-2">Sales Dashboard</h1>
            <p className="login-subtitle mb-0">Sign in to access your sales portal</p>
          </div>

          {/* ERROR ALERT */}
          {error && (
            <div className="login-error-alert d-flex align-items-center gap-2 mb-3" role="alert">
              <AlertCircle size={18} className="flex-shrink-0 text-danger" />
              <span>{error}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          <form onSubmit={handleSubmit} className="login-form d-flex flex-column gap-3">

            {/* EMAIL */}
            <div className="login-field">
              <label htmlFor="email" className="login-label mb-1">
                Email Address
              </label>

              <div className="login-input-wrapper position-relative">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                  autoComplete="email"
                  className="login-input w-100"
                  disabled={loading}
                />
                <span className="login-input-icon position-absolute d-flex align-items-center">
                  <Mail size={18} />
                </span>
              </div>
            </div>

            {/* PASSWORD */}
            <div className="login-field">
              <div className="auth-label-row d-flex justify-content-between align-items-center mb-1">
                <label htmlFor="password" className="login-label mb-0">
                  Password
                </label>
                <Link to="/forgot-password" className="auth-forgot-link">
                  Forgot password?
                </Link>
              </div>

              <div className="login-input-wrapper position-relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="login-input login-input-password w-100"
                  disabled={loading}
                />
                <span className="login-input-icon position-absolute d-flex align-items-center">
                  <Lock size={18} />
                </span>

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-toggle-password position-absolute d-flex align-items-center justify-content-center p-0 border-0 bg-transparent"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="login-submit-btn d-flex align-items-center justify-content-center gap-2 w-100 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="login-spinner flex-shrink-0" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} className="flex-shrink-0" />
                </>
              )}
            </button>

          </form>

        </div>
      </div>
    </div>
  );
};

export default Login;
