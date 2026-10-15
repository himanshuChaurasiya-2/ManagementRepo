import { NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <aside className="app-sidebar">
      {/* BRAND LOGO */}
      <Link to="/admin/dashboard" className="app-sidebar-logo">
        <img
          src={theme === "light" ? "/images/logo-dark.png" : "/images/logo.png"}
          alt="Admin Portal Logo"
          className="app-sidebar-logo-img"
        />
        <span>Admin Portal</span>
      </Link>

      {/* NAVIGATION LINKS */}
      <nav className="app-sidebar-nav">
        <div className="sidebar-section-heading">MAIN MENU</div>

        {/* Dashboard */}
        <NavLink
          to="/admin/dashboard"
          end
          className={({ isActive }) =>
            `app-nav-item ${isActive ? "active" : ""}`
          }
        >
          <span className="nav-icon">
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
              <rect width="7" height="9" x="3" y="3" rx="1" />
              <rect width="7" height="5" x="14" y="3" rx="1" />
              <rect width="7" height="9" x="14" y="12" rx="1" />
              <rect width="7" height="5" x="3" y="16" rx="1" />
            </svg>
          </span>
          <span>Dashboard</span>
        </NavLink>

        {/* All Tasks */}
        <NavLink
          to="/admin/tasks"
          end
          className={({ isActive }) =>
            `app-nav-item ${isActive ? "active" : ""}`
          }
        >
          <span className="nav-icon">
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
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
              <path d="m9 14 2 2 4-4" />
            </svg>
          </span>
          <span>All Tasks</span>
        </NavLink>

        {/* Users */}
        <NavLink
          to="/admin/users"
          end
          className={({ isActive }) =>
            `app-nav-item ${isActive ? "active" : ""}`
          }
        >
          <span className="nav-icon">
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          <span>Users</span>
        </NavLink>

        {/* Companies */}
        <NavLink
          to="/companies"
          end
          className={({ isActive }) =>
            `app-nav-item ${isActive ? "active" : ""}`
          }
        >
          <span className="nav-icon">
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
              <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
              <path d="M9 22v-4h6v4" />
              <path d="M8 6h.01" />
              <path d="M16 6h.01" />
              <path d="M8 10h.01" />
              <path d="M16 10h.01" />
              <path d="M8 14h.01" />
              <path d="M16 14h.01" />
            </svg>
          </span>
          <span>Companies</span>
        </NavLink>

     

<div className="sidebar-section-heading">
  LEAD MANAGEMENT
</div>

<NavLink
  to="/admin/leads"
  end
  className={({ isActive }) =>
    `app-nav-item ${isActive ? "active" : ""}`
  }
>
  <span className="nav-icon">
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
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  </span>

  <span>Leads</span>
</NavLink>

        {/* Company Calendar */}
        {user.role === "admin" && (
          <NavLink
            to="/company-calendar"
            end
            className={({ isActive }) =>
              `app-nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="nav-icon">
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
                <rect width="18" height="18" x="3" y="4" rx="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg>
            </span>
            <span>Company Calendar</span>
          </NavLink>
        )}
      </nav>

      {/* BOTTOM SECTION: SETTING & LOGOUT */}
      <div className="app-sidebar-bottom">
        <button
          type="button"
          className="app-sidebar-bottom-btn"
          onClick={() => navigate("/change-password")}
        >
          <span className="nav-icon">
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
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </span>
          <span>Setting</span>
        </button>

        <button
          type="button"
          className="app-sidebar-bottom-btn"
          onClick={handleLogout}
        >
          <span className="nav-icon">
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
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
          </span>
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;