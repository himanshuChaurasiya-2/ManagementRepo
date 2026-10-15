import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { connectSocket } from "../services/socketService";

interface TaskNotification {
  _id: string;
  type: string;
  message: string;
  task?: {
    _id: string;
    title: string;
    priority?: string;
    status?: string;
    company?: {
      _id: string;
      companyName: string;
    };
    assignedTo?: {
      _id: string;
      name: string;
      email: string;
    };
  };
  completedAt?: string;
}

const AdminNotificationFloat: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [popupNotification, setPopupNotification] =
    useState<TaskNotification | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const handledIdsRef = useRef<Set<string>>(new Set());

  // Request notification permissions
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(console.error);
    }
  }, []);

  // Socket setup for admin notifications
  useEffect(() => {
    if (!user || user.role !== "admin") return;

    const socket = connectSocket(user.id);
    if (!socket) return;

    socket.emit("join_admin_room");

    const handleTaskCompleted = (data: TaskNotification) => {
      const notifId = data._id || `notif-${data.task?._id || Date.now()}`;

      if (handledIdsRef.current.has(notifId)) return;
      handledIdsRef.current.add(notifId);

      const newNotif: TaskNotification = {
        ...data,
        _id: notifId,
        completedAt: data.completedAt || new Date().toISOString(),
      };

      setNotifications((prev) => {
        if (prev.some((n) => n._id === notifId)) return prev;
        return [newNotif, ...prev].slice(0, 50);
      });
      setUnreadCount((prev) => prev + 1);
      setPopupNotification(newNotif);

      setTimeout(() => {
        setPopupNotification((current) =>
          current?._id === newNotif._id ? null : current
        );
      }, 6000);

      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification("✅ Task Completed", {
            body:
              newNotif.message ||
              `Task "${newNotif.task?.title}" was completed`,
            icon: "/favicon.svg",
          });
        } catch (err) {
          console.error("Browser notification failed:", err);
        }
      }
    };

    socket.off("task_completed", handleTaskCompleted);
    socket.on("task_completed", handleTaskCompleted);

    return () => {
      socket.off("task_completed", handleTaskCompleted);
    };
  }, [user]);

  if (!user || user.role !== "admin") return null;

  const toggleDropdown = () => {
    setShowDropdown((prev) => {
      if (!prev) setUnreadCount(0);
      return !prev;
    });
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <>
      {/* ================= HEADER NOTIFICATION BELL ================= */}
      <div style={{ position: "relative" }}>
        <button
          type="button"
          className="app-notif-btn"
          onClick={toggleDropdown}
          aria-label="Admin Notifications"
          title="Task Notifications"
        >
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>

          {unreadCount > 0 && <span className="app-notif-dot" />}
        </button>

        {/* ================= NOTIFICATIONS DROPDOWN ================= */}
        {showDropdown && (
          <div className="admin-notification-dropdown">
            <div className="admin-notif-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <strong>Notifications</strong>
                {notifications.length > 0 && (
                  <span className="notif-count-pill">
                    {notifications.length}
                  </span>
                )}
              </div>

              {notifications.length > 0 && (
                <button
                  type="button"
                  className="btn-clear-notifs"
                  onClick={clearAll}
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="admin-notif-list">
              {notifications.length === 0 ? (
                <div className="admin-notif-empty">
                  <p>No new notifications</p>
                  <span>You'll be alerted when sales users complete tasks.</span>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div key={notif._id} className="admin-notif-item">
                    <div className="notif-item-icon success">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>

                    <div className="notif-item-content">
                      <div className="notif-item-title">
                        {notif.task?.title || "Task Completed"}
                      </div>
                      <p className="notif-item-msg">{notif.message}</p>
                      <div className="notif-item-meta">
                        {notif.task?.assignedTo?.name && (
                          <span className="notif-assignee-tag">
                            👤 {notif.task.assignedTo.name}
                          </span>
                        )}
                        <span className="notif-time">
                          {notif.completedAt
                            ? new Date(notif.completedAt).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" }
                              )
                            : "Just now"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================= REAL-TIME POPUP TOAST ================= */}
      {popupNotification && (
        <div className="admin-realtime-toast">
          <div className="toast-icon-circle">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <div className="toast-body">
            <div className="toast-header-row">
              <span className="toast-badge-success">Task Completed</span>
              <button
                type="button"
                className="toast-close-btn"
                onClick={() => setPopupNotification(null)}
              >
                ×
              </button>
            </div>
            <h4 className="toast-title">
              {popupNotification.task?.title || "Task Completed"}
            </h4>
            <p className="toast-message">{popupNotification.message}</p>
            {popupNotification.task?.company?.companyName && (
              <span className="toast-company-pill">
                🏢 {popupNotification.task.company.companyName}
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default AdminNotificationFloat;
