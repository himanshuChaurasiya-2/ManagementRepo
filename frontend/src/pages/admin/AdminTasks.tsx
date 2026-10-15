import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
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

  // Filter states for Priority and Status capsules
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchStatus =
        selectedStatus === "all" || t.status === selectedStatus;
      const matchPriority =
        selectedPriority === "all" || t.priority === selectedPriority;
      return matchStatus && matchPriority;
    });
  }, [tasks, selectedStatus, selectedPriority]);

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
          className="create-task-button"
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

      {/* Tasks Table Card */}
      <div className="tasks-card">
        <div className="tasks-card-header">
          <div className="d-flex align-items-center gap-2">
            <h2>All Assigned Tasks</h2>
            
          </div>
        </div>

        {/* Priority & Status Filter Capsules Section */}
        <div className="tasks-filter-bar">
          <div className="tasks-filter-group">
            <span className="tasks-filter-label">Status:</span>
            <div className="tasks-capsule-group">
              <button
                type="button"
                className={`task-filter-capsule all ${selectedStatus === "all" ? "active" : ""}`}
                onClick={() => setSelectedStatus("all")}
              >
                All ({tasks.length})
              </button>
              <button
                type="button"
                className={`task-filter-capsule pending ${selectedStatus === "pending" ? "active" : ""}`}
                onClick={() => setSelectedStatus("pending")}
              >
                <span className="badge-dot" />
                Pending ({tasks.filter((t) => t.status === "pending").length})
              </button>
              <button
                type="button"
                className={`task-filter-capsule in-progress ${selectedStatus === "in-progress" ? "active" : ""}`}
                onClick={() => setSelectedStatus("in-progress")}
              >
                <span className="badge-dot" />
                In Progress ({tasks.filter((t) => t.status === "in-progress").length})
              </button>
              <button
                type="button"
                className={`task-filter-capsule completed ${selectedStatus === "completed" ? "active" : ""}`}
                onClick={() => setSelectedStatus("completed")}
              >
                <span className="badge-dot" />
                Completed ({tasks.filter((t) => t.status === "completed").length})
              </button>
            </div>
          </div>

          <div className="tasks-filter-group">
            <span className="tasks-filter-label">Priority:</span>
            <div className="tasks-capsule-group">
              <button
                type="button"
                className={`task-filter-capsule all ${selectedPriority === "all" ? "active" : ""}`}
                onClick={() => setSelectedPriority("all")}
              >
                All
              </button>
              <button
                type="button"
                className={`task-filter-capsule low ${selectedPriority === "low" ? "active" : ""}`}
                onClick={() => setSelectedPriority("low")}
              >
                <span className="badge-dot" />
                Low ({tasks.filter((t) => t.priority === "low").length})
              </button>
              <button
                type="button"
                className={`task-filter-capsule medium ${selectedPriority === "medium" ? "active" : ""}`}
                onClick={() => setSelectedPriority("medium")}
              >
                <span className="badge-dot" />
                Medium ({tasks.filter((t) => t.priority === "medium").length})
              </button>
              <button
                type="button"
                className={`task-filter-capsule high ${selectedPriority === "high" ? "active" : ""}`}
                onClick={() => setSelectedPriority("high")}
              >
                <span className="badge-dot" />
                High ({tasks.filter((t) => t.priority === "high").length})
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="tasks-loading">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="tasks-empty">
            <h3>No matching tasks found</h3>
            <p>Try switching filter capsules or create a new task.</p>
          </div>
        ) : (
          <div className="tasks-table-wrapper">
            <table className="tasks-table">
              <thead>
                <tr>
                  <th>Task Title</th>
                  <th>Company</th>
                  <th>Assigned To</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task._id}>
                    <td>
                      <div className="task-title">{task.title}</div>
                      {task.description && (
                        <div className="task-description">
                          {task.description}
                        </div>
                      )}
                    </td>

                    <td>
                      <span className="company-tag">
                        {task.company?.companyName || "No company"}
                      </span>
                    </td>

                    <td>
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

                    {/* Priority Section: Capsule with blur effect & option color */}
                    <td>
                      <span className={`priority-badge ${task.priority}`}>
                        <span className="badge-dot" />
                        {task.priority}
                      </span>
                    </td>

                    {/* Status Section: Capsule with blur effect & option color */}
                    <td>
                      <span className={`status-badge ${task.status}`}>
                        <span className="badge-dot" />
                        {task.status === "in-progress" ? "In Progress" : task.status}
                      </span>
                    </td>

                    <td>
                      <span className="due-date-text">
                        {task.dueDate
                          ? new Date(task.dueDate).toLocaleDateString()
                          : "No deadline"}
                      </span>
                    </td>

                    <td className="text-end">
                      <div className="task-action-buttons">
                        <button
                          type="button"
                          className="action-btn-edit"
                          title="Edit Task"
                          onClick={() => openEditModal(task)}
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
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          Edit
                        </button>

                        <button
                          type="button"
                          className="action-btn-delete"
                          title="Delete Task"
                          disabled={deletingId === task._id}
                          onClick={() =>
                            handleDeleteTask(task._id, task.title)
                          }
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
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          {deletingId === task._id ? "..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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