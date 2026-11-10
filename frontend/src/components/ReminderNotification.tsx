import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import "./ReminderNotification.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// =====================================================
// TYPES
// =====================================================

interface CompanyReminder {
  _id: string;
  title: string;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  remindBefore: number;
  repeat: "none" | "daily" | "weekly" | "monthly";
  status: "pending" | "completed";
}

interface PersonalReminder {
  _id: string;
  title: string;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  reminderMinutes: number;
  repeat: "none" | "daily" | "weekly" | "monthly";
  status: "pending" | "completed";
}

type ReminderType = "company" | "personal";

interface ReminderData {
  _id: string;
  title: string;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  repeat: "none" | "daily" | "weekly" | "monthly";
  status: "pending" | "completed";

  remindBefore?: number;
  reminderMinutes?: number;
}

interface ActiveReminder {
  reminder: ReminderData;
  type: ReminderType;
}

// =====================================================
// COMPONENT
// =====================================================

const ReminderNotification = () => {
  const { user } = useAuth();

  const checkingRef = useRef(false);

  const [activeReminder, setActiveReminder] =
    useState<ActiveReminder | null>(null);

  const [isVisible, setIsVisible] = useState(false);

  // =====================================================
  // REQUEST NOTIFICATION PERMISSION
  // =====================================================

  useEffect(() => {
    if (!user) return;

    const requestPermission = async () => {
      if (!("Notification" in window)) {
        console.warn(
          "Browser notifications are not supported"
        );
        return;
      }

      if (Notification.permission === "default") {
        try {
          await Notification.requestPermission();
        } catch (error) {
          console.error(
            "Notification permission error:",
            error
          );
        }
      }
    };

    requestPermission();
  }, [user]);

  // =====================================================
  // CHECK ALL REMINDERS
  // =====================================================

  useEffect(() => {
    if (!user) return;

    const checkReminders = async () => {
      if (checkingRef.current) return;

      checkingRef.current = true;

      try {
        const token = localStorage.getItem("token");

        if (!token) return;

        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };

        // =================================================
        // COMPANY REMINDERS
        // =================================================

        const companyResponse =
          await axios.get<CompanyReminder[]>(
            `${API_URL}/company-reminders`,
            config
          );

        // =================================================
        // PERSONAL REMINDERS
        // =================================================

        const personalResponse =
          await axios.get<PersonalReminder[]>(
            `${API_URL}/reminders/my`,
            config
          );

        const now = new Date();

        // =================================================
        // CHECK COMPANY
        // =================================================

        for (const reminder of companyResponse.data) {
          await checkSingleReminder(
            reminder,
            "company",
            now
          );
        }

        // =================================================
        // CHECK PERSONAL
        // =================================================

        for (const reminder of personalResponse.data) {
          await checkSingleReminder(
            reminder,
            "personal",
            now
          );
        }
      } catch (error) {
        console.error(
          "Failed to check reminders:",
          error
        );
      } finally {
        checkingRef.current = false;
      }
    };

    // Check immediately
    checkReminders();

    // Check every 10 seconds
    const interval = window.setInterval(
      checkReminders,
      10000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [user]);

  // =====================================================
  // CLOSE CARD
  // =====================================================

  const closeReminder = () => {
    setIsVisible(false);

    // Wait for exit animation
    setTimeout(() => {
      setActiveReminder(null);
    }, 250);
  };

  // =====================================================
  // FORMAT TIME
  // =====================================================

  const formatTime = (time?: string) => {
    if (!time) return "";

    const [hours, minutes] =
      time.split(":").map(Number);

    const date = new Date();

    date.setHours(hours);
    date.setMinutes(minutes);

    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // =====================================================
  // RENDER
  // =====================================================

useEffect(() => {
  const handleReminderCard = (
    event: Event
  ) => {
    const customEvent =
      event as CustomEvent<ActiveReminder>;

    if (!customEvent.detail) return;

    setActiveReminder(customEvent.detail);
    setIsVisible(true);

    // Automatically hide after 8 seconds
    window.setTimeout(() => {
      setIsVisible(false);

      window.setTimeout(() => {
        setActiveReminder(null);
      }, 250);
    }, 8000);
  };

  window.addEventListener(
    "show-reminder-card",
    handleReminderCard
  );

  return () => {
    window.removeEventListener(
      "show-reminder-card",
      handleReminderCard
    );
  };
}, []);


  if (!activeReminder) {
    return null;
  }

  const { reminder, type } = activeReminder;

  return (
    <div
      className={`reminder-card ${
        isVisible
          ? "reminder-card-show"
          : "reminder-card-hide"
      }`}
    >
      {/* ICON */}

      <div className="reminder-card-icon">
        📅
      </div>

      {/* CONTENT */}

      <div className="reminder-card-content">
        <div className="reminder-card-header">
          <span className="reminder-card-label">
            {type === "company"
              ? "Company Reminder"
              : "Personal Reminder"}
          </span>

          <button
            type="button"
            className="reminder-card-close"
            onClick={closeReminder}
            aria-label="Close reminder"
          >
            ×
          </button>
        </div>

        <strong className="reminder-card-title">
          {reminder.title}
        </strong>

        {reminder.description && (
          <p className="reminder-card-description">
            {reminder.description}
          </p>
        )}

        <div className="reminder-card-time">
          🕐{" "}
          {formatTime(reminder.startTime)}

          {reminder.endTime && (
            <>
              {" "}
              - {formatTime(reminder.endTime)}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// =====================================================
// CHECK SINGLE REMINDER
// =====================================================

const checkSingleReminder = async (
  reminder: ReminderData,
  type: ReminderType,
  now: Date
) => {
  // Ignore completed reminders
  if (
    reminder.status === "completed" ||
    !reminder.startTime
  ) {
    return;
  }

  // =====================================================
  // CREATE EVENT DATE/TIME (LOCAL TIME)
  // =====================================================
  const dateStr = String(reminder.date).substring(0, 10);
  const parts = dateStr.split("-");
  if (parts.length < 3) return;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return;
  }

  let hours = 0;
  let minutes = 0;
  if (reminder.startTime) {
    const timeParts = reminder.startTime.split(":");
    hours = parseInt(timeParts[0], 10) || 0;
    minutes = parseInt(timeParts[1], 10) || 0;
  }

  const eventDateTime = new Date(year, month, day, hours, minutes, 0, 0);

  if (isNaN(eventDateTime.getTime())) {
    console.warn("Invalid reminder date:", reminder);
    return;
  }

  // =====================================================
  // GET REMINDER MINUTES
  // =====================================================
  const minutesBefore =
    type === "company"
      ? (reminder.remindBefore ?? 10)
      : (reminder.reminderMinutes ?? 10);

  // =====================================================
  // CALCULATE REMINDER TIME
  // =====================================================
  const reminderTime =
    eventDateTime.getTime() -
    minutesBefore * 60 * 1000;

  const currentTime = now.getTime();

  // Trigger if current time has reached reminderTime AND event is not older than 30 mins past event start
  const hasReachedReminderTime = currentTime >= reminderTime;
  const isStillRelevant = currentTime <= eventDateTime.getTime() + 30 * 60 * 1000;

  if (hasReachedReminderTime && isStillRelevant) {
    await triggerReminder(
      reminder,
      type,
      dateStr,
      minutesBefore
    );
  }
};

// =====================================================
// TRIGGER REMINDER
// =====================================================

const triggerReminder = async (
  reminder: ReminderData,
  type: ReminderType,
  dateStr: string,
  minutesBefore: number
) => {
  const notificationKey = `${type}-reminder-${reminder._id}-${dateStr}-${reminder.startTime || "allday"}-${minutesBefore}`;

  const alreadyNotified = localStorage.getItem(notificationKey);

  if (alreadyNotified === "true") {
    return;
  }

  // MARK AS NOTIFIED
  localStorage.setItem(notificationKey, "true");

  console.log(
    `🔔 ${type.toUpperCase()} REMINDER:`,
    reminder.title
  );

  // SHOW IN-APP CARD
  window.dispatchEvent(
    new CustomEvent("show-reminder-card", {
      detail: {
        reminder,
        type,
      },
    })
  );

  // BROWSER NOTIFICATION
  const notificationTitle =
    type === "company"
      ? `🔔 Company Reminder: ${reminder.title}`
      : `🔔 Personal Reminder: ${reminder.title}`;

  if (
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    try {
      const notification = new Notification(notificationTitle, {
        body:
          reminder.description ||
          "You have a scheduled reminder.",
        icon: "/favicon.ico",
        tag: notificationKey,
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error("Browser notification failed:", error);
    }
  }

  // ALARM SOUND
  playAlarmSound();
};

// =====================================================
// ALARM SOUND
// =====================================================

const playAlarmSound = () => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;

    if (!AudioContextClass) {
      console.warn("AudioContext not supported");
      return;
    }

    const audioContext = new AudioContextClass();

    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    gain.gain.setValueAtTime(0.3, audioContext.currentTime);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 1);

    oscillator.onended = () => {
      audioContext.close();
    };
  } catch (error) {
    console.error("Alarm sound failed:", error);
  }
};

export default ReminderNotification;