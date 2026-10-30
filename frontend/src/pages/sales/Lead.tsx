import React, { useEffect, useMemo, useRef, useState } from "react";
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
import "../admin/Adminlead.css";

// =====================================================
// TYPES
// =====================================================

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
  status?: LeadStatus | "";
  subStatus?: LeadSubStatus | "";
  notes?: string;
  uploadedBy?: string | UploadedBy;
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
// CONSTANTS
// =====================================================

const API_URL = "http://localhost:5000/api";

const SUB_STATUS_OPTIONS: Record<LeadStatus, LeadSubStatus[]> = {
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
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");
  const [subStatusFilter, setSubStatusFilter] = useState<LeadSubStatus | "">("");

  // Excel / CSV File Import state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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

  // Slide Drawer state
  const [selectedDrawerLead, setSelectedDrawerLead] = useState<Lead | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

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
      const res = await axios.get(`${API_URL}/leads`, getAuthConfig());
      if (res.data.success) {
        setLeads(res.data.leads || []);
      }
    } catch (err: any) {
      console.error("Failed to load leads:", err);
      setAlertMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to load leads.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  // Sync selectedDrawerLead when leads change
  useEffect(() => {
    if (selectedDrawerLead) {
      const fresh = leads.find((l) => l._id === selectedDrawerLead._id);
      if (fresh) {
        setSelectedDrawerLead(fresh);
      }
    }
  }, [leads]);

  // ===================================================
  // IMPORT EXCEL / CSV
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
      setAlertMessage({
        type: "error",
        text: "Please select a valid Excel or CSV file (.xlsx, .xls, or .csv).",
      });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setAlertMessage(null);
    setImportResult(null);
    setSelectedFile(file);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setAlertMessage({
        type: "error",
        text: "Please select an Excel or CSV file first.",
      });
      return;
    }

    try {
      setImporting(true);
      setAlertMessage(null);
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
      setAlertMessage({
        type: "success",
        text: `${data.message} (${data.imported} leads imported successfully${
          data.failed ? `, ${data.failed} failed` : ""
        }).`,
      });

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await loadLeads();
    } catch (err: any) {
      console.error("Import error:", err);
      const msg =
        err?.response?.data?.message ||
        "Failed to import leads. Please verify file format and columns.";
      setAlertMessage({
        type: "error",
        text: msg,
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadSampleTemplate = () => {
    const csvContent =
      "Sr No,Name,Phone,Email,Company,Source\n" +
      "1,Rajesh Kumar,+91 98765 43210,rajesh@example.com,Apex Retail,Website\n" +
      "2,Priya Sharma,+91 91234 56789,priya@sharma.in,Global Dynamics,Meta Ads\n" +
      "3,Amit Patel,+91 99887 76655,amit@patelcorp.com,Patel Corp,Referral\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "sample_leads_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ===================================================
  // DELETION AUDIT LOGS
  // ===================================================

  const fetchDeletionLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await axios.get(`${API_URL}/leads/deletion-logs`, getAuthConfig());
      if (res.data.success) {
        setDeletionLogs(res.data.logs || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch deletion logs:", err);
      setAlertMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to load audit logs.",
      });
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

      const response = await axios.patch(
        `${API_URL}/leads/${lead._id}/status`,
        {
          status,
          subStatus,
        },
        getAuthConfig()
      );

      const updated = response.data?.lead || {
        ...lead,
        status,
        subStatus,
      };

      setLeads((prev) =>
        prev.map((item) => (item._id === lead._id ? { ...item, ...updated } : item))
      );

      if (selectedDrawerLead && selectedDrawerLead._id === lead._id) {
        setSelectedDrawerLead((prev) => (prev ? { ...prev, ...updated } : prev));
      }
    } catch (err: any) {
      console.error("Update status error:", err);
      setAlertMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to update lead status.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // ===================================================
  // NOTES PERSISTENCE
  // ===================================================

  const handleSaveNotes = async (leadId: string, notes: string) => {
    try {
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
      setAlertMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to record note.",
      });
      throw err;
    }
  };

  // ===================================================
  // SELECTION & DELETION LOGIC
  // ===================================================

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

      const matchesStatus = !statusFilter || lead.status === statusFilter;
      const matchesSubStatus = !subStatusFilter || lead.subStatus === subStatusFilter;

      return matchesSearch && matchesStatus && matchesSubStatus;
    });
  }, [leads, search, statusFilter, subStatusFilter]);

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

  const promptSingleDelete = (leadId: string) => {
    setTargetDeleteIds([leadId]);
    setShowConfirmDeleteModal(true);
  };

  const promptBatchDelete = () => {
    if (selectedIds.length === 0) return;
    setTargetDeleteIds([...selectedIds]);
    setShowConfirmDeleteModal(true);
  };

  const executeDelete = async () => {
    if (targetDeleteIds.length === 0) return;
    try {
      setIsDeleting(true);
      setAlertMessage(null);

      const res = await axios.post(
        `${API_URL}/leads/batch-delete`,
        { leadIds: targetDeleteIds },
        getAuthConfig()
      );

      setAlertMessage({
        type: "success",
        text: res.data?.message || `Successfully deleted ${targetDeleteIds.length} lead(s).`,
      });

      setLeads((prev) => prev.filter((l) => !targetDeleteIds.includes(l._id)));
      setSelectedIds((prev) => prev.filter((id) => !targetDeleteIds.includes(id)));

      if (selectedDrawerLead && targetDeleteIds.includes(selectedDrawerLead._id)) {
        setSelectedDrawerLead(null);
      }

      setShowConfirmDeleteModal(false);
      setTargetDeleteIds([]);
    } catch (err: any) {
      console.error("Delete failed:", err);
      setAlertMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to delete lead(s).",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // ===================================================
  // STATS CALCULATIONS
  // ===================================================

  const stats = useMemo(() => {
    const total = leads.length;
    const interested = leads.filter((l) => l.status === "Interested");
    const followUp = leads.filter((l) => l.status === "Follow up");
    const noContact = leads.filter((l) => l.status === "No Contact");
    const notInterested = leads.filter((l) => l.status === "Not Interested");
    const junk = leads.filter((l) => l.status === "Junk");

    const hot = interested.filter((l) => l.subStatus === "Hot").length;
    const warm = interested.filter((l) => l.subStatus === "Warm").length;
    const cold = interested.filter((l) => l.subStatus === "Cold").length;
    const callLater = followUp.filter((l) => l.subStatus === "Call Me Later").length;

    return {
      total,
      interested: interested.length,
      followUp: followUp.length,
      noContact: noContact.length,
      notInterested: notInterested.length,
      junk: junk.length,
      unreached: noContact.length + junk.length,
      hot,
      warm,
      cold,
      callLater,
    };
  }, [leads]);

  return (
    <div className="lead-page">
      {/* HEADER */}
      <div className="lead-page-header">
        <div>
          <div className="lead-breadcrumb">Sales Portal / Leads Management</div>
          <h1>Leads Management</h1>
          <p>Manage, track, and convert sales prospects across all channels.</p>
        </div>

        <div className="lead-header-actions">
          <button
            type="button"
            className="lead-refresh-btn"
            onClick={() => loadLeads()}
            disabled={loading}
            title="Refresh lead data"
          >
            <span className={loading ? "lead-spin-icon" : ""}>🔄</span> Refresh
          </button>

          <button
            type="button"
            className="lead-history-btn"
            onClick={openHistoryModal}
            title="View deletion audit trail"
          >
            <span>📜</span> Audit Log
          </button>
        </div>
      </div>

      {/* ALERT BANNER */}
      {alertMessage && (
        <div className={`lead-alert ${alertMessage.type}`}>
          <span>{alertMessage.type === "success" ? "✓" : "⚠️"}</span>
          <span style={{ flex: 1 }}>{alertMessage.text}</span>
          <button
            type="button"
            className="lead-alert-close"
            onClick={() => setAlertMessage(null)}
            title="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      {/* DEDICATED EXCEL / CSV IMPORT CARD */}
      <section className="lead-import-card">
        <div className="lead-import-info">
          <div className="lead-import-icon">📥</div>
          <div>
            <h3>Import Leads via Excel / CSV</h3>
            <p>
              Upload your client or campaign leads (.xlsx, .xls, .csv). Supported columns: <strong>Name</strong>, <strong>Phone</strong>, Email, Company, Source.
            </p>
          </div>
        </div>

        <div className="lead-import-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="lead-file-input"
            style={{ display: "none" }}
          />

          {selectedFile && (
            <div className="lead-selected-file">
              <span>📄</span>
              <span style={{ maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedFile.name}
              </span>
              <button
                type="button"
                className="lead-file-remove-btn"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                title="Remove selected file"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  marginLeft: "6px",
                  fontSize: "13px",
                  opacity: 0.7,
                }}
              >
                ✕
              </button>
            </div>
          )}

          <button
            type="button"
            className="lead-upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            <span>📁</span> Choose Excel / CSV
          </button>

          <button
            type="button"
            className="lead-import-btn"
            onClick={handleImport}
            disabled={!selectedFile || importing}
          >
            {importing ? "Importing Leads..." : "Import Leads"}
          </button>

          <button
            type="button"
            className="lead-refresh-btn"
            onClick={downloadSampleTemplate}
            title="Download sample formatted spreadsheet"
          >
            <span>📥</span> Sample Template
          </button>
        </div>
      </section>

      {/* IMPORT RESULT DETAILED CARD */}
      {importResult && (
        <div className="lead-import-result">
          <div className="lead-import-stats">
            <div className="lead-import-stat">
              <span className="label">Total Rows</span>
              <strong>{importResult.totalRows}</strong>
            </div>
            <div className="lead-import-stat success">
              <span className="label">Imported</span>
              <strong>{importResult.imported}</strong>
            </div>
            {importResult.failed > 0 && (
              <div className="lead-import-stat danger">
                <span className="label">Failed</span>
                <strong>{importResult.failed}</strong>
              </div>
            )}
          </div>

          {importResult.failedRows && importResult.failedRows.length > 0 && (
            <div className="lead-failed-rows-box" style={{ marginTop: "10px", fontSize: "12.5px" }}>
              <strong style={{ color: "#f87171" }}>
                Issues Detected ({importResult.failedRows.length} rows):
              </strong>
              <ul style={{ margin: "6px 0 0", paddingLeft: "18px", color: "rgba(255, 255, 255, 0.7)" }}>
                {importResult.failedRows.slice(0, 5).map((f, i) => (
                  <li key={i}>Row #{f.row}: {f.reason}</li>
                ))}
                {importResult.failedRows.length > 5 && (
                  <li>...and {importResult.failedRows.length - 5} more</li>
                )}
              </ul>
            </div>
          )}

          <button
            type="button"
            className="lead-alert-close"
            onClick={() => setImportResult(null)}
            title="Dismiss import results"
            style={{ position: "absolute", top: "12px", right: "14px" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* STATS OVERVIEW CARDS */}
      <div className="lead-stats-grid">
        <div className="lead-stat-card">
          <span className="stat-label">Total Leads</span>
          <strong className="stat-value">{stats.total}</strong>
          <span className="stat-subtext">Registered contacts</span>
        </div>

        <div className="lead-stat-card stat-interested">
          <span className="stat-label">Interested</span>
          <strong className="stat-value">{stats.interested}</strong>
          <div className="stat-chip-row">
            <span className="stat-chip hot">🔥 Hot {stats.hot}</span>
            <span className="stat-chip warm">⚡ Warm {stats.warm}</span>
            <span className="stat-chip cold">❄️ Cold {stats.cold}</span>
          </div>
        </div>

        <div className="lead-stat-card stat-followup">
          <span className="stat-label">Follow Up</span>
          <strong className="stat-value">{stats.followUp}</strong>
          <div className="stat-chip-row">
            <span className="stat-chip call-later">📞 Call Later {stats.callLater}</span>
          </div>
        </div>

        <div className="lead-stat-card stat-unreached">
          <span className="stat-label">Unreached</span>
          <strong className="stat-value">{stats.unreached}</strong>
          <span className="stat-subtext">
            {stats.noContact} No Contact &bull; {stats.junk} Junk
          </span>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="lead-filter-bar">
        <div className="lead-search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search leads by name, phone, email, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="lead-search-input"
          />
          {search && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearch("")}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="lead-status-pills">
          <button
            type="button"
            className={`status-pill ${statusFilter === "" ? "active" : ""}`}
            onClick={() => {
              setStatusFilter("");
              setSubStatusFilter("");
            }}
          >
            All <span className="pill-count">{stats.total}</span>
          </button>

          <button
            type="button"
            className={`status-pill status-interested ${
              statusFilter === "Interested" ? "active" : ""
            }`}
            onClick={() => {
              setStatusFilter("Interested");
              setSubStatusFilter("");
            }}
          >
            Interested <span className="pill-count">{stats.interested}</span>
          </button>

          <button
            type="button"
            className={`status-pill status-follow-up ${
              statusFilter === "Follow up" ? "active" : ""
            }`}
            onClick={() => {
              setStatusFilter("Follow up");
              setSubStatusFilter("");
            }}
          >
            Follow Up <span className="pill-count">{stats.followUp}</span>
          </button>

          <button
            type="button"
            className={`status-pill status-no-contact ${
              statusFilter === "No Contact" ? "active" : ""
            }`}
            onClick={() => {
              setStatusFilter("No Contact");
              setSubStatusFilter("");
            }}
          >
            No Contact <span className="pill-count">{stats.noContact}</span>
          </button>

          <button
            type="button"
            className={`status-pill status-not-interested ${
              statusFilter === "Not Interested" ? "active" : ""
            }`}
            onClick={() => {
              setStatusFilter("Not Interested");
              setSubStatusFilter("");
            }}
          >
            Not Interested <span className="pill-count">{stats.notInterested}</span>
          </button>

          <button
            type="button"
            className={`status-pill status-junk ${
              statusFilter === "Junk" ? "active" : ""
            }`}
            onClick={() => {
              setStatusFilter("Junk");
              setSubStatusFilter("");
            }}
          >
            Junk <span className="pill-count">{stats.junk}</span>
          </button>
        </div>

        {statusFilter && SUB_STATUS_OPTIONS[statusFilter]?.length > 1 && (
          <div className="lead-substatus-dropdown-wrap">
            <select
              value={subStatusFilter}
              onChange={(e) => setSubStatusFilter(e.target.value as LeadSubStatus)}
              className="lead-substatus-filter-select"
            >
              <option value="">All Sub-Statuses</option>
              {SUB_STATUS_OPTIONS[statusFilter].map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* MASTER DATA TABLE CARD */}
      <div className="lead-table-card">
        {loading ? (
          <div className="lead-table-wrapper">
            <table className="lead-master-table">
              <thead>
                <tr>
                  <th style={{ width: "40px", textAlign: "center" }}>
                    <div className="lead-shimmer lead-shimmer-checkbox" />
                  </th>
                  <th style={{ width: "280px" }}>Lead & Contact Vector</th>
                  <th style={{ width: "230px" }}>Context & Urgency</th>
                  <th style={{ width: "250px" }}>Chained Pipeline Status</th>
                  <th style={{ width: "120px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((idx) => (
                  <tr key={idx} className="lead-shimmer-row">
                    <td style={{ textAlign: "center" }}>
                      <div className="lead-shimmer lead-shimmer-checkbox" />
                    </td>
                    <td>
                      <div className="lead-shimmer lead-shimmer-line lg" />
                      <div className="lead-shimmer lead-shimmer-line md" />
                    </td>
                    <td>
                      <div className="lead-shimmer lead-shimmer-line md" />
                      <div className="lead-shimmer lead-shimmer-line sm" />
                    </td>
                    <td>
                      <div className="lead-shimmer lead-shimmer-badge" />
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="lead-shimmer lead-shimmer-btn" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="lead-empty">
            <div className="lead-empty-icon">👥</div>
            <h3>No leads found</h3>
            <p>
              {search || statusFilter
                ? "No leads matched your current filters. Try resetting search or status."
                : "Import an Excel / CSV spreadsheet or start adding leads to your pipeline."}
            </p>
            {(search || statusFilter) && (
              <button
                type="button"
                className="lead-upload-btn"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("");
                  setSubStatusFilter("");
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* 1. DESKTOP/TABLET MASTER DATA TABLE */}
            <div className="lead-table-wrapper">
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
                    <th style={{ width: "280px" }}>Lead & Contact Vector</th>
                    <th style={{ width: "230px" }}>Context & Urgency</th>
                    <th style={{ width: "250px" }}>Chained Pipeline Status</th>
                    <th style={{ width: "120px", textAlign: "right" }}>Actions</th>
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
                                    onClick={(e) => e.stopPropagation()}
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
                                onClick={(e) => e.stopPropagation()}
                              >
                                📞 {lead.phone}
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

                        {/* 4. CHAINED PIPELINE STATUS BADGE */}
                        <td>
                          <div className="lead-status-cell">
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

                        {/* 5. ACTIONS: DRAWER TRIGGER & DELETE */}
                        <td style={{ textAlign: "right" }}>
                          <div className="lead-row-actions">
                            <button
                              type="button"
                              className="lead-drawer-trigger-btn"
                              onClick={() => setSelectedDrawerLead(lead)}
                              title="Open touchpoints & conversation history"
                              aria-label="Open Lead Details"
                            >
                              📝
                            </button>

                            <button
                              type="button"
                              className="lead-row-delete-btn"
                              onClick={() => promptSingleDelete(lead._id)}
                              title="Delete lead"
                              aria-label="Delete Lead"
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
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 2. MOBILE CARD DECK (RESPONSIVE VIEW FOR SMALL SCREENS) */}
            <div className="lead-mobile-card-deck">
              {filteredLeads.map((lead) => {
                const isSelected = selectedIds.includes(lead._id);
                const urgency = getUrgencyInfo(lead);

                return (
                  <div
                    key={lead._id}
                    className={`lead-mobile-card ${isSelected ? "selected" : ""}`}
                  >
                    {/* ROW 1: HEADER (CHECKBOX, NAME, COMPANY, DELETE BUTTON) */}
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
                      >
                        ✕
                      </button>
                    </div>

                    {/* ROW 2: CONTACT BOX */}
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

                    {/* ROW 3: TAGS & URGENCY */}
                    <div className="mobile-card-tags-row">
                      {lead.source && (
                        <span className="mobile-source-tag">📍 {lead.source}</span>
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

                    {/* ROW 4: PIPELINE STATUS */}
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
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* FOOTER COUNTER */}
      {!loading && filteredLeads.length > 0 && (
        <div className="lead-table-footer">
          Showing <strong>{filteredLeads.length}</strong> of{" "}
          <strong>{leads.length}</strong> leads
          {selectedIds.length > 0 && (
            <span style={{ marginLeft: "12px", color: "var(--accent-primary, #6366f1)" }}>
              ({selectedIds.length} selected)
            </span>
          )}
        </div>
      )}

      {/* FLOATING BATCH ACTIONS BAR */}
      {selectedIds.length > 0 && (
        <div className="lead-batch-actions-bar">
          <div className="batch-info">
            <span className="batch-count-badge">{selectedIds.length}</span>
            <span>Leads Selected</span>
          </div>

          <div className="batch-buttons">
            <button
              type="button"
              className="batch-btn batch-btn-secondary"
              onClick={handleSelectAll}
            >
              {isAllSelected ? "Deselect All" : "Select All"}
            </button>

            <button
              type="button"
              className="batch-btn batch-btn-danger"
              onClick={promptBatchDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : `Delete Selected (${selectedIds.length})`}
            </button>
          </div>
        </div>
      )}

      {/* SLIDE-OUT DETAIL DRAWER (WITH TOUCHPOINTS & PERMANENT TIMESTAMPS) */}
      <LeadSlideDrawer
        lead={selectedDrawerLead}
        isOpen={!!selectedDrawerLead}
        onClose={() => setSelectedDrawerLead(null)}
        onSaveNotes={handleSaveNotes}
        onUpdateStatus={(l, st, subSt) => handleUpdateStatus(l as any, st, subSt)}
        isAdmin={false}
      />

      {/* CONFIRM DELETE MODAL */}
      {showConfirmDeleteModal &&
        createPortal(
          <div className="lead-modal-overlay" onClick={() => setShowConfirmDeleteModal(false)}>
            <div className="lead-modal-box" onClick={(e) => e.stopPropagation()}>
              <div className="lead-modal-header danger">
                <div className="lead-modal-icon-danger">⚠️</div>
                <div>
                  <h3>Confirm Lead Deletion</h3>
                  <p>
                    Are you sure you want to delete{" "}
                    <strong>{targetDeleteIds.length}</strong> lead(s)?
                  </p>
                </div>
              </div>

              <div className="lead-modal-body">
                <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "14px", lineHeight: "1.6" }}>
                  This action is permanent and will remove the selected lead(s) from your active pipeline.
                  A snapshot will be recorded in the audit log for compliance.
                </p>
              </div>

              <div className="lead-modal-footer">
                <button
                  type="button"
                  className="lead-btn-cancel"
                  onClick={() => setShowConfirmDeleteModal(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="lead-btn-confirm-delete"
                  onClick={executeDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Yes, Delete"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* DELETION HISTORY / AUDIT LOG MODAL */}
      {showHistoryModal &&
        createPortal(
          <div className="lead-modal-overlay" onClick={() => setShowHistoryModal(false)}>
            <div
              className="lead-modal-box lead-history-modal-box"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="lead-modal-header">
                <div>
                  <h3>Deletion Audit Log</h3>
                  <p>Permanent ledger of deleted lead records and author timestamps.</p>
                </div>
                <button
                  type="button"
                  className="lead-modal-close-btn"
                  onClick={() => setShowHistoryModal(false)}
                  title="Close log"
                >
                  ✕
                </button>
              </div>

              <div className="lead-modal-body" style={{ maxHeight: "460px", overflowY: "auto" }}>
                {loadingLogs ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                    Loading audit trail...
                  </div>
                ) : deletionLogs.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                    No deletion records found.
                  </div>
                ) : (
                  <div className="lead-history-log-list">
                    {deletionLogs.map((log) => (
                      <div key={log._id} className="lead-history-log-card">
                        <div className="lead-history-log-header">
                          <div>
                            <strong>{log.deletedByName}</strong>
                            <span className="lead-history-role-tag">
                              {log.deletedByRole}
                            </span>
                            <span className="lead-history-count-tag">
                              {log.count} lead{log.count > 1 ? "s" : ""}
                            </span>
                          </div>
                          <span className="lead-history-timestamp">
                            {new Date(log.deletedAt || log.createdAt).toLocaleString()}
                          </span>
                        </div>

                        {log.deletedLeads && log.deletedLeads.length > 0 && (
                          <div className="lead-history-preview-list">
                            {log.deletedLeads.slice(0, 5).map((snap, i) => (
                              <span key={i} className="lead-history-chip">
                                {snap.name} ({snap.phone})
                              </span>
                            ))}
                            {log.deletedLeads.length > 5 && (
                              <span className="lead-history-chip more">
                                +{log.deletedLeads.length - 5} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="lead-modal-footer">
                <button
                  type="button"
                  className="lead-btn-cancel"
                  onClick={() => setShowHistoryModal(false)}
                >
                  Close
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
