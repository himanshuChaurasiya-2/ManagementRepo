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
import "./Adminlead.css";

// =====================================================
// TYPES
// =====================================================

type LeadStatus =
  | "Interested"
  | "Not Interested"
  | "No Contact"
  | "Follow up"
  | "Junk";

type LeadSubStatus =
  | "Hot"
  | "Warm"
  | "Cold"
  | "Pricing Issue"
  | "Not Required"
  | "Evaluating Competitors"
  | "Ring Not Received"
  | "Switched Off"
  | "Incoming Not Available"
  | "Call Me Later"
  | "Call Disconnected"
  | "";

interface UploadedBy {
  _id?: string;
  name?: string;
  email?: string;
}

interface Lead {
  _id: string;
  srNo?: number;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  source?: string;

  // Backend may return empty/undefined for newly imported leads
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

const API_URL = "http://localhost:5000/api";

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

  // Notes Modal State
  const [activeNotesLead, setActiveNotesLead] = useState<Lead | null>(null);
  const [notesText, setNotesText] = useState<string>("");
  const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null);

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
  // VALID STATUS HELPERS
  // ===================================================

  const isValidStatus = (value: unknown): value is LeadStatus => {
    return typeof value === "string" && statuses.includes(value as LeadStatus);
  };

  const getSafeStatus = (status?: LeadStatus | ""): LeadStatus | "" => {
    if (isValidStatus(status)) {
      return status;
    }
    return "";
  };

  const getSafeSubStatuses = (status?: LeadStatus | ""): LeadSubStatus[] => {
    if (!isValidStatus(status)) {
      return [];
    }
    return subStatusMap[status] ?? [];
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

    // 1. Initialize from users list
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

    // 2. Also register any uploader found in leads that might not be in users list
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

    // Unassigned tracker
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

    // 3. Aggregate lead counts into each user's stats
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

    // Sort by total leads descending, then by name
    return list.sort(
      (a, b) => b.totalLeads - a.totalLeads || a.name.localeCompare(b.name)
    );
  }, [users, leads]);

  // Filtered list of user cards according to user search bar
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

  // Active selected user object
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
  // SCOPED LEADS (FOR SELECTED USER METRICS)
  // ===================================================

  const userScopedLeads = useMemo(() => {
    if (selectedUserId === "all") return leads;
    return leads.filter((lead) => {
      const uploaderId = getLeadUploaderId(lead.uploadedBy);
      if (selectedUserId === "unassigned") {
        return uploaderId === "unassigned" || !lead.uploadedBy;
      }
      if (uploaderId === selectedUserId) return true;

      // Also check fallback matching
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

  // Dynamic statistics
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
  // UPDATE STATUS
  // ===================================================

  const updateStatus = async (lead: Lead, status: LeadStatus) => {
    try {
      setUpdatingId(lead._id);
      setError("");
      setSuccess("");

      const safeSubStatuses: LeadSubStatus[] = subStatusMap[status] ?? [];
      const defaultSubStatus: LeadSubStatus =
        status === "Junk" ? "" : safeSubStatuses[0] ?? "";

      const response = await axios.patch(
        `${API_URL}/leads/${lead._id}/status`,
        {
          status,
          subStatus: defaultSubStatus,
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
                subStatus: defaultSubStatus,
              }
            : item
        )
      );

      setSuccess("Lead status updated successfully.");
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
  // UPDATE SUB STATUS
  // ===================================================

  const updateSubStatus = async (lead: Lead, subStatus: LeadSubStatus) => {
    const currentStatus = getSafeStatus(lead.status);

    if (!currentStatus) {
      setError("Please select a status first.");
      return;
    }

    if (
      currentStatus !== "Junk" &&
      !getSafeSubStatuses(currentStatus).includes(subStatus)
    ) {
      setError("Invalid sub-status selected.");
      return;
    }

    try {
      setUpdatingId(lead._id);
      setError("");
      setSuccess("");

      const response = await axios.patch(
        `${API_URL}/leads/${lead._id}/status`,
        {
          status: currentStatus,
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
                status: currentStatus,
                subStatus,
              }
            : item
        )
      );

      setSuccess("Lead sub-status updated successfully.");
      setTimeout(() => {
        setSuccess("");
      }, 2500);
    } catch (err: any) {
      console.error("Update lead sub-status error:", err);
      setError(
        err?.response?.data?.message || "Failed to update lead sub-status."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // ===================================================
  // NOTES HANDLERS
  // ===================================================

  const handleOpenNotes = (lead: Lead) => {
    setActiveNotesLead(lead);
    setNotesText(lead.notes || "");
  };

  const handleCloseNotes = () => {
    if (isSavingNotes) return;
    setActiveNotesLead(null);
    setNotesText("");
  };

  const handleInsertTimestamp = () => {
    const now = new Date();
    const formatted = `[${now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })} ${now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })}] `;
    setNotesText((prev) => (prev ? `${prev}\n${formatted}` : formatted));
  };

  const handleSaveNotes = async () => {
    if (!activeNotesLead) return;
    try {
      setIsSavingNotes(true);
      setError("");

      const response = await axios.patch(
        `${API_URL}/leads/${activeNotesLead._id}/notes`,
        { notes: notesText },
        getAuthConfig()
      );

      const updatedLead = response.data?.lead;

      setLeads((previous) =>
        previous.map((item) =>
          item._id === activeNotesLead._id
            ? { ...item, notes: updatedLead?.notes ?? notesText }
            : item
        )
      );

      setSuccess("Lead notes saved successfully.");
      setTimeout(() => {
        setSuccess("");
      }, 2500);
      handleCloseNotes();
    } catch (err: any) {
      console.error("Save lead notes error:", err);
      setError(err?.response?.data?.message || "Failed to save lead notes.");
    } finally {
      setIsSavingNotes(false);
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
      setSuccess("");
      setImportResult(null);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await axios.post(
        `${API_URL}/leads/import-excel`,
        formData,
        getAuthConfig()
      );

      const result: ImportResult = response.data;
      setImportResult(result);

      if (result.imported > 0) {
        setSuccess(
          `${result.imported} lead${result.imported > 1 ? "s" : ""} imported successfully.`
        );
      }

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await fetchLeads();
    } catch (err: any) {
      console.error("Excel import error:", err);
      setError(
        err?.response?.data?.message || "Failed to import leads from Excel."
      );
    } finally {
      setImporting(false);
    }
  };

  // ===================================================
  // CLEAR FILTERS
  // ===================================================

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setSubStatusFilter("All");
  };

  const handleResetUserFilter = () => {
    setSelectedUserId("all");
  };

  // ===================================================
  // STATUS CLASS & FORMATTING
  // ===================================================

  const getStatusClass = (status?: LeadStatus | "") => {
    switch (status) {
      case "Interested":
        return "lead-status interested";
      case "Not Interested":
        return "lead-status not-interested";
      case "No Contact":
        return "lead-status no-contact";
      case "Follow up":
        return "lead-status follow-up";
      case "Junk":
        return "lead-status junk";
      default:
        return "lead-status";
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return "—";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const targetLeadsList = leads.filter((lead) =>
    targetDeleteIds.includes(lead._id)
  );

  // Overall counts for Master card
  const totalAllInterested = leads.filter((l) => l.status === "Interested").length;
  const totalAllFollowUp = leads.filter((l) => l.status === "Follow up").length;
  const totalAllNoContact = leads.filter((l) => l.status === "No Contact").length;

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="lead-page">
      {/* =================================================
          PAGE HEADER
      ================================================= */}
      <div className="lead-page-header">
        <div>
          <div className="lead-breadcrumb">Admin / Lead Management</div>
          <h1>Leads</h1>
          <p>Manage, track, analyze by team user, and batch audit all sales leads.</p>
        </div>

        <div className="lead-header-actions">
          <button
            type="button"
            className="lead-history-btn"
            onClick={openHistoryModal}
            title="View Deletion Audit Log"
          >
            <svg
              width="17"
              height="17"
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
          >
            <svg
              className={loading || loadingUsers ? "lead-spin-icon" : ""}
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4" />
              <path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4" />
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
          <span>⚠</span>
          {error}
          <button type="button" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="lead-alert lead-alert-success">
          <span>✓</span>
          {success}
        </div>
      )}

      {/* =================================================
          USER CARDS SECTION (TEAM PERFORMANCE & SELECTION)
      ================================================= */}
      <section className="lead-users-section">
        <div className="lead-users-header">
          <div className="lead-users-title-group">
            <div className="lead-users-icon">
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
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <div className="lead-users-heading-wrap">
                <h3>Sales Team Lead Breakdown</h3>
                <span className="lead-users-count-tag">
                  {userStatsList.length} Rep{userStatsList.length !== 1 ? "s" : ""}
                </span>
              </div>
              <p>Click any user card below to separately view and manage their assigned leads.</p>
            </div>
          </div>

          <div className="lead-users-controls">
            <div className="lead-users-search">
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
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Find sales rep..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
              />
              {userSearchQuery && (
                <button
                  type="button"
                  className="lead-users-search-clear"
                  onClick={() => setUserSearchQuery("")}
                >
                  ✕
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

        {/* User Cards Scroll / Grid Container */}
        <div className="lead-users-track">
          {/* 1. MASTER CARD: ALL TEAM LEADS */}
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

          {/* 2. INDIVIDUAL USER CARDS */}
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
                  {(user.notInterested > 0 || user.junk > 0) && (
                    <span
                      className="lead-capsule other"
                      title={`${user.notInterested + user.junk} Closed/Junk leads`}
                    >
                      <span className="lead-capsule-label">Closed/Junk</span>
                      <span className="lead-capsule-count">
                        {user.notInterested + user.junk}
                      </span>
                    </span>
                  )}
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

          {filteredUserCards.length === 0 && userSearchQuery && (
            <div className="lead-user-search-empty">
              <span>🔍</span>
              <p>No team members matching &ldquo;{userSearchQuery}&rdquo;</p>
              <button
                type="button"
                onClick={() => setUserSearchQuery("")}
                className="lead-user-clear-search-btn"
              >
                Clear Search
              </button>
            </div>
          )}
        </div>
      </section>

      {/* =================================================
          EXCEL IMPORT
      ================================================= */}
      <section className="lead-import-card">
        <div className="lead-import-info">
          <div className="lead-import-icon">
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
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="M8 13h8" />
              <path d="M8 17h8" />
            </svg>
          </div>

          <div>
            <h3>Import Leads</h3>
            <p>
              Upload an Excel file containing Name and Phone. Optional columns:
              Sr No, Email, Company and Source.
            </p>
          </div>
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
              <span>📄</span>
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

      {/* =================================================
          IMPORT RESULT
      ================================================= */}
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
          STATISTICS (DYNAMIC BASED ON SELECTED USER)
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
          <div className="lead-stat-value" style={{ color: "#059669" }}>
            {statInterested}
          </div>
        </div>

        <div className="lead-stat-card">
          <div className="lead-stat-label">Follow Up</div>
          <div className="lead-stat-value" style={{ color: "#d97706" }}>
            {statFollowUp}
          </div>
        </div>

        <div className="lead-stat-card">
          <div className="lead-stat-label">No Contact</div>
          <div className="lead-stat-value" style={{ color: "#2563eb" }}>
            {statNoContact}
          </div>
        </div>
      </div>

      {/* =================================================
          BATCH ACTION BAR (WHEN LEADS SELECTED)
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

      {/* =================================================
          ACTIVE USER FILTER BANNER
      ================================================= */}
      {selectedUserId !== "all" && (
        <div className="lead-active-user-banner">
          <div className="lead-active-user-info">
            <span className="lead-active-user-badge">Filtered by User</span>
            <div className="lead-active-user-text">
              <strong>{selectedUserObj?.name || "Selected User"}</strong>
              <span>
                Showing {filteredLeads.length} of {userScopedLeads.length} lead{userScopedLeads.length !== 1 ? "s" : ""} uploaded by this user ({leads.length} total team leads)
              </span>
            </div>
          </div>
          <button
            type="button"
            className="lead-active-user-clear-btn"
            onClick={handleResetUserFilter}
            title="Reset filter and show all team leads"
          >
            <span>✕</span> View All Team Leads
          </button>
        </div>
      )}

      {/* =================================================
          FILTER BAR
      ================================================= */}
      <section className="lead-table-card">
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

          <select
            value={statusFilter}
            onChange={(event) => {
              const value = event.target.value as "All" | LeadStatus;
              setStatusFilter(value);
              setSubStatusFilter("All");
            }}
            className="lead-filter-select"
          >
            <option value="All">All Status</option>
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
            <option value="All">All Sub Status</option>
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

        {/* =================================================
            TABLE HEADER INFO
        ================================================= */}
        <div className="lead-table-header">
          <div>
            <strong>
              {selectedUserId === "all"
                ? "All Team Leads"
                : `${selectedUserObj?.name || "User"}'s Leads`}
            </strong>
            <span>
              {filteredLeads.length} of {userScopedLeads.length}
              {selectedUserId !== "all" && ` (from ${leads.length} total)`}
            </span>
            {selectedIds.length > 0 && (
              <span style={{ color: "#2563eb", fontWeight: 600 }}>
                • {selectedIds.length} selected
              </span>
            )}
          </div>
        </div>

        {/* =================================================
            TABLE
        ================================================= */}
        <div className="lead-table-wrapper">
          {loading ? (
            <div className="lead-loading">
              <div className="lead-spinner" />
              <span>Loading leads...</span>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="lead-empty">
              <div className="lead-empty-icon">👥</div>
              <h3>
                {selectedUserId !== "all"
                  ? `No leads found for ${selectedUserObj?.name || "this user"}`
                  : "No leads found"}
              </h3>
              <p>
                {leads.length === 0
                  ? "Import an Excel file to add leads."
                  : selectedUserId !== "all"
                  ? "This user does not have any leads matching the current criteria."
                  : "Try changing your search or filters."}
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
            <table className="lead-table">
              <thead>
                <tr>
                  <th style={{ width: "42px", textAlign: "center" }}>
                    <input
                      ref={selectAllCheckboxRef}
                      type="checkbox"
                      className="lead-checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      title="Select / Deselect all"
                    />
                  </th>
                  <th>Sr. No.</th>
                  <th>Lead</th>
                  <th>Contact</th>
                  <th>Company</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Sub Status</th>
                  <th style={{ minWidth: "160px" }}>Notes</th>
                  <th>Uploaded By / User</th>
                  <th>Created</th>
                  <th style={{ width: "60px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredLeads.map((lead, index) => {
                  const safeStatus = getSafeStatus(lead.status);
                  const subStatuses = getSafeSubStatuses(lead.status);
                  const isUpdating = updatingId === lead._id;
                  const isSelected = selectedIds.includes(lead._id);

                  const safeSubStatus =
                    lead.subStatus && subStatuses.includes(lead.subStatus)
                      ? lead.subStatus
                      : "";

                  const uploaderName = getLeadUploaderName(lead.uploadedBy, users);
                  const uploaderEmail = getLeadUploaderEmail(lead.uploadedBy, users);
                  const uploaderRole = getLeadUploaderRole(lead.uploadedBy, users);
                  const uploaderId = getLeadUploaderId(lead.uploadedBy);

                  return (
                    <tr
                      key={lead._id}
                      className={isSelected ? "row-selected" : ""}
                    >
                      {/* CHECKBOX */}
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          className="lead-checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(lead._id)}
                        />
                      </td>

                      {/* SR NO */}
                      <td>
                        <span className="lead-sr-no">{index + 1}</span>
                      </td>

                      {/* NAME */}
                      <td>
                        <div className="lead-person">
                          <div className="lead-avatar">
                            {lead.name?.charAt(0).toUpperCase() || "L"}
                          </div>
                          <div>
                            <strong>{lead.name}</strong>
                            {lead.email && <small>{lead.email}</small>}
                          </div>
                        </div>
                      </td>

                      {/* CONTACT */}
                      <td>
                        <a href={`tel:${lead.phone}`} className="lead-phone">
                          {lead.phone}
                        </a>
                      </td>

                      {/* COMPANY */}
                      <td>{lead.company || "—"}</td>

                      {/* SOURCE */}
                      <td>{lead.source || "—"}</td>

                      {/* STATUS */}
                      <td>
                        <div className="lead-status-wrapper">
                          <select
                            value={safeStatus}
                            disabled={isUpdating}
                            className={getStatusClass(safeStatus)}
                            onChange={(event) => {
                              const selectedStatus = event.target
                                .value as LeadStatus;
                              if (isValidStatus(selectedStatus)) {
                                updateStatus(lead, selectedStatus);
                              }
                            }}
                          >
                            <option value="" disabled>
                              Select Status
                            </option>
                            {statuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* SUB STATUS */}
                      <td>
                        <select
                          value={safeStatus === "Junk" ? "" : safeSubStatus}
                          disabled={
                            isUpdating ||
                            safeStatus === "" ||
                            safeStatus === "Junk"
                          }
                          className="lead-substatus-select"
                          onChange={(event) => {
                            const selectedSubStatus = event.target
                              .value as LeadSubStatus;
                            if (selectedSubStatus !== "") {
                              updateSubStatus(lead, selectedSubStatus);
                            }
                          }}
                        >
                          {safeStatus === "Junk" ? (
                            <option value="">—</option>
                          ) : (
                            <>
                              <option value="" disabled>
                                {safeStatus === ""
                                  ? "Select Status First"
                                  : "Select Sub Status"}
                              </option>
                              {subStatuses
                                .filter((subStatus) => subStatus !== "")
                                .map((subStatus) => (
                                  <option key={subStatus} value={subStatus}>
                                    {subStatus}
                                  </option>
                                ))}
                            </>
                          )}
                        </select>
                      </td>

                      {/* NOTES */}
                      <td>
                        <div className="lead-notes-cell">
                          {lead.notes && lead.notes.trim() ? (
                            <button
                              type="button"
                              className="lead-note-badge"
                              onClick={() => handleOpenNotes(lead)}
                              title={lead.notes}
                            >
                              <span className="lead-note-icon">📝</span>
                              <span className="lead-note-snippet">
                                {lead.notes.length > 28
                                  ? `${lead.notes.slice(0, 28)}...`
                                  : lead.notes}
                              </span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="lead-add-note-btn"
                              onClick={() => handleOpenNotes(lead)}
                              title="Add a note to this lead"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                              </svg>
                              <span>Add Note</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* UPLOADER / USER DETAILS */}
                      <td>
                        <div
                          className="lead-uploader-clickable"
                          onClick={() => {
                            if (uploaderId && uploaderId !== "unassigned") {
                              setSelectedUserId(uploaderId);
                            }
                          }}
                          title={`Filter leads by ${uploaderName}${uploaderEmail ? ` (${uploaderEmail})` : ""}`}
                        >
                          <span className="lead-uploader-avatar-mini">
                            {uploaderName.charAt(0).toUpperCase()}
                          </span>
                          <div className="lead-uploader-info-col">
                            <strong className="lead-uploader-name">{uploaderName}</strong>
                            {uploaderEmail ? (
                              <span className="lead-uploader-sub">{uploaderEmail}</span>
                            ) : uploaderRole ? (
                              <span className="lead-uploader-sub">{uploaderRole}</span>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* CREATED */}
                      <td>
                        <span className="lead-date">
                          {formatDate(lead.createdAt)}
                        </span>
                      </td>

                      {/* SINGLE DELETE */}
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          className="admin-lead-row-delete-btn"
                          onClick={() => promptSingleDelete(lead._id)}
                          title="Delete this lead"
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
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* =================================================
          LEAD NOTES MODAL
      ================================================= */}
      {activeNotesLead &&
        createPortal(
          <div
            className="lead-modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSavingNotes) handleCloseNotes();
            }}
          >
            <div className="lead-modal-box lead-notes-modal-box" onClick={(e) => e.stopPropagation()}>
              <div className="lead-modal-header">
                <div className="lead-notes-header-left">
                  <div className="lead-notes-icon-wrapper">
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
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </div>
                  <div>
                    <div className="lead-notes-title-row">
                      <h3>Lead Notes</h3>
                      <span className="lead-notes-badge-tag">
                        {activeNotesLead.name}
                      </span>
                    </div>
                    <p>
                      Notes are recorded directly on the dashboard and not imported by Excel.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="lead-modal-close-btn"
                  onClick={handleCloseNotes}
                  disabled={isSavingNotes}
                  title="Close notes"
                  aria-label="Close"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="lead-modal-body">
                {/* LEAD QUICK CONTEXT BAR */}
                <div className="lead-notes-context-bar">
                  <div className="lead-notes-context-item">
                    <span className="label">Contact</span>
                    <strong>{activeNotesLead.phone}</strong>
                  </div>
                  {activeNotesLead.company && (
                    <div className="lead-notes-context-item">
                      <span className="label">Company</span>
                      <strong>{activeNotesLead.company}</strong>
                    </div>
                  )}
                  {activeNotesLead.email && (
                    <div className="lead-notes-context-item">
                      <span className="label">Email</span>
                      <strong>{activeNotesLead.email}</strong>
                    </div>
                  )}
                  <div className="lead-notes-context-item">
                    <span className="label">Status</span>
                    <span className={`lead-status-pill ${getSafeStatus(activeNotesLead.status).toLowerCase().replace(/\s+/g, "-")}`}>
                      {getSafeStatus(activeNotesLead.status) || "Select"}
                    </span>
                  </div>
                </div>

                {/* TEXTAREA CONTROLS */}
                <div className="lead-notes-editor-header">
                  <span className="lead-notes-editor-label">Note Content</span>
                  <div className="lead-notes-editor-actions">
                    <button
                      type="button"
                      className="lead-timestamp-btn"
                      onClick={handleInsertTimestamp}
                      title="Insert current date & time stamp"
                    >
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
                      + Timestamp
                    </button>
                    {notesText && (
                      <button
                        type="button"
                        className="lead-clear-note-text-btn"
                        onClick={() => setNotesText("")}
                        title="Clear note text"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  className="lead-notes-textarea"
                  placeholder="Write lead notes, follow-up remarks, meeting takeaways, requirements, or next steps here..."
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  rows={7}
                  autoFocus
                />

                <div className="lead-notes-meta-footer">
                  <span className="lead-notes-char-count">
                    {notesText.length} character{notesText.length === 1 ? "" : "s"} • {notesText.trim() ? notesText.trim().split(/\s+/).length : 0} word{notesText.trim().split(/\s+/).length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              <div className="lead-modal-footer">
                <button
                  type="button"
                  className="lead-modal-btn cancel"
                  onClick={handleCloseNotes}
                  disabled={isSavingNotes}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="lead-modal-btn confirm-notes-save"
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                >
                  {isSavingNotes ? (
                    <>
                      <div className="lead-spinner-mini" />
                      Saving Note...
                    </>
                  ) : (
                    "Save Note"
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

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
                  <div className="lead-history-loading">
                    <div className="lead-spinner" />
                    <p>Loading audit logs...</p>
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