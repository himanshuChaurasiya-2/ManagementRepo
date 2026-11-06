import React, { useEffect, useState } from "react";
import axios from "axios";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Modal, Button } from "react-bootstrap";
import { X } from "lucide-react";
import "../companyCalendar.css";
import "../pages.css";

interface CompanyReminder {
  _id: string;
  companyName?: string;
  title: string;
  description?: string;

  date: string;
  startTime?: string;
  endTime?: string;

  priority?: "low" | "medium" | "high";
  remindBefore?: number;
  repeat?: "none" | "daily" | "weekly" | "monthly";
  status?: "pending" | "completed";
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const formatTimeDisplay = (timeStr?: string) => {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":");
  const h = parseInt(hours, 10);
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? "PM" : "AM";
  const formattedHour = h % 12 === 0 ? 12 : h % 12;
  return `${formattedHour}:${minutes} ${ampm}`;
};

const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr.substring(0, 10) + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr.substring(0, 10);
  }
};

const formatRemindBeforeDisplay = (mins?: number | string) => {
  const m = Number(mins);
  if (isNaN(m) || m === 0) return "At time of event";
  if (m === 60) return "1 hour before";
  return `${m} minutes before`;
};

const formatRepeatDisplay = (repeat?: string) => {
  switch (repeat) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    default:
      return "Does not repeat";
  }
};

