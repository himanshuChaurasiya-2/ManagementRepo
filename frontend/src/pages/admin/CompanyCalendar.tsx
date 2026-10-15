import React, { useEffect, useState,useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";


import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

import {
  Modal,
  Button,
  Form,
} from "react-bootstrap";

import "../companyCalendar.css";

interface CompanyReminder {
  _id: string;

  // NEW
  companyName: string;

  title: string;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  priority: "low" | "medium" | "high";
  remindBefore: number;
  repeat: "none" | "daily" | "weekly" | "monthly";
  status: "pending" | "completed";
}

const API_URL = "http://localhost:5000/api";

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

const CompanyCalendar: React.FC = () => {
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";

  const [reminders, setReminders] = useState<CompanyReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importingExcel, setImportingExcel] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedReminder, setSelectedReminder] =
    useState<CompanyReminder | null>(null);
  const [viewingReminder, setViewingReminder] =
    useState<CompanyReminder | null>(null);

  const [form, setForm] = useState({
    // NEW
    companyName: "",

    title: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    priority: "medium",
    remindBefore: "10",
    repeat: "none",
  });

  const token = localStorage.getItem("token");

  const authConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  // =====================================================
  // LOAD REMINDERS
  // =====================================================

  const loadReminders = async () => {
    try {
      setLoading(true);

      const response = await axios.get(
        `${API_URL}/company-reminders`,
        authConfig
      );

      setReminders(response.data);
    } catch (error) {
      console.error(
        "Failed to load company reminders:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
  }, []);

  // =====================================================
  // FORM
  // =====================================================

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =====================================================
  // OPEN ADD
  // =====================================================

  const openAddModal = () => {
    setSelectedReminder(null);

    setForm({
      // NEW
      companyName: "",

      title: "",
      description: "",
      date: "",
      startTime: "",
      endTime: "",
      priority: "medium",
      remindBefore: "10",
      repeat: "none",
    });

    setShowModal(true);
  };

  // =====================================================
  // OPEN EDIT
  // =====================================================

  const openEditModal = (
    reminder: CompanyReminder
  ) => {
    if (!isAdmin) return;

    setSelectedReminder(reminder);

    setForm({
      // NEW
      companyName: reminder.companyName || "",

      title: reminder.title,
      description: reminder.description || "",
      date: reminder.date,
      startTime: reminder.startTime || "",
      endTime: reminder.endTime || "",
      priority: reminder.priority,
      remindBefore: String(reminder.remindBefore),
      repeat: reminder.repeat,
    });

    setShowModal(true);
  };

  // =====================================================
  // SAVE
  // =====================================================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!isAdmin) return;

    try {
      const payload = {
        ...form,
        remindBefore: Number(form.remindBefore),
      };

      if (selectedReminder) {
        await axios.patch(
          `${API_URL}/company-reminders/${selectedReminder._id}`,
          payload,
          authConfig
        );
      } else {
        await axios.post(
          `${API_URL}/company-reminders`,
          payload,
          authConfig
        );
      }

      setShowModal(false);

      await loadReminders();
    } catch (error) {
      console.error(
        "Failed to save company reminder:",
        error
      );

      alert("Failed to save reminder");
    }
  };

  // =====================================================
  // DELETE
  // =====================================================

  const handleDelete = async () => {
    if (!isAdmin || !selectedReminder) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this reminder?"
    );

    if (!confirmed) return;

    try {
      await axios.delete(
        `${API_URL}/company-reminders/${selectedReminder._id}`,
        authConfig
      );

      setShowModal(false);

      await loadReminders();
    } catch (error) {
      console.error(
        "Failed to delete reminder:",
        error
      );

      alert("Failed to delete reminder");
    }
  };

  // =====================================================
  // CALENDAR EVENTS
  // =====================================================

  const events = reminders.map((reminder) => {
    let start = reminder.date;

    if (reminder.startTime) {
      start += `T${reminder.startTime}`;
    }

    let end: string | undefined;

    if (reminder.endTime) {
      end = `${reminder.date}T${reminder.endTime}`;
    }

    return {
      id: reminder._id,

      // NEW
      // Shows company name with the reminder title
      title: reminder.companyName
        ? `${reminder.companyName} - ${reminder.title}`
        : reminder.title,

      start,
      end,

      classNames: [
        `priority-${reminder.priority}`,
        reminder.status === "completed"
          ? "completed-reminder"
          : "",
      ],

      extendedProps: {
        reminder,
      },
    };
  });

  // =====================================================
  // EVENT CLICK (OPEN VIEW MODAL)
  // =====================================================

  const handleEventClick = (info: any) => {
    const reminder = info.event.extendedProps.reminder;
    if (!reminder) return;

    setViewingReminder(reminder);
    setShowViewModal(true);
  };

  const handleEditFromView = () => {
    if (!viewingReminder || !isAdmin) return;
    const rem = viewingReminder;
    setShowViewModal(false);
    openEditModal(rem);
  };

  const handleDeleteFromView = async () => {
    if (!isAdmin || !viewingReminder) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this reminder?"
    );

    if (!confirmed) return;

    try {
      await axios.delete(
        `${API_URL}/company-reminders/${viewingReminder._id}`,
        authConfig
      );

      setShowViewModal(false);
      setViewingReminder(null);

      await loadReminders();
    } catch (error) {
      console.error(
        "Failed to delete reminder:",
        error
      );

      alert("Failed to delete reminder");
    }
  };

  // =====================================================
  // DATE CLICK → OPEN ADD REMINDER
  // =====================================================

  const handleDateClick = (info: any) => {
    // Only allow admin to create reminders
    if (!isAdmin) return;

    // Open as a new reminder
    setSelectedReminder(null);

    // Reset form and use clicked date
    setForm({
      // NEW
      companyName: "",

      title: "",
      description: "",
      date: info.dateStr,
      startTime: "",
      endTime: "",
      priority: "medium",
      remindBefore: "10",
      repeat: "none",
    });

    setShowModal(true);
  };

  // =====================================================
