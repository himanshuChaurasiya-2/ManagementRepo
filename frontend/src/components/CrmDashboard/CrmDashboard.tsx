import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Building2,
  Calendar,
  CheckSquare,
  ArrowUpRight,
  Clock,
  Check,
  Flame,
  ShieldCheck,
  RefreshCw,
  UserCheck,
  Phone,
  Mail,
  ChevronRight,
} from "lucide-react";
import "./CrmDashboard.css";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { connectSocket, getSocket } from "../../services/socketService";

export interface CrmDashboardProps {
  embedded?: boolean;
}

interface LeadData {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  status?: string;
  subStatus?: string;
  createdAt?: string;
}

interface TaskData {
  _id: string;
  title: string;
  description?: string;
  priority?: string;
  status: "pending" | "in-progress" | "completed";
  dueDate?: string;
  company?: any;
  assignedTo?: any;
  createdAt?: string;
}

interface CompanyData {
  _id: string;
  companyName: string;
  status: "active" | "inactive";
  contactPerson?: string;
  phone?: string;
  createdAt?: string;
}

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "sales";
  status: "active" | "inactive";
  jobPosition?: string;
  createdAt?: string;
}

interface CompanyReminderData {
  _id: string;
  title: string;
  companyName?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  priority?: "low" | "medium" | "high";
  status?: "pending" | "completed";
  description?: string;
}

