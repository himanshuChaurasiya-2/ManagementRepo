import { useEffect, useState } from "react";
import api from "../../services/api";
import type { Task } from "../../types/task";
import type { SalesUser } from "../../types/user";
import "../admin/admindasboard.css"

const AdminDashboard = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<SalesUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);

        const [tasksResponse, usersResponse] =
          await Promise.all([
            api.get("/tasks"),
            api.get("/users"),
          ]);

        setTasks(
          tasksResponse.data.tasks || []
        );

        setUsers(
          usersResponse.data.users || []
        );
      } catch (error) {
        console.error(
          "Dashboard loading error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const pendingTasks = tasks.filter(
    (task) => task.status === "pending"
  );

  const inProgressTasks = tasks.filter(
    (task) => task.status === "in-progress"
  );

  const completedTasks = tasks.filter(
    (task) => task.status === "completed"
  );

  const activeUsers = users.filter(
    (user) => user.status === "active"
  );

  if (loading) {
    return (
      <div className="dashboard-loading">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="admin-dashboard">

      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>
            Overview of your sales team, active tasks, and performance.
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="stats-grid">

        {/* Total Users */}
        <div className="stat-card stat-users">
          <div className="stat-card-header">
            <span>Active Users</span>
            <div className="stat-icon-wrapper">
              <svg
                width="20"
                height="20"
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
            </div>
          </div>
          <strong>{activeUsers.length}</strong>
        </div>

        {/* Total Tasks */}
        <div className="stat-card stat-tasks">
          <div className="stat-card-header">
            <span>Total Tasks</span>
            <div className="stat-icon-wrapper">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
              </svg>
            </div>
          </div>
          <strong>{tasks.length}</strong>
        </div>

        {/* Pending */}
        <div className="stat-card stat-pending">
          <div className="stat-card-header">
            <span>Pending</span>
            <div className="stat-icon-wrapper">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>
          <strong>{pendingTasks.length}</strong>
        </div>

        {/* In Progress */}
        <div className="stat-card stat-progress">
          <div className="stat-card-header">
            <span>In Progress</span>
            <div className="stat-icon-wrapper">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.83 6.72 2.24" />
                <path d="M21 3v6h-6" />
              </svg>
            </div>
          </div>
          <strong>{inProgressTasks.length}</strong>
        </div>

        {/* Completed */}
        <div className="stat-card stat-completed">
          <div className="stat-card-header">
            <span>Completed</span>
            <div className="stat-icon-wrapper">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>
          <strong>{completedTasks.length}</strong>
        </div>

      </div>

      {/* Task Overview */}
      <div className="section">

        <div className="section-header">
          <div>
            <h2>Task Overview</h2>
            <p className="section-subtitle">Real-time status breakdown across sales assignments</p>
          </div>
        </div>

        <div className="task-columns">

          {/* Pending Column */}
          <div className="task-column">

            <div className="task-column-header header-pending">
              <div className="column-title-group">
                <span className="column-indicator indicator-pending" />
                <h3>Pending</h3>
              </div>
              <span className="column-count">
                {pendingTasks.length}
              </span>
            </div>

            <div className="task-column-body">
              {pendingTasks.length === 0 ? (
                <div className="empty-column-card">
                  <p className="empty-text">
                    No pending tasks
                  </p>
                </div>
              ) : (
                pendingTasks.slice(0, 5).map(
                  (task) => (
                    <TaskPreview
                      key={task._id}
                      task={task}
                    />
                  )
                )
              )}
            </div>

          </div>

          {/* In Progress Column */}
          <div className="task-column">

            <div className="task-column-header header-progress">
              <div className="column-title-group">
                <span className="column-indicator indicator-progress" />
                <h3>In Progress</h3>
              </div>
              <span className="column-count">
                {inProgressTasks.length}
              </span>
            </div>

            <div className="task-column-body">
              {inProgressTasks.length === 0 ? (
                <div className="empty-column-card">
                  <p className="empty-text">
                    No tasks in progress
                  </p>
                </div>
              ) : (
                inProgressTasks.slice(0, 5).map(
                  (task) => (
                    <TaskPreview
                      key={task._id}
                      task={task}
                    />
                  )
                )
              )}
            </div>

          </div>

          {/* Completed Column */}
          <div className="task-column">

            <div className="task-column-header header-completed">
              <div className="column-title-group">
                <span className="column-indicator indicator-completed" />
                <h3>Completed</h3>
              </div>
              <span className="column-count">
                {completedTasks.length}
              </span>
            </div>

            <div className="task-column-body">
              {completedTasks.length === 0 ? (
                <div className="empty-column-card">
                  <p className="empty-text">
                    No completed tasks
                  </p>
                </div>
              ) : (
                completedTasks.slice(0, 5).map(
                  (task) => (
                    <TaskPreview
                      key={task._id}
                      task={task}
                    />
                  )
                )
              )}
            </div>

          </div>

        </div>

      </div>

      {/* Recent Tasks */}
      <div className="section">

        <div className="section-header">
          <div>
            <h2>Recent Tasks</h2>
            <p className="section-subtitle">Latest assigned actions and priority levels</p>
          </div>
        </div>

        <div className="table-container">

          <table className="admin-table">

            <thead>
              <tr>
                <th>Task</th>
                <th>Assigned To</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due Date</th>
              </tr>
            </thead>

            <tbody>

              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-empty">
                    No tasks found
                  </td>
                </tr>
              ) : (
                tasks.slice(0, 10).map(
                  (task) => {
                    const assigneeName = task.assignedTo?.name || "Unassigned";
                    const assigneeInitial = assigneeName.charAt(0).toUpperCase();

                    return (
                      <tr key={task._id}>

                        <td>
                          <div className="task-title-cell">
                            <strong>
                              {task.title}
                            </strong>
                            {task.description && (
                              <span className="task-desc-sub">
                                {task.description.length > 50
                                  ? `${task.description.substring(0, 50)}...`
                                  : task.description}
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          <div className="assignee-cell">
                            <span className="assignee-avatar">
                              {assigneeInitial}
                            </span>
                            <span>{assigneeName}</span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`priority priority-${task.priority}`}
                          >
                            {task.priority}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`status status-${task.status}`}
                          >
                            {task.status}
                          </span>
                        </td>

                        <td>
                          <span className="due-date-text">
                            {task.dueDate
                              ? new Date(
                                task.dueDate
                              ).toLocaleDateString()
                              : "-"}
                          </span>
                        </td>

                      </tr>
                    );
                  }
                )
              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
};

interface TaskPreviewProps {
  task: Task;
}

const TaskPreview = ({
  task,
}: TaskPreviewProps) => {
  const assigneeName = task.assignedTo?.name || "Unassigned";
  const assigneeInitial = assigneeName.charAt(0).toUpperCase();

  return (
    <div className="task-preview">

      <div className="task-preview-info">
        <strong>{task.title}</strong>

        <div className="task-preview-assignee">
          <span className="task-preview-avatar">
            {assigneeInitial}
          </span>
          <span>{assigneeName}</span>
        </div>
      </div>

      <span
        className={`priority priority-${task.priority}`}
      >
        {task.priority}
      </span>

    </div>
  );
};

export default AdminDashboard;