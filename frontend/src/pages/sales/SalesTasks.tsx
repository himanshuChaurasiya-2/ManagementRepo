import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "../pages.css";

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

const API_URL = "http://localhost:5000/api";

const MyTasks = () => {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // ==========================================
  // TOKEN
  // ==========================================

  const getToken = () => {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      ""
    );
  };

  // ==========================================
  // AUTH CONFIG
  // ==========================================

  const authConfig = () => ({
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  // ==========================================
  // LOAD MY TASKS
  // ==========================================

  const loadMyTasks = async () => {
    try {
      setLoading(true);

      const response = await axios.get(
        `${API_URL}/tasks/my`,
        authConfig()
      );

      console.log("MY TASKS RESPONSE:", response.data);

      if (response.data.success) {
        setTasks(response.data.tasks || []);
      } else {
        setTasks([]);
      }
    } catch (error: any) {
      console.error("Get my tasks error:", error);

      setTasks([]);

      alert(
        error.response?.data?.message ||
        "Unable to load your tasks"
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // LOAD ON PAGE OPEN
  // ==========================================

  useEffect(() => {
    loadMyTasks();
  }, []);

  // ==========================================
  // FILTER TASKS
  // ==========================================

  const filteredTasks = useMemo(() => {
    const query = search.toLowerCase().trim();

    return tasks.filter((task) => {
      const matchesSearch =
        !query ||
        task.title?.toLowerCase().includes(query) ||
        task.description
          ?.toLowerCase()
          .includes(query) ||
        task.company?.companyName
          ?.toLowerCase()
          .includes(query) ||
        task.priority
          ?.toLowerCase()
          .includes(query) ||
        task.status
          ?.toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        task.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tasks, search, statusFilter]);

  // ==========================================
  // STATISTICS
  // ==========================================

  const pendingTasks = tasks.filter(
    (task) => task.status === "pending"
  ).length;

  const inProgressTasks = tasks.filter(
    (task) => task.status === "in-progress"
  ).length;

  const completedTasks = tasks.filter(
    (task) => task.status === "completed"
  ).length;


  // ==========================================
  // PRIORITY LABEL
  // ==========================================

  const getPriorityLabel = (priority?: string) => {
    if (!priority) return "—";

    return (
      priority.charAt(0).toUpperCase() +
      priority.slice(1)
    );
  };

  // ==========================================
  // UPDATE TASK STATUS
  // ==========================================

  const updateTaskStatus = async (
    taskId: string,
    status:
      | "pending"
      | "in-progress"
      | "completed"
  ) => {
    try {
      await axios.patch(
        `${API_URL}/tasks/${taskId}/status`,
        {
          status,
        },
        authConfig()
      );

      // Update UI immediately
      setTasks((previousTasks) =>
        previousTasks.map((task) =>
          task._id === taskId
            ? {
              ...task,
              status,
            }
            : task
        )
      );

      // Optional backend refresh
      await loadMyTasks();
    } catch (error: any) {
      console.error(
        "Update task status error:",
        error
      );

      alert(
        error.response?.data?.message ||
        "Unable to update task status"
      );
    }
  };

  // ==========================================
  // STATUS SELECT CLASS
  // ==========================================

  const getStatusSelectClass = (
    status?: string
  ) => {
    switch (status) {
      case "completed":
        return "status-completed";

      case "in-progress":
        return "status-in-progress";

      case "pending":
      default:
        return "status-pending";
    }
  };

  // ==========================================
  // RETURN
  // ==========================================

  return (
    <div className="company-page">

      {/* =====================================
          HEADER
      ====================================== */}

      <div className="company-header">
        <div>
          <h1>My Tasks</h1>

          <p>
            Tasks assigned to you.
          </p>
        </div>
      </div>


      {/* =====================================
          STATS
      ====================================== */}

      <div className="company-stats">

        {/* TOTAL */}

        <div className="company-stat-card">
          <span>
            My Tasks
          </span>

          <strong>
            {loading
              ? "..."
              : tasks.length}
          </strong>
        </div>


        {/* PENDING */}

        <div className="company-stat-card">
          <span>
            Pending
          </span>

          <strong className="inactive-number">
            {loading
              ? "..."
              : pendingTasks}
          </strong>
        </div>


        {/* IN PROGRESS */}

        <div className="company-stat-card">
          <span>
            In Progress
          </span>

          <strong>
            {loading
              ? "..."
              : inProgressTasks}
          </strong>
        </div>


        {/* COMPLETED */}

        <div className="company-stat-card">
          <span>
            Completed
          </span>

          <strong className="active-number">
            {loading
              ? "..."
              : completedTasks}
          </strong>
        </div>

      </div>


      {/* =====================================
          TASK TABLE CARD
      ====================================== */}

      <div className="company-table-card">

        {/* TABLE HEADER */}

        <div className="company-table-header">

          <div>
            <h3>
              My Tasks
            </h3>

            <p>
              View and track your assigned tasks.
            </p>
          </div>


          {/* SEARCH */}

          <input
            type="text"
            placeholder="Search my tasks..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="company-search"
          />

        </div>


        {/* =================================
            FILTER
        ================================== */}

        <div className="task-filter-bar">

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
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


          {/* RESULT COUNT */}

          {!loading && (
            <span className="task-result-count">
              Showing{" "}
              {filteredTasks.length} of{" "}
              {tasks.length} tasks
            </span>
          )}

        </div>


        {/* =================================
            LOADING
        ================================== */}

        {loading ? (

          <div className="company-loading">
            Loading your tasks...
          </div>

        ) : filteredTasks.length === 0 ? (

          /* =================================
             EMPTY
          ================================== */

          <div className="company-empty">

            <h3>
              No tasks found
            </h3>

            <p>
              {tasks.length === 0
                ? "You currently don't have any assigned tasks."
                : "No tasks match your search or status filter."}
            </p>

          </div>

        ) : (

          /* =================================
             TABLE
          ================================== */

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

                      {/* SERIAL NUMBER */}

                      <td className="task-number-cell">
                        {index + 1}
                      </td>


                      {/* TASK */}

                      <td className="task-title-cell">

                        <strong>
                          {task.title}
                        </strong>

                        {task.description && (
                          <div className="task-description">
                            {task.description}
                          </div>
                        )}

                      </td>


                      {/* COMPANY */}

                      <td>
                        {task.company?.companyName ||
                          "—"}
                      </td>


                      {/* PRIORITY */}

                      <td>

                        <span
                          className={`task-priority ${task.priority || ""
                            }`}
                        >
                          {getPriorityLabel(
                            task.priority
                          )}
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

                        <select
                          value={
                            task.status ||
                            "pending"
                          }
                          onChange={(e) =>
                            updateTaskStatus(
                              task._id,
                              e.target.value as
                              | "pending"
                              | "in-progress"
                              | "completed"
                            )
                          }
                          className={`task-status-select ${getStatusSelectClass(
                            task.status
                          )}`}
                        >

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

export default MyTasks;