const CompanyCalendarView: React.FC = () => {
  const [reminders, setReminders] = useState<CompanyReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<CompanyReminder | null>(null);

  const getAuthConfig = () => {
    const token = localStorage.getItem("token");

    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  const loadReminders = async () => {
    try {
      setLoading(true);

      const response = await axios.get(
        `${API_URL}/company-reminders`,
        getAuthConfig()
      );

      setReminders(response.data);
    } catch (error) {
      console.error("Failed to load company reminders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
  }, []);

  const calendarEvents = reminders.map((reminder) => {
    let start = reminder.date;
    let end: string | undefined;

    // Add start time
    if (reminder.startTime) {
      start = `${reminder.date}T${reminder.startTime}`;
    }

    // Add end time
    if (reminder.endTime) {
      end = `${reminder.date}T${reminder.endTime}`;
    }

    return {
      id: reminder._id,
      title: reminder.companyName
        ? `${reminder.companyName} - ${reminder.title}`
        : reminder.title,
      start,
      end,

      // If there is no start time, treat it as an all-day event
      allDay: !reminder.startTime,

      extendedProps: {
        reminder,
      },

      classNames: [
        reminder.priority
          ? `priority-${reminder.priority}`
          : "",
        reminder.status === "completed"
          ? "completed-reminder"
          : "",
      ],
    };
  });

  return (
    <div className="company-calendar-page page-container">
      <div className="company-calendar-header page-header">
        <div>
          <h1>Company Calendar</h1>
          <p>
            Company-wide reminders and important events.
          </p>
        </div>
      </div>

      <div className="company-calendar-card calendar-card">
        {loading ? (
          <div className="company-calendar-loading calendar-loading">
            Loading company reminders...
          </div>
        ) : (
          <FullCalendar
            plugins={[
              dayGridPlugin,
              timeGridPlugin,
              interactionPlugin,
            ]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={calendarEvents}
            editable={false}
            selectable={false}
            eventStartEditable={false}
            eventDurationEditable={false}
            eventClick={(info) => {
              const reminder = info.event.extendedProps.reminder as CompanyReminder;
              if (reminder) {
                setSelectedReminder(reminder);
                setShowViewModal(true);
              }
            }}
            height="auto"
          />
        )}
      </div>

      {/* =====================================
          VIEW DETAILS MODAL (READ ONLY FORMAT)
          ===================================== */}
      <Modal
        show={showViewModal && !!selectedReminder}
        onHide={() => setShowViewModal(false)}
        centered
        className="reminder-view-modal"
      >
        {selectedReminder && (
          <>
            <Modal.Header className="reminder-header position-relative">
              <div className="reminder-view-header-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
                <h4>Company Reminder Details</h4>
              </div>
              <button
                type="button"
                className="calendar-modal-close-btn"
                onClick={() => setShowViewModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </Modal.Header>

            <Modal.Body>
              {/* Hero Section */}
              <div className="reminder-view-hero">
                {/* {selectedReminder.companyName && (
                  <div className="reminder-view-company-badge">
                    <Building2 size={13} />
                    <span>{selectedReminder.companyName}</span>
                  </div>
                )} */}
                <h3 className="reminder-view-title">{selectedReminder.title}</h3>
                {/* <div className="reminder-view-badges">
                  {selectedReminder.priority && (
                    <span className={`badge-priority badge-priority-${selectedReminder.priority}`} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <AlertCircle size={12} />
                      <span>
                        {selectedReminder.priority === "high" && "High Priority"}
                        {selectedReminder.priority === "medium" && "Medium Priority"}
                        {selectedReminder.priority === "low" && "Low Priority"}
                      </span>
                    </span>
                  )}
                  <span className={`badge-status badge-status-${selectedReminder.status || "pending"}`} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    {selectedReminder.status === "completed" ? (
                      <>
                        <Check size={12} />
                        <span>Completed</span>
                      </>
                    ) : (
                      <>
                        <Clock size={12} />
                        <span>Pending</span>
                      </>
                    )}
                  </span>
                </div> */}
              </div>

              {/* Detail Grid */}
              <div className="reminder-view-grid">
                {/* Company (if available) */}
                {selectedReminder.companyName && (
                  <div className="reminder-view-card">
                    <div className="reminder-view-card-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
                        <path d="M9 22v-4h6v4" />
                        <path d="M8 6h.01" />
                        <path d="M16 6h.01" />
                        <path d="M8 10h.01" />
                        <path d="M16 10h.01" />
                      </svg>
                    </div>
                    <div className="reminder-view-card-content">
                      <span className="reminder-view-card-label">Company</span>
                      <span className="reminder-view-card-value">
                        {selectedReminder.companyName}
                      </span>
                    </div>
                  </div>
                )}

                {/* Status */}
                <div className="reminder-view-card">
                  <div className="reminder-view-card-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 14 14" />
                    </svg>
                  </div>
                  <div className="reminder-view-card-content">
                    <span className="reminder-view-card-label">Status</span>
                    <span className="reminder-view-card-value">
                      {selectedReminder.status === "completed" ? "Completed" : "Pending"}
                    </span>
                  </div>
                </div>

                {/* Date */}
                <div className="reminder-view-card">
                  <div className="reminder-view-card-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="4" rx="2" />
                      <line x1="16" x2="16" y1="2" y2="6" />
                      <line x1="8" x2="8" y1="2" y2="6" />
                      <line x1="3" x2="21" y1="10" y2="10" />
                    </svg>
                  </div>
                  <div className="reminder-view-card-content">
                    <span className="reminder-view-card-label">Date</span>
                    <span className="reminder-view-card-value">
                      {formatDateDisplay(selectedReminder.date)}
                    </span>
                  </div>
                </div>

                {/* Time */}
                <div className="reminder-view-card">
                  <div className="reminder-view-card-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div className="reminder-view-card-content">
                    <span className="reminder-view-card-label">Time</span>
                    <span className="reminder-view-card-value">
                      {selectedReminder.startTime
                        ? `${formatTimeDisplay(selectedReminder.startTime)}${selectedReminder.endTime ? ` - ${formatTimeDisplay(selectedReminder.endTime)}` : ""}`
                        : "All Day"}
                    </span>
                  </div>
                </div>

                {/* Priority */}
                <div className="reminder-view-card">
                  <div className="reminder-view-card-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </div>
                  <div className="reminder-view-card-content">
                    <span className="reminder-view-card-label">Priority</span>
                    <span className="reminder-view-card-value">
                      {selectedReminder.priority
                        ? selectedReminder.priority.charAt(0).toUpperCase() + selectedReminder.priority.slice(1) + " Priority"
                        : "Normal Priority"}
                    </span>
                  </div>
                </div>

                {/* Remind Before */}
                <div className="reminder-view-card">
                  <div className="reminder-view-card-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    </svg>
                  </div>
                  <div className="reminder-view-card-content">
                    <span className="reminder-view-card-label">Notification</span>
                    <span className="reminder-view-card-value">
                      {formatRemindBeforeDisplay(selectedReminder.remindBefore)}
                    </span>
                  </div>
                </div>

                {/* Repeat */}
                <div className="reminder-view-card">
                  <div className="reminder-view-card-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m17 2 4 4-4 4" />
                      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
                      <path d="m7 22-4-4 4-4" />
                      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
                    </svg>
                  </div>
                  <div className="reminder-view-card-content">
                    <span className="reminder-view-card-label">Repeat</span>
                    <span className="reminder-view-card-value">
                      {formatRepeatDisplay(selectedReminder.repeat)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description & Notes */}
              <div className="reminder-view-desc-section">
                <div className="reminder-view-desc-header">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" x2="8" y1="13" y2="13" />
                    <line x1="16" x2="8" y1="17" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  <span>Meeting Agenda & Details</span>
                </div>
                {selectedReminder.description?.trim() ? (
                  <p className="reminder-view-desc-content">{selectedReminder.description}</p>
                ) : (
                  <p className="reminder-view-desc-empty">No details or agenda provided.</p>
                )}
              </div>
            </Modal.Body>

            <Modal.Footer className="reminder-view-modal-footer">
              <div className="reminder-view-footer-left"></div>
              <div className="reminder-view-footer-right">
                <Button variant="secondary" className="btn-cancel-custom" type="button" onClick={() => setShowViewModal(false)}>
                  Close
                </Button>
              </div>
            </Modal.Footer>
          </>
        )}
      </Modal>
    </div>
  );
};

export default CompanyCalendarView;