import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { ChangeEvent } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import LeadStatusBadgePopover from "../../components/LeadStatusBadgePopover";
import type {
  LeadStatus,
  LeadSubStatus,
} from "../../components/LeadStatusBadgePopover";
import LeadSlideDrawer, {
  getUrgencyInfo,
} from "../../components/LeadSlideDrawer";
import {
  AlertCircle,
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  MapPin,
  Phone,
  Users,
  X,
} from "lucide-react";
import "./Adminlead.css";

// =====================================================
// TYPES
// =====================================================

interface UploadedBy {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
  jobPosition?: string;
}

interface Lead {
  _id: string;
  srNo?: number;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  source?: string;
  status?: LeadStatus | "";
  subStatus?: LeadSubStatus | "";
  notes?: string;
  uploadedBy?: UploadedBy | string;
  createdAt?: string;
  updatedAt?: string;
}

interface ImportResult {
  message: string;
  totalRows: number;
  imported: number;
  failed: number;
  failedRows: {
    row: number;
    reason: string;
  }[];
}

interface DeletedLeadSnapshot {
  leadId: string;
  srNo?: number;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  source?: string;
  status?: string;
  subStatus?: string;
  notes?: string;
  uploadedByName?: string;
  createdAt?: string;
}

interface LeadDeletionLog {
  _id: string;
  deletedBy: string | { _id?: string; name?: string; email?: string };
  deletedByName: string;
  deletedByEmail: string;
  deletedByRole: "admin" | "sales";
  deletedAt: string;
  count: number;
  deletedLeads: DeletedLeadSnapshot[];
  createdAt: string;
}

interface TeamUser {
  _id: string;
  name: string;
  email: string;
  jobPosition?: string;
  role: "admin" | "sales";
  status?: "active" | "inactive";
  createdAt?: string;
}

interface UserLeadCard {
  userId: string;
  name: string;
  email: string;
  jobPosition?: string;
  role?: string;
  status?: string;
  totalLeads: number;
  interested: number;
  followUp: number;
  noContact: number;
  notInterested: number;
  junk: number;
  unprocessed: number;
}

// =====================================================
// CONSTANTS & HELPERS
// =====================================================

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const statuses: LeadStatus[] = [
  "Interested",
  "Not Interested",
  "No Contact",
  "Follow up",
  "Junk",
];

const subStatusMap: Record<LeadStatus, LeadSubStatus[]> = {
  Interested: ["Hot", "Warm", "Cold"],
  "Not Interested": [
    "Pricing Issue",
    "Not Required",
    "Evaluating Competitors",
  ],
  "No Contact": [
    "Ring Not Received",
    "Switched Off",
    "Incoming Not Available",
  ],
  "Follow up": [
    "Call Me Later",
    "Call Disconnected",
  ],
  Junk: [""],
};

