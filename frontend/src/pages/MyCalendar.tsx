import React, { useEffect, useState } from "react";
import axios from "axios";
import { AlertCircle, Check, Clock } from "lucide-react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

import {
  Modal,
  Button,
  Form,
} from "react-bootstrap";

import "./pages.css";

interface Reminder {
  _id: string;
  title: string;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  priority: "low" | "medium" | "high";
  reminderMinutes: number;
  status: "pending" | "completed";
  repeat: "none" | "daily" | "weekly" | "monthly";
}

const API_URL = "http://localhost:5000/api";

const getAuthConfig = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

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

const formatReminderMinutes = (mins?: number) => {
  if (mins === undefined || mins === null) return "At time of event";
  if (mins === 0) return "At time of event";
  if (mins === 60) return "1 hour before";
  return `${mins} minutes before`;
};

const formatRepeat = (repeat?: string) => {
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

const MyCalendar: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const [editingReminder, setEditingReminder] =
    useState<Reminder | null>(null);
  const [viewingReminder, setViewingReminder] =
    useState<Reminder | null>(null);

  const [, setNotificationPermission] =
  useState<NotificationPermission>("default");


  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    priority: "medium",
    reminderMinutes: 10,
    repeat: "none",
  });

  // =========================
  // LOAD REMINDERS
  // =========================

  const loadReminders = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/reminders/my`,
        getAuthConfig()
      );

      setReminders(response.data);
    } catch (error) {
      console.error("Failed to load reminders", error);
    }
  };

  useEffect(() => {
    loadReminders();
  }, []);

  // =========================
// NOTIFICATION PERMISSION
// =========================

useEffect(() => {
  if (!("Notification" in window)) {
    console.warn("Browser notifications are not supported.");
    return;
  }

  setNotificationPermission(Notification.permission);

  if (Notification.permission === "default") {
    Notification.requestPermission().then((permission) => {
      setNotificationPermission(permission);
    });
  }
}, []);

  // =========================
  // OPEN CREATE MODAL
  // =========================

  const handleDateClick = (info: any) => {
    setEditingReminder(null);

    setForm({
      title: "",
      description: "",
      date: info.dateStr,
      startTime: "",
      endTime: "",
      priority: "medium",
      reminderMinutes: 10,
      repeat: "none",
    });

    setShowModal(true);
  };

  // =========================
  // VIEW REMINDER (CLICK EVENT)
  // =========================

  const handleEventClick = (info: any) => {
    const reminder = reminders.find(
      (item) => item._id === info.event.id
    );

    if (!reminder) return;

    setViewingReminder(reminder);
    setShowViewModal(true);
  };

  // Transition from View to Edit
  const handleEditFromView = () => {
    if (!viewingReminder) return;

    setEditingReminder(viewingReminder);

    setForm({
      title: viewingReminder.title,
      description: viewingReminder.description || "",
      date: viewingReminder.date.substring(0, 10),
      startTime: viewingReminder.startTime || "",
      endTime: viewingReminder.endTime || "",
      priority: viewingReminder.priority,
      reminderMinutes: viewingReminder.reminderMinutes,
      repeat: viewingReminder.repeat,
    });

    setShowViewModal(false);
    setShowModal(true);
  };

  // Delete from View modal
  const handleDeleteFromView = async () => {
    if (!viewingReminder) return;

    if (!window.confirm("Delete this reminder?")) {
      return;
    }

    try {
      await axios.delete(
        `${API_URL}/reminders/${viewingReminder._id}`,
        getAuthConfig()
      );

      setShowViewModal(false);
      setViewingReminder(null);
      await loadReminders();
    } catch (error) {
      console.error("Delete error", error);
    }
  };

  // Complete from View modal
  const handleCompleteFromView = async () => {
    if (!viewingReminder) return;

    try {
      await axios.patch(
        `${API_URL}/reminders/${viewingReminder._id}/complete`,
        {},
        getAuthConfig()
      );

      setShowViewModal(false);
      setViewingReminder(null);
      await loadReminders();
    } catch (error) {
      console.error("Complete error", error);
    }
  };

  // =========================
  // SAVE REMINDER
  // =========================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingReminder) {
        await axios.patch(
          `${API_URL}/reminders/${editingReminder._id}`,
          form,
          getAuthConfig()
        );
      } else {
        await axios.post(
          `${API_URL}/reminders`,
          form,
          getAuthConfig()
        );
      }

      setShowModal(false);

      await loadReminders();
    } catch (error) {
      console.error("Failed to save reminder", error);
      alert("Failed to save reminder");
    }
  };

  // =========================
  // DELETE
  // =========================

  const handleDelete = async () => {
    if (!editingReminder) return;

    if (!window.confirm("Delete this reminder?")) {
      return;
    }

    try {
      await axios.delete(
        `${API_URL}/reminders/${editingReminder._id}`,
        getAuthConfig()
      );

      setShowModal(false);

      await loadReminders();
    } catch (error) {
      console.error("Delete error", error);
    }
  };

  // =========================
  // COMPLETE
  // =========================

  const handleComplete = async () => {
    if (!editingReminder) return;

    try {
      await axios.patch(
        `${API_URL}/reminders/${editingReminder._id}/complete`,
        {},
        getAuthConfig()
      );

      setShowModal(false);

      await loadReminders();
    } catch (error) {
      console.error("Complete error", error);
    }
  };

  // =========================
  // CALENDAR EVENTS
  // =========================

  const events = reminders.map((reminder) => {
    const start = reminder.startTime
      ? `${reminder.date.substring(0, 10)}T${reminder.startTime}`
      : reminder.date.substring(0, 10);

    return {
      id: reminder._id,
      title: reminder.title,
      start,
      allDay: !reminder.startTime,
      className:
        reminder.status === "completed"
          ? "completed-reminder"
          : `priority-${reminder.priority}`,
    };
  });

  return (
    <div className="calendar-page">

      <div className="calendar-header">
        <div>
          <h2>My Calendar</h2>

          <p>
            Manage your personal reminders and daily work
          </p>
        </div>

        <Button
          className="add-reminder-btn"
          onClick={() => {
            setEditingReminder(null);

            setForm({
              title: "",
              description: "",
              date: new Date()
                .toISOString()
                .substring(0, 10),
              startTime: "",
              endTime: "",
              priority: "medium",
              reminderMinutes: 10,
              repeat: "none",
            });

            setShowModal(true);
          }}
        >
          + Add Reminder
        </Button>
      </div>

      <div className="calendar-card">

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
          events={events}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          height="auto"
          selectable
        />

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
            <Modal.Header closeButton>
              <div className="reminder-view-header-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
                <h4>Reminder Details</h4>
              </div>
            </Modal.Header>

            <Modal.Body>
              {/* Hero Section */}
              <div className="reminder-view-hero">
                <h3 className="reminder-view-title">{viewingReminder.title}</h3>
                <div className="reminder-view-badges">
                  <span className={`badge-priority badge-priority-${viewingReminder.priority}`} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <AlertCircle size={12} />
                    <span>
                      {viewingReminder.priority === "high" && "High Priority"}
                      {viewingReminder.priority === "medium" && "Medium Priority"}
                      {viewingReminder.priority === "low" && "Low Priority"}
                    </span>
                  </span>
                  <span className={`badge-status badge-status-${viewingReminder.status}`} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    {viewingReminder.status === "completed" ? (
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
                </div>
              </div>

              {/* Detail Grid */}
              <div className="reminder-view-grid">
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
                      {formatReminderMinutes(viewingReminder.reminderMinutes)}
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
                      {formatRepeat(viewingReminder.repeat)}
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
                  <span>Notes & Description</span>
                </div>
                {viewingReminder.description?.trim() ? (
                  <p className="reminder-view-desc-content">{viewingReminder.description}</p>
                ) : (
                  <p className="reminder-view-desc-empty">No description provided for this reminder.</p>
                )}
              </div>
            </Modal.Body>

            <Modal.Footer className="reminder-view-modal-footer">
              <div className="reminder-view-footer-left">
                <Button variant="danger" className="btn-danger" onClick={handleDeleteFromView}>
                  Delete
                </Button>
                {viewingReminder.status !== "completed" && (
                  <Button variant="success" className="btn-success" onClick={handleCompleteFromView}>
                    Mark Complete
                  </Button>
                )}
              </div>

              <div className="reminder-view-footer-right">
                <Button variant="light" onClick={() => setShowViewModal(false)}>
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
            </Modal.Footer>
          </>
        )}
      </Modal>

      {/* EDIT / CREATE MODAL */}
      <Modal
  show={showModal}
  onHide={() => setShowModal(false)}
  centered
  size="lg"
  className="reminder-modal"
>
  <Form onSubmit={handleSubmit}>
    <Modal.Header closeButton>
      <Modal.Title>
        {editingReminder ? "Edit Reminder" : "Add Reminder"}
      </Modal.Title>
    </Modal.Header>

    <Modal.Body>
      {/* ================= TITLE ================= */}
      <Form.Group className="mb-4">
        <Form.Label>Title</Form.Label>

        <Form.Control
          type="text"
          placeholder="e.g. Call ABC Company"
          value={form.title}
          onChange={(e) =>
            setForm({
              ...form,
              title: e.target.value,
            })
          }
          required
        />
      </Form.Group>

      {/* ================= DESCRIPTION ================= */}
      <Form.Group className="mb-4">
        <Form.Label>Description</Form.Label>

        <Form.Control
          as="textarea"
          rows={3}
          placeholder="Add details..."
          value={form.description}
          onChange={(e) =>
            setForm({
              ...form,
              description: e.target.value,
            })
          }
        />
      </Form.Group>

      {/* ================= DATE + PRIORITY ================= */}
      <div className="row g-3">
        <div className="col-md-6">
          <Form.Group>
            <Form.Label>Date</Form.Label>

            <Form.Control
              type="date"
              value={form.date}
              onChange={(e) =>
                setForm({
                  ...form,
                  date: e.target.value,
                })
              }
              required
            />
          </Form.Group>
        </div>

        <div className="col-md-6">
          <Form.Group>
            <Form.Label>Priority</Form.Label>

            <Form.Select
              value={form.priority}
              onChange={(e) =>
                setForm({
                  ...form,
                  priority: e.target.value,
                })
              }
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Form.Select>
          </Form.Group>
        </div>
      </div>

      {/* ================= START + END TIME ================= */}
      <div className="row g-3 mt-1">
        <div className="col-md-6">
          <Form.Group>
            <Form.Label>Start Time</Form.Label>

            <Form.Control
              type="time"
              value={form.startTime}
              onChange={(e) =>
                setForm({
                  ...form,
                  startTime: e.target.value,
                })
              }
            />
          </Form.Group>
        </div>

        <div className="col-md-6">
          <Form.Group>
            <Form.Label>End Time</Form.Label>

            <Form.Control
              type="time"
              value={form.endTime}
              onChange={(e) =>
                setForm({
                  ...form,
                  endTime: e.target.value,
                })
              }
            />
          </Form.Group>
        </div>
      </div>

      {/* ================= REMINDER + REPEAT ================= */}
      <div className="row g-3 mt-1">
        <div className="col-md-6">
          <Form.Group>
            <Form.Label>Remind me before</Form.Label>

            <Form.Select
              value={form.reminderMinutes}
              onChange={(e) =>
                setForm({
                  ...form,
                  reminderMinutes: Number(e.target.value),
                })
              }
            >
              <option value="0">At time</option>
              <option value="5">5 minutes before</option>
              <option value="10">10 minutes before</option>
              <option value="15">15 minutes before</option>
              <option value="30">30 minutes before</option>
              <option value="60">1 hour before</option>
            </Form.Select>
          </Form.Group>
        </div>

        <div className="col-md-6">
          <Form.Group>
            <Form.Label>Repeat</Form.Label>

            <Form.Select
              value={form.repeat}
              onChange={(e) =>
                setForm({
                  ...form,
                  repeat: e.target.value,
                })
              }
            >
              <option value="none">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </Form.Select>
          </Form.Group>
        </div>
      </div>
    </Modal.Body>

    {/* ================= FOOTER ================= */}
    <Modal.Footer className="reminder-modal-footer">
      <div className="reminder-footer-left">
        {editingReminder && (
          <>
            <Button
              variant="danger"
              onClick={handleDelete}
            >
              Delete
            </Button>

            {editingReminder.status !== "completed" && (
              <Button
                variant="success"
                onClick={handleComplete}
              >
                Mark Complete
              </Button>
            )}
          </>
        )}
      </div>

      <div className="reminder-footer-right">
        <Button
          variant="light"
          className="reminder-cancel-btn btn-light-custom"
          onClick={() => setShowModal(false)}
        >
          Close
        </Button>

        <Button
          variant="primary"
          type="submit"
        >
          {editingReminder
            ? "Update Reminder"
            : "Create Reminder"}
        </Button>
      </div>
    </Modal.Footer>
  </Form>
</Modal>

    </div>
  );
};

export default MyCalendar;