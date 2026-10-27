import React from "react";
import ThemeToggle from "./ThemeToggle";
import AdminNotificationFloat from "./AdminNotificationFloat";
import { useAuth } from "../context/AuthContext";

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
  const { user } = useAuth();
  const userName = user?.name || user?.email?.split("@")[0] || "Administrator";
  const userRole =
    user?.role === "admin"
      ? "Administrator"
      : user?.jobPosition || "Sales Representative";
  const userInitial = userName.charAt(0).toUpperCase();

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
        {/* <h1 className="app-topbar-title">Dashboard</h1> */}
      </div>

      {/* RIGHT: THEME TOGGLE, NOTIFICATIONS & USER PROFILE */}
      <div className="app-topbar-right">
        <ThemeToggle compact />
        {showAdminNotifications && user?.role === "admin" && <AdminNotificationFloat />}
        {rightExtra}

        <div className="app-user-profile" title={`${userName} (${userRole})`}>
          <div className="app-user-text">
            <span className="app-user-name">{userName}</span>
            <span className="app-user-role">{userRole}</span>
          </div>
          <div className="app-user-avatar">{userInitial}</div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

