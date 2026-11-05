import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Edit3,
  Eye,
  MousePointerClick,
  Play,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import api from "../../services/api";
import "./admindasboard.css";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

interface Company {
  _id: string;
  companyName: string;
  status: "active" | "inactive";
}

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

const AdminTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form states for Create Task
  const [form, setForm] = useState({
    title: "",
    company: "",
    description: "",
    assignedTo: "",
    priority: "medium" as "low" | "medium" | "high",
    dueDate: "",
  });

  // Form states for Edit Task
  const [editForm, setEditForm] = useState({
    title: "",
    company: "",
    description: "",
    assignedTo: "",
    priority: "medium" as "low" | "medium" | "high",
    status: "pending" as "pending" | "in-progress" | "completed",
    dueDate: "",
  });

  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
  const [activeMobileTab, setActiveMobileTab] = useState<
    "all" | "pending" | "in-progress" | "completed"
  >("all");

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
      await api.patch(`/tasks/${taskId}`, { status: newStatus });
      await fetchData();
    } catch (err: any) {
      console.error("Failed to update status:", err);
      alert(err.response?.data?.message || "Failed to update status");
      await fetchData();
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

  // ===============================
  // FETCH TASKS + USERS + COMPANIES
  // ===============================

  const fetchData = async () => {
    try {
      setLoading(true);

      const [tasksResponse, usersResponse, companiesResponse] =
        await Promise.all([
          api.get("/tasks"),
          api.get("/users"),
          api.get("/companies"),
        ]);

      setTasks(tasksResponse.data.tasks || []);
      setUsers(usersResponse.data.users || []);
      setCompanies(companiesResponse.data.companies || []);
    } catch (error) {
      console.error("Failed to load tasks/users/companies:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ===============================
  // CREATE TASK HANDLERS
  // ===============================

  const handleCreateChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      alert("Task title is required");
      return;
    }

    if (!form.assignedTo) {
      alert("Please select a sales user");
      return;
    }

    if (!form.company) {
      alert("Please select a company");
      return;
    }

    try {
      setCreating(true);

      await api.post("/tasks", {
        title: form.title.trim(),
        company: form.company,
        description: form.description.trim(),
        assignedTo: form.assignedTo,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
      });

      setForm({
        title: "",
        company: "",
        description: "",
        assignedTo: "",
        priority: "medium",
        dueDate: "",
      });

      setShowCreateModal(false);
      await fetchData();
    } catch (error: any) {
      console.error("Create task error:", error);
      alert(error.response?.data?.message || "Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  // ===============================
  // EDIT TASK HANDLERS
  // ===============================

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      company: task.company?._id || "",
      description: task.description || "",
      assignedTo: task.assignedTo?._id || "",
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
    });
  };

  const handleEditChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setEditForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    if (!editForm.title.trim()) {
      alert("Task title is required");
      return;
    }

    try {
      setUpdating(true);

      await api.patch(`/tasks/${editingTask._id}`, {
        title: editForm.title.trim(),
        company: editForm.company || undefined,
        description: editForm.description.trim(),
        assignedTo: editForm.assignedTo || undefined,
        priority: editForm.priority,
        status: editForm.status,
        dueDate: editForm.dueDate || undefined,
      });

      setEditingTask(null);
      await fetchData();
    } catch (error: any) {
      console.error("Update task error:", error);
      alert(error.response?.data?.message || "Failed to update task");
    } finally {
      setUpdating(false);
    }
  };

  // ===============================
  // DELETE TASK HANDLER
  // ===============================

  const handleDeleteTask = async (taskId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete task "${title}"?`)) {
      return;
    }

    try {
      setDeletingId(taskId);
      await api.delete(`/tasks/${taskId}`);
      await fetchData();
    } catch (error: any) {
      console.error("Delete task error:", error);
      alert(error.response?.data?.message || "Failed to delete task");
    } finally {
      setDeletingId(null);
    }
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

        {/* Bottom Actions Toolbar */}
        <div className="task-detail-actions-toolbar">
          <button
            type="button"
            className="task-detail-action-btn edit-btn"
            onClick={() => openEditModal(task)}
          >
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
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit Task
          </button>

          {task.status === "completed" && (
            <button
              type="button"
              className="task-detail-action-btn delete-btn"
              disabled={deletingId === task._id}
              onClick={() => handleDeleteTask(task._id, task.title)}
            >
              <Trash2 size={15} />
              {deletingId === task._id ? "Deleting..." : "Delete Task"}
            </button>
          )}
        </div>
      </div>
    );
  };

  // Render Individual Task Card for the 3-Column Status Board
  const renderTaskCard = (task: Task) => {
    const isSelected = selectedTaskId === task._id;
    const due = formatDueDate(task.dueDate);

    return (
      <div
        key={task._id}
        className={`task-board-card ${isSelected ? "is-selected" : ""}`}
        onClick={() => handleSelectTask(task)}
      >
        {/* Top Badges: Priority + Company */}
        <div className="task-board-card-header">
          <span className={`priority-badge ${task.priority}`}>
            <span className="badge-dot" />
            {task.priority}
          </span>

          {task.company?.companyName && (
            <span
              className="task-card-company-tag"
              title={task.company.companyName}
            >
              <Building2 size={12} className="flex-shrink-0" />
              <span>{task.company.companyName}</span>
            </span>
          )}
        </div>

        {/* Title & Description */}
        <h4 className="task-board-card-title">{task.title}</h4>
        {task.description && (
          <p className="task-board-card-desc">{task.description}</p>
        )}

        {/* Meta: Due Date & Assignee */}
        <div className="task-board-card-meta">
          <div
            className={`task-board-due-pill ${
              due.isOverdue ? "overdue" : due.isToday ? "today" : ""
            }`}
          >
            <Calendar size={12} className="flex-shrink-0" />
            <span>{due.text}</span>
          </div>

          <div className="task-board-assignee-chip">
            <div className="task-board-avatar">
              {(task.assignedTo?.name || "U").charAt(0).toUpperCase()}
            </div>
            <span>{task.assignedTo?.name || "Unassigned"}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div
          className="task-board-card-actions"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="task-card-action-group">
            {/* When Pending: advance to In Progress */}
            {task.status === "pending" && (
              <button
                type="button"
                className="task-status-move-btn btn-advance-progress"
                disabled={quickUpdatingId === task._id}
                onClick={() => handleQuickStatusUpdate(task._id, "in-progress")}
                title="Start Task (Move to In Progress)"
              >
                <Play size={11} />
                <span>Start</span>
                <ArrowRight size={11} />
              </button>
            )}

            {/* When In Progress: move back to Pending or advance to Completed */}
            {task.status === "in-progress" && (
              <>
                <button
                  type="button"
                  className="task-status-move-btn btn-move-back"
                  disabled={quickUpdatingId === task._id}
                  onClick={() => handleQuickStatusUpdate(task._id, "pending")}
                  title="Move back to Pending"
                >
                  <ArrowLeft size={11} />
                  <span>Pending</span>
                </button>

                <button
                  type="button"
                  className="task-status-move-btn btn-advance-complete"
                  disabled={quickUpdatingId === task._id}
                  onClick={() => handleQuickStatusUpdate(task._id, "completed")}
                  title="Complete Task"
                >
                  <CheckCircle2 size={11} />
                  <span>Done</span>
                </button>
              </>
            )}

            {/* When Completed: option to reopen */}
            {task.status === "completed" && (
              <button
                type="button"
                className="task-status-move-btn btn-move-back"
                disabled={quickUpdatingId === task._id}
                onClick={() => handleQuickStatusUpdate(task._id, "in-progress")}
                title="Reopen Task (Move to In Progress)"
              >
                <RotateCcw size={11} />
                <span>Reopen</span>
              </button>
            )}
          </div>

          <div className="task-board-crud-actions">
            {/* View Details */}
            <button
              type="button"
              className="action-btn-view"
              onClick={() => handleSelectTask(task)}
              title="View Details"
            >
              <Eye size={12} />
              {/* <span>Details</span> */}
            </button>

            {/* Quick Edit button for Admin */}
            <button
              type="button"
              className="action-btn-edit"
              onClick={() => openEditModal(task)}
              title="Edit Task"
            >
              <Edit3 size={12} />
              {/* <span>Edit</span> */}
            </button>

            {/* ONLY for Admin on COMPLETED tasks: Delete Task! */}
            {task.status === "completed" && (
              <button
                type="button"
                className="task-delete-btn-completed"
                disabled={deletingId === task._id}
                onClick={() => handleDeleteTask(task._id, task.title)}
                title="Delete completed task (Admin only)"
              >
                <Trash2 size={12} />
                <span>{deletingId === task._id ? "..." : " "}</span>
              </button>
            )}
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
          <h1>Tasks Management</h1>
          <p>Assign, monitor, edit, and organize tasks for your sales team.</p>
        </div>

        <button
          type="button"
          className="create-task-button desktop-only-btn"
          onClick={() => setShowCreateModal(true)}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Task
        </button>
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
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search tasks by title, company, or assignee"
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
          <div className="tasks-loading">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="tasks-empty">
            <h3>No matching tasks found</h3>
            <p>Try switching filter capsules, clearing search, or creating a new task.</p>
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
                  <p>Click on any task row in the table to view its full details and actions.</p>
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

      {/* ================= MOBILE FLOATING ACTION BUTTON (FAB) ================= */}
      <button
        type="button"
        className="tasks-mobile-fab"
        onClick={() => setShowCreateModal(true)}
        title="Create New Task"
        aria-label="Create New Task"
      >
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
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span className="tasks-mobile-fab-label">New Task</span>
      </button>

      {/* ================= CREATE TASK MODAL ================= */}
      {showCreateModal &&
        createPortal(
          <div
            className="task-modal-overlay"
            onClick={() => setShowCreateModal(false)}
          >
            <div
              className="task-modal-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="task-modal-header">
                <h3>Create New Task</h3>
                <button
                  type="button"
                  className="task-modal-close-btn"
                  onClick={() => setShowCreateModal(false)}
                  title="Close modal"
                  aria-label="Close"
                >
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
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

            <form onSubmit={handleCreateTask}>
              <div className="task-modal-body">
                {/* Title */}
                <div className="modal-form-group">
                  <label className="modal-form-label">Task Title</label>
                  <input
                    type="text"
                    name="title"
                    className="modal-form-control"
                    value={form.title}
                    onChange={handleCreateChange}
                    placeholder="e.g. Follow up on product demo"
                    required
                  />
                </div>

                {/* Company & Sales User */}
                <div className="modal-form-row">
                  <div className="modal-form-group">
                    <label className="modal-form-label">Company</label>
                    <select
                      name="company"
                      className="modal-form-control"
                      value={form.company}
                      onChange={handleCreateChange}
                      required
                    >
                      <option value="">Select company</option>
                      {companies
                        .filter((c) => c.status === "active")
                        .map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.companyName}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="modal-form-group">
                    <label className="modal-form-label">Assign To</label>
                    <select
                      name="assignedTo"
                      className="modal-form-control"
                      value={form.assignedTo}
                      onChange={handleCreateChange}
                      required
                    >
                      <option value="">Select sales user</option>
                      {users
                        .filter(
                          (u) => u.role === "sales" && u.status === "active"
                        )
                        .map((u) => (
                          <option key={u._id} value={u._id}>
                            {u.name} ({u.email})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Priority Option Capsules */}
                <div className="modal-form-group">
                  <label className="modal-form-label">Priority</label>
                  <div className="modal-capsule-group">
                    <button
                      type="button"
                      className={`modal-capsule-btn low ${form.priority === "low" ? "active" : ""}`}
                      onClick={() => setForm((prev) => ({ ...prev, priority: "low" }))}
                    >
                      <span className="badge-dot" />
                      Low
                    </button>
                    <button
                      type="button"
                      className={`modal-capsule-btn medium ${form.priority === "medium" ? "active" : ""}`}
                      onClick={() => setForm((prev) => ({ ...prev, priority: "medium" }))}
                    >
                      <span className="badge-dot" />
                      Medium
                    </button>
                    <button
                      type="button"
                      className={`modal-capsule-btn high ${form.priority === "high" ? "active" : ""}`}
                      onClick={() => setForm((prev) => ({ ...prev, priority: "high" }))}
                    >
                      <span className="badge-dot" />
                      High
                    </button>
                  </div>
                </div>

                {/* Due Date */}
                <div className="modal-form-group">
                  <label className="modal-form-label">Due Date</label>
                  <input
                    type="date"
                    name="dueDate"
                    className="modal-form-control"
                    value={form.dueDate}
                    onChange={handleCreateChange}
                  />
                </div>

                {/* Description */}
                <div className="modal-form-group">
                  <label className="modal-form-label">Description (Optional)</label>
                  <textarea
                    name="description"
                    className="modal-form-control modal-textarea"
                    value={form.description}
                    onChange={handleCreateChange}
                    placeholder="Add detailed task instructions..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="task-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={creating}
                >
                  {creating ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ================= EDIT TASK MODAL ================= */}
      {editingTask &&
        createPortal(
          <div
            className="task-modal-overlay"
            onClick={() => setEditingTask(null)}
          >
            <div
              className="task-modal-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="task-modal-header">
                <h3>Edit Task</h3>
                <button
                  type="button"
                  className="task-modal-close-btn"
                  onClick={() => setEditingTask(null)}
                  title="Close modal"
                  aria-label="Close"
                >
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
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

            <form onSubmit={handleUpdateTask}>
              <div className="task-modal-body">
                {/* Title */}
                <div className="modal-form-group">
                  <label className="modal-form-label">Task Title</label>
                  <input
                    type="text"
                    name="title"
                    className="modal-form-control"
                    value={editForm.title}
                    onChange={handleEditChange}
                    placeholder="Enter task title"
                    required
                  />
                </div>

                {/* Company & Sales User */}
                <div className="modal-form-row">
                  <div className="modal-form-group">
                    <label className="modal-form-label">Company</label>
                    <select
                      name="company"
                      className="modal-form-control"
                      value={editForm.company}
                      onChange={handleEditChange}
                    >
                      <option value="">Select company</option>
                      {companies.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.companyName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="modal-form-group">
                    <label className="modal-form-label">Assign To</label>
                    <select
                      name="assignedTo"
                      className="modal-form-control"
                      value={editForm.assignedTo}
                      onChange={handleEditChange}
                    >
                      <option value="">Select sales user</option>
                      {users
                        .filter((u) => u.role === "sales")
                        .map((u) => (
                          <option key={u._id} value={u._id}>
                            {u.name} ({u.email})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Priority & Status Capsule Option Selectors */}
                <div className="modal-form-group">
                  <label className="modal-form-label">Priority</label>
                  <div className="modal-capsule-group">
                    <button
                      type="button"
                      className={`modal-capsule-btn low ${editForm.priority === "low" ? "active" : ""}`}
                      onClick={() => setEditForm((prev) => ({ ...prev, priority: "low" }))}
                    >
                      <span className="badge-dot" />
                      Low
                    </button>
                    <button
                      type="button"
                      className={`modal-capsule-btn medium ${editForm.priority === "medium" ? "active" : ""}`}
                      onClick={() => setEditForm((prev) => ({ ...prev, priority: "medium" }))}
                    >
                      <span className="badge-dot" />
                      Medium
                    </button>
                    <button
                      type="button"
                      className={`modal-capsule-btn high ${editForm.priority === "high" ? "active" : ""}`}
                      onClick={() => setEditForm((prev) => ({ ...prev, priority: "high" }))}
                    >
                      <span className="badge-dot" />
                      High
                    </button>
                  </div>
                </div>

                <div className="modal-form-group">
                  <label className="modal-form-label">Status</label>
                  <div className="modal-capsule-group">
                    <button
                      type="button"
                      className={`modal-capsule-btn pending ${editForm.status === "pending" ? "active" : ""}`}
                      onClick={() => setEditForm((prev) => ({ ...prev, status: "pending" }))}
                    >
                      <span className="badge-dot" />
                      Pending
                    </button>
                    <button
                      type="button"
                      className={`modal-capsule-btn in-progress ${editForm.status === "in-progress" ? "active" : ""}`}
                      onClick={() => setEditForm((prev) => ({ ...prev, status: "in-progress" }))}
                    >
                      <span className="badge-dot" />
                      In Progress
                    </button>
                    <button
                      type="button"
                      className={`modal-capsule-btn completed ${editForm.status === "completed" ? "active" : ""}`}
                      onClick={() => setEditForm((prev) => ({ ...prev, status: "completed" }))}
                    >
                      <span className="badge-dot" />
                      Completed
                    </button>
                  </div>
                </div>

                {/* Due Date */}
                <div className="modal-form-group">
                  <label className="modal-form-label">Due Date</label>
                  <input
                    type="date"
                    name="dueDate"
                    className="modal-form-control"
                    value={editForm.dueDate}
                    onChange={handleEditChange}
                  />
                </div>

                {/* Description */}
                <div className="modal-form-group">
                  <label className="modal-form-label">Description</label>
                  <textarea
                    name="description"
                    className="modal-form-control modal-textarea"
                    value={editForm.description}
                    onChange={handleEditChange}
                    placeholder="Add task details..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="task-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setEditingTask(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={updating}
                >
                  {updating ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminTasks;