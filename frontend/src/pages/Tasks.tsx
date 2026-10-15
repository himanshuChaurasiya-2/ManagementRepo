import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./pages.css";

interface UserData {
  _id: string;
  name?: string;
  email?: string;
  role?: string;
}

interface TaskData {
  _id: string;
  title: string;
  description?: string;
  company?: {
    _id: string;
    companyName: string;
  };
  assignedTo?: UserData | string | null;
  assignedBy?: UserData | string | null;
  priority?: "low" | "medium" | "high";
  status?: "pending" | "in-progress" | "completed";
  dueDate?: string;
  createdAt: string;
}

const API_URL = "http://localhost:5000/api";

const Tasks = () => {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [priorityFilter, setPriorityFilter] =
    useState("all");

  const getToken = () => {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      ""
    );
  };

  const authConfig = () => ({
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  // ==========================================
  // GET ALL TASKS
  // ==========================================

  const loadTasks = async () => {
    try {
      setLoading(true);

      const response = await axios.get(
        `${API_URL}/tasks`,
        authConfig()
      );

      if (response.data.success) {
        setTasks(response.data.tasks || []);
      }
    } catch (error: any) {
      console.error("Get all tasks error:", error);

      alert(
        error?.response?.data?.message ||
          "Unable to load tasks"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // ==========================================
  // HELPER - USER NAME
  // ==========================================

  const getUserName = (
    user?: UserData | string | null
  ) => {
    if (!user) return "—";

    if (typeof user === "string") {
      return user;
    }

    return (
      user.name ||
      user.email ||
      "Unknown User"
    );
  };

  // ==========================================
  // FILTER TASKS
  // ==========================================

  const filteredTasks = useMemo(() => {
    const query =
      search.toLowerCase().trim();

    return tasks.filter((task) => {
      const assignedToName =
        getUserName(task.assignedTo)
          .toLowerCase();

      const assignedByName =
        getUserName(task.assignedBy)
          .toLowerCase();

      const companyName =
        task.company?.companyName
          ?.toLowerCase() || "";

      const matchesSearch =
        !query ||
        task.title
          ?.toLowerCase()
          .includes(query) ||
        task.description
          ?.toLowerCase()
          .includes(query) ||
        assignedToName.includes(query) ||
        assignedByName.includes(query) ||
        companyName.includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        task.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" ||
        task.priority === priorityFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority
      );
    });
  }, [
    tasks,
    search,
    statusFilter,
    priorityFilter,
  ]);

  // ==========================================
  // STATS
  // ==========================================

  const pendingTasks = tasks.filter(
    (task) =>
      task.status === "pending"
  ).length;

  const inProgressTasks = tasks.filter(
    (task) =>
      task.status === "in-progress"
  ).length;

  const completedTasks = tasks.filter(
    (task) =>
      task.status === "completed"
  ).length;

  // ==========================================
  // STATUS LABEL
  // ==========================================

  const getStatusLabel = (
    status?: string
  ) => {
    switch (status) {
      case "in-progress":
        return "In Progress";

      case "completed":
        return "Completed";

      default:
        return "Pending";
    }
  };

  // ==========================================
  // PRIORITY LABEL
  // ==========================================

  const getPriorityLabel = (
    priority?: string
  ) => {
    if (!priority) return "—";

    return (
      priority.charAt(0).toUpperCase() +
      priority.slice(1)
    );
  };


  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="company-page">

      {/* ================= HEADER ================= */}

      <div className="company-header">
        <div>
          <h1>All Tasks</h1>

          <p>
            View all tasks and their assignments.
          </p>
        </div>
      </div>

      {/* ================= STATS ================= */}

      <div className="company-stats">

        <div className="company-stat-card">
          <span>Total Tasks</span>

          <strong className="total-number">
            {loading
              ? "..."
              : tasks.length}
          </strong>
        </div>

        <div className="company-stat-card">
          <span>Pending</span>

          <strong className="pending-number">
            {loading
              ? "..."
              : pendingTasks}
          </strong>
        </div>

        <div className="company-stat-card">
          <span>In Progress</span>

          <strong className="progress-number">
            {loading
              ? "..."
              : inProgressTasks}
          </strong>
        </div>

        <div className="company-stat-card">
          <span>Completed</span>

          <strong className="active-number">
            {loading
              ? "..."
              : completedTasks}
          </strong>
        </div>

      </div>

      {/* ================= TASK TABLE ================= */}

      <div className="company-table-card">

        {/* TABLE HEADER */}

        <div className="company-table-header">

          <h3>
            All Tasks
          </h3>

          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="company-search"
          />

        </div>

        {/* ================= FILTERS ================= */}

        <div className="task-filter-bar">

          {/* STATUS */}

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value
              )
            }
            className="task-filter-select"
          >
            <option value="all">
              All Status
            </option>

            <option value="pending">
              Pending
            </option>

            <option value="in-progress">
              In Progress
            </option>

            <option value="completed">
              Completed
            </option>
          </select>

          {/* PRIORITY */}

          <select
            value={priorityFilter}
            onChange={(e) =>
              setPriorityFilter(
                e.target.value
              )
            }
            className="task-filter-select"
          >
            <option value="all">
              All Priority
            </option>

            <option value="high">
              High
            </option>

            <option value="medium">
              Medium
            </option>

            <option value="low">
              Low
            </option>
          </select>

          {/* RESULT COUNT */}
          {!loading && (
            <span className="task-result-count">
              Showing {filteredTasks.length} of {tasks.length} tasks
            </span>
          )}

          {/* RESET BUTTON */}
          {(statusFilter !== "all" || priorityFilter !== "all" || search.trim() !== "") && (
            <button
              type="button"
              className="task-reset-filter-btn"
              onClick={() => {
                setStatusFilter("all");
                setPriorityFilter("all");
                setSearch("");
              }}
            >
              Reset Filters
            </button>
          )}

        </div>

        {/* ================= LOADING ================= */}

        {loading ? (

          <div className="company-loading">
            Loading tasks...
          </div>

        ) : filteredTasks.length === 0 ? (

          /* ================= EMPTY ================= */

          <div className="company-empty">

            <h3>
              No tasks found
            </h3>

            <p>
              There are currently no tasks
              matching your search or filters.
            </p>

          </div>

        ) : (

          /* ================= TABLE ================= */

          <div className="company-table-wrapper">

            <table className="company-table">

              <thead>

                <tr>

                  <th>
                    Sr. No.
                  </th>

                  <th>
                    Task
                  </th>

                  <th>
                    Company
                  </th>

                  <th>
                    Assigned To
                  </th>

                  <th>
                    Assigned By
                  </th>

                  <th>
                    Priority
                  </th>

                  <th>
                    Due Date
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Created Date
                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredTasks.map(
                  (task, index) => (

                    <tr
                      key={task._id}
                    >

                      {/* SR NO */}

                      <td className="task-number-cell">
                        {index + 1}
                      </td>

                      {/* TASK */}

                      <td className="task-title-cell">

                        <strong className="task-title-text">
                          {task.title}
                        </strong>

                        {task.description && (

                          <div className="task-description">
                            {task.description}
                          </div>

                        )}

                      </td>

                      {/* COMPANY */}

                      <td className="task-company-cell">

                        <span className="task-company-badge">
                          {task.company?.companyName || "—"}
                        </span>

                      </td>

                      {/* ASSIGNED TO */}

                      <td className="task-assignee-cell">

                        <strong>
                          {
                            getUserName(
                              task.assignedTo
                            )
                          }
                        </strong>

                        {typeof task.assignedTo !==
                          "string" &&
                          task.assignedTo
                            ?.email && (

                          <span className="task-user-email">
                            {
                              task.assignedTo
                                .email
                            }
                          </span>

                        )}

                      </td>

                      {/* ASSIGNED BY */}

                      <td className="task-assigner-cell">

                        {
                          getUserName(
                            task.assignedBy
                          )
                        }

                      </td>

                      {/* PRIORITY */}

                      <td>

                        <span
                          className={`task-priority ${task.priority || "medium"}`}
                        >
                          {
                            getPriorityLabel(
                              task.priority
                            )
                          }
                        </span>

                      </td>

                      {/* DUE DATE */}

                      <td className="task-date-cell">

                        {task.dueDate
                          ? new Date(
                              task.dueDate
                            ).toLocaleDateString()
                          : "—"}

                      </td>

                      {/* STATUS */}

                      <td className="task-status-cell">

                        <span
                          className={`task-status-badge status-${task.status || "pending"}`}
                        >
                          {
                            getStatusLabel(
                              task.status
                            )
                          }
                        </span>

                      </td>

                      {/* CREATED DATE */}

                      <td className="task-date-cell">

                        {new Date(
                          task.createdAt
                        ).toLocaleDateString()}

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  );
};

export default Tasks;