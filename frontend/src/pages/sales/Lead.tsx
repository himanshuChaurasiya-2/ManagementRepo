import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import "./lead.css";

// =====================================================
// TYPES
// =====================================================

type LeadStatus =
  | "Select"
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
  status: LeadStatus;
  subStatus: LeadSubStatus;
  notes?: string;
  uploadedBy: string | UploadedBy;
  createdAt: string;
  updatedAt: string;
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
// CONSTANTS
// =====================================================

const API_URL = "http://localhost:5000/api";

const STATUS_OPTIONS: LeadStatus[] = [
  "Select",
  "Interested",
  "Not Interested",
  "No Contact",
  "Follow up",
  "Junk",
];

const SUB_STATUS_OPTIONS: Record<LeadStatus, LeadSubStatus[]> = {
  Select: [""],
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

// =====================================================
// COMPONENT
// =====================================================

const Lead: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");
  const [subStatusFilter, setSubStatusFilter] = useState<LeadSubStatus | "">("");

  const [uploading, setUploading] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Selection state for Batch Operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Confirmation Modal state
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [targetDeleteIds, setTargetDeleteIds] = useState<string[]>([]);

  // Deletion History / Audit Logs state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [deletionLogs, setDeletionLogs] = useState<LeadDeletionLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Notes Modal State
  const [activeNotesLead, setActiveNotesLead] = useState<Lead | null>(null);
  const [notesText, setNotesText] = useState<string>("");
  const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  // =====================================================
  // AUTH CONFIG
  // =====================================================

  const getAuthConfig = () => {
    const token = localStorage.getItem("token");
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  const showAlert = (type: "success" | "error", text: string) => {
    setAlertMessage({ type, text });
    setTimeout(() => {
      setAlertMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // =====================================================
  // LOAD LEADS
  // =====================================================

  const loadLeads = async () => {
    try {
      setLoading(true);
      const endpoint = isAdmin
        ? `${API_URL}/leads/all`
        : `${API_URL}/leads/my`;

      const response = await axios.get(endpoint, getAuthConfig());
      setLeads(response.data.leads || []);
      // Clear selections that no longer exist
      setSelectedIds((prev) =>
        prev.filter((id) =>
          (response.data.leads || []).some((l: Lead) => l._id === id)
        )
      );
    } catch (error: any) {
      console.error("Failed to load leads:", error);
      showAlert("error", error?.response?.data?.message || "Failed to load leads");
    } finally {
      setLoading(false);
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

  useEffect(() => {
    loadLeads();
  }, [isAdmin]);

  // =====================================================
  // LOAD DELETION LOGS (AUDIT TRAIL)
  // =====================================================

  const loadDeletionLogs = async () => {
    try {
      setLoadingLogs(true);
      const response = await axios.get(
        `${API_URL}/leads/deletion-logs`,
        getAuthConfig()
      );
      setDeletionLogs(response.data.logs || []);
    } catch (error: any) {
      console.error("Failed to load deletion logs:", error);
      showAlert("error", error?.response?.data?.message || "Failed to load deletion audit trail");
    } finally {
      setLoadingLogs(false);
    }
  };

  const openHistoryModal = () => {
    setShowHistoryModal(true);
    loadDeletionLogs();
  };

  // =====================================================
  // IMPORT EXCEL
  // =====================================================

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleExcelImport = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedExtensions = [".xlsx", ".xls"];
    const fileName = file.name.toLowerCase();

    if (!allowedExtensions.some((ext) => fileName.endsWith(ext))) {
      showAlert("error", "Please select an Excel file (.xlsx or .xls)");
      e.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      const response = await axios.post(
        `${API_URL}/leads/import-excel`,
        formData,
        getAuthConfig()
      );

      const result = response.data;
      showAlert(
        "success",
        `Excel imported! Total: ${result.totalRows}, Imported: ${result.imported}, Failed: ${result.failed}`
      );
      await loadLeads();
    } catch (error: any) {
      console.error("Excel import error:", error);
      showAlert(
        "error",
        error?.response?.data?.message || "Failed to import leads from Excel"
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // =====================================================
  // UPDATE STATUS
  // =====================================================

  const handleStatusChange = async (lead: Lead, newStatus: LeadStatus) => {
    let newSubStatus: LeadSubStatus = "";

    if (newStatus === "Select" || newStatus === "Junk") {
      newSubStatus = "";
    } else {
      newSubStatus = SUB_STATUS_OPTIONS[newStatus][0];
    }

    try {
      setLeads((prev) =>
        prev.map((item) =>
          item._id === lead._id
            ? { ...item, status: newStatus, subStatus: newSubStatus }
            : item
        )
      );

      if (newStatus === "Select") {
        return;
      }

      await axios.patch(
        `${API_URL}/leads/${lead._id}/status`,
        { status: newStatus, subStatus: newSubStatus },
        getAuthConfig()
      );
    } catch (error: any) {
      console.error("Failed to update status:", error);
      showAlert(
        "error",
        error?.response?.data?.message || "Failed to update lead status"
      );
      await loadLeads();
    }
  };

  // =====================================================
  // UPDATE SUB STATUS
  // =====================================================

  const handleSubStatusChange = async (
    lead: Lead,
    newSubStatus: LeadSubStatus
  ) => {
    try {
      setLeads((prev) =>
        prev.map((item) =>
          item._id === lead._id
            ? { ...item, subStatus: newSubStatus }
            : item
        )
      );

      await axios.patch(
        `${API_URL}/leads/${lead._id}/status`,
        { status: lead.status, subStatus: newSubStatus },
        getAuthConfig()
      );
    } catch (error: any) {
      console.error("Failed to update sub status:", error);
      showAlert(
        "error",
        error?.response?.data?.message || "Failed to update sub status"
      );
      await loadLeads();
    }
  };

  // =====================================================
  // NOTES HANDLERS
  // =====================================================

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
      const response = await axios.patch(
        `${API_URL}/leads/${activeNotesLead._id}/notes`,
        { notes: notesText },
        getAuthConfig()
      );

      const updatedLead = response.data?.lead;

      setLeads((prev) =>
        prev.map((l) =>
          l._id === activeNotesLead._id
            ? { ...l, notes: updatedLead?.notes ?? notesText }
            : l
        )
      );

      showAlert("success", "Lead notes saved successfully.");
      handleCloseNotes();
    } catch (err: any) {
      console.error("Save notes error:", err);
      showAlert(
        "error",
        err?.response?.data?.message || "Failed to save lead notes."
      );
    } finally {
      setIsSavingNotes(false);
    }
  };

  // =====================================================
  // FILTER
  // =====================================================

  const filteredLeads = useMemo(() => {
    const searchValue = search.toLowerCase().trim();

    return leads.filter((lead) => {
      const matchesSearch =
        !searchValue ||
        lead.name.toLowerCase().includes(searchValue) ||
        lead.phone.toLowerCase().includes(searchValue) ||
        (lead.email || "").toLowerCase().includes(searchValue) ||
        (lead.company || "").toLowerCase().includes(searchValue) ||
        (lead.notes || "").toLowerCase().includes(searchValue);

      const matchesStatus = !statusFilter || lead.status === statusFilter;
      const matchesSubStatus =
        !subStatusFilter || lead.subStatus === subStatusFilter;

      return matchesSearch && matchesStatus && matchesSubStatus;
    });
  }, [leads, search, statusFilter, subStatusFilter]);

  const subStatusFilterOptions = statusFilter
    ? SUB_STATUS_OPTIONS[statusFilter]
    : [];

  const getUploadedByName = (uploadedBy: string | UploadedBy) => {
    if (typeof uploadedBy === "object" && uploadedBy) {
      return uploadedBy.name || uploadedBy.email || "-";
    }
    return "-";
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setSubStatusFilter("");
  };

  // =====================================================
  // SELECTION HANDLERS
  // =====================================================

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
      // Unselect all currently filtered
      const filteredIds = new Set(filteredLeads.map((l) => l._id));
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      // Select all currently filtered
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

  // =====================================================
  // DELETE HANDLERS
  // =====================================================

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

      const response = await axios.post(
        `${API_URL}/leads/batch-delete`,
        { leadIds: targetDeleteIds },
        getAuthConfig()
      );

      showAlert(
        "success",
        response.data.message ||
          `Successfully deleted ${targetDeleteIds.length} lead(s)`
      );

      // Remove deleted IDs from selection
      const targetSet = new Set(targetDeleteIds);
      setSelectedIds((prev) => prev.filter((id) => !targetSet.has(id)));

      // Close modal and refresh leads
      setShowConfirmDeleteModal(false);
      setTargetDeleteIds([]);
      await loadLeads();
    } catch (error: any) {
      console.error("Batch delete error:", error);
      showAlert(
        "error",
        error?.response?.data?.message || "Failed to delete leads"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Format date helper
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

  // Target leads details for modal preview
  const targetLeadsList = leads.filter((lead) =>
    targetDeleteIds.includes(lead._id)
  );

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="lead-page">
      {/* ================================================
          HEADER
      ================================================= */}
      <div className="lead-header">
        <div>
          <h1>Lead Management</h1>
          <p>Manage, track, batch delete and audit your sales leads</p>
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

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelImport}
            style={{ display: "none" }}
          />

          <button
            className="lead-import-btn"
            onClick={handleImportClick}
            disabled={uploading}
          >
            {uploading ? "Importing..." : "Import Excel"}
          </button>
        </div>
      </div>

      {/* ================================================
          ALERT TOAST / BANNER
      ================================================= */}
      {alertMessage && (
        <div className={`lead-alert-banner ${alertMessage.type}`}>
          <span>{alertMessage.type === "success" ? "✓" : "⚠"}</span>
          <span>{alertMessage.text}</span>
          <button
            type="button"
            onClick={() => setAlertMessage(null)}
            className="lead-alert-close"
          >
            ×
          </button>
        </div>
      )}

      {/* ================================================
          SUMMARY CARDS
      ================================================= */}
      <div className="lead-summary">
        <div className="lead-summary-card">
          <span>Total Leads</span>
          <strong>{leads.length}</strong>
        </div>

        <div className="lead-summary-card">
          <span>Interested</span>
          <strong>
            {leads.filter((lead) => lead.status === "Interested").length}
          </strong>
        </div>

        <div className="lead-summary-card">
          <span>Follow Up</span>
          <strong>
            {leads.filter((lead) => lead.status === "Follow up").length}
          </strong>
        </div>

        <div className="lead-summary-card">
          <span>Junk</span>
          <strong>
            {leads.filter((lead) => lead.status === "Junk").length}
          </strong>
        </div>
      </div>

      {/* ================================================
          FILTERS
      ================================================= */}
      <div className="lead-filter-card">
        <div className="lead-search-wrapper">
          <input
            type="text"
            placeholder="Search name, phone, email or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="lead-search"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as LeadStatus | "");
            setSubStatusFilter("");
          }}
          className="lead-filter-select"
        >
          <option value="">All Status</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          value={subStatusFilter}
          onChange={(e) =>
            setSubStatusFilter(e.target.value as LeadSubStatus | "")
          }
          disabled={!statusFilter}
          className="lead-filter-select"
        >
          <option value="">All Sub Status</option>
          {subStatusFilterOptions.map(
            (subStatus) =>
              subStatus && (
                <option key={subStatus} value={subStatus}>
                  {subStatus}
                </option>
              )
          )}
        </select>

        {(search || statusFilter || subStatusFilter) && (
          <button className="lead-clear-btn" onClick={clearFilters}>
            Clear
          </button>
        )}
      </div>

      {/* ================================================
          BATCH ACTION BAR (WHEN ITEMS SELECTED)
      ================================================= */}
      {selectedIds.length > 0 && (
        <div className="lead-batch-bar">
          <div className="lead-batch-info">
            <span className="lead-batch-badge">{selectedIds.length}</span>
            <span>lead{selectedIds.length > 1 ? "s" : ""} selected</span>
          </div>

          <div className="lead-batch-actions">
            <button
              type="button"
              className="lead-batch-delete-btn"
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
              className="lead-batch-cancel-btn"
              onClick={clearSelection}
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* ================================================
          TABLE
      ================================================= */}
      <div className="lead-table-card">
        {loading ? (
          <div className="lead-loading">
            <div className="lead-spinner" />
            <p>Loading leads...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="lead-empty">
            <h3>No leads found</h3>
            <p>Import an Excel file or adjust your filters.</p>
          </div>
        ) : (
          <div className="lead-table-wrapper">
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
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Company</th>
                  <th>Source</th>
                  {isAdmin && <th>Uploaded By</th>}
                  <th>Status</th>
                  <th>Sub Status</th>
                  <th style={{ minWidth: "150px" }}>Notes</th>
                  <th>Created</th>
                  <th style={{ width: "60px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredLeads.map((lead, index) => {
                  const subStatuses = SUB_STATUS_OPTIONS[lead.status];
                  const isSelected = selectedIds.includes(lead._id);

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

                      <td>{index + 1}</td>

                      <td>
                        <div className="lead-name-cell">
                          <strong>{lead.name}</strong>
                        </div>
                      </td>

                      <td>{lead.phone}</td>

                      <td>{lead.email || "-"}</td>

                      <td>{lead.company || "-"}</td>

                      <td>{lead.source || "-"}</td>

                      {isAdmin && <td>{getUploadedByName(lead.uploadedBy)}</td>}

                      {/* STATUS */}
                      <td>
                        <select
                          value={lead.status}
                          onChange={(e) =>
                            handleStatusChange(
                              lead,
                              e.target.value as LeadStatus
                            )
                          }
                          className={`lead-status-select status-${lead.status
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* SUB STATUS */}
                      <td>
                        {lead.status === "Junk" ? (
                          <span className="lead-no-substatus">-</span>
                        ) : (
                          <select
                            value={lead.subStatus}
                            onChange={(e) =>
                              handleSubStatusChange(
                                lead,
                                e.target.value as LeadSubStatus
                              )
                            }
                            className="lead-substatus-select"
                          >
                            <option value="">Select</option>
                            {subStatuses.map((subStatus) => (
                              <option key={subStatus} value={subStatus}>
                                {subStatus}
                              </option>
                            ))}
                          </select>
                        )}
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
                                {lead.notes.length > 24
                                  ? `${lead.notes.slice(0, 24)}...`
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

                      {/* CREATED */}
                      <td>
                        <span className="lead-date">
                          {formatDate(lead.createdAt)}
                        </span>
                      </td>

                      {/* SINGLE DELETE ACTION */}
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          className="lead-row-delete-btn"
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
          </div>
        )}
      </div>

      {/* ================================================
          FOOTER
      ================================================= */}
      {!loading && filteredLeads.length > 0 && (
        <div className="lead-table-footer">
          Showing <strong>{filteredLeads.length}</strong> of{" "}
          <strong>{leads.length}</strong> leads
          {selectedIds.length > 0 && (
            <span style={{ marginLeft: "12px", color: "#4f46e5" }}>
              ({selectedIds.length} selected)
            </span>
          )}
        </div>
      )}

      {/* ================================================
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
                      Notes are written and updated directly on the dashboard.
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
                    <span className={`lead-status-pill status-${activeNotesLead.status.toLowerCase().replace(/\s+/g, "-")}`}>
                      {activeNotesLead.status || "Select"}
                    </span>
                  </div>
                </div>

                <div className="lead-notes-editor-header">
                  <span className="lead-notes-editor-label">Note Details</span>
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
                  placeholder="Write customer conversation notes, call logs, follow-up requirements, or action items here..."
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
                  {isSavingNotes ? "Saving Note..." : "Save Note"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ================================================
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
                  <p>This action cannot be undone.</p>
                </div>
              </div>

              <div className="lead-modal-body">
                <p className="lead-modal-desc">
                  You are about to delete{" "}
                  <strong>{targetDeleteIds.length}</strong> lead
                  {targetDeleteIds.length > 1 ? "s" : ""}. An audit entry
                  with a timestamp, your user details, and the deleted lead details
                  will be permanently recorded in the deletion history.
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

      {/* ================================================
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
                  <p>Full record of who deleted leads, timestamp, and deleted data</p>
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
                  onClick={loadDeletionLogs}
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