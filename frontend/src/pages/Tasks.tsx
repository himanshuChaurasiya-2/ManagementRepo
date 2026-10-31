import { useEffect, useState, useMemo } from "react";
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  MousePointerClick,
  X,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import "./admin/admindasboard.css";

interface Task {
  _id: string;
  title: string;
  description?: string;

  company?: {
    _id: string;
    companyName: string;
  };

  priority: "low" | "medium" | "high";
  status: "pending" | "in-progress" | "completed";
  dueDate?: string;

  assignedTo?: {
    _id: string;
    name: string;
    email: string;
  };

  assignedBy?: {
    _id: string;
    name: string;
    email: string;
  };

  createdAt?: string;
}

const Tasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [quickUpdatingId, setQuickUpdatingId] = useState<string | null>(null);

  // Master-Detail & Responsive State
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Mobile Bottom Sheet Swipe-to-Dismiss gesture state
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Filter states for Priority and Status capsules
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");

  // Fetch all tasks
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get("/tasks");
      setTasks(res.data.tasks || []);
    } catch (error) {
      console.error("Failed to load all tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Filter tasks based on search, status, and priority
  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tasks.filter((t) => {
      const matchStatus =
        selectedStatus === "all" || t.status === selectedStatus;
      const matchPriority =
        selectedPriority === "all" || t.priority === selectedPriority;
      const matchSearch =
        !query ||
        t.title.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query)) ||
        (t.company?.companyName &&
          t.company.companyName.toLowerCase().includes(query)) ||
        (t.assignedTo?.name &&
          t.assignedTo.name.toLowerCase().includes(query)) ||
        (t.assignedTo?.email &&
          t.assignedTo.email.toLowerCase().includes(query));

      return matchStatus && matchPriority && matchSearch;
    });
  }, [tasks, selectedStatus, selectedPriority, searchQuery]);

  // Selected task object
  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasks.find((t) => t._id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  // Check if current user is allowed to update status of a task
  const canUpdateStatus = (task: Task) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    const assigneeId =
      typeof task.assignedTo === "object"
        ? task.assignedTo?._id
        : task.assignedTo;
    const currentUserId = user.id || (user as any)._id;
    return assigneeId === currentUserId;
  };

  // Window resize & keyboard Escape handlers
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 769 && mobileDrawerOpen) {
        setMobileDrawerOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (mobileDrawerOpen) {
          setMobileDrawerOpen(false);
        } else if (selectedTaskId) {
          setSelectedTaskId(null);
        }
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileDrawerOpen, selectedTaskId]);

  // Handle task selection
  const handleSelectTask = (task: Task) => {
    if (selectedTaskId === task._id) {
      if (window.innerWidth < 769) {
        setMobileDrawerOpen(true);
        setDragOffsetY(0);
      } else {
        setSelectedTaskId(null);
      }
      return;
    }

    setSelectedTaskId(task._id);
    if (window.innerWidth < 769) {
      setMobileDrawerOpen(true);
      setDragOffsetY(0);
    }
  };

  const handleCloseDetail = () => {
    setSelectedTaskId(null);
    setMobileDrawerOpen(false);
  };

  // Mobile Bottom Sheet Swipe-to-Dismiss handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY === null) return;
    const diff = e.touches[0].clientY - touchStartY;
    if (diff > 0) {
      setDragOffsetY(diff);
    } else {
      setDragOffsetY(0);
    }
  };

  const handleTouchEnd = () => {
    if (dragOffsetY > 80) {
      setMobileDrawerOpen(false);
    }
    setTouchStartY(null);
    setDragOffsetY(0);
    setIsDragging(false);
  };

  // Quick Status changer (Pending, In Progress, Completed)
  const handleQuickStatusUpdate = async (
    taskId: string,
    newStatus: "pending" | "in-progress" | "completed"
  ) => {
    try {
      setQuickUpdatingId(taskId);
      // Optimistic state update
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
      );
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
    } catch (err: any) {
      console.error("Failed to update status:", err);
      alert(err.response?.data?.message || "Failed to update status");
      await fetchTasks();
    } finally {
      setQuickUpdatingId(null);
    }
  };

  // Helper to format due dates with relative badges
  const formatDueDate = (dateStr?: string) => {
    if (!dateStr) {
      return { text: "No deadline", isOverdue: false, isToday: false };
    }
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round(
      (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    const formatted = date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    if (diffDays < 0) {
      return { text: `${formatted} (Overdue)`, isOverdue: true, isToday: false };
    } else if (diffDays === 0) {
      return { text: "Due Today", isOverdue: false, isToday: true };
    } else if (diffDays === 1) {
      return { text: "Due Tomorrow", isOverdue: false, isToday: false };
    }
    return { text: formatted, isOverdue: false, isToday: false };
  };

  // Rich Task Detail Content (Shared between Desktop Detail Panel and Mobile Drawer)
  const renderTaskDetailContent = (task: Task, isMobile: boolean = false) => {
    const due = formatDueDate(task.dueDate);
    const editable = canUpdateStatus(task);

    return (
      <div className={`task-detail-content ${isMobile ? "is-mobile-sheet" : ""}`}>
        {/* Title & Badges Section */}
        <div className="task-detail-hero">
          <div className="task-detail-badges-row">
            <span className={`priority-badge ${task.priority}`}>
              <span className="badge-dot" />
              {task.priority}
            </span>
            <span className={`status-badge ${task.status}`}>
              <span className="badge-dot" />
              {task.status === "in-progress" ? "In Progress" : task.status}
            </span>
          </div>

          <h2 className="task-detail-title">{task.title}</h2>

          <div
            className={`task-detail-due-pill ${
              due.isOverdue ? "overdue" : due.isToday ? "today" : ""
            }`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{due.text}</span>
          </div>
        </div>

        {/* Quick Status Switcher */}
        <div className="task-detail-section">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <label className="task-detail-section-label m-0">
              Quick Status Update
            </label>
            {!editable && (
              <span
                style={{
                  fontSize: "11px",
                  color: "rgba(255, 255, 255, 0.45)",
                  fontStyle: "italic",
                }}
              >
                (Assigned to {task.assignedTo?.name || "another rep"})
              </span>
            )}
          </div>
          <div className="task-quick-status-group">
            <button
              type="button"
              className={`task-quick-status-btn pending ${
                task.status === "pending" ? "active" : ""
              }`}
              disabled={!editable || quickUpdatingId === task._id}
              onClick={() => handleQuickStatusUpdate(task._id, "pending")}
              title={
                editable
                  ? "Mark as Pending"
                  : "You can only update tasks assigned to you"
              }
            >
              <span className="badge-dot" />
              Pending
            </button>
            <button
              type="button"
              className={`task-quick-status-btn in-progress ${
                task.status === "in-progress" ? "active" : ""
              }`}
              disabled={!editable || quickUpdatingId === task._id}
              onClick={() => handleQuickStatusUpdate(task._id, "in-progress")}
              title={
                editable
                  ? "Mark as In Progress"
                  : "You can only update tasks assigned to you"
              }
            >
              <span className="badge-dot" />
              In Progress
            </button>
            <button
              type="button"
              className={`task-quick-status-btn completed ${
                task.status === "completed" ? "active" : ""
              }`}
              disabled={!editable || quickUpdatingId === task._id}
              onClick={() => handleQuickStatusUpdate(task._id, "completed")}
              title={
                editable
                  ? "Mark as Completed"
                  : "You can only update tasks assigned to you"
              }
            >
              <span className="badge-dot" />
              Completed
            </button>
          </div>
        </div>

        {/* Description Section */}
        <div className="task-detail-section">
          <label className="task-detail-section-label">Task Description</label>
          <div className="task-detail-desc-card">
            {task.description ? (
              <p className="task-detail-desc-text">{task.description}</p>
            ) : (
              <span className="task-detail-empty-text">
                No detailed description provided for this task.
              </span>
            )}
          </div>
        </div>

        {/* Assignee & Company Grid */}
        <div className="task-detail-grid">
          {/* Assignee Card */}
          <div className="task-detail-meta-card">
            <span className="task-detail-card-subtitle">Assigned To</span>
            <div className="task-detail-user-row">
              <div className="task-detail-avatar">
                {(task.assignedTo?.name || "U").charAt(0).toUpperCase()}
              </div>
              <div className="task-detail-user-info">
                <span className="task-detail-user-name">
                  {task.assignedTo?.name || "Unassigned"}
                </span>
                <span className="task-detail-user-email">
                  {task.assignedTo?.email || "No email available"}
                </span>
              </div>
            </div>
          </div>

          {/* Company Card */}
          <div className="task-detail-meta-card">
            <span className="task-detail-card-subtitle">Company</span>
            <div className="task-detail-company-row">
              <div className="task-detail-company-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Building2 size={16} />
              </div>
              <div className="task-detail-company-info">
                <span className="task-detail-company-name">
                  {task.company?.companyName || "No Company"}
                </span>
                <span className="company-tag mt-1 d-inline-block">
                  Sales Client
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Task Created Meta */}
        {task.createdAt && (
          <div className="task-detail-footer-meta">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>
              Created on {new Date(task.createdAt).toLocaleDateString()}
              {task.assignedBy?.name ? ` by ${task.assignedBy.name}` : ""}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="admin-tasks">
      {/* Header */}
      <div className="tasks-header">
        <div>
          <h1>All Tasks</h1>
          <p>View, filter, and track all team tasks and deadlines.</p>
        </div>
      </div>

      {/* Main Tasks Card */}
      <div className="tasks-card">
        <div className="tasks-card-header">
          <div className="d-flex align-items-center gap-2">
            <h2>All Assigned Tasks</h2>
            <span className="tasks-count-pill">{tasks.length}</span>
          </div>
        </div>

        {/* Priority, Status & Search Filter Bar */}
        <div className="tasks-filter-bar">
          {/* Quick Search Box */}
          <div className="tasks-search-box">
            <svg
              className="tasks-search-icon"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="tasks-search-input"
              placeholder="Search tasks by title, company, or assignee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search tasks"
            />
            {searchQuery && (
              <button
                type="button"
                className="tasks-search-clear"
                onClick={() => setSearchQuery("")}
                title="Clear search"
                aria-label="Clear search"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <div className="tasks-filter-controls">
            <div className="tasks-filter-group">
              <span className="tasks-filter-label">Status:</span>
              <div className="tasks-capsule-group">
                <button
                  type="button"
                  className={`task-filter-capsule all ${
                    selectedStatus === "all" ? "active" : ""
                  }`}
                  onClick={() => setSelectedStatus("all")}
                >
                  All ({tasks.length})
                </button>
                <button
                  type="button"
                  className={`task-filter-capsule pending ${
                    selectedStatus === "pending" ? "active" : ""
                  }`}
                  onClick={() => setSelectedStatus("pending")}
                >
                  <span className="badge-dot" />
                  Pending (
                  {tasks.filter((t) => t.status === "pending").length})
                </button>
                <button
                  type="button"
                  className={`task-filter-capsule in-progress ${
                    selectedStatus === "in-progress" ? "active" : ""
                  }`}
                  onClick={() => setSelectedStatus("in-progress")}
                >
                  <span className="badge-dot" />
                  In Progress (
                  {tasks.filter((t) => t.status === "in-progress").length})
                </button>
                <button
                  type="button"
                  className={`task-filter-capsule completed ${
                    selectedStatus === "completed" ? "active" : ""
                  }`}
                  onClick={() => setSelectedStatus("completed")}
                >
                  <span className="badge-dot" />
                  Completed (
                  {tasks.filter((t) => t.status === "completed").length})
                </button>
              </div>
            </div>

            <div className="tasks-filter-group">
              <span className="tasks-filter-label">Priority:</span>
              <div className="tasks-capsule-group">
                <button
                  type="button"
                  className={`task-filter-capsule all ${
                    selectedPriority === "all" ? "active" : ""
                  }`}
                  onClick={() => setSelectedPriority("all")}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`task-filter-capsule low ${
                    selectedPriority === "low" ? "active" : ""
                  }`}
                  onClick={() => setSelectedPriority("low")}
                >
                  <span className="badge-dot" />
                  Low ({tasks.filter((t) => t.priority === "low").length})
                </button>
                <button
                  type="button"
                  className={`task-filter-capsule medium ${
                    selectedPriority === "medium" ? "active" : ""
                  }`}
                  onClick={() => setSelectedPriority("medium")}
                >
                  <span className="badge-dot" />
                  Medium (
                  {tasks.filter((t) => t.priority === "medium").length})
                </button>
                <button
                  type="button"
                  className={`task-filter-capsule high ${
                    selectedPriority === "high" ? "active" : ""
                  }`}
                  onClick={() => setSelectedPriority("high")}
                >
                  <span className="badge-dot" />
                  High ({tasks.filter((t) => t.priority === "high").length})
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="tasks-loading" style={{ padding: "60px 20px", textAlign: "center" }}>
            Loading tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="tasks-empty" style={{ padding: "60px 20px", textAlign: "center" }}>
            <h3>No matching tasks found</h3>
            <p>Try switching filter capsules or clearing the search query.</p>
          </div>
        ) : (
          /* MASTER-DETAIL SPLIT CONTAINER */
          <div
            className={`tasks-master-detail-container ${
              selectedTask ? "panel-open" : ""
            }`}
          >
            {/* MASTER VIEW (Desktop Table + Mobile Cards) */}
            <div className="tasks-master-view">
              {/* Desktop / Tablet Table */}
              <div className="tasks-table-wrapper">
                <table className="tasks-table">
                  <thead>
                    <tr>
                      <th className="col-title">Task Title</th>
                      <th className="col-company">Company</th>
                      <th className="col-assignee">Assigned To</th>
                      <th className="col-priority">Priority</th>
                      <th className="col-status">Status</th>
                      <th className="col-due">Due Date</th>
                      <th className="col-actions text-end">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredTasks.map((task) => {
                      const isSelected = selectedTaskId === task._id;
                      const due = formatDueDate(task.dueDate);

                      return (
                        <tr
                          key={task._id}
                          className={`task-table-row ${
                            isSelected ? "selected-task-row" : ""
                          }`}
                          onClick={() => handleSelectTask(task)}
                          title="Click to view details"
                        >
                          <td className="col-title">
                            <div className="task-title-cell">
                              <span className="task-title">{task.title}</span>
                              {task.description && (
                                <span className="task-description">
                                  {task.description}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="col-company">
                            <span className="company-tag">
                              {task.company?.companyName || "No company"}
                            </span>
                          </td>

                          <td className="col-assignee">
                            <div className="assignee-chip">
                              <div className="assignee-avatar">
                                {(task.assignedTo?.name || "U")
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                              <span className="assignee-name">
                                {task.assignedTo?.name || "Unassigned"}
                              </span>
                            </div>
                          </td>

                          <td className="col-priority">
                            <span className={`priority-badge ${task.priority}`}>
                              <span className="badge-dot" />
                              {task.priority}
                            </span>
                          </td>

                          <td className="col-status">
                            <span className={`status-badge ${task.status}`}>
                              <span className="badge-dot" />
                              {task.status === "in-progress"
                                ? "In Progress"
                                : task.status}
                            </span>
                          </td>

                          <td className="col-due">
                            <span
                              className={`due-date-text ${
                                due.isOverdue
                                  ? "text-danger fw-bold"
                                  : due.isToday
                                  ? "text-warning fw-bold"
                                  : ""
                              }`}
                            >
                              {due.text}
                            </span>
                          </td>

                          <td className="col-actions text-end">
                            <div
                              className="task-action-buttons"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                className="action-btn-view"
                                title="View Details"
                                onClick={() => handleSelectTask(task)}
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                                {isSelected ? "Active" : "View"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Card List (< 769px) */}
              <div className="tasks-mobile-card-list">
                {filteredTasks.map((task) => {
                  const isSelected = selectedTaskId === task._id;
                  const due = formatDueDate(task.dueDate);

                  return (
                    <div
                      key={task._id}
                      className={`task-mobile-card ${
                        isSelected ? "selected-task-card" : ""
                      }`}
                      onClick={() => handleSelectTask(task)}
                    >
                      {/* Top Badges & Due Row */}
                      <div className="task-mobile-card-header">
                        <div className="task-mobile-badges">
                          <span className={`priority-badge ${task.priority}`}>
                            <span className="badge-dot" />
                            {task.priority}
                          </span>
                          <span className={`status-badge ${task.status}`}>
                            <span className="badge-dot" />
                            {task.status === "in-progress"
                              ? "In Progress"
                              : task.status}
                          </span>
                        </div>

                        <div
                          className={`task-mobile-due-tag ${
                            due.isOverdue
                              ? "overdue"
                              : due.isToday
                              ? "today"
                              : ""
                          }`}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect
                              x="3"
                              y="4"
                              width="18"
                              height="18"
                              rx="2"
                              ry="2"
                            />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          <span>{due.text}</span>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div className="task-mobile-card-body">
                        <h3 className="task-mobile-title">{task.title}</h3>
                        {task.description && (
                          <p className="task-mobile-desc">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Footer Meta & Actions */}
                      <div className="task-mobile-card-footer">
                        <div className="task-mobile-meta-chips">
                          <span className="company-tag">
                            {task.company?.companyName || "No company"}
                          </span>
                          <div className="assignee-chip">
                            <div className="assignee-avatar">
                              {(task.assignedTo?.name || "U")
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                            <span className="assignee-name">
                              {task.assignedTo?.name || "Unassigned"}
                            </span>
                          </div>
                        </div>

                        <div
                          className="task-mobile-actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="action-btn-view"
                            title="View Details"
                            onClick={() => handleSelectTask(task)}
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DESKTOP / TABLET RIGHT-SIDE SLIDING DETAIL PANEL */}
            <div
              className={`tasks-detail-panel ${
                selectedTask ? "open" : ""
              }`}
            >
              {selectedTask ? (
                <>
                  <div className="tasks-detail-panel-header">
                    <div className="d-flex align-items-center gap-2">
                      <span className="tasks-detail-header-icon" style={{ display: "inline-flex", alignItems: "center" }}>
                        <ClipboardList size={16} />
                      </span>
                      <h3 className="m-0">Task Details</h3>
                    </div>
                    <button
                      type="button"
                      className="tasks-detail-close-btn"
                      onClick={handleCloseDetail}
                      title="Close details panel"
                      aria-label="Close details"
                      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="tasks-detail-panel-body">
                    {renderTaskDetailContent(selectedTask, false)}
                  </div>
                </>
              ) : (
                <div className="tasks-detail-empty-prompt">
                  <div className="prompt-icon" style={{ display: "inline-flex", justifyContent: "center", alignItems: "center" }}>
                    <MousePointerClick size={36} strokeWidth={1.5} />
                  </div>
                  <h4>No Task Selected</h4>
                  <p>
                    Click on any task row in the table to view its full details
                    and update its status.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================= MOBILE BOTTOM SHEET / SLIDE-OVER DRAWER ================= */}
      {selectedTask && (
        <div
          className={`tasks-mobile-sheet-root ${
            mobileDrawerOpen ? "open" : ""
          }`}
        >
          <div
            className="tasks-sheet-backdrop"
            onClick={handleCloseDetail}
          />
          <div
            className="tasks-sheet-drawer"
            style={{
              transform: isDragging
                ? `translateY(${dragOffsetY}px)`
                : undefined,
            }}
          >
            <div
              className="tasks-sheet-drag-area"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="sheet-drag-pill" />
              <div className="sheet-header-row">
                <span className="sheet-drag-hint">Swipe down to dismiss</span>
                <button
                  type="button"
                  className="tasks-sheet-close-btn"
                  onClick={handleCloseDetail}
                  title="Close task details"
                  aria-label="Close"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="tasks-sheet-scrollable-body">
              {renderTaskDetailContent(selectedTask, true)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