const getAvatarGradient = (str: string) => {
  const gradients = [
    "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
    "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
    "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
    "linear-gradient(135deg, #059669 0%, #047857 100%)",
    "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
    "linear-gradient(135deg, #db2777 0%, #9d174d 100%)",
    "linear-gradient(135deg, #d97706 0%, #92400e 100%)",
    "linear-gradient(135deg, #0d9488 0%, #115e59 100%)",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
};

const getLeadUploaderId = (uploadedBy?: UploadedBy | string): string => {
  if (!uploadedBy) return "unassigned";
  if (typeof uploadedBy === "string") return uploadedBy;
  return uploadedBy._id || "unassigned";
};

const getLeadUploaderName = (
  uploadedBy?: UploadedBy | string,
  usersList?: TeamUser[]
): string => {
  if (!uploadedBy) return "Unassigned";
  if (typeof uploadedBy === "object") {
    if (uploadedBy.name && uploadedBy.name.trim()) return uploadedBy.name;
    if (uploadedBy.email && uploadedBy.email.trim()) return uploadedBy.email;
  }
  const id = typeof uploadedBy === "string" ? uploadedBy : uploadedBy?._id;
  if (id && usersList && usersList.length > 0) {
    const matched = usersList.find((u) => u._id === id);
    if (matched) {
      if (matched.name && matched.name.trim()) return matched.name;
      if (matched.email && matched.email.trim()) return matched.email;
    }
  }
  if (typeof uploadedBy === "string") {
    if (uploadedBy.includes("@")) return uploadedBy;
    if (/^[0-9a-fA-F]{24}$/.test(uploadedBy)) {
      return "Team Member";
    }
    return uploadedBy;
  }
  return "Unassigned";
};

const getLeadUploaderEmail = (
  uploadedBy?: UploadedBy | string,
  usersList?: TeamUser[]
): string => {
  if (!uploadedBy) return "";
  if (typeof uploadedBy === "object" && uploadedBy.email) {
    return uploadedBy.email;
  }
  const id = typeof uploadedBy === "string" ? uploadedBy : uploadedBy?._id;
  if (id && usersList && usersList.length > 0) {
    const matched = usersList.find((u) => u._id === id);
    if (matched && matched.email) return matched.email;
  }
  return "";
};

const getLeadUploaderRole = (
  uploadedBy?: UploadedBy | string,
  usersList?: TeamUser[]
): string => {
  const id = typeof uploadedBy === "string" ? uploadedBy : uploadedBy?._id;
  if (id && usersList && usersList.length > 0) {
    const matched = usersList.find((u) => u._id === id);
    if (matched) {
      if (matched.jobPosition) return matched.jobPosition;
      return matched.role === "admin" ? "Admin" : "Sales Rep";
    }
  }
  return "";
};

const formatTimestamp = (dateStr?: string) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })} ${d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })}`;
  } catch {
    return dateStr;
  }
};

// =====================================================
// COMPONENT
// =====================================================

const AdminLeads: React.FC = () => {
  const {} = useAuth();

  // ---------------------------------------------------
  // STATE
  // ---------------------------------------------------

  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // User Selection for separate view
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [userSearchQuery, setUserSearchQuery] = useState<string>("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | LeadStatus>("All");
  const [subStatusFilter, setSubStatusFilter] =
    useState<"All" | LeadSubStatus>("All");

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Batch Selection & Deletion State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [targetDeleteIds, setTargetDeleteIds] = useState<string[]>([]);

  // Deletion History / Audit Log State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [deletionLogs, setDeletionLogs] = useState<LeadDeletionLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Slide-out Drawer State (replacing old notes modal)
  const [selectedDrawerLead, setSelectedDrawerLead] = useState<Lead | null>(null);

  // Inline Reassignment Popover State
  const [activeReassignPopoverLeadId, setActiveReassignPopoverLeadId] = useState<string | null>(null);
  const [isReassigning, setIsReassigning] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null);
  const reassignPopoverRef = useRef<HTMLDivElement | null>(null);

  // Close reassign popover on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        reassignPopoverRef.current &&
        !reassignPopoverRef.current.contains(e.target as Node)
      ) {
        setActiveReassignPopoverLeadId(null);
      }
    };
    if (activeReassignPopoverLeadId) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [activeReassignPopoverLeadId]);

  // ===================================================
  // AUTH CONFIG
  // ===================================================

  const getAuthConfig = () => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      "";
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  // ===================================================
  // FETCH ALL DATA
  // ===================================================

  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_URL}/leads/all`,
        getAuthConfig()
      );

      const fetchedLeads = Array.isArray(response.data?.leads)
        ? response.data.leads
        : [];

      setLeads(fetchedLeads);
      // Clean selected IDs that don't exist anymore
      setSelectedIds((prev) =>
        prev.filter((id) => fetchedLeads.some((l: Lead) => l._id === id))
      );
    } catch (err: any) {
      console.error("Failed to fetch leads:", err);
      setError(
        err?.response?.data?.message ||
          "Failed to fetch leads. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await axios.get(
        `${API_URL}/users`,
        getAuthConfig()
      );

      if (response.data?.success && Array.isArray(response.data.users)) {
        setUsers(response.data.users);
      } else if (Array.isArray(response.data?.users)) {
        setUsers(response.data.users);
      } else if (Array.isArray(response.data)) {
        setUsers(response.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleRefreshAll = async () => {
    await Promise.all([fetchLeads(), fetchUsers()]);
  };

  useEffect(() => {
    fetchLeads();
    fetchUsers();
  }, []);

  // ===================================================
  // FETCH DELETION LOGS (AUDIT TRAIL)
  // ===================================================

  const fetchDeletionLogs = async () => {
    try {
      setLoadingLogs(true);
      const response = await axios.get(
        `${API_URL}/leads/deletion-logs`,
        getAuthConfig()
      );
      setDeletionLogs(response.data?.logs || []);
    } catch (err: any) {
      console.error("Failed to fetch deletion logs:", err);
      setError(
        err?.response?.data?.message || "Failed to load deletion audit trail."
      );
    } finally {
      setLoadingLogs(false);
    }
  };

  const openHistoryModal = () => {
    setShowHistoryModal(true);
    fetchDeletionLogs();
  };

  // ===================================================
  // USER METRICS / USER CARDS CALCULATION
  // ===================================================

  const userStatsList = useMemo((): UserLeadCard[] => {
    const userMap = new Map<string, UserLeadCard>();

    users.forEach((u) => {
      userMap.set(u._id, {
        userId: u._id,
        name: u.name || "Unnamed User",
        email: u.email || "",
        jobPosition:
          u.jobPosition ||
          (u.role === "admin" ? "Administrator" : "Sales Representative"),
        role: u.role || "sales",
        status: u.status || "active",
        totalLeads: 0,
        interested: 0,
        followUp: 0,
        noContact: 0,
        notInterested: 0,
        junk: 0,
        unprocessed: 0,
      });
    });

    leads.forEach((lead) => {
      const uploaderId = getLeadUploaderId(lead.uploadedBy);
      if (
        uploaderId &&
        uploaderId !== "unassigned" &&
        !userMap.has(uploaderId)
      ) {
        const uploaderName = getLeadUploaderName(lead.uploadedBy, users);
        const uploaderEmail = getLeadUploaderEmail(lead.uploadedBy, users);
        const uploaderRole = getLeadUploaderRole(lead.uploadedBy, users);
        userMap.set(uploaderId, {
          userId: uploaderId,
          name: uploaderName,
          email: uploaderEmail,
          jobPosition: uploaderRole || "Sales Representative",
          role: "sales",
          status: "active",
          totalLeads: 0,
          interested: 0,
          followUp: 0,
          noContact: 0,
          notInterested: 0,
          junk: 0,
          unprocessed: 0,
        });
      }
    });

    let hasUnassigned = false;
    const unassignedCard: UserLeadCard = {
      userId: "unassigned",
      name: "Direct / Unassigned Leads",
      email: "No uploader recorded",
      jobPosition: "System Imports",
      role: "sales",
      status: "active",
      totalLeads: 0,
      interested: 0,
      followUp: 0,
      noContact: 0,
      notInterested: 0,
      junk: 0,
      unprocessed: 0,
    };

    leads.forEach((lead) => {
      const uploaderId = getLeadUploaderId(lead.uploadedBy);
      let card = userMap.get(uploaderId);

      if (!card && (uploaderId === "unassigned" || !uploaderId)) {
        card = unassignedCard;
        hasUnassigned = true;
      }

      if (card) {
        card.totalLeads += 1;
        if (lead.status === "Interested") card.interested += 1;
        else if (lead.status === "Follow up") card.followUp += 1;
        else if (lead.status === "No Contact") card.noContact += 1;
        else if (lead.status === "Not Interested") card.notInterested += 1;
        else if (lead.status === "Junk") card.junk += 1;
        else card.unprocessed += 1;
      }
    });

    const list = Array.from(userMap.values());
    if (hasUnassigned && unassignedCard.totalLeads > 0) {
      list.push(unassignedCard);
    }

    return list.sort(
      (a, b) => b.totalLeads - a.totalLeads || a.name.localeCompare(b.name)
    );
  }, [users, leads]);

  const filteredUserCards = useMemo(() => {
    if (!userSearchQuery.trim()) return userStatsList;
    const q = userSearchQuery.trim().toLowerCase();
    return userStatsList.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.jobPosition && u.jobPosition.toLowerCase().includes(q))
    );
  }, [userStatsList, userSearchQuery]);

  const selectedUserObj = useMemo(() => {
    if (selectedUserId === "all") return null;
    if (selectedUserId === "unassigned") {
      return {
        userId: "unassigned",
        name: "Direct / Unassigned Leads",
        email: "No uploader recorded",
        jobPosition: "System Imports",
        role: "sales",
      };
    }
    return userStatsList.find((u) => u.userId === selectedUserId) || null;
  }, [selectedUserId, userStatsList]);

  // ===================================================
  // FILTER SUB STATUS OPTIONS
  // ===================================================

  const availableSubStatuses = useMemo((): LeadSubStatus[] => {
    if (statusFilter === "All") {
      return Object.values(subStatusMap)
        .flat()
        .filter((value, index, array) => array.indexOf(value) === index);
    }
    return subStatusMap[statusFilter] ?? [];
  }, [statusFilter]);

  // ===================================================
  // SCOPED LEADS
  // ===================================================

  const userScopedLeads = useMemo(() => {
    if (selectedUserId === "all") return leads;
    return leads.filter((lead) => {
      const uploaderId = getLeadUploaderId(lead.uploadedBy);
      if (selectedUserId === "unassigned") {
        return uploaderId === "unassigned" || !lead.uploadedBy;
      }
      if (uploaderId === selectedUserId) return true;

      const targetUser = users.find((u) => u._id === selectedUserId);
      if (targetUser) {
        const uploaderName = getLeadUploaderName(lead.uploadedBy, users).toLowerCase();
        const uploaderEmail = getLeadUploaderEmail(lead.uploadedBy, users).toLowerCase();
        return (
          uploaderName === targetUser.name.toLowerCase() ||
          (targetUser.email && uploaderEmail === targetUser.email.toLowerCase())
        );
      }
      return false;
    });
  }, [leads, selectedUserId, users]);

  const statTotal = userScopedLeads.length;
  const statInterested = userScopedLeads.filter(
    (l) => l.status === "Interested"
  ).length;
  const statFollowUp = userScopedLeads.filter(
    (l) => l.status === "Follow up"
  ).length;
  const statNoContact = userScopedLeads.filter(
    (l) => l.status === "No Contact"
  ).length;

  // ===================================================
  // FILTER LEADS (SEARCH + USER + STATUS + SUBSTATUS)
  // ===================================================

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase();

    return userScopedLeads.filter((lead) => {
      const matchesSearch =
        !query ||
        lead.name?.toLowerCase().includes(query) ||
        lead.phone?.toLowerCase().includes(query) ||
        lead.email?.toLowerCase().includes(query) ||
        lead.company?.toLowerCase().includes(query) ||
        lead.source?.toLowerCase().includes(query) ||
        lead.notes?.toLowerCase().includes(query) ||
        getLeadUploaderName(lead.uploadedBy, users).toLowerCase().includes(query) ||
        getLeadUploaderEmail(lead.uploadedBy, users).toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" || lead.status === statusFilter;

      const matchesSubStatus =
        subStatusFilter === "All" || lead.subStatus === subStatusFilter;

      return matchesSearch && matchesStatus && matchesSubStatus;
    });
  }, [userScopedLeads, search, statusFilter, subStatusFilter, users]);

  // Target leads list for delete modal preview
  const targetLeadsList = useMemo(() => {
    const targetSet = new Set(targetDeleteIds);
    return leads.filter((l) => targetSet.has(l._id));
  }, [leads, targetDeleteIds]);

  // Total status counts across all leads
  const totalAllInterested = useMemo(
    () => leads.filter((l) => l.status === "Interested").length,
    [leads]
  );
  const totalAllFollowUp = useMemo(
    () => leads.filter((l) => l.status === "Follow up").length,
    [leads]
  );
  const totalAllNoContact = useMemo(
    () => leads.filter((l) => l.status === "No Contact").length,
    [leads]
  );

  // ===================================================
  // SELECTION HANDLERS
  // ===================================================

  const isAllSelected =
    filteredLeads.length > 0 &&
    filteredLeads.every((lead) => selectedIds.includes(lead._id));

  const isIndeterminate =
    selectedIds.length > 0 &&
    !isAllSelected &&
    filteredLeads.some((lead) => selectedIds.includes(lead._id));

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const handleSelectAll = () => {
    if (isAllSelected) {
      const filteredIdSet = new Set(filteredLeads.map((l) => l._id));
      setSelectedIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    } else {
      const newSelected = new Set(selectedIds);
      filteredLeads.forEach((l) => newSelected.add(l._id));
      setSelectedIds(Array.from(newSelected));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  // ===================================================
  // DELETE HANDLERS
  // ===================================================

  const promptBatchDelete = () => {
    if (selectedIds.length === 0) return;
    setTargetDeleteIds(selectedIds);
    setShowConfirmDeleteModal(true);
  };

  const promptSingleDelete = (id: string) => {
    setTargetDeleteIds([id]);
    setShowConfirmDeleteModal(true);
  };

  const confirmExecutionDelete = async () => {
    if (targetDeleteIds.length === 0) return;

    try {
      setIsDeleting(true);
      setError("");
      setSuccess("");

      const response = await axios.post(
        `${API_URL}/leads/batch-delete`,
        { leadIds: targetDeleteIds },
        getAuthConfig()
      );

      setSuccess(
        response.data?.message ||
          `Successfully deleted ${targetDeleteIds.length} lead(s).`
      );

      const targetSet = new Set(targetDeleteIds);
      setSelectedIds((prev) => prev.filter((id) => !targetSet.has(id)));

      if (selectedDrawerLead && targetSet.has(selectedDrawerLead._id)) {
        setSelectedDrawerLead(null);
      }

      setShowConfirmDeleteModal(false);
      setTargetDeleteIds([]);

      setTimeout(() => {
        setSuccess("");
      }, 3500);

      await fetchLeads();
    } catch (err: any) {
      console.error("Batch delete error:", err);
      setError(
        err?.response?.data?.message || "Failed to delete selected leads."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // ===================================================
  // CHAINED STATUS UPDATE HANDLER
  // ===================================================

  const handleUpdateStatus = async (
    lead: Lead,
    status: LeadStatus,
    subStatus: LeadSubStatus
  ) => {
    try {
      setUpdatingId(lead._id);
      setError("");

      const response = await axios.patch(
        `${API_URL}/leads/${lead._id}/status`,
        {
          status,
          subStatus,
        },
        getAuthConfig()
      );

      const updatedLead: Lead | undefined = response.data?.lead;

      setLeads((previous) =>
        previous.map((item) =>
          item._id === lead._id
            ? updatedLead ?? {
                ...item,
                status,
                subStatus,
              }
            : item
        )
      );

      if (selectedDrawerLead && selectedDrawerLead._id === lead._id) {
        setSelectedDrawerLead((prev) =>
          prev
            ? {
                ...prev,
                status: updatedLead?.status ?? status,
                subStatus: updatedLead?.subStatus ?? subStatus,
              }
            : null
        );
      }

      setSuccess("Lead pipeline status updated.");
      setTimeout(() => {
        setSuccess("");
      }, 2500);
    } catch (err: any) {
      console.error("Update lead status error:", err);
      setError(
        err?.response?.data?.message || "Failed to update lead status."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // ===================================================
  // REASSIGNMENT HANDLER (1-CLICK ADMIN REASSIGN)
  // ===================================================

  const handleReassignLead = async (leadId: string, userId: string) => {
    try {
      setIsReassigning(true);
      setError("");

      const response = await axios.patch(
        `${API_URL}/leads/${leadId}/assign`,
        { userId },
        getAuthConfig()
      );

      const updatedLead: Lead | undefined = response.data?.lead;
      const targetUser = users.find((u) => u._id === userId);

      setLeads((prev) =>
        prev.map((item) =>
          item._id === leadId
            ? updatedLead ?? {
                ...item,
                uploadedBy: targetUser || userId,
              }
            : item
        )
      );

      if (selectedDrawerLead && selectedDrawerLead._id === leadId) {
        setSelectedDrawerLead((prev) =>
          prev
            ? {
                ...prev,
                uploadedBy: updatedLead?.uploadedBy ?? targetUser ?? userId,
              }
            : null
        );
      }

      setActiveReassignPopoverLeadId(null);
      setSuccess("Lead reassigned successfully.");
      setTimeout(() => setSuccess(""), 2500);
    } catch (err: any) {
      console.error("Reassign lead error:", err);
      setError(err?.response?.data?.message || "Failed to reassign lead.");
    } finally {
      setIsReassigning(false);
    }
  };

  // ===================================================
  // NOTES SAVE HANDLER (SLIDE DRAWER)
  // ===================================================

  const handleSaveNotes = async (leadId: string, notes: string) => {
    try {
      setError("");

      const response = await axios.patch(
        `${API_URL}/leads/${leadId}/notes`,
        { notes },
        getAuthConfig()
      );

      const updatedLead = response.data?.lead;

      setLeads((previous) =>
        previous.map((item) =>
          item._id === leadId
            ? { ...item, notes: updatedLead?.notes ?? notes }
            : item
        )
      );

      if (selectedDrawerLead && selectedDrawerLead._id === leadId) {
        setSelectedDrawerLead((prev) =>
          prev ? { ...prev, notes: updatedLead?.notes ?? notes } : null
        );
      }

      setSuccess("Lead notes saved successfully.");
      setTimeout(() => {
        setSuccess("");
      }, 2500);
    } catch (err: any) {
      console.error("Save lead notes error:", err);
      setError(err?.response?.data?.message || "Failed to save lead notes.");
      throw err;
    }
  };

  // ===================================================
  // FILE SELECT & IMPORT EXCEL
  // ===================================================

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validExtensions = [".xlsx", ".xls"];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      setError("Please select a valid Excel file (.xlsx or .xls).");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setError("");
    setImportResult(null);
    setSelectedFile(file);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setError("Please select an Excel file first.");
      return;
    }

    try {
      setImporting(true);
      setError("");
      setImportResult(null);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await axios.post(
        `${API_URL}/leads/import-excel`,
        formData,
        {
          headers: {
            ...getAuthConfig().headers,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setImportResult(response.data);
      setSuccess("Leads imported successfully.");

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await handleRefreshAll();
    } catch (err: any) {
      console.error("Import error:", err);
      setError(
        err?.response?.data?.message ||
          "Failed to import leads. Please verify file format."
      );
    } finally {
      setImporting(false);
    }
  };

  // ===================================================
  // RESET FILTERS
  // ===================================================

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setSubStatusFilter("All");
  };

  const handleResetUserFilter = () => {
    setSelectedUserId("all");
    setUserSearchQuery("");
  };

  return (
    <div className="lead-page">
      {/* =================================================
          PAGE HEADER
      ================================================= */}
      <div className="lead-page-header">
        <div>
          <div className="lead-breadcrumb">Admin / Leads Pipeline</div>
          <h1>Leads Management</h1>
          <p>
            Master grid overview of organization leads, team assignments, and pipeline progression
          </p>
        </div>

        <div className="lead-header-actions">
          <button
            type="button"
            className="lead-history-btn"
            onClick={openHistoryModal}
            title="View audit trail of deleted leads"
          >
            <svg
              width="16"
              height="16"
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
            Deletion History
          </button>

          <button
            type="button"
            className="lead-refresh-btn"
            onClick={handleRefreshAll}
            disabled={loading || loadingUsers}
            title="Refresh leads and team data"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={loading || loadingUsers ? "lead-spin-icon" : ""}
            >
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
            {loading || loadingUsers ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* =================================================
          ALERTS
      ================================================= */}
      {error && (
        <div className="lead-alert lead-alert-error">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} style={{ display: "inline-flex", alignItems: "center" }}>
            <X size={14} />
          </button>
        </div>
      )}

      {success && (
        <div className="lead-alert lead-alert-success">
          <CheckCircle2 size={16} />
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess("")} style={{ display: "inline-flex", alignItems: "center" }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* =================================================
          SALES TEAM LEADS CAROUSEL
      ================================================= */}
      <section className="lead-users-section">
        <div className="lead-users-heading-wrap">
          <div className="lead-users-title-group">
            <div className="lead-users-title-row">
              <h3>Sales Team Lead Distribution</h3>
              <span className="lead-users-count-tag">
                {userStatsList.length} Member{userStatsList.length !== 1 ? "s" : ""}
              </span>
            </div>
            <p>
              Click any team member card to isolate their leads, or keep All Team Leads selected.
            </p>
          </div>

          <div className="lead-users-controls">
            <div className="lead-users-search">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Find representative..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
              />
              {userSearchQuery && (
                <button
                  type="button"
                  className="lead-users-search-clear"
                  onClick={() => setUserSearchQuery("")}
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {selectedUserId !== "all" && (
              <button
                type="button"
                className="lead-users-reset-btn"
                onClick={handleResetUserFilter}
              >
                Show All Leads
              </button>
            )}
          </div>
        </div>

        <div className="lead-users-track">
          {loading && userStatsList.length === 0 ? (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="lead-user-card lead-user-card-shimmer">
                <div className="lead-user-card-header">
                  <div
                    className="lead-shimmer lead-shimmer-avatar"
                    style={{ width: "42px", height: "42px", borderRadius: "12px" }}
                  />
                  <div className="lead-user-meta" style={{ gap: "6px" }}>
                    <div
                      className="lead-shimmer lead-shimmer-line"
                      style={{ width: "100px", height: "14px" }}
                    />
                    <div
                      className="lead-shimmer lead-shimmer-line"
                      style={{ width: "130px", height: "12px" }}
                    />
                  </div>
                </div>
                <div className="lead-user-metric-row" style={{ marginTop: "12px" }}>
                  <div
                    className="lead-shimmer lead-shimmer-line"
                    style={{ width: "40px", height: "28px" }}
                  />
                  <div
                    className="lead-shimmer lead-shimmer-line"
                    style={{ width: "110px", height: "12px", marginTop: "4px" }}
                  />
                </div>
                <div className="lead-user-capsules-row" style={{ marginTop: "12px" }}>
                  <div
                    className="lead-shimmer lead-shimmer-badge"
                    style={{ width: "70px", height: "22px" }}
                  />
                  <div
                    className="lead-shimmer lead-shimmer-badge"
                    style={{ width: "70px", height: "22px" }}
                  />
                  <div
                    className="lead-shimmer lead-shimmer-badge"
                    style={{ width: "70px", height: "22px" }}
                  />
                </div>
              </div>
            ))
          ) : (
            <>
              {/* MASTER CARD: ALL TEAM LEADS */}
              <div
                className={`lead-user-card all-card ${
                  selectedUserId === "all" ? "active" : ""
                }`}
                onClick={() => setSelectedUserId("all")}
                role="button"
                tabIndex={0}
              >
            <div className="lead-user-card-header">
              <div className="lead-user-avatar-all">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="lead-user-meta">
                <span className="lead-user-card-name">All Team Leads</span>
                <span className="lead-user-card-email">
                  {userStatsList.length} Team Member{userStatsList.length !== 1 ? "s" : ""}
                </span>
              </div>
              <span className="lead-user-tag all">Total</span>
            </div>

            <div className="lead-user-metric-row">
              <div className="lead-user-total-number">{leads.length}</div>
              <div className="lead-user-total-label">Total Organization Leads</div>
            </div>

            <div className="lead-user-capsules-row">
              <span className="lead-capsule interested" title="Interested Leads">
                <span className="lead-capsule-label">Interested</span>
                <span className="lead-capsule-count">{totalAllInterested}</span>
              </span>
              <span className="lead-capsule follow-up" title="Follow Up Leads">
                <span className="lead-capsule-label">Follow Up</span>
                <span className="lead-capsule-count">{totalAllFollowUp}</span>
              </span>
              <span className="lead-capsule no-contact" title="No Contact Leads">
                <span className="lead-capsule-label">No Contact</span>
                <span className="lead-capsule-count">{totalAllNoContact}</span>
              </span>
            </div>

            <div className="lead-user-card-footer">
              {selectedUserId === "all" ? (
                <span className="lead-user-active-indicator">
                  <span className="active-dot" /> Viewing All Leads
                </span>
              ) : (
                <span className="lead-user-cta-text">Click to view all leads →</span>
              )}
            </div>
          </div>

          {/* INDIVIDUAL USER CARDS */}
          {filteredUserCards.map((user) => {
            const isSelected = selectedUserId === user.userId;
            const initials =
              user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase() || "U";
            const avatarBg = getAvatarGradient(user.userId + user.name);
            const conversionPct =
              user.totalLeads > 0
                ? Math.round(((user.interested + user.followUp) / user.totalLeads) * 100)
                : 0;

            return (
              <div
                key={user.userId}
                className={`lead-user-card ${isSelected ? "active" : ""}`}
                onClick={() =>
                  setSelectedUserId(isSelected ? "all" : user.userId)
                }
                role="button"
                tabIndex={0}
              >
                <div className="lead-user-card-header">
                  <div
                    className="lead-user-avatar-circle"
                    style={{ background: avatarBg }}
                  >
                    {initials}
                  </div>
                  <div className="lead-user-meta">
                    <span className="lead-user-card-name" title={user.name}>
                      {user.name}
                    </span>
                    <span className="lead-user-card-email" title={user.email}>
                      {user.jobPosition || user.email || "Sales Rep"}
                    </span>
                  </div>
                  <span
                    className={`lead-user-tag ${
                      user.role === "admin" ? "admin" : "sales"
                    }`}
                  >
                    {user.role === "admin" ? "Admin" : "Sales"}
                  </span>
                </div>

                <div className="lead-user-metric-row">
                  <div className="lead-user-total-number">{user.totalLeads}</div>
                  <div className="lead-user-total-label">
                    {user.totalLeads === 1 ? "Assigned Lead" : "Assigned Leads"}
                    {user.totalLeads > 0 && (
                      <span className="lead-user-conv-badge">
                        {conversionPct}% Active
                      </span>
                    )}
                  </div>
                </div>

                <div className="lead-user-capsules-row">
                  <span
                    className="lead-capsule interested"
                    title={`${user.interested} Interested leads`}
                  >
                    <span className="lead-capsule-label">Interested</span>
                    <span className="lead-capsule-count">{user.interested}</span>
                  </span>
                  <span
                    className="lead-capsule follow-up"
                    title={`${user.followUp} Follow Up leads`}
                  >
                    <span className="lead-capsule-label">Follow Up</span>
                    <span className="lead-capsule-count">{user.followUp}</span>
                  </span>
                  <span
                    className="lead-capsule no-contact"
                    title={`${user.noContact} No Contact leads`}
                  >
                    <span className="lead-capsule-label">No Contact</span>
                    <span className="lead-capsule-count">{user.noContact}</span>
                  </span>
                </div>

                <div className="lead-user-card-footer">
                  {isSelected ? (
                    <span className="lead-user-active-indicator">
                      <span className="active-dot" /> Viewing User's Leads
                    </span>
                  ) : (
                    <span className="lead-user-cta-text">
                      Click to view leads →
                    </span>
                  )}
                </div>
              </div>
            );
          })}
            </>
          )}
        </div>
      </section>

      {/* =================================================
          EXCEL IMPORT CARD
      ================================================= */}
      <section className="lead-import-card">
        <div className="lead-import-info">
          {/* <div className="lead-import-badge">Bulk Upload</div> */}
          <h3>Import Leads via Excel</h3>
          <p>
            Upload .xlsx or .xls file. Expected columns: Name, Phone, Email, Company, Source.
          </p>
        </div>

        <div className="lead-import-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="lead-file-input"
          />

          {selectedFile && (
            <div className="lead-selected-file">
              <FileSpreadsheet size={15} />
              <span>{selectedFile.name}</span>
            </div>
          )}

          <button
            type="button"
            className="lead-upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            Choose Excel
          </button>

          <button
            type="button"
            className="lead-import-btn"
            onClick={handleImport}
            disabled={!selectedFile || importing}
          >
            {importing ? "Importing..." : "Import Leads"}
          </button>
        </div>
      </section>

      {/* IMPORT RESULT */}
      {importResult && (
        <section className="lead-import-result">
          <div className="lead-result-stat">
            <span>Total Rows</span>
            <strong>{importResult.totalRows}</strong>
          </div>

          <div className="lead-result-stat success">
            <span>Imported</span>
            <strong>{importResult.imported}</strong>
          </div>

          <div className="lead-result-stat failed">
            <span>Failed</span>
            <strong>{importResult.failed}</strong>
          </div>

          {importResult.failedRows.length > 0 && (
            <div className="lead-failed-rows">
              <strong>Failed Rows</strong>
              {importResult.failedRows.map((item) => (
                <div
                  key={`${item.row}-${item.reason}`}
                  className="lead-failed-row"
                >
                  Row {item.row}: {item.reason}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* =================================================
          DYNAMIC STATS COUNTERS
      ================================================= */}
      <div className="lead-stats-grid">
        <div className="lead-stat-card">
          <div className="lead-stat-label">
            {selectedUserId === "all"
              ? "Total Leads (All Team)"
              : `Total Leads (${selectedUserObj?.name || "User"})`}
          </div>
          <div className="lead-stat-value">{statTotal}</div>
        </div>

        <div className="lead-stat-card">
          <div className="lead-stat-label">Interested</div>
          <div className="lead-stat-value" style={{ color: "#10b981" }}>
            {statInterested}
          </div>
        </div>

        <div className="lead-stat-card">
          <div className="lead-stat-label">Follow Up</div>
          <div className="lead-stat-value" style={{ color: "#f59e0b" }}>
            {statFollowUp}
          </div>
        </div>

        <div className="lead-stat-card">
          <div className="lead-stat-label">No Contact</div>
          <div className="lead-stat-value" style={{ color: "#3b82f6" }}>
            {statNoContact}
          </div>
        </div>
      </div>

      {/* =================================================
          BATCH ACTION BAR
      ================================================= */}
      {selectedIds.length > 0 && (
        <div className="admin-lead-batch-bar">
          <div className="admin-lead-batch-info">
            <span className="admin-lead-batch-badge">{selectedIds.length}</span>
            <span>lead{selectedIds.length > 1 ? "s" : ""} selected</span>
          </div>

          <div className="admin-lead-batch-actions">
            <button
              type="button"
              className="admin-lead-batch-delete-btn"
              onClick={promptBatchDelete}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              Delete Selected ({selectedIds.length})
            </button>

            <button
              type="button"
              className="admin-lead-batch-cancel-btn"
              onClick={clearSelection}
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* ACTIVE USER FILTER BANNER */}
      {selectedUserId !== "all" && (
        <div className="lead-active-user-banner">
          <div className="lead-active-user-info">
            <span className="lead-active-user-badge">Filtered by User</span>
            <div className="lead-active-user-text">
              <strong>{selectedUserObj?.name || "Selected User"}</strong>
              <span>
                Showing {filteredLeads.length} of {userScopedLeads.length} lead{userScopedLeads.length !== 1 ? "s" : ""} ({leads.length} total org leads)
              </span>
            </div>
          </div>
          <button
            type="button"
            className="lead-active-user-clear-btn"
            onClick={handleResetUserFilter}
            title="Reset filter and show all team leads"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <X size={14} />
            <span>View All Team Leads</span>
          </button>
        </div>
      )}

      {/* =================================================
          MAIN MASTER GRID & TABLE CARD
      ================================================= */}
      <section className="lead-table-card">
        {/* RESPONSIVE FILTER BAR */}
        <div className="lead-filter-bar">
          <div className="lead-search">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>

            <input
              type="text"
              placeholder="Search name, phone, email, company, uploader..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="lead-filter-dropdowns">
            <select
              value={statusFilter}
              onChange={(event) => {
                const value = event.target.value as "All" | LeadStatus;
                setStatusFilter(value);
                setSubStatusFilter("All");
              }}
              className="lead-filter-select"
            >
              <option value="All">All Pipeline Stages</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <select
              value={subStatusFilter}
              onChange={(event) =>
                setSubStatusFilter(event.target.value as "All" | LeadSubStatus)
              }
              className="lead-filter-select"
            >
              <option value="All">All Sub-Statuses</option>
              {availableSubStatuses
                .filter((value) => value !== "")
                .map((subStatus) => (
                  <option key={subStatus} value={subStatus}>
                    {subStatus}
                  </option>
                ))}
            </select>

            {(search || statusFilter !== "All" || subStatusFilter !== "All") && (
              <button
                type="button"
                className="lead-clear-btn"
                onClick={clearFilters}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* HEADER SUMMARY ROW */}
        <div className="lead-table-header">
          <div>
            <strong>
              {selectedUserId === "all"
                ? "Organization Leads"
                : `${selectedUserObj?.name || "User"}'s Leads`}
            </strong>
            <span>
              {filteredLeads.length} of {userScopedLeads.length}
              {selectedUserId !== "all" && ` (from ${leads.length} total)`}
            </span>
            {selectedIds.length > 0 && (
              <span style={{ color: "#818cf8", fontWeight: 700 }}>
                • {selectedIds.length} selected
              </span>
            )}
          </div>
        </div>

        {/* LOADING & EMPTY STATES */}
        {loading ? (
          <div className="lead-shimmer-container" aria-label="Loading leads">
            {/* 1. DESKTOP SHIMMER TABLE */}
            <div className="lead-table-wrap lead-shimmer-table-wrap">
              <div className="table-responsive">
                <table className="lead-table">
                  <thead>
                    <tr>
                      <th style={{ width: "42px", textAlign: "center" }}>
                        <div className="lead-shimmer lead-shimmer-checkbox" />
                      </th>
                      <th style={{ width: "50px", textAlign: "center" }}>#</th>
                      <th style={{ width: "260px" }}>Lead & Contact Vector</th>
                      <th style={{ width: "210px" }}>Context & Urgency</th>
                      <th style={{ width: "240px" }}>Chained Pipeline Status</th>
                      <th style={{ width: "200px" }}>Assigned Representative</th>
                      <th style={{ width: "130px", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <tr key={i} className="lead-shimmer-row">
                        <td style={{ textAlign: "center" }}>
                          <div className="lead-shimmer lead-shimmer-checkbox" />
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div className="lead-shimmer lead-shimmer-sr" />
                        </td>
                        <td>
                          <div className="lead-vector-contact">
                            <div className="vector-person-row">
                              <div className="lead-shimmer lead-shimmer-avatar" />
                              <div className="lead-shimmer lead-shimmer-line lead-shimmer-name" />
                            </div>
                            <div className="lead-shimmer lead-shimmer-line lead-shimmer-phone" />
                            <div className="lead-shimmer lead-shimmer-line lead-shimmer-email" />
                          </div>
                        </td>
                        <td>
                          <div className="lead-context-block">
                            <div className="lead-shimmer lead-shimmer-line lead-shimmer-company" />
                            <div className="lead-context-pills">
                              <div className="lead-shimmer lead-shimmer-badge" />
                              <div className="lead-shimmer lead-shimmer-urgency" />
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="lead-shimmer lead-shimmer-status-pill" />
                        </td>
                        <td>
                          <div className="lead-rep-cell">
                            <div className="lead-shimmer lead-shimmer-rep-badge" />
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div
                            className="lead-actions-cell"
                            style={{ justifyContent: "flex-end" }}
                          >
                            <div className="lead-shimmer lead-shimmer-action-btn" />
                            <div className="lead-shimmer lead-shimmer-action-btn" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. MOBILE SHIMMER CARD STREAM */}
            <div className="lead-mobile-card-stream lead-shimmer-card-stream">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="lead-mobile-card lead-shimmer-card">
                  {/* ROW 1: HEADER */}
                  <div className="mobile-card-header">
                    <div className="mobile-card-identity">
                      <div className="lead-shimmer lead-shimmer-checkbox" />
                      <div className="mobile-names-wrap">
                        <div
                          className="lead-shimmer lead-shimmer-line lead-shimmer-name"
                          style={{ width: "130px", height: "16px" }}
                        />
                        <div
                          className="lead-shimmer lead-shimmer-line lead-shimmer-company"
                          style={{
                            width: "90px",
                            height: "12px",
                            marginTop: "4px",
                          }}
                        />
                      </div>
                    </div>
                    <div className="mobile-card-quick-actions">
                      <div className="lead-shimmer lead-shimmer-action-btn" />
                      <div className="lead-shimmer lead-shimmer-action-btn" />
                    </div>
                  </div>

                  {/* ROW 2: CONTACT */}
                  <div className="mobile-card-contact-row">
                    <div
                      className="lead-shimmer lead-shimmer-line"
                      style={{ width: "110px", height: "14px" }}
                    />
                    <div
                      className="lead-shimmer lead-shimmer-line"
                      style={{ width: "160px", height: "13px" }}
                    />
                  </div>

                  {/* ROW 3: BADGES */}
                  <div className="mobile-card-tags-row">
                    <div
                      className="lead-shimmer lead-shimmer-badge"
                      style={{ width: "65px", height: "20px" }}
                    />
                    <div
                      className="lead-shimmer lead-shimmer-badge"
                      style={{ width: "80px", height: "20px" }}
                    />
                  </div>

                  {/* ROW 4: PIPELINE STAGE */}
                  <div className="mobile-card-pipeline-row">
                    <div
                      className="lead-shimmer lead-shimmer-status-pill"
                      style={{ width: "100%", height: "36px" }}
                    />
                  </div>

                  {/* ROW 5: ASSIGNED REP */}
                  <div className="mobile-card-rep-section">
                    <div
                      className="lead-shimmer lead-shimmer-line"
                      style={{ width: "120px", height: "14px" }}
                    />
                    <div
                      className="lead-shimmer lead-shimmer-rep-badge"
                      style={{ width: "95px", height: "28px" }}
                    />
                  </div>

                  {/* ROW 6: FOOTER */}
                  <div className="mobile-card-notes-footer">
                    <div
                      className="lead-shimmer lead-shimmer-line"
                      style={{
                        width: "100%",
                        height: "32px",
                        borderRadius: "10px",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="lead-empty">
            <div className="lead-empty-icon" style={{ display: "inline-flex", justifyContent: "center", alignItems: "center" }}>
              <Users size={44} strokeWidth={1.5} />
            </div>
            <h3>
              {selectedUserId !== "all"
                ? `No leads found for ${selectedUserObj?.name || "this user"}`
                : "No leads found"}
            </h3>
            <p>
              {leads.length === 0
                ? "Import an Excel file to populate leads."
                : selectedUserId !== "all"
                ? "This user does not have any leads matching the current criteria."
                : "Try adjusting your search keywords or pipeline status filters."}
            </p>
            {selectedUserId !== "all" && (
              <button
                type="button"
                className="lead-empty-action-btn"
                onClick={handleResetUserFilter}
              >
                View All Leads
              </button>
            )}
          </div>
        ) : (
          <>
            {/* =============================================
                1. DESKTOP / TABLET MASTER-DETAIL TABLE
                (Fluid width, no 1250px bottleneck)
            ============================================= */}
            <div className="lead-desktop-table-view">
              <table className="lead-master-table">
                <thead>
                  <tr>
                    <th style={{ width: "40px", textAlign: "center" }}>
                      <input
                        ref={selectAllCheckboxRef}
                        type="checkbox"
                        className="lead-checkbox"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        title="Select / Deselect all"
                      />
                    </th>
                    {/* <th style={{ width: "50px", textAlign: "center" }}>#</th> */}
                    <th style={{ width: "260px" }}>Lead & Contact Vector</th>
                    <th style={{ width: "210px" }}>Context & Urgency</th>
                    <th style={{ width: "240px" }}>Chained Pipeline Status</th>
                    <th style={{ width: "200px" }}>Assigned Representative</th>
                    <th style={{ width: "130px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLeads.map((lead) => {
                    const isSelected = selectedIds.includes(lead._id);
                    const urgency = getUrgencyInfo(lead);
                    const uploaderName = getLeadUploaderName(lead.uploadedBy, users);
                    const uploaderEmail = getLeadUploaderEmail(lead.uploadedBy, users);
                    const uploaderRole = getLeadUploaderRole(lead.uploadedBy, users);
                    const uploaderId = getLeadUploaderId(lead.uploadedBy);
                    const isReassignOpen = activeReassignPopoverLeadId === lead._id;

                    return (
                      <tr
                        key={lead._id}
                        className={`${isSelected ? "row-selected" : ""} ${
                          selectedDrawerLead?._id === lead._id ? "row-drawer-active" : ""
                        }`}
                      >
                        {/* 1. SELECTION CHECKBOX */}
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            className="lead-checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(lead._id)}
                          />
                        </td>

                        {/* 2. SR NO */}
                        {/* <td style={{ textAlign: "center" }}>
                          <span className="lead-sr-no">{index + 1}</span>
                        </td> */}

                        {/* 3. CONTACT VECTOR (NAME, PHONE, EMAIL) */}
                        <td>
                          <div className="lead-vector-contact">
                            <div className="vector-person-row">
                              {/* <div
                                className="vector-avatar"
                                style={{
                                  background: getAvatarGradient(lead._id + lead.name),
                                }}
                              >
                                {lead.name?.charAt(0).toUpperCase() || "L"}
                              </div> */}
                              <div className="vector-names-col">
                                <button
                                  type="button"
                                  className="vector-name-link"
                                  onClick={() => setSelectedDrawerLead(lead)}
                                  title="Click to open slide-out detail drawer"
                                >
                                  {lead.name}
                                </button>
                                {lead.email && (
                                  <a
                                    href={`mailto:${lead.email}`}
                                    className="vector-email-link"
                                    title={`Send email to ${lead.email}`}
                                  >
                                    {lead.email}
                                  </a>
                                )}
                              </div>
                            </div>

                            <div className="vector-phone-row">
                              <a
                                href={`tel:${lead.phone}`}
                                className="vector-phone-link"
                                title={`Call ${lead.phone}`}
                                style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                              >
                                <Phone size={12} /> {lead.phone}
                              </a>
                            </div>
                          </div>
                        </td>

                        {/* 4. CONTEXT & URGENCY (COMPANY, SOURCE, URGENCY DOT) */}
                        <td>
                          <div className="lead-vector-context">
                            <div className="context-company-row">
                              <strong className="context-company">
                                {lead.company || "Individual"}
                              </strong>
                            </div>

                            <div className="context-tags-row">
                              {lead.source && (
                                <span className="lead-source-chip">
                                  {lead.source}
                                </span>
                              )}

                              {/* REAL-TIME URGENCY INDICATOR */}
                              <span
                                className={`urgency-badge urgency-${urgency.level}`}
                                title={urgency.text}
                              >
                                <span
                                  className="urgency-dot"
                                  style={{ backgroundColor: urgency.color }}
                                />
                                {urgency.label}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 5. CHAINED PIPELINE STATUS */}
                        <td>
                          <div className="lead-status-column-cell">
                            <LeadStatusBadgePopover
                              currentStatus={lead.status as any}
                              currentSubStatus={lead.subStatus as any}
                              isLoading={updatingId === lead._id}
                              onUpdate={(st, subSt) =>
                                handleUpdateStatus(lead, st, subSt)
                              }
                              size="md"
                              align="left"
                            />
                          </div>
                        </td>

                        {/* 6. REPRESENTATIVE & 1-CLICK REASSIGN */}
                        <td>
                          <div className="lead-rep-cell">
                            <div
                              className="lead-rep-badge-btn"
                              onClick={() =>
                                setActiveReassignPopoverLeadId(
                                  isReassignOpen ? null : lead._id
                                )
                              }
                              title="Click to reassign to another representative"
                              role="button"
                              tabIndex={0}
                            >
                              <div
                                className="lead-rep-avatar"
                                style={{
                                  background: getAvatarGradient(
                                    uploaderId + uploaderName
                                  ),
                                }}
                              >
                                {uploaderName.charAt(0).toUpperCase()}
                              </div>
                              <div className="lead-rep-info">
                                <span className="rep-name">{uploaderName}</span>
                                <span className="rep-sub">
                                  {uploaderRole || uploaderEmail || "Sales Rep"}
                                </span>
                              </div>
                              <span className="rep-reassign-icon" title="Reassign">
                                ⇄
                              </span>
                            </div>

                            {/* REASSIGNMENT POPOVER */}
                            {isReassignOpen && (
                              <div
                                className="lead-reassign-floating-popover"
                                ref={reassignPopoverRef}
                              >
                                <div className="reassign-popover-header">
                                  <span>Reassign Lead</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveReassignPopoverLeadId(null)
                                    }
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                                <div className="reassign-popover-list">
                                  {users
                                    .filter((u) => u.status !== "inactive")
                                    .map((user) => {
                                      const isCurr = user._id === uploaderId;
                                      return (
                                        <button
                                          key={user._id}
                                          type="button"
                                          disabled={isReassigning || isCurr}
                                          className={`reassign-user-item ${
                                            isCurr ? "active-assigned" : ""
                                          }`}
                                          onClick={() =>
                                            handleReassignLead(lead._id, user._id)
                                          }
                                        >
                                          <span className="rep-avatar-sm">
                                            {user.name.charAt(0).toUpperCase()}
                                          </span>
                                          <div className="rep-user-info-sm">
                                            <strong>{user.name}</strong>
                                            <small>
                                              {user.jobPosition || user.role}
                                            </small>
                                          </div>
                                          {isCurr && (
                                            <span className="assigned-tag">
                                              Current
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 7. ACTIONS & NOTES DRAWER TRIGGER */}
                        <td style={{ textAlign: "right" }}>
                          <div className="lead-row-actions-group">
                            {/* SLIDE-OUT DRAWER BUTTON */}
                            <button
                              type="button"
                              className={`lead-drawer-trigger-btn ${
                                lead.notes && lead.notes.trim() ? "has-notes" : ""
                              }`}
                              onClick={() => setSelectedDrawerLead(lead)}
                              title={
                                lead.notes ? lead.notes : "Open Slide Drawer & Notes"
                              }
                            >
                              <span className="drawer-btn-icon" style={{ display: "inline-flex", alignItems: "center" }}>
                                <FileText size={14} />
                              </span>
                              <span className="drawer-btn-label">
                                {lead.notes && lead.notes.trim() ? "Notes" : "Drawer"}
                              </span>
                            </button>

                            {/* QUICK CALL */}
                            {/* <a
                              href={`tel:${lead.phone}`}
                              className="lead-quick-call-btn"
                              title={`Direct Call: ${lead.phone}`}
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                              </svg>
                            </a> */}

                            {/* DELETE BUTTON */}
                            <button
                              type="button"
                              className="admin-lead-row-delete-btn"
                              onClick={() => promptSingleDelete(lead._id)}
                              title="Delete this lead"
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M3 6h18" />
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* =============================================
                2. MOBILE TOUCH-FRIENDLY CARD STREAM
                (Shown automatically on <= 768px viewport)
            ============================================= */}
            <div className="lead-mobile-card-stream">
              {filteredLeads.map((lead) => {
                const isSelected = selectedIds.includes(lead._id);
                const urgency = getUrgencyInfo(lead);
                const uploaderName = getLeadUploaderName(lead.uploadedBy, users);
                const isReassignOpen = activeReassignPopoverLeadId === lead._id;

                return (
                  <div
                    key={lead._id}
                    className={`lead-mobile-card ${isSelected ? "selected" : ""}`}
                  >
                    {/* ROW 1: HEADER (CHECKBOX, SR NO, AVATAR, NAME, COMPANY & DELETE BUTTON) */}
                    <div className="mobile-card-header">
                      <div className="mobile-card-identity">
                        <input
                          type="checkbox"
                          className="lead-checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(lead._id)}
                        />
                        {/* <span className="mobile-sr-badge">#{index + 1}</span> */}
                        {/* <div
                          className="mobile-avatar"
                          style={{
                            background: getAvatarGradient(lead._id + lead.name),
                          }}
                        >
                          {lead.name.charAt(0).toUpperCase()}
                        </div> */}
                        <div className="mobile-names-wrap">
                          <button
                            type="button"
                            className="mobile-lead-name-btn"
                            onClick={() => setSelectedDrawerLead(lead)}
                            title="Open Lead Drawer"
                          >
                            {lead.name}
                          </button>
                          {lead.company && (
                            <span className="mobile-lead-company">
                              {lead.company}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="mobile-delete-btn"
                        onClick={() => promptSingleDelete(lead._id)}
                        title="Delete Lead"
                        aria-label="Delete Lead"
                        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* ROW 2: CONTACT INFORMATION WITH DEDICATED QUICK CTAS */}
                    <div className="mobile-card-contact-box">
                      <div className="mobile-contact-item">
                        <div className="mobile-contact-info">
                          <span className="mobile-contact-label">Phone</span>
                          <a href={`tel:${lead.phone}`} className="mobile-phone-link">
                            {lead.phone}
                          </a>
                        </div>
                      </div>

                      {lead.email && (
                        <div className="mobile-contact-item">
                          <div className="mobile-contact-info">
                            <span className="mobile-contact-label">Email</span>
                            <a href={`mailto:${lead.email}`} className="mobile-email-link">
                              {lead.email}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ROW 3: SOURCE & REAL-TIME URGENCY PILLS */}
                    <div className="mobile-card-tags-row">
                      {lead.source && (
                        <span className="mobile-source-tag" style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                          <MapPin size={11} /> {lead.source}
                        </span>
                      )}
                      <span
                        className={`urgency-badge urgency-${urgency.level}`}
                        title={urgency.text}
                      >
                        <span
                          className="urgency-dot"
                          style={{ backgroundColor: urgency.color }}
                        />
                        {urgency.label}
                      </span>
                    </div>

                    {/* ROW 4: PIPELINE STAGE (CHAINED STATUS BADGE) */}
                    <div className="mobile-card-pipeline-row">
                      {/* <span className="mobile-section-label">Pipeline Stage</span> */}
                      <div className="mobile-status-container">
                        <LeadStatusBadgePopover
                          currentStatus={lead.status as any}
                          currentSubStatus={lead.subStatus as any}
                          isLoading={updatingId === lead._id}
                          onUpdate={(st, subSt) =>
                            handleUpdateStatus(lead, st, subSt)
                          }
                          size="md"
                          align="left"
                        />
                      </div>
                    </div>

                    {/* ROW 5: ASSIGNED FIELD REPRESENTATIVE */}
                    <div className="mobile-card-rep-section">
                      <div className="mobile-rep-left">
                        <span className="mobile-section-label">Assigned:</span>
                        <div className="mobile-rep-name-group">
                          <strong className="mobile-rep-name">{uploaderName}</strong>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="mobile-reassign-btn"
                        onClick={() =>
                          setActiveReassignPopoverLeadId(
                            isReassignOpen ? null : lead._id
                          )
                        }
                        style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                      >
                        {isReassignOpen ? (
                          <>
                            <span>Close</span>
                            <X size={12} />
                          </>
                        ) : (
                          <>
                            <span>Reassign</span>
                            <ArrowRightLeft size={12} />
                          </>
                        )}
                      </button>
                    </div>

                    {/* MOBILE REASSIGNMENT LIST PANEL */}
                    {isReassignOpen && (
                      <div className="mobile-reassign-panel">
                        <span className="panel-title">Choose Representative:</span>
                        <div className="mobile-reassign-list">
                          {users
                            .filter((u) => u.status !== "inactive")
                            .map((user) => (
                              <button
                                key={user._id}
                                type="button"
                                disabled={isReassigning}
                                className="mobile-reassign-option"
                                onClick={() =>
                                  handleReassignLead(lead._id, user._id)
                                }
                              >
                                <div className="opt-meta">
                                  <strong>{user.name}</strong>
                                  <small>{user.jobPosition || user.role}</small>
                                </div>
                                <span className="opt-action" style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                                  Assign <ArrowRight size={12} />
                                </span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* ROW 6: NOTES & SLIDE-OUT DRAWER TRIGGER */}
                    {/* <div
                      className="mobile-card-notes-footer"
                      onClick={() => setSelectedDrawerLead(lead)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="notes-left">
                        <span className="notes-icon" style={{ display: "inline-flex", alignItems: "center" }}>
                          <FileText size={14} />
                        </span>
                        <span className="notes-snippet">
                          {lead.notes && lead.notes.trim()
                            ? lead.notes
                            : "Tap to open details & notes..."}
                        </span>
                      </div>
                      <span className="notes-arrow">→</span>
                    </div> */}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* =================================================
          RIGHT-SIDE SLIDE-OUT DRAWER (MOBILE BOTTOM SHEET)
      ================================================= */}
      <LeadSlideDrawer
        lead={selectedDrawerLead}
        isOpen={!!selectedDrawerLead}
        onClose={() => setSelectedDrawerLead(null)}
        onSaveNotes={handleSaveNotes}
        onUpdateStatus={(l, st, subSt) => handleUpdateStatus(l as any, st, subSt)}
        users={users}
        onReassign={handleReassignLead}
        isAdmin={true}
      />

      {/* =================================================
          CONFIRM DELETE MODAL
      ================================================= */}
      {showConfirmDeleteModal &&
        createPortal(
          <div className="lead-modal-overlay">
            <div className="lead-modal-box">
              <div className="lead-modal-header danger">
                <div className="lead-modal-icon-danger">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div>
                  <h3>
                    Delete {targetDeleteIds.length} Lead
                    {targetDeleteIds.length > 1 ? "s" : ""}?
                  </h3>
                  <p>This action will permanently remove the lead(s).</p>
                </div>
              </div>

              <div className="lead-modal-body">
                <p className="lead-modal-desc">
                  You are about to delete{" "}
                  <strong>{targetDeleteIds.length}</strong> lead
                  {targetDeleteIds.length > 1 ? "s" : ""}. A permanent audit entry
                  with a timestamp, your user account details, and full deleted lead
                  data will be stored in the deletion history.
                </p>

                <div className="lead-delete-preview-list">
                  {targetLeadsList.slice(0, 5).map((l) => (
                    <div key={l._id} className="lead-preview-item">
                      <span className="lead-preview-name">{l.name}</span>
                      <span className="lead-preview-phone">{l.phone}</span>
                      {l.company && (
                        <span className="lead-preview-company">({l.company})</span>
                      )}
                    </div>
                  ))}
                  {targetLeadsList.length > 5 && (
                    <div className="lead-preview-more">
                      + {targetLeadsList.length - 5} more leads
                    </div>
                  )}
                </div>
              </div>

              <div className="lead-modal-footer">
                <button
                  type="button"
                  className="lead-modal-btn cancel"
                  onClick={() => {
                    setShowConfirmDeleteModal(false);
                    setTargetDeleteIds([]);
                  }}
                  disabled={isDeleting}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="lead-modal-btn confirm-delete"
                  onClick={confirmExecutionDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Yes, Delete Permanently"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* =================================================
          DELETION HISTORY (AUDIT TRAIL) MODAL
      ================================================= */}
      {showHistoryModal &&
        createPortal(
          <div className="lead-modal-overlay">
            <div className="lead-modal-box large">
              <div className="lead-modal-header">
                <div className="lead-modal-icon-info">
                  <svg
                    width="22"
                    height="22"
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
                <div>
                  <h3>Lead Deletion Audit Trail</h3>
                  <p>Comprehensive logs of who deleted leads, timestamp, and deleted details</p>
                </div>
                <button
                  type="button"
                  className="lead-modal-close-btn"
                  onClick={() => setShowHistoryModal(false)}
                >
                  ×
                </button>
              </div>

              <div className="lead-modal-body history-body">
                {loadingLogs ? (
                  <div className="lead-history-loading" style={{ padding: "12px 0" }}>
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="lead-shimmer"
                        style={{
                          height: "56px",
                          borderRadius: "12px",
                          marginBottom: "12px",
                        }}
                      />
                    ))}
                  </div>
                ) : deletionLogs.length === 0 ? (
                  <div className="lead-history-empty">
                    <svg
                      width="44"
                      height="44"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#9ca3af"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <h4>No Deletion Logs</h4>
                    <p>No leads have been deleted yet.</p>
                  </div>
                ) : (
                  <div className="lead-history-list">
                    {deletionLogs.map((log) => {
                      const isExpanded = expandedLogId === log._id;

                      return (
                        <div key={log._id} className="lead-history-card">
                          <div
                            className="lead-history-card-header"
                            onClick={() =>
                              setExpandedLogId(isExpanded ? null : log._id)
                            }
                          >
                            <div className="lead-history-meta">
                              <div className="lead-history-user">
                                <span className="lead-user-avatar">
                                  {log.deletedByName
                                    ? log.deletedByName.charAt(0).toUpperCase()
                                    : "U"}
                                </span>
                                <div>
                                  <strong>{log.deletedByName}</strong>
                                  <span className="lead-user-email">
                                    {log.deletedByEmail}
                                  </span>
                                </div>
                                <span className={`lead-role-tag ${log.deletedByRole}`}>
                                  {log.deletedByRole}
                                </span>
                              </div>

                              <div className="lead-history-time">
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <circle cx="12" cy="12" r="10" />
                                  <polyline points="12 6 12 12 16 14" />
                                </svg>
                                <span>{formatTimestamp(log.deletedAt)}</span>
                              </div>
                            </div>

                            <div className="lead-history-actions-col">
                              <span className="lead-count-badge">
                                {log.count} Lead{log.count > 1 ? "s" : ""} Deleted
                              </span>
                              <button
                                type="button"
                                className="lead-history-toggle-btn"
                              >
                                {isExpanded ? "Hide Details ▲" : "View Deleted Items ▼"}
                              </button>
                            </div>
                          </div>

                          {/* EXPANDED DETAILS */}
                          {isExpanded && (
                            <div className="lead-history-details">
                              <div className="lead-history-details-title">
                                Deleted Leads Breakdown ({log.deletedLeads.length})
                              </div>
                              <div className="lead-history-table-wrapper">
                                <table className="lead-history-table">
                                  <thead>
                                    <tr>
                                      <th>#</th>
                                      <th>Lead Name</th>
                                      <th>Phone</th>
                                      <th>Email</th>
                                      <th>Company</th>
                                      <th>Source</th>
                                      <th>Previous Status</th>
                                      <th>Notes</th>
                                      <th>Original Uploader</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {log.deletedLeads.map((item, idx) => (
                                      <tr key={`${log._id}-${idx}`}>
                                        <td>{idx + 1}</td>
                                        <td>
                                          <strong>{item.name}</strong>
                                        </td>
                                        <td>{item.phone}</td>
                                        <td>{item.email || "—"}</td>
                                        <td>{item.company || "—"}</td>
                                        <td>{item.source || "—"}</td>
                                        <td>
                                          <span className="lead-status-pill">
                                            {item.status}
                                            {item.subStatus ? ` / ${item.subStatus}` : ""}
                                          </span>
                                        </td>
                                        <td>
                                          {item.notes ? (
                                            <span className="lead-deleted-notes-preview" title={item.notes}>
                                              {item.notes.length > 25 ? `${item.notes.slice(0, 25)}...` : item.notes}
                                            </span>
                                          ) : (
                                            "—"
                                          )}
                                        </td>
                                        <td>{item.uploadedByName || "—"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="lead-modal-footer">
                <button
                  type="button"
                  className="lead-modal-btn cancel"
                  onClick={() => setShowHistoryModal(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="lead-modal-btn secondary"
                  onClick={fetchDeletionLogs}
                  disabled={loadingLogs}
                >
                  {loadingLogs ? "Refreshing..." : "Refresh Logs"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default AdminLeads;
