import { useEffect, useState } from "react";
import axios from "axios";
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  Lock,
  Mail,
  Search,
  Send,
  User as UserIcon,
  Users as UsersIcon,
  X,
} from "lucide-react";
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
  temporaryPassword?: string;
  inviteUrl?: string;
  previewUrl?: string;
  emailSent?: boolean;
}

interface UserTaskItem {
  _id: string;
  status: "pending" | "in-progress" | "completed";
  assignedTo?:
    | {
        _id: string;
        name?: string;
        email?: string;
      }
    | string;
  dueDate?: string | Date;
}

const API_URL = "http://localhost:5000/api";

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<UserTaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [jobPosition, setJobPosition] = useState("");

  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [createdInviteUrl, setCreatedInviteUrl] = useState("");
  const [emailPreviewUrl, setEmailPreviewUrl] = useState("");
  const [inviteEmailSent, setInviteEmailSent] = useState(true);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [createdUserName, setCreatedUserName] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Master-Detail & Mobile Drawer State
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [copyEmailSuccess, setCopyEmailSuccess] = useState<string | null>(null);

  // Swipe-to-dismiss gesture state for mobile bottom sheet
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

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

      const [usersResponse, tasksResponse] = await Promise.all([
        axios.get(`${API_URL}/users`, getAuthConfig()),
        axios
          .get(`${API_URL}/tasks`, getAuthConfig())
          .catch(() => ({ data: { success: false, tasks: [] } })),
      ]);

      if (usersResponse.data.success) {
        const loadedUsers = usersResponse.data.users || [];
        setUsers(loadedUsers);
        setSelectedUserId((prev) => {
          if (prev && loadedUsers.some((u: User) => u._id === prev)) {
            return prev;
          }
          return loadedUsers.length > 0 ? loadedUsers[0]._id : null;
        });
      }

      if (tasksResponse.data?.tasks) {
        setTasks(tasksResponse.data.tasks);
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
          response.data.temporaryPassword || ""
        );
        setCreatedInviteUrl(
          response.data.inviteUrl || ""
        );
        setEmailPreviewUrl(
          response.data.previewUrl || ""
        );
        setInviteEmailSent(
          response.data.emailSent ?? true
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
  // RESEND INVITATION
  // ===============================

  const handleResendInvite = async (user: User) => {
    try {
      setActionLoading(user._id);

      const response = await axios.post<{
        success: boolean;
        message: string;
        inviteUrl?: string;
        previewUrl?: string;
        emailSent?: boolean;
      }>(
        `${API_URL}/users/${user._id}/resend-invitation`,
        {},
        getAuthConfig()
      );

      if (response.data.success) {
        setCreatedInviteUrl(response.data.inviteUrl || "");
        setEmailPreviewUrl(response.data.previewUrl || "");
        setInviteEmailSent(response.data.emailSent ?? true);
        setCreatedUserName(user.name);
        setTemporaryPassword("");
        setShowPasswordModal(true);
      }
    } catch (error: any) {
      console.error("Resend invite error:", error);
      alert(
        error.response?.data?.message ||
        "Unable to resend invitation email"
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ===============================
  // COPY INVITATION URL
  // ===============================

  const copyInviteUrl = async () => {
    if (!createdInviteUrl) return;
    try {
      await navigator.clipboard.writeText(createdInviteUrl);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    } catch {
      alert("Unable to copy invitation link");
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
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch {
      alert("Unable to copy password");
    }
  };

  // Close mobile drawer on desktop resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 769 && mobileDrawerOpen) {
        setMobileDrawerOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mobileDrawerOpen]);

  const handleSelectUser = (user: User) => {
    setSelectedUserId(user._id);
    if (window.innerWidth < 769) {
      setMobileDrawerOpen(true);
      setDragOffsetY(0);
    }
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

  const handleCopyEmail = (emailToCopy: string) => {
    navigator.clipboard.writeText(emailToCopy);
    setCopyEmailSuccess(emailToCopy);
    setTimeout(() => setCopyEmailSuccess(null), 2000);
  };

  // Filtered users for condensed master list
  const filteredUsers = users.filter((user) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      (user.jobPosition && user.jobPosition.toLowerCase().includes(query));

    const matchesStatus =
      statusFilter === "all" ? true : user.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const selectedUser =
    users.find((u) => u._id === selectedUserId) ||
    (filteredUsers.length > 0 ? filteredUsers[0] : users.length > 0 ? users[0] : null);

  // Render Rich User Profile (Shared between Desktop Right Panel & Mobile Bottom Sheet)
  const renderUserProfile = (user: User, isMobileSheet: boolean = false) => {
    const userTasks = tasks.filter((t) => {
      const assignedId =
        typeof t.assignedTo === "object" && t.assignedTo !== null
          ? (t.assignedTo as any)._id
          : t.assignedTo;
      return assignedId === user._id;
    });

    const totalTasks = userTasks.length;
    const completedTasks = userTasks.filter((t) => t.status === "completed").length;
    const inProgressTasks = userTasks.filter((t) => t.status === "in-progress").length;
    const pendingTasks = userTasks.filter((t) => t.status === "pending").length;

    const completedPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const inProgressPct = totalTasks > 0 ? Math.round((inProgressTasks / totalTasks) * 100) : 0;
    const pendingPct = totalTasks > 0 ? Math.round((pendingTasks / totalTasks) * 100) : 0;

    return (
      <div className={`user-profile-view ${isMobileSheet ? "is-mobile-sheet" : ""}`}>
        {/* PROFILE HEADER HERO */}
        <div className="user-profile-hero">
          <div className="d-flex align-items-center" style={{gap:8}}>
            <div className="user-profile-avatar-wrapper position-relative">
              <div className="user-profile-avatar">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span
                className={`user-avatar-status-dot ${
                  user.status === "active" ? "dot-active" : "dot-inactive"
                }`}
                title={`Status: ${user.status}`}
              />
            </div>

            <div className="user-profile-title-block flex-grow-1">
              <div className="d-flex align-items-center flex-wrap mb-1" style={{ gap: 4 }}>
                <h3 className="user-profile-name m-0">{user.name}</h3>
                {/* <span
                  className={`user-status-badge ${
                    user.status === "active" ? "status-active" : "status-inactive"
                  }`}
                >
                  <span className="badge-dot" />
                  {user.status}
                </span> */}
                <span className={`user-role-badge role-${user.role}`}>
                  {/* <span className="badge-dot" /> */}
                  {user.role}
                </span>
              </div>

              <div className="user-profile-meta d-flex align-items-center gap-2 flex-wrap">
                <span className="user-profile-position">
                  {user.jobPosition ||
                    (user.role === "admin" ? "Administrator" : "Sales Representative")}
                </span>
                {/* <span className="meta-separator">•</span> */}
                {/* <span className="meta-separator">•</span> */}
                {/* <span className="m-1">
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </span> */}
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS TOOLBAR */}
          <div className="user-profile-actions-bar">
            <button
              className={`user-action-btn ${
                user.status === "active" ? "deactivate-btn" : "activate-btn"
              }`}
              disabled={actionLoading === user._id}
              onClick={() => handleStatusChange(user)}
            >
              {actionLoading === user._id ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" />
                  Updating...
                </>
              ) : user.status === "active" ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="me-1">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                  Deactivate Account
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="me-1">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Activate Account
                </>
              )}
            </button>

            {user.role === "sales" && (
              <button
                className="user-action-btn resend-invite-btn"
                disabled={actionLoading === user._id}
                onClick={() => handleResendInvite(user)}
                title="Send password setup invitation link to user via email"
              >
                {actionLoading === user._id ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={14} className="me-1" />
                    Resend Invite
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* PROFILE BODY DETAILS CARDS */}
        <div className="user-profile-body-grid">
          {/* Card 1: Contact & Identification */}
          <div className="user-detail-card">
            <div className="user-detail-card-header">
              <span className="card-header-icon" style={{ display: "inline-flex", alignItems: "center" }}>
                <Mail size={15} />
              </span>
              <h5>Contact & Role</h5>
            </div>

            <div className="user-detail-card-content">
              <div className="detail-field">
                <span className="detail-field-label">Email Address</span>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <a href={`mailto:${user.email}`} className="detail-field-value user-email-link">
                    {user.email}
                  </a>
                  <button
                    type="button"
                    className="btn-copy-mini"
                    onClick={() => handleCopyEmail(user.email)}
                    title="Copy email address"
                    style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    {copyEmailSuccess === user.email ? (
                      <>
                        <Check size={12} style={{ color: "#10b981" }} />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="detail-field">
                <span className="detail-field-label">Job Position</span>
                <span className="detail-field-value">
                  {user.jobPosition || (user.role === "admin" ? "Administrator" : "Sales Representative")}
                </span>
              </div>

              <div className="detail-field">
                <span className="detail-field-label">System Role</span>
                <span className="detail-field-value text-capitalize">
                  {user.role}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Security & Credentials */}
          <div className="user-detail-card">
            <div className="user-detail-card-header">
              <span className="card-header-icon" style={{ display: "inline-flex", alignItems: "center" }}>
                <Lock size={15} />
              </span>
              <h5>Security & Credentials</h5>
            </div>

            <div className="user-detail-card-content">
              <div className="detail-field">
                <span className="detail-field-label">Password Status</span>
                <div>
                  {user.mustChangePassword ? (
                    <span className="password-status-badge password-required" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <AlertTriangle size={13} /> Temporary Password
                    </span>
                  ) : (
                    <span className="password-status-badge password-set">
                      Password Secured
                    </span>
                  )}
                </div>
              </div>

              <div className="detail-field">
                <span className="detail-field-label">Account Created</span>
                <span className="detail-field-value">
                  {new Date(user.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>

              {/* <div className="detail-field">
                <span className="detail-field-label">User ID</span>
                <span className="detail-field-value user-mono-id">
                  {user._id}
                </span>
              </div> */}
            </div>
          </div>

          {/* Card 3: Exploded Circular Segmented Pie Task Overview */}
          <div className="user-detail-card user-task-overview-card">
            <div className="user-detail-card-header task-overview-header-row">
              <h5>Task Overview</h5>
            </div>

            <div className="task-overview-flanking-layout">
              {/* Left Column Callouts */}
              <div className="task-callout-col col-left">
                <div className="task-callout-item">
                  <span className="task-callout-title" style={{ color: "#F28E79" }}>
                    TOTAL TASKS
                  </span>
                  <div className="task-callout-data-row">
                    <span className="task-callout-count">{totalTasks} Tasks</span>
                  </div>
                </div>

                <div className="task-callout-item">
                  <span className="task-callout-title" style={{ color: "#2C7DA0" }}>
                    PENDING
                  </span>
                  <div className="task-callout-data-row">
                    <span className="task-callout-count">{pendingTasks} Tasks</span>
                    <span className="task-callout-pct">({pendingPct}%)</span>
                  </div>
                </div>
              </div>

              {/* Center Pie with Small Curved Arrows pointing directly to Titles */}
              <div className="task-pie-center-wrap">
                <svg
                  viewBox="0 0 240 220"
                  className="task-pie-svg"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-label="Task Distribution Chart"
                >
                  {/* S1: Top-Left TOTAL (Coral #F28E79) */}
                  <path
                    className="task-pie-slice"
                    d="M 116.5,106.5 L 44.5,106.5 A 72 72 0 0 1 116.5,34.5 Z"
                    fill="#F28E79"
                  />
                  <text
                    x="86"
                    y="76"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="task-pie-pct-label"
                  >
                    {totalTasks > 0 ? "100%" : "0%"}
                  </text>
                  {/* Arrow 1: Starts at S1, curves UP & LEFT, arrowhead points DIRECTLY to "TOTAL TASKS" title */}
                  <path
                    d="M 58,54 Q 34,38 2,16"
                    fill="none"
                    stroke="#F28E79"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 2,16 L 11,16.5 M 2,16 L 7.5,23.5"
                    fill="none"
                    stroke="#F28E79"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* S2: Top-Right COMPLETED (Mint Green #52B788) */}
                  <path
                    className="task-pie-slice"
                    d="M 123.5,106.5 L 123.5,34.5 A 72 72 0 0 1 195.5,106.5 Z"
                    fill="#52B788"
                  />
                  <text
                    x="154"
                    y="76"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="task-pie-pct-label"
                  >
                    {completedPct}%
                  </text>
                  {/* Arrow 2: Starts at S2, curves UP & RIGHT, arrowhead points DIRECTLY to "COMPLETED" title */}
                  <path
                    d="M 182,54 Q 206,38 238,16"
                    fill="none"
                    stroke="#52B788"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 238,16 L 229,16.5 M 238,16 L 232.5,23.5"
                    fill="none"
                    stroke="#52B788"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* S3: Bottom-Right IN PROGRESS (Vibrant Teal #00A896) */}
                  <path
                    className="task-pie-slice"
                    d="M 123.5,113.5 L 195.5,113.5 A 72 72 0 0 1 123.5,185.5 Z"
                    fill="#00A896"
                  />
                  <text
                    x="154"
                    y="144"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="task-pie-pct-label"
                  >
                    {inProgressPct}%
                  </text>
                  {/* Arrow 3: Starts at S3, curves DOWN & RIGHT, arrowhead points DIRECTLY to "IN PROGRESS" title */}
                  <path
                    d="M 182,166 Q 206,182 238,204"
                    fill="none"
                    stroke="#00A896"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 238,204 L 229,203.5 M 238,204 L 232.5,196.5"
                    fill="none"
                    stroke="#00A896"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* S4: Bottom-Left PENDING (Slate Blue #2C7DA0) */}
                  <path
                    className="task-pie-slice"
                    d="M 116.5,113.5 L 116.5,185.5 A 72 72 0 0 1 44.5,113.5 Z"
                    fill="#2C7DA0"
                  />
                  <text
                    x="86"
                    y="144"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="task-pie-pct-label"
                  >
                    {pendingPct}%
                  </text>
                  {/* Arrow 4: Starts at S4, curves DOWN & LEFT, arrowhead points DIRECTLY to "PENDING" title */}
                  <path
                    d="M 58,166 Q 34,182 2,204"
                    fill="none"
                    stroke="#2C7DA0"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 2,204 L 11,203.5 M 2,204 L 7.5,196.5"
                    fill="none"
                    stroke="#2C7DA0"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Right Column Callouts */}
              <div className="task-callout-col col-right">
                <div className="task-callout-item">
                  <span className="task-callout-title" style={{ color: "#52B788" }}>
                    COMPLETED
                  </span>
                  <div className="task-callout-data-row">
                    <span className="task-callout-count">{completedTasks} Tasks</span>
                    <span className="task-callout-pct">({completedPct}%)</span>
                  </div>
                </div>

                <div className="task-callout-item">
                  <span className="task-callout-title" style={{ color: "#00A896" }}>
                    IN PROGRESS
                  </span>
                  <div className="task-callout-data-row">
                    <span className="task-callout-count">{inProgressTasks} Tasks</span>
                    <span className="task-callout-pct">({inProgressPct}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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
            {loading ? (
              <span className="users-shimmer users-shimmer-stat" aria-hidden="true" />
            ) : (
              users.length
            )}
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
            {loading ? (
              <span className="users-shimmer users-shimmer-stat" aria-hidden="true" />
            ) : (
              users.filter(
                (user) =>
                  user.status === "active"
              ).length
            )}
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
            {loading ? (
              <span className="users-shimmer users-shimmer-stat" aria-hidden="true" />
            ) : (
              users.filter(
                (user) =>
                  user.status === "inactive"
              ).length
            )}
          </div>
        </div>

      </div>

      {/* ================= MASTER-DETAIL SPLIT CONTAINER ================= */}
      <div className="users-split-container">
        {/* LEFT MASTER PANEL: Condensed, highly scannable vertical list */}
        <div className="users-master-panel">
          <div className="master-panel-header">
            {/* Search Input */}
            <div className="master-search-box">
              <span className="master-search-icon" style={{ display: "inline-flex", alignItems: "center" }}>
                <Search size={14} />
              </span>
              <input
                type="text"
                className="master-search-input"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search users"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="master-search-clear"
                  onClick={() => setSearchQuery("")}
                  title="Clear search"
                  aria-label="Clear search"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Status Filter Chips */}
            <div className="master-filter-chips">
              <button
                type="button"
                className={`master-filter-chip ${statusFilter === "all" ? "active" : ""}`}
                onClick={() => setStatusFilter("all")}
              >
                All <span className="chip-count">{users.length}</span>
              </button>
              <button
                type="button"
                className={`master-filter-chip ${statusFilter === "active" ? "active" : ""}`}
                onClick={() => setStatusFilter("active")}
              >
                Active{" "}
                <span className="chip-count">
                  {users.filter((u) => u.status === "active").length}
                </span>
              </button>
              <button
                type="button"
                className={`master-filter-chip ${statusFilter === "inactive" ? "active" : ""}`}
                onClick={() => setStatusFilter("inactive")}
              >
                Inactive{" "}
                <span className="chip-count">
                  {users.filter((u) => u.status === "inactive").length}
                </span>
              </button>
            </div>
          </div>

          {/* Condensed Scannable List */}
          <div className="users-master-list">
            {loading ? (
              <div className="users-shimmer-list" aria-label="Loading users list">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="users-shimmer-master-item">
                    <div className="users-shimmer users-shimmer-avatar" />
                    <div className="users-shimmer-item-info">
                      <div className="users-shimmer users-shimmer-name" />
                      <div className="users-shimmer users-shimmer-sub" />
                    </div>
                    <div className="users-shimmer users-shimmer-badge" />
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="users-empty">
                <div className="users-empty-icon" style={{ display: "inline-flex", justifyContent: "center", alignItems: "center" }}>
                  <UsersIcon size={36} strokeWidth={1.5} />
                </div>
                <h5>No users found</h5>
                <p>No user matches your search or filter.</p>
                {searchQuery || statusFilter !== "all" ? (
                  <button
                    type="button"
                    className="btn-outline-soft mt-2"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                    }}
                  >
                    Reset Filter
                  </button>
                ) : (
                  <button
                    className="add-user-btn mt-2"
                    onClick={() => setShowCreateModal(true)}
                  >
                    Add Sales User
                  </button>
                )}
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = selectedUserId === user._id;
                return (
                  <div
                    key={user._id}
                    className={`user-master-item ${isSelected ? "is-selected" : ""}`}
                    onClick={() => handleSelectUser(user)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleSelectUser(user);
                      }
                    }}
                  >
                    {/* Avatar with Status Dot */}
                    <div className="master-avatar-wrapper position-relative">
                      <div className="master-avatar">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span
                        className={`master-avatar-dot ${
                          user.status === "active" ? "dot-active" : "dot-inactive"
                        }`}
                      />
                    </div>

                    {/* Condensed Info */}
                    <div className="master-item-info">
                      <div className="d-flex align-items-center justify-content-between gap-1">
                        <span className="master-item-name">{user.name}</span>
                        <span className={`user-role-badge role-${user.role} role-compact`}>
                          {user.role}
                        </span>
                      </div>
                      <div className="master-item-sub">
                        {user.jobPosition ||
                          (user.role === "admin"
                            ? "Administrator"
                            : "Sales Representative")}
                      </div>
                    </div>

                    {/* Arrow chevron indicator */}
                    <div className="master-item-arrow" aria-hidden="true">
                      ›
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT DETAIL PANEL: Expansive full profile on desktop */}
        <div className="users-detail-panel">
          {loading ? (
            <div className="users-profile-shimmer" aria-label="Loading profile details">
              {/* Hero Shimmer */}
              <div className="users-shimmer-hero">
                <div className="d-flex align-items-center gap-3">
                  <div className="users-shimmer users-shimmer-profile-avatar" />
                  <div className="flex-grow-1 d-flex flex-column gap-2">
                    <div className="users-shimmer users-shimmer-title" />
                    <div className="users-shimmer users-shimmer-meta" />
                  </div>
                </div>
                <div className="users-shimmer-actions">
                  <div className="users-shimmer users-shimmer-btn" />
                  <div className="users-shimmer users-shimmer-btn" />
                </div>
              </div>

              {/* Body Cards Shimmer */}
              <div className="users-shimmer-body-grid">
                <div className="users-shimmer-card">
                  <div className="users-shimmer users-shimmer-card-header mb-2" />
                  <div className="d-flex flex-column gap-3">
                    <div className="users-shimmer users-shimmer-field" />
                    <div className="users-shimmer users-shimmer-field" />
                    <div className="users-shimmer users-shimmer-field" />
                  </div>
                </div>
                <div className="users-shimmer-card">
                  <div className="users-shimmer users-shimmer-card-header mb-2" />
                  <div className="d-flex flex-column gap-3">
                    <div className="users-shimmer users-shimmer-field" />
                    <div className="users-shimmer users-shimmer-field" />
                    <div className="users-shimmer users-shimmer-field" />
                  </div>
                </div>
              </div>
            </div>
          ) : selectedUser ? (
            renderUserProfile(selectedUser, false)
          ) : (
            <div className="users-empty">
              <div className="users-empty-icon" style={{ display: "inline-flex", justifyContent: "center", alignItems: "center" }}>
                <UserIcon size={36} strokeWidth={1.5} />
              </div>
              <h5>Select a user</h5>
              <p>Choose any user from the list to view their complete profile.</p>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE DRAWER SHEET (Bottom Sheet covering 85% of viewport with swipe-to-dismiss) */}
      {mobileDrawerOpen && selectedUser && (
        <div className="user-mobile-sheet-root">
          {/* Backdrop overlay */}
          <div
            className="user-sheet-backdrop"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Sheet Container */}
          <div
            className="user-sheet-drawer"
            style={{
              transform: `translateY(${dragOffsetY}px)`,
              transition: isDragging
                ? "none"
                : "transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* Draggable header bar */}
            <div
              className="user-sheet-drag-area"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="sheet-drag-pill" />
              <div className="sheet-header-row">
                <span className="sheet-drag-hint">Swipe down or tap close</span>
                <button
                  type="button"
                  className="user-sheet-close-btn"
                  onClick={() => setMobileDrawerOpen(false)}
                  title="Close profile"
                  aria-label="Close profile"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Scrollable Rich Profile Content inside Drawer */}
            <div className="user-sheet-content">
              {renderUserProfile(selectedUser, true)}
            </div>
          </div>
        </div>
      )}

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

      {/* ================= PASSWORD & INVITATION MODAL ================= */}

      {showPasswordModal && (

        <div
          className="user-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPasswordModal(false);
              setCreatedInviteUrl("");
              setEmailPreviewUrl("");
              setTemporaryPassword("");
            }
          }}
        >
          <div className="user-modal user-invite-modal" onClick={(e) => e.stopPropagation()}>
            <div className="user-modal-header">
              <div className="d-flex align-items-center gap-2">
                <Send size={18} className="text-primary" />
                <h5>User Invitation & Setup</h5>
              </div>
              <button
                type="button"
                className="user-modal-close-btn"
                onClick={() => {
                  setShowPasswordModal(false);
                  setCreatedInviteUrl("");
                  setEmailPreviewUrl("");
                  setTemporaryPassword("");
                }}
                title="Close"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="user-modal-body">
              <div className="password-success-notice mb-3">
                <Check size={20} className="flex-shrink-0" />
                <div>
                  <strong>Invitation Generated Successfully</strong>
                  {inviteEmailSent ? (
                    <span>An invitation email has been sent to <strong>{createdUserName}</strong> with their secure password creation link.</span>
                  ) : (
                    <span>Invitation link created for <strong>{createdUserName}</strong>.</span>
                  )}
                </div>
              </div>

              {emailPreviewUrl && (
                <div className="ethereal-preview-box mb-3">
                  <div className="d-flex align-items-center gap-2">
                    <Mail size={16} className="text-primary flex-shrink-0" />
                    <span className="small">Ethereal Mailbox: Email ready to view</span>
                  </div>
                  <a
                    href={emailPreviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ethereal-link-btn"
                  >
                    <span>View in Mailbox</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              )}

              {createdInviteUrl && (
                <div className="temp-password-box mb-3">
                  <span className="temp-password-label">Secure Invitation Link (Expires in 48 Hours)</span>
                  <div className="invite-link-row">
                    <div className="temp-password flex-grow-1" style={{ fontSize: "12.5px" }}>
                      {createdInviteUrl}
                    </div>
                    <button
                      className="copy-password-btn"
                      type="button"
                      onClick={copyInviteUrl}
                    >
                      {copiedInvite ? (
                        <>
                          <Check size={14} /> Copied
                        </>
                      ) : (
                        <>
                          <Copy size={14} /> Copy Link
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {temporaryPassword && (
                <div className="temp-password-box mb-2">
                  <span className="temp-password-label">Direct Login Fallback (Temporary Password)</span>
                  <div className="invite-link-row">
                    <div className="temp-password flex-grow-1">
                      {temporaryPassword}
                    </div>
                    <button
                      className="copy-password-btn"
                      type="button"
                      onClick={copyPassword}
                    >
                      {copiedPassword ? (
                        <>
                          <Check size={14} /> Copied
                        </>
                      ) : (
                        <>
                          <Copy size={14} /> Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <small className="text-muted d-block mt-3" style={{ fontSize: "12px", lineHeight: "1.5" }}>
                The user can click the invitation link to set their personal encrypted password. If they do not receive the email, you can copy and share the link above directly.
              </small>
            </div>

            <div className="user-modal-footer">
              <button
                type="button"
                className="user-modal-btn user-modal-submit-btn"
                onClick={() => {
                  setShowPasswordModal(false);
                  setCreatedInviteUrl("");
                  setEmailPreviewUrl("");
                  setTemporaryPassword("");
                }}
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