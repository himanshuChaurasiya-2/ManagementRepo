import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import LeadStatusBadgePopover from "./LeadStatusBadgePopover";
import type {
  LeadStatus,
  LeadSubStatus,
} from "./LeadStatusBadgePopover";
import "./LeadSlideDrawer.css";

export interface DrawerLead {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  source?: string;
  status?: LeadStatus | "";
  subStatus?: LeadSubStatus | "";
  notes?: string;
  uploadedBy?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeamMember {
  _id: string;
  name: string;
  email: string;
  jobPosition?: string;
  role: "admin" | "sales";
  status?: "active" | "inactive";
}

interface LeadSlideDrawerProps {
  lead: DrawerLead | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveNotes: (leadId: string, notes: string) => Promise<void>;
  onUpdateStatus: (
    lead: DrawerLead,
    status: LeadStatus,
    subStatus: LeadSubStatus
  ) => Promise<void>;
  users?: TeamMember[];
  onReassign?: (leadId: string, userId: string) => Promise<void>;
  isAdmin?: boolean;
}

export const getUrgencyInfo = (lead?: DrawerLead | null) => {
  if (!lead) {
    return { level: "closed", label: "Dormant", color: "#64748b", text: "No lead selected" };
  }
  const s = (lead.status || "").toLowerCase();
  if (s === "junk" || s === "not interested") {
    return {
      level: "closed",
      label: "Closed / Archived",
      color: "#6b7280",
      text: "Pipeline inactive",
    };
  }

  const dateStr = lead.updatedAt || lead.createdAt;
  if (!dateStr) {
    return {
      level: "pending",
      label: "Action Pending",
      color: "#f59e0b",
      text: "Recent touchpoint pending",
    };
  }

  const then = new Date(dateStr).getTime();
  const diffHours = (Date.now() - then) / (1000 * 60 * 60);

  if (diffHours < 12) {
    return {
      level: "fresh",
      label: "Fresh Lead",
      color: "#10b981",
      text: `Active touchpoint (${Math.max(1, Math.round(diffHours))}h ago)`,
    };
  } else if (diffHours < 48) {
    return {
      level: "pending",
      label: "Follow-up Due",
      color: "#f59e0b",
      text: `Follow-up recommended (${Math.round(diffHours)}h elapsed)`,
    };
  } else {
    const days = Math.floor(diffHours / 24);
    return {
      level: "overdue",
      label: "Overdue / Stale",
      color: "#ef4444",
      text: `Needs attention! (${days}d inactive)`,
    };
  }
};

export const LeadSlideDrawer: React.FC<LeadSlideDrawerProps> = ({
  lead,
  isOpen,
  onClose,
  onSaveNotes,
  onUpdateStatus,
  users = [],
  onReassign,
  isAdmin = false,
}) => {
  const [notes, setNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);

  // Sync notes when active lead changes
  useEffect(() => {
    if (lead) {
      setNotes(lead.notes || "");
    }
  }, [lead]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSavingNotes) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, isSavingNotes, onClose]);

  if (!isOpen || !lead) return null;

  const urgency = getUrgencyInfo(lead);

  // Assigned user details
  const uploaderId =
    typeof lead.uploadedBy === "object"
      ? lead.uploadedBy?._id
      : typeof lead.uploadedBy === "string"
      ? lead.uploadedBy
      : "";

  const assignedUser = users.find((u) => u._id === uploaderId);
  const assignedName =
    assignedUser?.name ||
    (typeof lead.uploadedBy === "object" ? lead.uploadedBy?.name : "") ||
    "Unassigned";
  const assignedEmail =
    assignedUser?.email ||
    (typeof lead.uploadedBy === "object" ? lead.uploadedBy?.email : "") ||
    "";
  const assignedRole =
    assignedUser?.jobPosition ||
    (assignedUser?.role === "admin" ? "Administrator" : "Sales Representative");

  // Format phone for WhatsApp
  const cleanPhone = lead.phone.replace(/[^0-9]/g, "");

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
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
    setNotes((prev) => (prev ? `${prev}\n${formatted}` : formatted));
  };

  const handleSave = async () => {
    if (!lead) return;
    try {
      setIsSavingNotes(true);
      await onSaveNotes(lead._id, notes);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleSelectAssignee = async (userId: string) => {
    if (!onReassign || !lead) return;
    try {
      setIsReassigning(true);
      await onReassign(lead._id, userId);
      setIsReassignOpen(false);
    } finally {
      setIsReassigning(false);
    }
  };

  // Parse notes for activity timeline
  const parseNotesTimeline = (rawNotes: string) => {
    if (!rawNotes.trim()) return [];
    const regex = /\[([A-Za-z]{3}\s+\d{1,2},\s+\d{4}\s+[^\]]+)\]/g;
    const parts: { time: string; text: string }[] = [];
    let match;
    let lastIndex = 0;
    let lastTime = "Initial Entry";

    while ((match = regex.exec(rawNotes)) !== null) {
      if (match.index > lastIndex) {
        const text = rawNotes.substring(lastIndex, match.index).trim();
        if (text) {
          parts.push({ time: lastTime, text });
        }
      }
      lastTime = match[1];
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < rawNotes.length) {
      const text = rawNotes.substring(lastIndex).trim();
      if (text) {
        parts.push({ time: lastTime, text });
      }
    }

    return parts.length > 0
      ? parts.reverse()
      : [{ time: "Log Note", text: rawNotes.trim() }];
  };

  const timelineEntries = parseNotesTimeline(notes);

  return createPortal(
    <div className="lead-drawer-backdrop" onClick={onClose}>
      <div
        className="lead-drawer-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Lead details for ${lead.name}`}
      >
        {/* MOBILE DRAG HANDLE */}
        <div className="lead-drawer-drag-bar" />

        {/* DRAWER HEADER */}
        <div className="lead-drawer-header">
          <div className="drawer-header-lead-info">
            <div className="drawer-lead-avatar">
              {lead.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="drawer-lead-title-row">
                <h2 className="drawer-lead-name">{lead.name}</h2>
                <span
                  className={`drawer-urgency-pill urgency-${urgency.level}`}
                  style={{
                    backgroundColor: `${urgency.color}20`,
                    borderColor: `${urgency.color}50`,
                    color: urgency.color,
                  }}
                  title={urgency.text}
                >
                  <span
                    className="urgency-pulse-dot"
                    style={{ backgroundColor: urgency.color }}
                  />
                  {urgency.label}
                </span>
              </div>
              <p className="drawer-lead-meta">
                {lead.company ? `${lead.company} • ` : ""}
                Added {new Date(lead.createdAt || Date.now()).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            disabled={isSavingNotes}
            title="Close Drawer (Esc)"
          >
            ✕
          </button>
        </div>

        {/* QUICK COMMUNICATION CTA BAR */}
        <div className="drawer-quick-actions-bar">
          <a
            href={`tel:${lead.phone}`}
            className="drawer-cta-btn call"
            title="Direct Call"
          >
            <span>📞</span> Call
          </a>

          {cleanPhone && (
            <a
              href={`https://wa.me/${cleanPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="drawer-cta-btn whatsapp"
              title="Open WhatsApp Chat"
            >
              <span>💬</span> WhatsApp
            </a>
          )}

          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              className="drawer-cta-btn email"
              title="Compose Email"
            >
              <span>✉️</span> Email
            </a>
          )}

          <button
            type="button"
            className="drawer-cta-btn copy"
            onClick={() => handleCopy(lead.phone, "phone")}
            title="Copy phone number"
          >
            <span>📋</span> {copiedField === "phone" ? "Copied!" : "Copy"}
          </button>
        </div>

        {/* DRAWER SCROLLABLE BODY */}
        <div className="lead-drawer-body">
          {/* SECTION 1: PIPELINE STATUS */}
          <div className="drawer-card">
            <div className="drawer-card-header">
              <span className="card-title">Pipeline Stage</span>
              <span className="card-hint">Click badge to update</span>
            </div>
            <div className="drawer-status-wrap">
              <LeadStatusBadgePopover
                currentStatus={lead.status as any}
                currentSubStatus={lead.subStatus as any}
                onUpdate={(st, subSt) => onUpdateStatus(lead, st, subSt)}
                size="lg"
                align="left"
              />
            </div>
          </div>

          {/* SECTION 2: CONTACT & CONTEXT DETAILS */}
          <div className="drawer-card">
            <div className="drawer-card-header">
              <span className="card-title">Lead Vectors & Context</span>
            </div>
            <div className="drawer-details-grid">
              <div className="drawer-detail-item">
                <span className="detail-label">Phone</span>
                <div className="detail-value-row">
                  <a href={`tel:${lead.phone}`} className="detail-link">
                    {lead.phone}
                  </a>
                </div>
              </div>

              <div className="drawer-detail-item">
                <span className="detail-label">Email</span>
                <div className="detail-value-row">
                  {lead.email ? (
                    <a href={`mailto:${lead.email}`} className="detail-link">
                      {lead.email}
                    </a>
                  ) : (
                    <span className="empty-text">None provided</span>
                  )}
                </div>
              </div>

              <div className="drawer-detail-item">
                <span className="detail-label">Company</span>
                <div className="detail-value-row">
                  <strong>{lead.company || "Individual / Not specified"}</strong>
                </div>
              </div>

              <div className="drawer-detail-item">
                <span className="detail-label">Source</span>
                <div className="detail-value-row">
                  <span className="drawer-source-badge">
                    {lead.source || "Direct Import"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: ASSIGNED REPRESENTATIVE */}
          <div className="drawer-card">
            <div className="drawer-card-header">
              <span className="card-title">Assigned Field Agent</span>
              {isAdmin && onReassign && (
                <button
                  type="button"
                  className="drawer-reassign-toggle-btn"
                  onClick={() => setIsReassignOpen((prev) => !prev)}
                >
                  {isReassignOpen ? "Cancel Reassignment" : "⚡ Reassign Lead"}
                </button>
              )}
            </div>

            <div className="drawer-assigned-user-box">
              <div className="assigned-user-avatar">
                {assignedName.charAt(0).toUpperCase()}
              </div>
              <div className="assigned-user-info">
                <strong className="assigned-user-name">{assignedName}</strong>
                <span className="assigned-user-meta">
                  {assignedEmail || assignedRole}
                </span>
              </div>
            </div>

            {/* REASSIGNMENT DROPDOWN (ADMIN ONLY) */}
            {isAdmin && isReassignOpen && (
              <div className="drawer-reassign-select-panel">
                <span className="reassign-panel-title">
                  Select Team Representative:
                </span>
                <div className="drawer-reassign-list">
                  {users
                    .filter((u) => u.status !== "inactive")
                    .map((user) => {
                      const isCurrent = user._id === uploaderId;
                      return (
                        <button
                          key={user._id}
                          type="button"
                          disabled={isReassigning || isCurrent}
                          className={`drawer-reassign-option ${
                            isCurrent ? "active-current" : ""
                          }`}
                          onClick={() => handleSelectAssignee(user._id)}
                        >
                          <span className="option-avatar">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                          <div className="option-info">
                            <span className="option-name">{user.name}</span>
                            <span className="option-pos">
                              {user.jobPosition || user.role}
                            </span>
                          </div>
                          {isCurrent ? (
                            <span className="option-badge">Assigned</span>
                          ) : (
                            <span className="option-select-cta">Assign →</span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: LONG-FORM NOTES & TIMELINE */}
          <div className="drawer-card">
            <div className="drawer-card-header">
              <span className="card-title">Interactive Notes & History</span>
              <button
                type="button"
                className="drawer-timestamp-btn"
                onClick={handleInsertTimestamp}
                title="Add current date & time stamp"
              >
                + Timestamp
              </button>
            </div>

            <textarea
              className="drawer-notes-textarea"
              placeholder="Record detailed notes, follow-up callbacks, requirements, or client objections here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
            />

            <div className="drawer-notes-action-row">
              <span className="notes-char-counter">
                {notes.length} characters
              </span>
              <button
                type="button"
                className="drawer-save-notes-btn"
                onClick={handleSave}
                disabled={isSavingNotes}
              >
                {isSavingNotes ? "Saving..." : "Save Notes"}
              </button>
            </div>

            {/* TIMELINE VIEW OF NOTES */}
            {timelineEntries.length > 0 && (
              <div className="drawer-timeline-wrapper">
                <span className="timeline-title">Historical Touchpoints</span>
                <div className="drawer-timeline">
                  {timelineEntries.map((entry, idx) => (
                    <div key={idx} className="timeline-item">
                      <div className="timeline-dot" />
                      <div className="timeline-content">
                        <span className="timeline-time">{entry.time}</span>
                        <p className="timeline-text">{entry.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* DRAWER FOOTER */}
        {/* <div className="lead-drawer-footer">
          <button
            type="button"
            className="drawer-footer-close-btn"
            onClick={onClose}
          >
            Close Panel
          </button>
        </div> */}
      </div>
    </div>,
    document.body
  );
};

export default LeadSlideDrawer;

