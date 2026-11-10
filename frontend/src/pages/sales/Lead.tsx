import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { ChangeEvent } from "react";
import axios from "axios";
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
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  MapPin,
  Phone,
  Users,
  X,
} from "lucide-react";
import "../admin/Adminlead.css";

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

const Lead: React.FC = () => {
  // ---------------------------------------------------
  // STATE
  // ---------------------------------------------------

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Slide-out Drawer State
  const [selectedDrawerLead, setSelectedDrawerLead] = useState<Lead | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null);

  const getAuthConfig = () => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("accessToken") || "";
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  // ===================================================
  // FETCH LEADS
  // ===================================================

  const loadLeads = async () => {
    try {
      setLoading(true);
      setError("");

      let fetched: Lead[] = [];
      try {
        const res = await axios.get(`${API_URL}/leads/my`, getAuthConfig());
        if (Array.isArray(res.data?.leads)) {
          fetched = res.data.leads;
        }
      } catch {
        const fallbackRes = await axios.get(`${API_URL}/leads`, getAuthConfig());
        if (Array.isArray(fallbackRes.data?.leads)) {
          fetched = fallbackRes.data.leads;
        }
      }

      setLeads(fetched);
    } catch (err: any) {
      console.error("Failed to load leads:", err);
      setError(err?.response?.data?.message || "Failed to load leads from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  // Sync drawer when leads state updates
  useEffect(() => {
    if (selectedDrawerLead) {
      const fresh = leads.find((l) => l._id === selectedDrawerLead._id);
      if (fresh) {
        setSelectedDrawerLead(fresh);
      }
    }
  }, [leads]);

  // ===================================================
  // EXCEL / CSV IMPORT
  // ===================================================

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validExtensions = [".xlsx", ".xls", ".csv"];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      setError("Please select a valid Excel or CSV file (.xlsx, .xls, or .csv).");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setError("");
    setSuccess("");
    setImportResult(null);
    setSelectedFile(file);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setError("Please choose an Excel or CSV file first.");
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
        {
          headers: {
            ...getAuthConfig().headers,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const data: ImportResult = response.data;
      setImportResult(data);
      setSuccess(
        `Import completed successfully: ${data.imported} lead(s) imported${
          data.failed ? `, ${data.failed} row(s) failed` : ""
        }.`
      );

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await loadLeads();
    } catch (err: any) {
      console.error("Import error:", err);
      setError(
        err?.response?.data?.message ||
          "Failed to import leads. Please verify column headers: Name, Phone, Email, Company, Source."
      );
    } finally {
      setImporting(false);
    }
  };

  // ===================================================
  // DELETION AUDIT TRAIL
  // ===================================================

  const fetchDeletionLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await axios.get(`${API_URL}/leads/deletion-logs`, getAuthConfig());
      setDeletionLogs(res.data?.logs || []);
    } catch (err: any) {
      console.error("Failed to fetch deletion logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const openHistoryModal = () => {
    setShowHistoryModal(true);
    fetchDeletionLogs();
  };

  // ===================================================
  // STATUS UPDATE
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
      setError(err?.response?.data?.message || "Failed to update lead status.");
    } finally {
      setUpdatingId(null);
    }
  };

  // ===================================================
  // NOTES PERSISTENCE
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
      if (updatedLead) {
        setLeads((prev) =>
          prev.map((item) =>
            item._id === leadId ? { ...item, notes: updatedLead.notes } : item
          )
        );
        setSelectedDrawerLead((prev) =>
          prev && prev._id === leadId ? { ...prev, notes: updatedLead.notes } : prev
        );
      }
    } catch (err: any) {
      console.error("Save notes error:", err);
      setError(err?.response?.data?.message || "Failed to record lead notes.");
      throw err;
    }
  };

  // ===================================================
  // FILTERING & DERIVED VALUES
  // ===================================================

  const availableSubStatuses = useMemo(() => {
    if (statusFilter === "All") return [];
    return subStatusMap[statusFilter] || [];
  }, [statusFilter]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setSubStatusFilter("All");
  };

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((lead) => {
      const matchesSearch =
        !q ||
        lead.name?.toLowerCase().includes(q) ||
        lead.phone?.toLowerCase().includes(q) ||
        lead.email?.toLowerCase().includes(q) ||
        lead.company?.toLowerCase().includes(q) ||
        lead.source?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "All" || lead.status === statusFilter;

      const matchesSubStatus =
        subStatusFilter === "All" || lead.subStatus === subStatusFilter;

      return matchesSearch && matchesStatus && matchesSubStatus;
    });
  }, [leads, search, statusFilter, subStatusFilter]);

  // Selection
  const allFilteredIds = useMemo(
    () => filteredLeads.map((l) => l._id),
    [filteredLeads]
  );

  const isAllSelected =
    allFilteredIds.length > 0 &&
    allFilteredIds.every((id) => selectedIds.includes(id));

  const isIndeterminate =
    allFilteredIds.some((id) => selectedIds.includes(id)) && !isAllSelected;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
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

  // Deletion Prompt & Execution
  const promptSingleDelete = (leadId: string) => {
    setTargetDeleteIds([leadId]);
    setShowConfirmDeleteModal(true);
  };

  const promptBatchDelete = () => {
    if (selectedIds.length === 0) return;
    setTargetDeleteIds([...selectedIds]);
    setShowConfirmDeleteModal(true);
  };

  const targetLeadsList = useMemo(() => {
    return leads.filter((l) => targetDeleteIds.includes(l._id));
  }, [leads, targetDeleteIds]);

  const confirmExecutionDelete = async () => {
    if (targetDeleteIds.length === 0) return;
    try {
      setIsDeleting(true);
      setError("");
      setSuccess("");

      const res = await axios.post(
        `${API_URL}/leads/batch-delete`,
        { leadIds: targetDeleteIds },
        getAuthConfig()
      );

      setSuccess(res.data?.message || `Deleted ${targetDeleteIds.length} lead(s).`);

      setLeads((prev) => prev.filter((l) => !targetDeleteIds.includes(l._id)));
      setSelectedIds((prev) => prev.filter((id) => !targetDeleteIds.includes(id)));

      if (selectedDrawerLead && targetDeleteIds.includes(selectedDrawerLead._id)) {
        setSelectedDrawerLead(null);
      }

      setShowConfirmDeleteModal(false);
      setTargetDeleteIds([]);
    } catch (err: any) {
      console.error("Delete failed:", err);
      setError(err?.response?.data?.message || "Failed to delete lead(s).");
    } finally {
      setIsDeleting(false);
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = leads.length;
    const interested = leads.filter((l) => l.status === "Interested").length;
    const followUp = leads.filter((l) => l.status === "Follow up").length;
    const noContact = leads.filter((l) => l.status === "No Contact").length;
    return { total, interested, followUp, noContact };
  }, [leads]);

  return (
    <div className="lead-page">
      {/* =================================================
          PAGE HEADER
      ================================================= */}
      <div className="lead-page-header">
        <div>
          <div className="lead-breadcrumb">Sales / Leads Pipeline</div>
          <h1>Leads Management</h1>
          <p>
            Master grid overview of your assigned leads, status updates, and pipeline progression
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
            onClick={loadLeads}
            disabled={loading}
            title="Refresh lead data"
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
              className={loading ? "lead-spin-icon" : ""}
            >
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
            {loading ? "Refreshing..." : "Refresh"}
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
          EXCEL IMPORT CARD
      ================================================= */}
      <section className="lead-import-card">
        <div className="lead-import-info">
          <h3>Import Leads via Excel</h3>
          <p>
            Upload .xlsx, .xls or .csv file. Expected columns: Name, Phone, Email, Company, Source.
          </p>
        </div>

        <div className="lead-import-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
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
          <div className="lead-stat-label">Total Leads</div>
          <div className="lead-stat-value">{stats.total}</div>
        </div>

        <div className="lead-stat-card">
          <div className="lead-stat-label">Interested</div>
          <div className="lead-stat-value" style={{ color: "#10b981" }}>
            {stats.interested}
          </div>
        </div>

        <div className="lead-stat-card">
          <div className="lead-stat-label">Follow Up</div>
          <div className="lead-stat-value" style={{ color: "#f59e0b" }}>
            {stats.followUp}
          </div>
        </div>

        <div className="lead-stat-card">
          <div className="lead-stat-label">No Contact</div>
          <div className="lead-stat-value" style={{ color: "#3b82f6" }}>
            {stats.noContact}
          </div>
        </div>
      </div>

      {/* =================================================
          BATCH ACTION BAR (MATCHING ADMIN REFERENCE)
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
              placeholder="Search name, phone, email, company, source..."
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
            <strong>My Assigned Leads</strong>
            <span>
              {filteredLeads.length} of {leads.length}
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
                      <th style={{ width: "260px" }}>Lead & Contact Vector</th>
                      <th style={{ width: "210px" }}>Context & Urgency</th>
                      <th style={{ width: "240px" }}>Chained Pipeline Status</th>
                      <th style={{ width: "130px", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <tr key={i} className="lead-shimmer-row">
                        <td style={{ textAlign: "center" }}>
                          <div className="lead-shimmer lead-shimmer-checkbox" />
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
                </div>
              ))}
            </div>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="lead-empty">
            <div className="lead-empty-icon" style={{ display: "inline-flex", justifyContent: "center", alignItems: "center" }}>
              <Users size={44} strokeWidth={1.5} />
            </div>
            <h3>No leads found</h3>
            <p>
              {leads.length === 0
                ? "Import an Excel file to populate leads."
                : "Try adjusting your search keywords or pipeline status filters."}
            </p>
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
                    <th style={{ width: "260px" }}>Lead & Contact Vector</th>
                    <th style={{ width: "210px" }}>Context & Urgency</th>
                    <th style={{ width: "240px" }}>Chained Pipeline Status</th>
                    <th style={{ width: "130px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLeads.map((lead) => {
                    const isSelected = selectedIds.includes(lead._id);
                    const urgency = getUrgencyInfo(lead);

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

                        {/* 2. CONTACT VECTOR (NAME, PHONE, EMAIL) */}
                        <td>
                          <div className="lead-vector-contact">
                            <div className="vector-person-row">
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

                        {/* 3. CONTEXT & URGENCY (COMPANY, SOURCE, URGENCY DOT) */}
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

                        {/* 4. CHAINED PIPELINE STATUS */}
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

                        {/* 5. ACTIONS & NOTES DRAWER TRIGGER */}
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

                    {/* ROW 2: CONTACT INFORMATION */}
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

                    {/* ROW 5: NOTES & SLIDE-OUT DRAWER TRIGGER */}
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
        isAdmin={false}
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

export default Lead;
