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
  priority?: "low" | "medium" | "high";
  status?: "pending" | "in-progress" | "completed";
  dueDate?: string;
  createdAt: string;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const MyTasks = () => {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");

  const getToken = () => {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      ""
    );
  };

  const getCurrentUser = (): UserData | null => {
    try {
      const storedUser =
        localStorage.getItem("user");

      if (!storedUser) return null;

      return JSON.parse(storedUser);
    } catch {
      return null;
    }
  };

  const authConfig = () => ({
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  const getAssignedUserId = (
    assignedTo?: UserData | string | null
  ) => {
    if (!assignedTo) return "";

    if (typeof assignedTo === "string") {
      return assignedTo;
    }

    return assignedTo._id;
  };

  const loadMyTasks = async () => {
    try {
      setLoading(true);

      const response = await axios.get(
        `${API_URL}/tasks`,
        authConfig()
      );

      if (response.data.success) {
        const allTasks =
          response.data.tasks || [];

        const currentUser =
          getCurrentUser();

        if (!currentUser?._id) {
          setTasks([]);
          return;
        }

        const myTasks = allTasks.filter(
          (task: TaskData) =>
            getAssignedUserId(
              task.assignedTo
            ) === currentUser._id
        );

        setTasks(myTasks);
      }
    } catch (error: any) {
      console.error(
        "Get my tasks error:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Unable to load your tasks"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyTasks();
  }, []);

  const filteredTasks = useMemo(() => {
    const query =
      search.toLowerCase().trim();

    return tasks.filter((task) => {
      const matchesSearch =
        !query ||
        task.title
          ?.toLowerCase()
          .includes(query) ||
        task.description
          ?.toLowerCase()
          .includes(query) ||
        task.company?.companyName
          ?.toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        task.status === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    tasks,
    search,
    statusFilter,
  ]);

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

  return (
    <div className="company-page">

      {/* HEADER */}

      <div className="company-header">

        <div>
          <h1>My Tasks</h1>

          <p>
            Tasks assigned to you.
          </p>
        </div>

      </div>

      {/* STATS */}

      <div className="company-stats">

        <div className="company-stat-card">
          <span>My Tasks</span>

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

      {/* TASK TABLE */}

      <div className="company-table-card">

        <div className="company-table-header">

          <h3>
            My Tasks
          </h3>

          <input
            type="text"
            placeholder="Search my tasks..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            className="company-search"
          />

        </div>

        {/* FILTER */}

        <div className="task-filter-bar">

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

          {!loading && (
            <span className="task-result-count">
              Showing {filteredTasks.length} of {tasks.length} tasks
            </span>
          )}

          {(statusFilter !== "all" || search.trim() !== "") && (
            <button
              type="button"
              className="task-reset-filter-btn"
              onClick={() => {
                setStatusFilter("all");
                setSearch("");
              }}
            >
              Reset Filters
            </button>
          )}

        </div>

        {loading ? (

          <div className="company-loading">
            Loading your tasks...
          </div>

        ) : filteredTasks.length === 0 ? (

          <div className="company-empty">

            <h3>
              No tasks assigned
            </h3>

            <p>
              You currently don't have
              any assigned tasks.
            </p>

          </div>

        ) : (

          <div className="company-table-wrapper">

            <table className="company-table">

              <thead>
                <tr>
                  <th>Sr. No.</th>
                  <th>Task</th>
                  <th>Company</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Created Date</th>
                </tr>
              </thead>

              <tbody>

                {filteredTasks.map(
                  (task, index) => (

                    <tr
                      key={task._id}
                    >

                      <td className="task-number-cell">
                        {index + 1}
                      </td>

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

                      <td className="task-company-cell">
                        <span className="task-company-badge">
                          {
                            task.company
                              ?.companyName ||
                            "—"
                          }
                        </span>
                      </td>

                      <td>
                        <span className={`task-priority ${task.priority || "medium"}`}>
                          {task.priority
                            ? task.priority
                                .charAt(0)
                                .toUpperCase() +
                              task.priority.slice(
                                1
                              )
                            : "—"}
                        </span>
                      </td>

                      <td className="task-date-cell">
                        {task.dueDate
                          ? new Date(
                              task.dueDate
                            ).toLocaleDateString()
                          : "—"}
                      </td>

                      <td className="task-status-cell">

                        <span
                          className={`task-status-badge status-${task.status || "pending"}`}
                        >
                          {getStatusLabel(
                            task.status
                          )}
                        </span>

                      </td>

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

export default MyTasks;