const CrmDashboard: React.FC<CrmDashboardProps> = ({ embedded = true }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Theme support
  let activeTheme = "dark";
  try {
    const themeContext = useTheme();
    if (themeContext) {
      activeTheme = themeContext.theme;
    }
  } catch {
    // Fallback if context not mounted
  }

  // Filter states (No search)
  const [taskFilter, setTaskFilter] = useState<"all" | "urgent" | "pending">("all");
  // const [newQuickTaskTitle, setNewQuickTaskTitle] = useState("");
  // const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Raw database entities from project (100% Real-Time)
  const [rawLeads, setRawLeads] = useState<LeadData[]>([]);
  const [rawTasks, setRawTasks] = useState<TaskData[]>([]);
  const [rawCompanies, setRawCompanies] = useState<CompanyData[]>([]);
  const [rawUsers, setRawUsers] = useState<UserData[]>([]);
  const [rawReminders, setRawReminders] = useState<CompanyReminderData[]>([]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Just now");

  // Fetch telemetry from project APIs
  const fetchTelemetry = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [leadsRes, tasksRes, compRes, usersRes, remindersRes] = await Promise.allSettled([
        api.get("/leads"),
        api.get("/tasks"),
        api.get("/companies"),
        api.get("/users"),
        api.get("/company-reminders"),
      ]);

      if (leadsRes.status === "fulfilled" && leadsRes.value.data?.leads) {
        setRawLeads(leadsRes.value.data.leads);
      }

      if (tasksRes.status === "fulfilled" && tasksRes.value.data?.tasks) {
        setRawTasks(tasksRes.value.data.tasks);
      }

      if (compRes.status === "fulfilled" && compRes.value.data?.companies) {
        setRawCompanies(compRes.value.data.companies);
      }

      if (usersRes.status === "fulfilled" && usersRes.value.data?.users) {
        setRawUsers(usersRes.value.data.users);
      }

      if (remindersRes.status === "fulfilled") {
        const rems = Array.isArray(remindersRes.value.data)
          ? remindersRes.value.data
          : remindersRes.value.data?.reminders || [];
        setRawReminders(rems);
      }

      const now = new Date();
      setLastSyncTime(
        `${now.getHours().toString().padStart(2, "0")}:${now
          .getMinutes()
          .toString()
          .padStart(2, "0")}`
      );
    } catch (err) {
      console.error("Dashboard real-time sync error:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial load + periodic real-time polling (every 25 seconds)
  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 25000);
    return () => clearInterval(interval);
  }, [fetchTelemetry]);

  // Real-time Socket.IO events integration
  useEffect(() => {
    let socket = getSocket();
    const userId = user?.id || (user as any)?._id;
    if (!socket && userId) {
      socket = connectSocket(userId);
    }

    if (socket) {
      const handleSocketRefresh = () => {
        fetchTelemetry();
      };

      socket.on("task_assigned", handleSocketRefresh);
      socket.on("task_completed", handleSocketRefresh);
      socket.on("reminder_due", handleSocketRefresh);

      return () => {
        socket.off("task_assigned", handleSocketRefresh);
        socket.off("task_completed", handleSocketRefresh);
        socket.off("reminder_due", handleSocketRefresh);
      };
    }
  }, [user?.id, fetchTelemetry]);

  // ----------------------------------------------------
  // COMPUTED REAL-TIME METRICS (Pure Real Data)
  // ----------------------------------------------------

  // 1. Leads
  const totalLeads = rawLeads.length;
  const interestedLeads = useMemo(() => {
    return rawLeads.filter((l) => l.status === "Interested").length;
  }, [rawLeads]);
  const hotLeads = useMemo(() => {
    return rawLeads.filter(
      (l) => l.status === "Interested" && l.subStatus?.toLowerCase() === "hot"
    ).length;
  }, [rawLeads]);
  const followupLeads = useMemo(() => {
    return rawLeads.filter((l) => l.status === "Follow up").length;
  }, [rawLeads]);
  const newLeadsCount = useMemo(() => {
    return rawLeads.filter((l) => !l.status || l.status === "Select").length;
  }, [rawLeads]);
  const noContactLeads = useMemo(() => {
    return rawLeads.filter((l) => l.status === "No Contact").length;
  }, [rawLeads]);
  const notInterestedLeads = useMemo(() => {
    return rawLeads.filter(
      (l) => l.status === "Not Interested" || l.status === "Junk"
    ).length;
  }, [rawLeads]);

  // 2. Tasks
  const totalTasks = rawTasks.length;
  const completedTasks = useMemo(() => {
    return rawTasks.filter((t) => t.status === "completed").length;
  }, [rawTasks]);
  const pendingTasks = useMemo(() => {
    return rawTasks.filter((t) => t.status === "pending").length;
  }, [rawTasks]);
  const inProgressTasks = useMemo(() => {
    return rawTasks.filter((t) => t.status === "in-progress").length;
  }, [rawTasks]);
  const urgentTasksCount = useMemo(() => {
    return rawTasks.filter(
      (t) =>
        t.status !== "completed" &&
        (t.priority?.toLowerCase() === "urgent" || t.priority?.toLowerCase() === "high")
    ).length;
  }, [rawTasks]);
  const taskCompletionRate = useMemo(() => {
    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  }, [completedTasks, totalTasks]);

  // 3. Companies
  const totalCompanies = rawCompanies.length;
  const activeCompanies = useMemo(() => {
    return rawCompanies.filter((c) => c.status === "active").length;
  }, [rawCompanies]);

  // 4. Team Members
  const totalUsers = rawUsers.length;
  const activeUsers = useMemo(() => {
    return rawUsers.filter((u) => u.status === "active").length;
  }, [rawUsers]);
  const salesUsers = useMemo(() => {
    return rawUsers.filter((u) => u.role === "sales");
  }, [rawUsers]);

  // 5. Recent Inbound Leads (Sorted by newest)
  const recentLeads = useMemo(() => {
    const sorted = [...rawLeads].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
    return sorted.slice(0, 5);
  }, [rawLeads]);

  // 6. Chronological Schedule (Company Reminders)
  const scheduledReminders = useMemo(() => {
    const sorted = [...rawReminders].sort((a, b) => {
      const dateA = `${a.date || ""} ${a.startTime || ""}`;
      const dateB = `${b.date || ""} ${b.startTime || ""}`;
      return dateA.localeCompare(dateB);
    });
    return sorted.slice(0, 5);
  }, [rawReminders]);

  // 7. Priority Tasks (Sorted by urgency & due date)
  const priorityTasks = useMemo(() => {
    const sorted = [...rawTasks].sort((a, b) => {
      const weight: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
      const wA = weight[a.priority?.toLowerCase() || "medium"] || 2;
      const wB = weight[b.priority?.toLowerCase() || "medium"] || 2;
      if (a.status === "completed" && b.status !== "completed") return 1;
      if (a.status !== "completed" && b.status === "completed") return -1;
      return wB - wA;
    });

    return sorted.filter((t) => {
      if (taskFilter === "urgent") {
        return (
          t.status !== "completed" &&
          (t.priority?.toLowerCase() === "urgent" || t.priority?.toLowerCase() === "high")
        );
      }
      if (taskFilter === "pending") {
        return t.status !== "completed";
      }
      return true;
    }).slice(0, 6);
  }, [rawTasks, taskFilter]);

  // Toggle Task Completion via API
  const handleToggleTask = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";

    setRawTasks((prev) =>
      prev.map((t) => (t._id === id ? { ...t, status: newStatus } : t))
    );

    try {
      await api.patch(`/tasks/${id}/status`, { status: newStatus });
    } catch (err) {
      console.warn("Failed to update task status:", err);
      setRawTasks((prev) =>
        prev.map((t) => (t._id === id ? { ...t, status: currentStatus as any } : t))
      );
    }
  };

  // Quick Add Operational Task
  // const handleAddQuickTask = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   const title = newQuickTaskTitle.trim();
  //   if (!title || isSubmittingTask) return;

  //   setIsSubmittingTask(true);
  //   try {
  //     const companyId = rawCompanies[0]?._id;
  //     const assignedUserId = user?.id || (user as any)?._id;

  //     if (companyId && assignedUserId) {
  //       const res = await api.post("/tasks", {
  //         title,
  //         description: "Created via dashboard quick action",
  //         priority: "urgent",
  //         status: "pending",
  //         dueDate: new Date(Date.now() + 86400000).toISOString(),
  //         company: companyId,
  //         assignedTo: assignedUserId,
  //       });

  //       if (res.data?.task) {
  //         setRawTasks((prev) => [res.data.task, ...prev]);
  //       }
  //     } else {
  //       const newTask: TaskData = {
  //         _id: `task-${Date.now()}`,
  //         title,
  //         priority: "urgent",
  //         status: "pending",
  //         dueDate: new Date(Date.now() + 86400000).toISOString(),
  //         company: "Enterprise Task",
  //       };
  //       setRawTasks((prev) => [newTask, ...prev]);
  //     }
  //     setNewQuickTaskTitle("");
  //   } catch (err) {
  //     console.error("Add task error:", err);
  //   } finally {
  //     setIsSubmittingTask(false);
  //   }
  // };

  const userName = user?.name || user?.email?.split("@")[0] || "Administrator";

  return (
    <div
      className={`crm-dashboard-shell ${
        activeTheme === "light" ? "light-mode" : "dark-mode"
      } ${embedded ? "is-embedded" : ""}`}
    >
      <div className="crm-main-area">
        <main className="crm-content">
          {/* =========================================================
              1. MINIMAL HEADER BAR (Greeting & Live Sync Action)
              ========================================================= */}
          <div className="crm-content-header d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-3 mb-4">
            <div className="crm-header-greeting">
              <h1 className="crm-heading">Welcome back, {userName}</h1>
              <p className="crm-subheading">
                Operational Command &bull; Real-time pipeline, team velocity, and scheduled tasks.
              </p>
            </div>

            <div className="crm-header-actions d-flex align-items-center gap-2 flex-wrap">
              {/* Live Sync Badge */}
              <div className="crm-live-badge">
                <span className="crm-pulsing-dot" />
                <span>Live Sync ({lastSyncTime})</span>
              </div>

              {/* Styled Refresh Action Button */}
              <button
                type="button"
                className={`crm-refresh-btn ${isRefreshing ? "spin" : ""}`}
                onClick={fetchTelemetry}
                title="Refresh live metrics"
                aria-label="Refresh telemetry"
              >
                <RefreshCw size={14} />
                <span>Sync Now</span>
              </button>
            </div>
          </div>

          {/* =========================================================
              2. KPI METRIC STRIP (4 Minimalist To-The-Point Cards)
              ========================================================= */}
          <section className="row g-3 mb-4">
            {/* KPI 1: Total Leads */}
            <div className="col-12 col-sm-6 col-xl-3">
              <div
                className="crm-kpi-card h-100"
                onClick={() => navigate("/admin/leads")}
                role="button"
                tabIndex={0}
                title="Click to view all leads"
              >
                <div className="crm-kpi-header d-flex align-items-center justify-content-between">
                  <span className="crm-kpi-label">Total Leads</span>
                  <div className="crm-kpi-icon-pill blue">
                    <Users size={17} />
                  </div>
                </div>
                <div className="crm-kpi-metric-row">
                  <span className="crm-kpi-value">{totalLeads.toLocaleString()}</span>
                  {hotLeads > 0 && (
                    <span className="crm-trend-pill hot">
                      <Flame size={12} />
                      <span>{hotLeads} Hot</span>
                    </span>
                  )}
                </div>
                <div className="crm-kpi-footer">
                  <span className="crm-kpi-subtext">
                    <strong>{interestedLeads}</strong> interested &bull; <strong>{followupLeads}</strong> in follow-up
                  </span>
                  <div className="crm-sparkline-bar">
                    <span
                      style={{
                        width:
                          totalLeads > 0
                            ? `${Math.min(100, Math.round((interestedLeads / totalLeads) * 100))}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* KPI 2: Enterprise Accounts */}
            <div className="col-12 col-sm-6 col-xl-3">
              <div
                className="crm-kpi-card h-100"
                onClick={() => navigate("/companies")}
                role="button"
                tabIndex={0}
                title="Click to view all companies"
              >
                <div className="crm-kpi-header d-flex align-items-center justify-content-between">
                  <span className="crm-kpi-label">Enterprise Accounts</span>
                  <div className="crm-kpi-icon-pill amber">
                    <Building2 size={17} />
                  </div>
                </div>
                <div className="crm-kpi-metric-row">
                  <span className="crm-kpi-value">{totalCompanies}</span>
                  <span className="crm-trend-pill up">
                    <ArrowUpRight size={12} />
                    <span>{activeCompanies} Active</span>
                  </span>
                </div>
                <div className="crm-kpi-footer">
                  <span className="crm-kpi-subtext">
                    {totalCompanies > 0
                      ? `${activeCompanies} active enterprise accounts`
                      : "No companies registered yet"}
                  </span>
                  <div className="crm-sparkline-bar">
                    <span
                      style={{
                        width:
                          totalCompanies > 0
                            ? `${Math.min(100, Math.round((activeCompanies / totalCompanies) * 100))}%`
                            : "0%",
                        background: "#F59E0B",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* KPI 3: Task Operations */}
            <div className="col-12 col-sm-6 col-xl-3">
              <div
                className="crm-kpi-card h-100"
                onClick={() => navigate("/admin/tasks")}
                role="button"
                tabIndex={0}
                title="Click to view all tasks"
              >
                <div className="crm-kpi-header d-flex align-items-center justify-content-between">
                  <span className="crm-kpi-label">Task Operations</span>
                  <div className="crm-kpi-icon-pill emerald">
                    <CheckSquare size={17} />
                  </div>
                </div>
                <div className="crm-kpi-metric-row">
                  <span className="crm-kpi-value">{taskCompletionRate}%</span>
                  <span className="crm-trend-pill green">
                    <ShieldCheck size={12} />
                    <span>{completedTasks}/{totalTasks} Done</span>
                  </span>
                </div>
                <div className="crm-kpi-footer">
                  <span className="crm-kpi-subtext">
                    <strong>{pendingTasks}</strong> pending &bull; <strong>{inProgressTasks}</strong> active &bull; <strong>{urgentTasksCount}</strong> urgent
                  </span>
                  <div className="crm-sparkline-bar">
                    <span
                      style={{
                        width: `${taskCompletionRate}%`,
                        background: "#10B981",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* KPI 4: Sales Team */}
            <div className="col-12 col-sm-6 col-xl-3">
              <div
                className="crm-kpi-card h-100"
                onClick={() => navigate("/admin/users")}
                role="button"
                tabIndex={0}
                title="Click to manage team members"
              >
                <div className="crm-kpi-header d-flex align-items-center justify-content-between">
                  <span className="crm-kpi-label">Sales Team</span>
                  <div className="crm-kpi-icon-pill indigo">
                    <UserCheck size={17} />
                  </div>
                </div>
                <div className="crm-kpi-metric-row">
                  <span className="crm-kpi-value">{totalUsers}</span>
                  <span className="crm-trend-pill green">
                    <span>{activeUsers} Active</span>
                  </span>
                </div>
                <div className="crm-kpi-footer">
                  <span className="crm-kpi-subtext">
                    <strong>{salesUsers.length}</strong> sales reps &bull; <strong>{totalUsers - salesUsers.length}</strong> administrators
                  </span>
                  <div className="crm-sparkline-bar">
                    <span
                      style={{
                        width:
                          totalUsers > 0
                            ? `${Math.min(100, Math.round((activeUsers / totalUsers) * 100))}%`
                            : "0%",
                        background: "#6366F1",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* =========================================================
              3. MIDDLE SECTION: PIPELINE BREAKDOWN & RECENT LEADS
              ========================================================= */}
          <section className="row g-3 g-xl-4 mb-4">
            {/* LEFT CARD: Real Pipeline Distribution */}
            <div className="col-12 col-xl-6">
              <div className="crm-card h-100 d-flex flex-column">
                <div className="crm-card-header d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
                  <div>
                    <h2 className="crm-card-title">Pipeline & Lead Distribution</h2>
                    <p className="crm-card-subtitle">
                      Real-time status allocation of incoming and engaged leads
                    </p>
                  </div>
                  <button
                    type="button"
                    className="crm-link-btn"
                    onClick={() => navigate("/admin/leads")}
                  >
                    View All Leads &rarr;
                  </button>
                </div>

                {totalLeads === 0 ? (
                  <div className="crm-empty-state my-auto">
                    <Users size={28} style={{ opacity: 0.4 }} />
                    <p className="crm-empty-title">No leads in the pipeline yet</p>
                    <span className="crm-empty-desc">
                      Import or create leads to view live pipeline distribution.
                    </span>
                    <button
                      type="button"
                      className="crm-action-pill-btn"
                      onClick={() => navigate("/admin/leads")}
                    >
                      + Add New Lead
                    </button>
                  </div>
                ) : (
                  <div className="crm-pipeline-bars">
                    {/* Status 1: Interested */}
                    <div className="crm-pipeline-row">
                      <div className="crm-pipeline-label-row d-flex align-items-center justify-content-between gap-2 flex-wrap">
                        <span className="crm-pipeline-status-name">
                          <span className="crm-status-dot emerald" />
                          Interested & Qualified
                        </span>
                        <span className="crm-pipeline-counts">
                          <strong>{interestedLeads}</strong> (
                          {Math.round((interestedLeads / totalLeads) * 100)}%)
                        </span>
                      </div>
                      <div className="crm-pipeline-bar-track">
                        <span
                          className="crm-pipeline-fill emerald"
                          style={{
                            width: `${Math.max(3, (interestedLeads / totalLeads) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Status 2: Follow up */}
                    <div className="crm-pipeline-row">
                      <div className="crm-pipeline-label-row d-flex align-items-center justify-content-between gap-2 flex-wrap">
                        <span className="crm-pipeline-status-name">
                          <span className="crm-status-dot blue" />
                          Follow-up Scheduled
                        </span>
                        <span className="crm-pipeline-counts">
                          <strong>{followupLeads}</strong> (
                          {Math.round((followupLeads / totalLeads) * 100)}%)
                        </span>
                      </div>
                      <div className="crm-pipeline-bar-track">
                        <span
                          className="crm-pipeline-fill blue"
                          style={{
                            width: `${Math.max(3, (followupLeads / totalLeads) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Status 3: New / Select */}
                    <div className="crm-pipeline-row">
                      <div className="crm-pipeline-label-row d-flex align-items-center justify-content-between gap-2 flex-wrap">
                        <span className="crm-pipeline-status-name">
                          <span className="crm-status-dot indigo" />
                          New / Inbound
                        </span>
                        <span className="crm-pipeline-counts">
                          <strong>{newLeadsCount}</strong> (
                          {Math.round((newLeadsCount / totalLeads) * 100)}%)
                        </span>
                      </div>
                      <div className="crm-pipeline-bar-track">
                        <span
                          className="crm-pipeline-fill indigo"
                          style={{
                            width: `${Math.max(3, (newLeadsCount / totalLeads) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Status 4: No Contact */}
                    <div className="crm-pipeline-row">
                      <div className="crm-pipeline-label-row d-flex align-items-center justify-content-between gap-2 flex-wrap">
                        <span className="crm-pipeline-status-name">
                          <span className="crm-status-dot amber" />
                          No Contact / Unreachable
                        </span>
                        <span className="crm-pipeline-counts">
                          <strong>{noContactLeads}</strong> (
                          {Math.round((noContactLeads / totalLeads) * 100)}%)
                        </span>
                      </div>
                      <div className="crm-pipeline-bar-track">
                        <span
                          className="crm-pipeline-fill amber"
                          style={{
                            width: `${Math.max(3, (noContactLeads / totalLeads) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Status 5: Not Interested */}
                    <div className="crm-pipeline-row">
                      <div className="crm-pipeline-label-row d-flex align-items-center justify-content-between gap-2 flex-wrap">
                        <span className="crm-pipeline-status-name">
                          <span className="crm-status-dot muted" />
                          Not Interested / Dropped
                        </span>
                        <span className="crm-pipeline-counts">
                          <strong>{notInterestedLeads}</strong> (
                          {Math.round((notInterestedLeads / totalLeads) * 100)}%)
                        </span>
                      </div>
                      <div className="crm-pipeline-bar-track">
                        <span
                          className="crm-pipeline-fill muted"
                          style={{
                            width: `${Math.max(3, (notInterestedLeads / totalLeads) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom Pipeline Summary Strip */}
                <div className="row g-2 pt-3 mt-auto crm-funnel-stats-summary">
                  <div className="col-4 col-sm-4">
                    <div className="crm-funnel-stat-box h-100">
                      <span className="crm-funnel-stat-label">Hot Leads</span>
                      <span className="crm-funnel-stat-value">{hotLeads}</span>
                    </div>
                  </div>
                  <div className="col-4 col-sm-4">
                    <div className="crm-funnel-stat-box h-100">
                      <span className="crm-funnel-stat-label">Active Outreach</span>
                      <span className="crm-funnel-stat-value">
                        {interestedLeads + followupLeads}
                      </span>
                    </div>
                  </div>
                  <div className="col-4 col-sm-4">
                    <div className="crm-funnel-stat-box h-100">
                      <span className="crm-funnel-stat-label">Qualification</span>
                      <span className="crm-funnel-stat-value">
                        {totalLeads > 0 ? `${Math.round((interestedLeads / totalLeads) * 100)}%` : "0%"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT CARD: Recent Inbound Leads Activity */}
            <div className="col-12 col-xl-6">
              <div className="crm-card h-100 d-flex flex-column">
                <div className="crm-card-header d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
                  <div>
                    <h2 className="crm-card-title">Recent Inbound Leads</h2>
                    <p className="crm-card-subtitle">
                      Latest lead arrivals & current contact readiness
                    </p>
                  </div>
                  <button
                    type="button"
                    className="crm-link-btn"
                    onClick={() => navigate("/admin/leads")}
                  >
                    Manage Leads &rarr;
                  </button>
                </div>

                {recentLeads.length === 0 ? (
                  <div className="crm-empty-state my-auto">
                    <Users size={28} style={{ opacity: 0.4 }} />
                    <p className="crm-empty-title">No recent leads found</p>
                    <span className="crm-empty-desc">
                      New leads will appear here in real-time as they are added.
                    </span>
                    <button
                      type="button"
                      className="crm-action-pill-btn"
                      onClick={() => navigate("/admin/leads")}
                    >
                      + Add New Lead
                    </button>
                  </div>
                ) : (
                  <div className="crm-recent-leads-list">
                    {recentLeads.map((lead) => {
                      const initial = (lead.name || "L").charAt(0).toUpperCase();
                      const statusClass =
                        lead.status === "Interested"
                          ? "status-interested"
                          : lead.status === "Follow up"
                          ? "status-followup"
                          : lead.status === "No Contact"
                          ? "status-nocontact"
                          : "status-new";

                      return (
                        <div
                          key={lead._id}
                          className="crm-recent-lead-item"
                          onClick={() => navigate("/admin/leads")}
                          role="button"
                          tabIndex={0}
                          title="Click to view in Leads"
                        >
                          <div className="crm-lead-avatar">{initial}</div>

                          <div className="crm-lead-details">
                            <div className="crm-lead-top-row">
                              <span className="crm-lead-name" title={lead.name}>
                                {lead.name}
                              </span>
                              <span
                                className={`crm-lead-status-pill ${statusClass}`}
                                title={`${lead.status || "New"}${
                                  lead.subStatus ? ` • ${lead.subStatus}` : ""
                                }`}
                              >
                                {lead.status || "New"}
                                {lead.subStatus ? ` • ${lead.subStatus}` : ""}
                              </span>
                            </div>

                            <div className="crm-lead-meta-row">
                              <span
                                className="crm-lead-company"
                                title={lead.company || "Direct Client"}
                              >
                                {lead.company || "Direct Client"}
                              </span>
                              {lead.phone && (
                                <span
                                  className="crm-lead-contact"
                                  title={`Phone: ${lead.phone}`}
                                >
                                  <Phone size={11} />
                                  <span>{lead.phone}</span>
                                </span>
                              )}
                              {lead.email && (
                                <span
                                  className="crm-lead-contact"
                                  title={`Email: ${lead.email}`}
                                >
                                  <Mail size={11} />
                                  <span>{lead.email}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <ChevronRight size={15} className="crm-row-chevron" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* =========================================================
              4. BOTTOM SECTION: SCHEDULED BRIEFINGS & PRIORITY TASKS
              ========================================================= */}
          <section className="row g-3 g-xl-4">
            {/* LEFT CARD: Scheduled Briefings & Reminders (Simple List Row Format) */}
            <div className="col-12 col-xl-6">
              <div className="crm-card h-100 d-flex flex-column">
                <div className="crm-card-header d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
                  <div>
                    <h2 className="crm-card-title">Scheduled Briefings & Reminders</h2>
                    <p className="crm-card-subtitle">
                      Upcoming client calls and operational appointments
                    </p>
                  </div>
                  <button
                    type="button"
                    className="crm-link-btn"
                    onClick={() => navigate("/company-calendar")}
                  >
                    Open Calendar &rarr;
                  </button>
                </div>

                {scheduledReminders.length === 0 ? (
                  <div className="crm-empty-state my-auto">
                    <Calendar size={28} style={{ opacity: 0.4 }} />
                    <p className="crm-empty-title">No reminders scheduled for today</p>
                    <span className="crm-empty-desc">
                      Plan upcoming team calls or follow-ups in the company calendar.
                    </span>
                    <button
                      type="button"
                      className="crm-action-pill-btn"
                      onClick={() => navigate("/company-calendar")}
                    >
                      + Schedule Calendar Event
                    </button>
                  </div>
                ) : (
                  <div className="crm-recent-leads-list">
                    {scheduledReminders.map((rem) => {
                      const timeRange = rem.startTime
                        ? rem.endTime
                          ? `${rem.startTime} - ${rem.endTime}`
                          : rem.startTime
                        : "Scheduled";

                      const isHigh = rem.priority === "high";

                      return (
                        <div
                          key={rem._id}
                          className="crm-recent-lead-item"
                          onClick={() => navigate("/company-calendar")}
                          role="button"
                          tabIndex={0}
                          title="Click to view in Company Calendar"
                        >
                          <div className={`crm-lead-avatar ${isHigh ? "avatar-high" : "avatar-cal"}`}>
                            <Calendar size={15} />
                          </div>

                          <div className="crm-lead-details">
                            <div className="crm-lead-top-row">
                              <span className="crm-lead-name">{rem.title}</span>
                              <span className={`crm-priority-flag ${isHigh ? "urgent" : "medium"}`}>
                                {isHigh && <Flame size={10} style={{ marginRight: 2 }} />}
                                {isHigh ? "High Priority" : rem.priority || "Normal"}
                              </span>
                            </div>

                            <div className="crm-lead-meta-row">
                              <span className="crm-lead-company">
                                {rem.companyName || "General Briefing"}
                              </span>
                              <span className="crm-lead-contact">
                                <Clock size={11} />
                                {timeRange} {rem.date ? `• ${rem.date}` : ""}
                              </span>
                              {rem.description && (
                                <span className="crm-reminder-desc">
                                  {rem.description}
                                </span>
                              )}
                            </div>
                          </div>

                          <ChevronRight size={15} className="crm-row-chevron" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT CARD: Priority Tasks Checklist */}
            <div className="col-12 col-xl-6">
              <div className="crm-card h-100 d-flex flex-column">
                <div className="crm-card-header d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
                  <div>
                    <h2 className="crm-card-title">Priority Tasks</h2>
                    <p className="crm-card-subtitle">
                      Live actionable task list with instant status toggling
                    </p>
                  </div>

                  <div className="crm-task-filter-pills">
                    {(["all", "urgent", "pending"] as const).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        className={`crm-filter-pill ${taskFilter === filter ? "active" : ""}`}
                        onClick={() => setTaskFilter(filter)}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                {priorityTasks.length === 0 ? (
                  <div className="crm-empty-state my-auto">
                    <CheckSquare size={28} style={{ opacity: 0.4 }} />
                    <p className="crm-empty-title">No pending priority tasks</p>
                    <span className="crm-empty-desc">
                      All clear! Tasks will appear here in real-time as assigned.
                    </span>
                    <button
                      type="button"
                      className="crm-action-pill-btn"
                      onClick={() => navigate("/admin/tasks")}
                    >
                      View All Tasks &rarr;
                    </button>
                  </div>
                ) : (
                  <div className="crm-urgent-tasks-list">
                    {priorityTasks.map((task) => {
                      const isCompleted = task.status === "completed";
                      const isUrgent =
                        task.priority?.toLowerCase() === "urgent" ||
                        task.priority?.toLowerCase() === "high";

                      const dueDateObj = task.dueDate ? new Date(task.dueDate) : null;
                      const isOverdue =
                        dueDateObj && !isCompleted
                          ? dueDateObj.getTime() < Date.now()
                          : false;

                      let dueDateLabel = "No deadline";
                      if (dueDateObj && !isNaN(dueDateObj.getTime())) {
                        const diffDays = Math.ceil(
                          (dueDateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                        );
                        if (diffDays < 0) dueDateLabel = `Overdue by ${Math.abs(diffDays)}d`;
                        else if (diffDays === 0) dueDateLabel = "Due Today";
                        else if (diffDays === 1) dueDateLabel = "Due Tomorrow";
                        else dueDateLabel = `Due in ${diffDays}d`;
                      }

                      const compName =
                        typeof task.company === "object" && task.company?.companyName
                          ? task.company.companyName
                          : typeof task.company === "string" && task.company
                          ? task.company
                          : task.assignedTo?.name
                          ? `Assigned: ${task.assignedTo.name}`
                          : "Operations";

                      return (
                        <div
                          key={task._id}
                          className={`crm-urgent-task-item ${isCompleted ? "completed" : ""}`}
                        >
                          <button
                            type="button"
                            className={`crm-urgent-task-checkbox ${isCompleted ? "checked" : ""}`}
                            onClick={() => handleToggleTask(task._id, task.status)}
                            aria-label={
                              isCompleted ? "Mark pending" : "Mark completed"
                            }
                          >
                            {isCompleted && <Check size={11} strokeWidth={3} />}
                          </button>

                          <div className="crm-urgent-task-content">
                            <span className="crm-urgent-task-title">{task.title}</span>

                            <div className="crm-urgent-task-meta">
                              <span className="crm-urgent-task-company">{compName}</span>

                              <span
                                className={`crm-priority-flag ${
                                  isUrgent ? "urgent" : "medium"
                                }`}
                              >
                                {isUrgent && <Flame size={10} style={{ marginRight: 2 }} />}
                                {task.priority || "Medium"}
                              </span>

                              <span
                                className={`crm-urgent-due-badge ${
                                  isOverdue ? "overdue" : ""
                                }`}
                              >
                                <Clock size={10} />
                                {dueDateLabel}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default CrmDashboard;
