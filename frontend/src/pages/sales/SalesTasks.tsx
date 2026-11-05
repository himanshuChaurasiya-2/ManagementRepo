import { useEffect, useState, useMemo } from "react";
import {
  Building2,
  ClipboardList,
  MousePointerClick,
  X,
  Clock,
  Play,
  CheckCircle2,
  Calendar,
  Eye,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";
import api from "../../services/api";
import "../admin/admindasboard.css";

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

const SalesTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [quickUpdatingId, setQuickUpdatingId] = useState<string | null>(null);

  // Master-Detail & Responsive State
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMobileTab, setActiveMobileTab] = useState<
    "all" | "pending" | "in-progress" | "completed"
  >("all");

  // Mobile Bottom Sheet Swipe-to-Dismiss gesture state
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Filter states for Priority and Status capsules
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");

  // Fetch logged-in user's tasks
  const fetchMyTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get("/tasks/my");
      setTasks(res.data.tasks || []);
    } catch (error) {
      console.error("Failed to load my tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTasks();
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

  // Status column groups for Kanban board
  const pendingTasks = useMemo(
    () => filteredTasks.filter((t) => t.status === "pending"),
    [filteredTasks]
  );
  const inProgressTasks = useMemo(
    () => filteredTasks.filter((t) => t.status === "in-progress"),
    [filteredTasks]
  );
  const completedTasks = useMemo(
    () => filteredTasks.filter((t) => t.status === "completed"),
    [filteredTasks]
  );

  // Selected task object
  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasks.find((t) => t._id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

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
      await fetchMyTasks();
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
          <label className="task-detail-section-label">Quick Status Update</label>
          <div className="task-quick-status-group">
            <button
              type="button"
              className={`task-quick-status-btn pending ${
                task.status === "pending" ? "active" : ""
              }`}
              disabled={quickUpdatingId === task._id}
              onClick={() => handleQuickStatusUpdate(task._id, "pending")}
              title="Mark as Pending"
            >
              <span className="badge-dot" />
              Pending
            </button>
            <button
              type="button"
              className={`task-quick-status-btn in-progress ${
                task.status === "in-progress" ? "active" : ""
              }`}
              disabled={quickUpdatingId === task._id}
              onClick={() => handleQuickStatusUpdate(task._id, "in-progress")}
              title="Mark as In Progress"
            >
              <span className="badge-dot" />
              In Progress
            </button>
            <button
              type="button"
              className={`task-quick-status-btn completed ${
                task.status === "completed" ? "active" : ""
              }`}
              disabled={quickUpdatingId === task._id}
              onClick={() => handleQuickStatusUpdate(task._id, "completed")}
              title="Mark as Completed"
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
                  {task.assignedTo?.name || "You (Assigned)"}
                </span>
                <span className="task-detail-user-email">
                  {task.assignedTo?.email || "My Account"}
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

  // Render individual card for the 3-column status board (Sales: No delete button)
  const renderTaskCard = (task: Task) => {
    const isSelected = selectedTaskId === task._id;
    const due = formatDueDate(task.dueDate);
    const isUpdating = quickUpdatingId === task._id;

    return (
      <div
        key={task._id}
        className={`task-board-card ${isSelected ? "selected-task-card" : ""}`}
        onClick={() => handleSelectTask(task)}
      >
        <div className="task-board-card-header">
          <div className="task-board-badges">
            <span className={`priority-badge ${task.priority}`}>
              <span className="badge-dot" />
              {task.priority}
            </span>
          </div>

          <div
            className={`task-board-due-pill task-board-due ${
              due.isOverdue ? "overdue" : due.isToday ? "today" : ""
            }`}
          >
            <Calendar size={12} className="flex-shrink-0" />
            <span>{due.text}</span>
          </div>
        </div>

        <div className="task-board-card-body">
          <h4 className="task-board-card-title task-board-title">{task.title}</h4>
          {task.description && (
            <p className="task-board-card-desc task-board-desc">{task.description}</p>
          )}
        </div>

        <div className="task-board-card-meta task-board-meta">
          <span className="task-card-company-tag company-tag">
            <Building2 size={12} className="flex-shrink-0" />
            <span>{task.company?.companyName || "No company"}</span>
          </span>
        </div>

        <div
          className="task-board-card-actions task-board-actions"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Status Stepper Progression Buttons */}
          <div className="task-status-steppers">
            {task.status === "pending" && (
              <button
                type="button"
                className="task-status-move-btn in-progress-btn"
                disabled={isUpdating}
                onClick={() => handleQuickStatusUpdate(task._id, "in-progress")}
                title="Start working on this task"
              >
                <Play size={11} />
                <span>Start</span>
                <ArrowRight size={11} />
              </button>
            )}

            {task.status === "in-progress" && (
              <>
                <button
                  type="button"
                  className="task-status-move-btn pending-btn"
                  disabled={isUpdating}
                  onClick={() => handleQuickStatusUpdate(task._id, "pending")}
                  title="Move back to Pending"
                >
                  <ArrowLeft size={11} />
                  <span>Pending</span>
                </button>
                <button
                  type="button"
                  className="task-status-move-btn complete-btn"
                  disabled={isUpdating}
                  onClick={() => handleQuickStatusUpdate(task._id, "completed")}
                  title="Mark task as Completed"
                >
                  <CheckCircle2 size={11} />
                  <span>Done</span>
                </button>
              </>
            )}

            {task.status === "completed" && (
              <button
                type="button"
                className="task-status-move-btn reopen-btn"
                disabled={isUpdating}
                onClick={() => handleQuickStatusUpdate(task._id, "in-progress")}
                title="Reopen task (move to In Progress)"
              >
                <RotateCcw size={11} />
                <span>Reopen</span>
              </button>
            )}
          </div>

          {/* Action buttons (View only - sales cannot delete) */}
          <div className="task-board-crud-actions">
            <button
              type="button"
              className="action-btn-view"
              title="View Details"
              onClick={() => handleSelectTask(task)}
            >
              <Eye size={12} />
              <span>Details</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-tasks">
      {/* Header */}
      <div className="tasks-header">
        <div>
          <h1>My Tasks</h1>
          <p>View, update status, and track your assigned tasks and deadlines.</p>
        </div>
      </div>

      {/* Main Tasks Card */}
      <div className="tasks-card">
        <div className="tasks-card-header">
          <div className="d-flex align-items-center gap-2">
            <h2>Tasks Assigned To Me</h2>
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
              placeholder="Search my tasks by title or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search my tasks"
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
            Loading your tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="tasks-empty" style={{ padding: "60px 20px", textAlign: "center" }}>
            <h3>No assigned tasks found</h3>
            <p>You're all caught up! Try switching filter capsules or clearing search.</p>
          </div>
        ) : (
          /* MASTER-DETAIL SPLIT CONTAINER */
          <div
            className={`tasks-master-detail-container ${
              selectedTask ? "panel-open" : ""
            }`}
          >
            {/* MASTER VIEW - 3 COLUMN STATUS KANBAN BOARD */}
            <div className="tasks-board-layout">
              {/* Mobile Column Switcher Tabs */}
              <div className="tasks-mobile-column-tabs">
                <button
                  type="button"
                  className={`tasks-col-tab ${activeMobileTab === "all" ? "active" : ""}`}
                  onClick={() => setActiveMobileTab("all")}
                >
                  All Columns ({filteredTasks.length})
                </button>
                <button
                  type="button"
                  className={`tasks-col-tab ${activeMobileTab === "pending" ? "active" : ""}`}
                  onClick={() => setActiveMobileTab("pending")}
                >
                  <Clock size={13} />
                  Pending ({pendingTasks.length})
                </button>
                <button
                  type="button"
                  className={`tasks-col-tab ${activeMobileTab === "in-progress" ? "active" : ""}`}
                  onClick={() => setActiveMobileTab("in-progress")}
                >
                  <Play size={13} />
                  In Progress ({inProgressTasks.length})
                </button>
                <button
                  type="button"
                  className={`tasks-col-tab ${activeMobileTab === "completed" ? "active" : ""}`}
                  onClick={() => setActiveMobileTab("completed")}
                >
                  <CheckCircle2 size={13} />
                  Completed ({completedTasks.length})
                </button>
              </div>

              {/* 3 Status Columns */}
              <div className="tasks-status-board">
                {/* Column 1: Pending */}
                <div
                  className={`task-status-col col-pending ${
                    activeMobileTab === "pending" || activeMobileTab === "all" ? "mobile-visible" : "mobile-hidden"
                  }`}
                >
                  <div className="task-col-header">
                    <div className="task-col-header-left">
                      <span className="task-col-dot dot-pending" />
                      <h4 className="task-col-title">Pending</h4>
                    </div>
                    <span className="task-col-badge badge-pending">
                      {pendingTasks.length}
                    </span>
                  </div>
                  <div className="task-col-cards">
                    {pendingTasks.length === 0 ? (
                      <div className="task-col-empty">No pending tasks</div>
                    ) : (
                      pendingTasks.map((task) => renderTaskCard(task))
                    )}
                  </div>
                </div>

                {/* Column 2: In Progress */}
                <div
                  className={`task-status-col col-in-progress ${
                    activeMobileTab === "in-progress" || activeMobileTab === "all" ? "mobile-visible" : "mobile-hidden"
                  }`}
                >
                  <div className="task-col-header">
                    <div className="task-col-header-left">
                      <span className="task-col-dot dot-in-progress" />
                      <h4 className="task-col-title">In Progress</h4>
                    </div>
                    <span className="task-col-badge badge-in-progress">
                      {inProgressTasks.length}
                    </span>
                  </div>
                  <div className="task-col-cards">
                    {inProgressTasks.length === 0 ? (
                      <div className="task-col-empty">No in-progress tasks</div>
                    ) : (
                      inProgressTasks.map((task) => renderTaskCard(task))
                    )}
                  </div>
                </div>

                {/* Column 3: Completed */}
                <div
                  className={`task-status-col col-completed ${
                    activeMobileTab === "completed" || activeMobileTab === "all" ? "mobile-visible" : "mobile-hidden"
                  }`}
                >
                  <div className="task-col-header">
                    <div className="task-col-header-left">
                      <span className="task-col-dot dot-completed" />
                      <h4 className="task-col-title">Completed</h4>
                    </div>
                    <span className="task-col-badge badge-completed">
                      {completedTasks.length}
                    </span>
                  </div>
                  <div className="task-col-cards">
                    {completedTasks.length === 0 ? (
                      <div className="task-col-empty">No completed tasks</div>
                    ) : (
                      completedTasks.map((task) => renderTaskCard(task))
                    )}
                  </div>
                </div>
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

export default SalesTasks;
