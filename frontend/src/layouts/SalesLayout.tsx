import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import ReminderNotification from "../components/ReminderNotification";
import {
  connectSocket,
  disconnectSocket,
} from "../services/socketService";
import Navbar from "../components/Navbar";
import "./SalesLayout.css";

// NOTIFICATION TYPE
interface TaskNotification {
  _id?: string;
  message?: string;
  createdAt?: string;

  task?: {
    _id?: string;
    title?: string;
  };
}

// STORAGE KEY
const getNotificationStorageKey = (userId?: string) => {
  return userId
    ? `sales_notifications_${userId}`
    : "sales_notifications";
};

// SALES LAYOUT
const SalesLayout = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Mobile navigation state
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [popupNotification, setPopupNotification] = useState<TaskNotification | null>(null);

  // Close mobile navbar on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  // Load Stored Notifications
  useEffect(() => {
    if (!user?.id) return;
    const storageKey = getNotificationStorageKey(user.id);
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setNotifications(parsed);
        }
      }
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  }, [user?.id]);

  // Save Notifications
  useEffect(() => {
    if (!user?.id) return;
    const storageKey = getNotificationStorageKey(user.id);
    try {
      localStorage.setItem(storageKey, JSON.stringify(notifications));
    } catch (error) {
      console.error("Failed to save notifications:", error);
    }
  }, [notifications, user?.id]);

  // Socket
  useEffect(() => {
    if (!user?.id) return;

    const socket = connectSocket(user.id);
    if (!socket) return;

    const handleTaskAssigned = (data: TaskNotification) => {
      const newNotification: TaskNotification = {
        ...data,
        _id: data?._id || `${Date.now()}-${Math.random()}`,
        createdAt: data?.createdAt || new Date().toISOString(),
      };

      setNotifications((prev) => [newNotification, ...prev].slice(0, 50));
      setPopupNotification(newNotification);

      setTimeout(() => {
        setPopupNotification((current) =>
          current?._id === newNotification._id ? null : current
        );
      }, 5000);

      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification("📋 New Task Assigned", {
            body:
              newNotification?.task?.title ||
              newNotification?.message ||
              "You have been assigned a new task.",
            icon: "/favicon.ico",
          });
        } catch (err) {
          console.error("Notification error:", err);
        }
      }
    };

    socket.off("task_assigned", handleTaskAssigned);
    socket.on("task_assigned", handleTaskAssigned);

    return () => {
      socket.off("task_assigned", handleTaskAssigned);
      disconnectSocket();
    };
  }, [user?.id]);

  const unreadCount = notifications.length;

  const clearNotifications = () => {
    setNotifications([]);
    if (user?.id) {
      localStorage.removeItem(getNotificationStorageKey(user.id));
    }
  };

  const closePopup = () => {
    setPopupNotification(null);
  };

  const isActive = (path: string) => location.pathname === path;

  const formatNotificationTime = (date?: string) => {
    if (!date) return "Just now";
    const notificationDate = new Date(date);
    const now = new Date();
    const diff = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return notificationDate.toLocaleDateString();
  };

  return (
    <div className="app-shell">
      {/* Mobile Backdrop Overlay */}
      {mobileNavOpen && (
        <div
          className="app-sidebar-backdrop"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Global Reminder */}
      <ReminderNotification />

      {/* Instant Task Popup Toast */}
      {popupNotification && (
        <div className="task-notification">
          <div className="task-notification-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </div>
          <div className="task-notification-content">
            <strong>New Task Assigned</strong>
            <p>{popupNotification.message || "You have been assigned a new task."}</p>
            {popupNotification.task?.title && (
              <div className="task-notification-task">{popupNotification.task.title}</div>
            )}
          </div>
          <button type="button" className="task-notification-close" onClick={closePopup}>×</button>
        </div>
      )}

      {/* DARK SIDEBAR (MATCHING REFERENCE THEME) */}
      <aside className={`app-sidebar ${mobileNavOpen ? "mobile-open" : ""}`}>
        {/* BRAND ROW + MOBILE CLOSE */}
        <div className="app-sidebar-brand-row">
          <Link to="/sales/dashboard" className="app-sidebar-logo" onClick={() => setMobileNavOpen(false)}>
            <img
              src={theme === "light" ? "/images/logo-dark.png" : "/images/logo.png"}
              alt="Employee Portal Logo"
              className="app-sidebar-logo-img"
            />
            <span>Employee portal</span>
          </Link>

          <button
            type="button"
            className="mobile-sidebar-close-btn"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
            title="Close menu"
          >
            ✕
          </button>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="app-sidebar-nav">
          <div className="sidebar-section-heading">MAIN MENU</div>

          {/* Dashboard */}
          <Link
            to="/sales/dashboard"
            className={`app-nav-item ${isActive("/sales/dashboard") ? "active" : ""}`}
          >
            <span className="nav-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="7" height="9" x="3" y="3" rx="1" />
                <rect width="7" height="5" x="14" y="3" rx="1" />
                <rect width="7" height="9" x="14" y="12" rx="1" />
                <rect width="7" height="5" x="3" y="16" rx="1" />
              </svg>
            </span>
            <span>Dashboard</span>
          </Link>

          <div className="sidebar-section-heading">TASK MANAGEMENT</div>

          {/* My Tasks */}
          <Link
            to="/sales/tasks-my"
            className={`app-nav-item ${isActive("/sales/tasks-my") ? "active" : ""}`}
          >
            <span className="nav-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <path d="M12 11h4" />
                <path d="M12 16h4" />
                <path d="M8 11h.01" />
                <path d="M8 16h.01" />
              </svg>
            </span>
            <span>My Tasks</span>
          </Link>

          {/* All Tasks */}
          <Link
            to="/sales/tasks"
            className={`app-nav-item ${isActive("/sales/tasks") ? "active" : ""}`}
          >
            <span className="nav-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <path d="m9 11 3 3L22 4" />
              </svg>
            </span>
            <span>All Tasks</span>
          </Link>

          <div className="sidebar-section-heading">CALENDARS</div>

          {/* My Calendar */}
          <Link
            to="/sales/calendar"
            className={`app-nav-item ${isActive("/sales/calendar") ? "active" : ""}`}
          >
            <span className="nav-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg>
            </span>
            <span>My Calendar</span>
          </Link>

          {/* Company Calendar */}
          <Link
            to="/sales/company-calendar"
            className={`app-nav-item ${isActive("/sales/company-calendar") ? "active" : ""}`}
          >
            <span className="nav-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 11 18-5v12L3 14v-3z" />
                <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
              </svg>
            </span>
            <span>Company Calendar</span>
          </Link>

          <div className="sidebar-section-heading">CLIENT MANAGEMENT</div>

          {/* Companies */}
          <Link
            to="/sales/companies"
            className={`app-nav-item ${isActive("/sales/companies") ? "active" : ""}`}
          >
            <span className="nav-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          </Link>

          {/* Leads */}
          <Link
            to="/sales/leads"
            className={`app-nav-item ${
              isActive("/sales/leads") ? "active" : ""
            }`}
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
          </Link>

          <div className="sidebar-section-heading">REPORTS</div>

          {/* Monthly Reports / Meta Ads Live */}
          <Link
            to="/sales/reports"
            className={`app-nav-item ${isActive("/sales/reports") ? "active" : ""}`}
          >
            <span className="nav-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" x2="18" y1="20" y2="10" />
                <line x1="12" x2="12" y1="20" y2="4" />
                <line x1="6" x2="6" y1="20" y2="14" />
              </svg>
            </span>
            <span>Meta Ads Live</span>
          </Link>
        </nav>
      </aside>

      {/* MAIN WRAPPER (TOPBAR + CANVAS) */}
      <div className="app-main-wrapper">
        {/* RESPONSIVE TOPBAR / NAVBAR */}
        <Navbar
          mobileNavOpen={mobileNavOpen}
          onToggleMobileNav={() => setMobileNavOpen((prev) => !prev)}
          showAdminNotifications={false}
          rightExtra={
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="app-notif-btn"
                onClick={() => setShowNotifications((prev) => !prev)}
                aria-label="Notifications"
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                {unreadCount > 0 && <span className="app-notif-dot" />}
              </button>

              {showNotifications && (
                <div className="sales-notification-dropdown">
                  <div className="sales-notification-header">
                    <div>
                      <strong>Notifications</strong>
                      {unreadCount > 0 && <span>({unreadCount} unread)</span>}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        className="sales-clear-notifications"
                        onClick={clearNotifications}
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  <div className="sales-notification-list">
                    {notifications.length === 0 ? (
                      <div className="sales-no-notifications">
                        <strong>No notifications</strong>
                        <span>You're all caught up!</span>
                      </div>
                    ) : (
                      notifications.map((notification, index) => (
                        <div
                          className="sales-notification-item"
                          key={notification._id || `${notification.createdAt}-${index}`}
                          onClick={() => {
                            setShowNotifications(false);
                            navigate("/sales/tasks-my");
                          }}
                        >
                          <div className="sales-notification-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                              <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
                            </svg>
                          </div>
                          <div className="sales-notification-content">
                            <strong>New Task Assigned</strong>
                            <p>{notification?.task?.title || notification?.message || "You have been assigned a new task."}</p>
                            <small>{formatNotificationTime(notification.createdAt)}</small>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          }
        />

        {/* MAIN CANVAS */}
        <main className="app-canvas">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SalesLayout;