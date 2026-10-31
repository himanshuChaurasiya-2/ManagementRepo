import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Settings, LogOut } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import AdminNotificationFloat from "./AdminNotificationFloat";
import { useAuth } from "../context/AuthContext";
import { disconnectSocket } from "../services/socketService";

export interface NavbarProps {
  mobileNavOpen: boolean;
  onToggleMobileNav: () => void;
  showAdminNotifications?: boolean;
  rightExtra?: React.ReactNode;
}

export const Navbar: React.FC<NavbarProps> = ({
  mobileNavOpen,
  onToggleMobileNav,
  showAdminNotifications = true,
  rightExtra,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userName = user?.name || user?.email?.split("@")[0] || "User";
  const userEmail = user?.email || "";
  const userRole =
    user?.role === "admin"
      ? "Administrator"
      : user?.jobPosition || "Sales Representative";
  const userInitial = userName.charAt(0).toUpperCase();

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    if (!dropdownOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownOpen]);

  // Close dropdown on route change
  useEffect(() => {
    setDropdownOpen(false);
  }, [location.pathname]);

  const handleSettings = () => {
    setDropdownOpen(false);
    navigate("/change-password");
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    disconnectSocket();
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="app-topbar">
      {/* LEFT: NAVBAR ICON (FOR SMALL SCREENS) + TITLE */}
      <div className="app-topbar-left">
        <button
          type="button"
          className={`app-navbar-toggle ${mobileNavOpen ? "open" : ""}`}
          onClick={onToggleMobileNav}
          aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileNavOpen}
          title={mobileNavOpen ? "Close navigation" : "Open navigation"}
        >
          <span className="navbar-toggle-bar bar-1"></span>
          <span className="navbar-toggle-bar bar-2"></span>
          <span className="navbar-toggle-bar bar-3"></span>
        </button>
      </div>

      {/* RIGHT: THEME TOGGLE, NOTIFICATIONS & USER PROFILE DROPDOWN */}
      <div className="app-topbar-right">
        <ThemeToggle compact />
        {showAdminNotifications && user?.role === "admin" && <AdminNotificationFloat />}
        {rightExtra}

        {/* USER PROFILE TRIGGER & DROPDOWN */}
        <div className="app-user-dropdown-wrapper" ref={dropdownRef}>
          <button
            type="button"
            className={`app-user-profile ${dropdownOpen ? "active" : ""}`}
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
            aria-label="User account menu"
            title={`${userName} (${userRole})`}
          >
            <div className="app-user-text">
              <span className="app-user-name">{userName}</span>
              <span className="app-user-role">{userRole}</span>
            </div>
            <div className="app-user-avatar">{userInitial}</div>
            {/* <ChevronDown
              size={14}
              className={`app-user-chevron ${dropdownOpen ? "open" : ""}`}
            /> */}
          </button>

          {dropdownOpen && (
            <div className="app-user-dropdown-menu" role="menu" aria-label="User profile options">
              {/* Profile Card Header */}
              <div className="user-dropdown-header">
                <div className="user-dropdown-avatar">{userInitial}</div>
                <div className="user-dropdown-meta">
                  <div className="user-dropdown-name">{userName}</div>
                  {userEmail && <div className="user-dropdown-email">{userEmail}</div>}
                  <span className="user-dropdown-role-badge">{userRole}</span>
                </div>
              </div>

              <div className="user-dropdown-divider" />

              {/* Action Buttons: Setting & Log Out */}
              <div className="user-dropdown-actions">
                <button
                  type="button"
                  className="user-dropdown-item"
                  role="menuitem"
                  onClick={handleSettings}
                >
                  <span className="user-dropdown-icon">
                    <Settings size={16} />
                  </span>
                  <span>Setting</span>
                </button>

                <button
                  type="button"
                  className="user-dropdown-item user-dropdown-danger"
                  role="menuitem"
                  onClick={handleLogout}
                >
                  <span className="user-dropdown-icon">
                    <LogOut size={16} />
                  </span>
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