// IMPORT EXCEL
// ADMIN ONLY
// =====================================================

const handleExcelImport = async (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  const file = e.target.files?.[0];

  if (!file) return;

  if (
    !file.name.endsWith(".xlsx") &&
    !file.name.endsWith(".xls")
  ) {
    alert("Please select a valid Excel file (.xlsx or .xls)");

    e.target.value = "";
    return;
  }

  try {
    setImportingExcel(true);

    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(
      `${API_URL}/company-reminders/import-excel`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      }
    );

    const data = response.data;

    if (data.failed > 0) {
      alert(
        `Excel imported successfully!\n\n` +
        `Total rows: ${data.totalRows}\n` +
        `Imported: ${data.imported}\n` +
        `Failed: ${data.failed}`
      );
    } else {
      alert(
        `Excel imported successfully!\n\n` +
        `${data.imported} calendar events imported.`
      );
    }

    // Refresh calendar
    await loadReminders();

  } catch (error: any) {
    console.error(
      "Failed to import Excel:",
      error
    );

    alert(
      error?.response?.data?.message ||
      "Failed to import Excel file"
    );
  } finally {
    setImportingExcel(false);

    // Allow selecting the same file again
    e.target.value = "";
  }
};

  return (
    <div className="company-calendar-page">

      {/* HEADER */}

      <div className="company-calendar-header">
        <div>
          <h1>Company Calendar</h1>

          <p>
            Shared company reminders and important events
          </p>
        </div>

        {isAdmin && (
  <div
    style={{
      display: "flex",
      gap: "10px",
      alignItems: "center",
    }}
  >
    {/* IMPORT EXCEL */}

    <button
      className="company-calendar-add-btn"
      onClick={() => fileInputRef.current?.click()}
      disabled={importingExcel}
    >
      <span>↓</span>
      {importingExcel
        ? "Importing..."
        : "Import Excel"}
    </button>

    {/* HIDDEN FILE INPUT */}

    <input
      ref={fileInputRef}
      type="file"
      accept=".xlsx,.xls"
      onChange={handleExcelImport}
      style={{ display: "none" }}
    />

    {/* ADD REMINDER */}

    <button
      className="company-calendar-add-btn"
      onClick={openAddModal}
    >
      <span>+</span>
      Add Reminder
    </button>
  </div>
)}
      </div>

      {/* CALENDAR */}
      <div className="company-calendar-card">

        {loading ? (
          <div className="company-calendar-loading">
            Loading company calendar...
          </div>
        ) : (
          <FullCalendar 
            plugins={[
              dayGridPlugin,
              timeGridPlugin,
              interactionPlugin,
            ]}
            initialView="dayGridMonth"

            dateClick={handleDateClick}

            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right:
                "dayGridMonth,timeGridWeek,timeGridDay",
            }}

            events={events}
            eventClick={handleEventClick}
            height="auto"
            dayMaxEvents={3}
          />
        )}

      </div>

      {/* =====================================
          VIEW DETAILS MODAL (READ ONLY FORMAT)
          ===================================== */}
      <Modal
        show={showViewModal && !!viewingReminder}
        onHide={() => setShowViewModal(false)}
        centered
        className="reminder-view-modal"
      >
        {viewingReminder && (
          <>
            <Modal.Header closeButton className="reminder-header">
              <div className="reminder-view-header-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
                <h4>Company Reminder Details</h4>
              </div>
            </Modal.Header>

            <Modal.Body>
              {/* Hero Section */}
              <div className="reminder-view-hero">
                {viewingReminder.companyName && (
                  <div className="reminder-view-company-badge">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
                      <path d="M9 22v-4h6v4" />
                      <path d="M8 6h.01" />
                      <path d="M16 6h.01" />
                      <path d="M8 10h.01" />
                      <path d="M16 10h.01" />
                    </svg>
                    <span>{viewingReminder.companyName}</span>
                  </div>
                )}
                <h3 className="reminder-view-title">{viewingReminder.title}</h3>
                <div className="reminder-view-badges">
                  <span className={`badge-priority badge-priority-${viewingReminder.priority}`}>
                    {viewingReminder.priority === "high" && "🔴 High Priority"}
                    {viewingReminder.priority === "medium" && "🟡 Medium Priority"}
                    {viewingReminder.priority === "low" && "🟢 Low Priority"}
                  </span>
                  <span className={`badge-status badge-status-${viewingReminder.status}`}>
                    {viewingReminder.status === "completed" ? "✓ Completed" : "⏳ Pending"}
                  </span>
                </div>
              </div>

              {/* Detail Grid */}
              <div className="reminder-view-grid">
                {/* Company (if available) */}
                {viewingReminder.companyName && (
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
                        {viewingReminder.companyName}
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
                      {viewingReminder.status === "completed" ? "Completed" : "Pending"}
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
                      {formatDateDisplay(viewingReminder.date)}
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
                      {viewingReminder.startTime
                        ? `${formatTimeDisplay(viewingReminder.startTime)}${viewingReminder.endTime ? ` - ${formatTimeDisplay(viewingReminder.endTime)}` : ""}`
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
                      {viewingReminder.priority
                        ? viewingReminder.priority.charAt(0).toUpperCase() + viewingReminder.priority.slice(1) + " Priority"
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
                      {formatRemindBeforeDisplay(viewingReminder.remindBefore)}
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
                      {formatRepeatDisplay(viewingReminder.repeat)}
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
                {viewingReminder.description?.trim() ? (
                  <p className="reminder-view-desc-content">{viewingReminder.description}</p>
                ) : (
                  <p className="reminder-view-desc-empty">No details or agenda provided.</p>
                )}
              </div>
            </Modal.Body>

            <Modal.Footer className="reminder-view-modal-footer">
              {isAdmin ? (
                <>
                  <div className="reminder-view-footer-left">
                    <Button variant="danger" className="btn-danger-custom" onClick={handleDeleteFromView}>
                      Delete
                    </Button>
                  </div>
                  <div className="reminder-view-footer-right">
                    <Button variant="light" className="btn-light-custom" onClick={() => setShowViewModal(false)}>
                      Close
                    </Button>
                    <Button className="reminder-btn-edit" onClick={handleEditFromView}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                      Edit Reminder
                    </Button>
                  </div>
                </>
              ) : (
                <div className="reminder-view-footer-right" style={{ width: "100%", justifyContent: "flex-end" }}>
                  <Button variant="light" className="btn-light-custom" onClick={() => setShowViewModal(false)}>
                    Close
                  </Button>
                </div>
              )}
            </Modal.Footer>
          </>
        )}
      </Modal>

      {/* REMINDER MODAL */}

      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        centered
        scrollable
        className="company-reminder-modal"
      >
        <Form onSubmit={handleSubmit}>

          <Modal.Header closeButton className="reminder-header">
            <div>
              <Modal.Title>
                {isAdmin
                  ? selectedReminder
                    ? "Edit Company Reminder"
                    : "Add Company Reminder"
                  : "Company Reminder"}
              </Modal.Title>

              {!isAdmin && (
                <small className="text-muted">
                  Read-only company reminder
                </small>
              )}
            </div>
          </Modal.Header>

          <Modal.Body>

            <div className="reminder-modal-form">

              {/* NEW: Company Name */}

              <div className="form-group-full">
                <Form.Label>Company Name</Form.Label>

                <Form.Control
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  placeholder="e.g. ABC Pvt Ltd"
                  disabled={!isAdmin}
                  required
                />
              </div>

              {/* Title */}

              <div className="form-group-full">
                <Form.Label>Title</Form.Label>

                <Form.Control
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. Product video shoot"
                  disabled={!isAdmin}
                  required
                />
              </div>

              {/* Description */}

              <div className="form-group-full">
                <Form.Label>Description</Form.Label>

                <Form.Control
                  as="textarea"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Add details or meeting agenda..."
                  rows={3}
                  disabled={!isAdmin}
                />
              </div>

              {/* Date & Priority */}

              <div className="reminder-form-row">

                <div className="form-group-half">
                  <Form.Label>Date</Form.Label>

                  <Form.Control
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={handleChange}
                    disabled={!isAdmin}
                    required
                  />
                </div>

                <div className="form-group-half">
                  <Form.Label>Priority</Form.Label>

                  <Form.Select
                    name="priority"
                    className="company-reminder-select"
                    value={form.priority}
                    onChange={handleChange}
                    disabled={!isAdmin}
                  >
                    <option value="low">
                      Low Priority
                    </option>

                    <option value="medium">
                      Medium Priority
                    </option>

                    <option value="high">
                      High Priority
                    </option>
                  </Form.Select>
                </div>

              </div>

              {/* Start Time & End Time */}

              <div className="reminder-form-row">

                <div className="form-group-half">
                  <Form.Label>Start Time</Form.Label>

                  <Form.Control
                    type="time"
                    name="startTime"
                    value={form.startTime}
                    onChange={handleChange}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="form-group-half">
                  <Form.Label>End Time</Form.Label>

                  <Form.Control
                    type="time"
                    name="endTime"
                    value={form.endTime}
                    onChange={handleChange}
                    disabled={!isAdmin}
                  />
                </div>

              </div>

              {/* Remind Before & Repeat */}

              <div className="reminder-form-row">

                <div className="form-group-half">
                  <Form.Label>
                    Remind me before
                  </Form.Label>

                  <Form.Select
                    name="remindBefore"
                    className="company-reminder-select"
                    value={form.remindBefore}
                    onChange={handleChange}
                    disabled={!isAdmin}
                  >
                    <option value="0">
                      At time of event
                    </option>

                    <option value="5">
                      5 minutes before
                    </option>

                    <option value="10">
                      10 minutes before
                    </option>

                    <option value="30">
                      30 minutes before
                    </option>

                    <option value="60">
                      1 hour before
                    </option>
                  </Form.Select>
                </div>

                <div className="form-group-half">
                  <Form.Label>Repeat</Form.Label>

                  <Form.Select
                    name="repeat"
                    className="company-reminder-select"
                    value={form.repeat}
                    onChange={handleChange}
                    disabled={!isAdmin}
                  >
                    <option value="none">
                      Does not repeat
                    </option>

                    <option value="daily">
                      Daily
                    </option>

                    <option value="weekly">
                      Weekly
                    </option>

                    <option value="monthly">
                      Monthly
                    </option>
                  </Form.Select>
                </div>

              </div>

            </div>

          </Modal.Body>

          <Modal.Footer>

            {isAdmin && selectedReminder && (
              <Button
                variant="danger"
                className="btn-danger-custom"
                onClick={handleDelete}
              >
                Delete
              </Button>
            )}

            <Button
              variant="light"
              className="btn-light-custom"
              onClick={() => setShowModal(false)}
            >
              Close
            </Button>

            {isAdmin && (
              <Button
                variant="primary"
                className="btn-primary-custom"
                type="submit"
              >
                {selectedReminder
                  ? "Save Changes"
                  : "Create Reminder"}
              </Button>
            )}

          </Modal.Footer>

        </Form>
      </Modal>

    </div>
  );
};

export default CompanyCalendar;