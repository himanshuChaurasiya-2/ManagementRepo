import { useEffect, useState } from "react";
import axios from "axios";
import "../admin/admindasboard.css";

interface User {
  _id: string;
  name: string;
  email: string;
  jobPosition?: string;
  role: "admin" | "sales";
  status: "active" | "inactive";
  mustChangePassword: boolean;
  createdAt: string;
}

interface CreateUserResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
    jobPosition?: string;
    role: string;
    status: string;
    mustChangePassword: boolean;
  };
  temporaryPassword: string;
}

interface ResetPasswordResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  temporaryPassword: string;
}

const API_URL = "http://localhost:5000/api";

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [jobPosition, setJobPosition] = useState("");

  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [createdUserName, setCreatedUserName] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const getToken = () => {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      ""
    );
  };

  const getAuthConfig = () => ({
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  // ===============================
  // GET USERS
  // ===============================

  const loadUsers = async () => {
    try {
      setLoading(true);

      const response = await axios.get(
        `${API_URL}/users`,
        getAuthConfig()
      );

      if (response.data.success) {
        setUsers(response.data.users);
      }
    } catch (error: any) {
      console.error("Get users error:", error);

      alert(
        error.response?.data?.message ||
        "Unable to load users"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // ===============================
  // CREATE USER
  // ===============================

  const handleCreateUser = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      alert("Name and email are required");
      return;
    }

    try {
      setSubmitting(true);

      const response =
        await axios.post<CreateUserResponse>(
          `${API_URL}/users`,
          {
            name: name.trim(),
            email: email.trim(),
            jobPosition: jobPosition.trim() || "Sales Representative",
            role: "sales",
          },
          getAuthConfig()
        );

      if (response.data.success) {
        setTemporaryPassword(
          response.data.temporaryPassword
        );

        setCreatedUserName(response.data.user.name);

        setShowCreateModal(false);
        setShowPasswordModal(true);

        setName("");
        setEmail("");
        setJobPosition("");

        await loadUsers();
      }
    } catch (error: any) {
      console.error("Create user error:", error);

      alert(
        error.response?.data?.message ||
        "Unable to create user"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ===============================
  // CHANGE STATUS
  // ===============================

  const handleStatusChange = async (
    user: User
  ) => {
    const newStatus =
      user.status === "active"
        ? "inactive"
        : "active";

    const confirmed = window.confirm(
      `Are you sure you want to ${newStatus === "active"
        ? "activate"
        : "deactivate"
      } ${user.name}?`
    );

    if (!confirmed) return;

    try {
      setActionLoading(user._id);

      await axios.patch(
        `${API_URL}/users/${user._id}/status`,
        {
          status: newStatus,
        },
        getAuthConfig()
      );

      await loadUsers();
    } catch (error: any) {
      console.error(
        "Update user status error:",
        error
      );

      alert(
        error.response?.data?.message ||
        "Unable to update user status"
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ===============================
  // RESET PASSWORD
  // ===============================

  const handleResetPassword = async (
    user: User
  ) => {
    const confirmed = window.confirm(
      `Reset password for ${user.name}?`
    );

    if (!confirmed) return;

    try {
      setActionLoading(user._id);

      const response =
        await axios.patch<ResetPasswordResponse>(
          `${API_URL}/users/${user._id}/reset-password`,
          {},
          getAuthConfig()
        );

      if (response.data.success) {
        setTemporaryPassword(
          response.data.temporaryPassword
        );

        setCreatedUserName(user.name);

        setShowPasswordModal(true);

        await loadUsers();
      }
    } catch (error: any) {
      console.error(
        "Reset password error:",
        error
      );

      alert(
        error.response?.data?.message ||
        "Unable to reset password"
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ===============================
  // COPY PASSWORD
  // ===============================

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(
        temporaryPassword
      );

      alert("Temporary password copied");
    } catch {
      alert("Unable to copy password");
    }
  };

  return (
    <div className="users-page">

      {/* ================= HEADER ================= */}

      <div className="users-header">
        <div>
          <h1>Users</h1>

          <p>
            Manage sales users here.
          </p>
        </div>

        <button
          className="add-user-btn"
          onClick={() =>
            setShowCreateModal(true)
          }
        >
          + Add Sales User
        </button>
      </div>

      {/* ================= STATS ================= */}

      <div className="users-stats-grid">

        {/* Total Users */}
        <div className="user-stat-card stat-total-users">
          <div className="user-stat-card-header">
            <span className="user-stat-title">Total Users</span>
            <div className="user-stat-icon-wrapper icon-total">
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
          <div className="user-stat-number">
            {users.length}
          </div>
        </div>

        {/* Active Users */}
        <div className="user-stat-card stat-active-users">
          <div className="user-stat-card-header">
            <span className="user-stat-title">Active Users</span>
            <div className="user-stat-icon-wrapper icon-active">
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
          <div className="user-stat-number text-success">
            {
              users.filter(
                (user) =>
                  user.status === "active"
              ).length
            }
          </div>
        </div>

        {/* Inactive Users */}
        <div className="user-stat-card stat-inactive-users">
          <div className="user-stat-card-header">
            <span className="user-stat-title">Inactive Users</span>
            <div className="user-stat-icon-wrapper icon-inactive">
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
                <line x1="4.93" x2="19.07" y1="4.93" y2="19.07" />
              </svg>
            </div>
          </div>
          <div className="user-stat-number text-danger">
            {
              users.filter(
                (user) =>
                  user.status === "inactive"
              ).length
            }
          </div>
        </div>

      </div>

      {/* ================= USERS TABLE ================= */}

      <div className="users-table-card">

        {loading ? (
          <div className="users-empty">

            <div
              className="spinner-border text-primary"
              role="status"
            />

            <p className="text-muted mt-3 mb-0">
              Loading users...
            </p>

          </div>
        ) : users.length === 0 ? (

          <div className="users-empty">

            <div className="users-empty-icon">
              👤
            </div>

            <h5>
              No users found
            </h5>

            <p>
              Create your first sales user.
            </p>

            <button
              className="add-user-btn"
              onClick={() =>
                setShowCreateModal(true)
              }
            >
              Add Sales User
            </button>

          </div>

        ) : (

          <div className="table-responsive">

            <table className="users-table">

              <thead>
                <tr>

                  <th>
                    User
                  </th>

                  <th>
                    Email
                  </th>

                  <th>
                    Role
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Password
                  </th>

                  <th className="text-end">
                    Actions
                  </th>

                </tr>
              </thead>

              <tbody>

                {users.map((user) => (

                  <tr key={user._id}>

                    {/* USER */}

                    <td>

                      <div className="d-flex align-items-center gap-3">

                        <div className="user-avatar">
                          {user.name
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>

                          <div className="user-name">
                            {user.name}
                          </div>

                          <span className="user-position-text">
                            {user.jobPosition || (user.role === "admin" ? "Administrator" : "Sales Representative")}
                          </span>

                          <span className="user-created">
                            Joined{" "}
                            {new Date(
                              user.createdAt
                            ).toLocaleDateString()}
                          </span>

                        </div>

                      </div>

                    </td>

                    {/* EMAIL */}

                    <td>
                      {user.email}
                    </td>

                    {/* ROLE */}

                    <td>

                      <span className="user-role-badge">
                        {user.role}
                      </span>

                    </td>

                    {/* STATUS */}

                    <td>

                      <span
                        className={`user-status-badge ${user.status === "active"
                            ? "status-active"
                            : "status-inactive"
                          }`}
                      >
                        {user.status}
                      </span>

                    </td>

                    {/* PASSWORD */}

                    <td>

                      {user.mustChangePassword ? (

                        <span className="password-status-badge password-required">
                          Change required
                        </span>

                      ) : (

                        <span className="password-status-badge password-set">
                          Set
                        </span>

                      )}

                    </td>

                    {/* ACTIONS */}

                    <td>

                      <div className="d-flex justify-content-end gap-2">

                        <button
                          className={`user-action-btn ${user.status === "active"
                              ? "deactivate-btn"
                              : "activate-btn"
                            }`}
                          disabled={
                            actionLoading ===
                            user._id
                          }
                          onClick={() =>
                            handleStatusChange(
                              user
                            )
                          }
                        >
                          {user.status ===
                            "active"
                            ? "Deactivate"
                            : "Activate"}
                        </button>

                        {user.role === "sales" && (

                          <button
                            className="user-action-btn reset-btn"
                            disabled={
                              actionLoading ===
                              user._id
                            }
                            onClick={() =>
                              handleResetPassword(
                                user
                              )
                            }
                          >
                            Reset Password
                          </button>

                        )}

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* ================= CREATE USER MODAL ================= */}

      {showCreateModal && (

        <div
          className="user-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setShowCreateModal(false);
          }}
        >
          <div className="user-modal" onClick={(e) => e.stopPropagation()}>
            <div className="user-modal-header">
              <h5>Add Sales User</h5>
              <button
                type="button"
                className="user-modal-close-btn"
                onClick={() => setShowCreateModal(false)}
                title="Close"
                aria-label="Close"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form
              onSubmit={handleCreateUser}
            >

              <div className="user-modal-body">

                {/* NAME */}

                <div className="user-form-group">

                  <label className="user-form-label">
                    Full Name
                  </label>

                  <input
                    type="text"
                    className="user-form-input"
                    placeholder="e.g. Sarah Connor"
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value)
                    }
                    required
                  />

                </div>

                {/* EMAIL */}

                <div className="user-form-group">

                  <label className="user-form-label">
                    Email Address
                  </label>

                  <input
                    type="email"
                    className="user-form-input"
                    placeholder="e.g. sarah@company.com"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    required
                  />

                </div>

                {/* JOB POSITION */}

                <div className="user-form-group">

                  <label className="user-form-label">
                    Job Position
                  </label>

                  <input
                    type="text"
                    className="user-form-input"
                    placeholder="e.g. Senior Sales Executive, Account Manager"
                    value={jobPosition}
                    onChange={(e) =>
                      setJobPosition(e.target.value)
                    }
                  />

                </div>

                {/* INFO */}

                <div className="user-info-box">
                  A temporary password will
                  automatically be generated for
                  this sales user.
                </div>

              </div>

              <div className="user-modal-footer">
                <button
                  type="button"
                  className="user-modal-btn user-modal-cancel-btn"
                  onClick={() => setShowCreateModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="user-modal-btn user-modal-submit-btn"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="user-spinner-mini" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      <span>Create User</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>

        </div>

      )}

      {/* ================= PASSWORD MODAL ================= */}

      {showPasswordModal && (

        <div
          className="user-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPasswordModal(false);
          }}
        >
          <div className="user-modal" onClick={(e) => e.stopPropagation()}>
            <div className="user-modal-header">
              <h5>Temporary Password</h5>
              <button
                type="button"
                className="user-modal-close-btn"
                onClick={() => setShowPasswordModal(false)}
                title="Close"
                aria-label="Close"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="user-modal-body">

              <div className="alert alert-success">
                Password generated successfully
                for{" "}
                <strong>
                  {createdUserName}
                </strong>
                .
              </div>

              <div className="temp-password-box">

                <span className="temp-password-label">
                  Temporary Password
                </span>

                <div className="d-flex gap-2 align-items-center">

                  <div className="temp-password flex-grow-1">
                    {temporaryPassword}
                  </div>

                  <button
                    className="btn btn-outline-primary"
                    type="button"
                    onClick={copyPassword}
                  >
                    Copy
                  </button>

                </div>

              </div>

              <small className="text-muted d-block mt-3">
                The user must change this password
                after logging in.
              </small>

            </div>

            <div className="user-modal-footer">
              <button
                type="button"
                className="user-modal-btn user-modal-submit-btn"
                onClick={() => setShowPasswordModal(false)}
              >
                Done
              </button>
            </div>

          </div>

        </div>

      )}

    </div>
  );
};

export default Users;