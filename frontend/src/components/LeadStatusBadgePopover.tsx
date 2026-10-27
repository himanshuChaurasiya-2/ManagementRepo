import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import "./LeadStatusBadgePopover.css";

export type LeadStatus =
  | "Interested"
  | "Not Interested"
  | "No Contact"
  | "Follow up"
  | "Junk";

export type LeadSubStatus =
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

export interface StatusConfigItem {
  status: LeadStatus;
  label: string;
  color: string;
  bg: string;
  border: string;
  dotColor: string;
  subStatuses: {
    id: LeadSubStatus;
    label: string;
  }[];
}

export const LEAD_STATUS_CONFIG: StatusConfigItem[] = [
  {
    status: "Interested",
    label: "Interested",
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.12)",
    border: "rgba(16, 185, 129, 0.3)",
    dotColor: "#10b981",
    subStatuses: [
      { id: "Hot", label: "Hot" },
      { id: "Warm", label: "Warm" },
      { id: "Cold", label: "Cold" },
    ],
  },
  {
    status: "Follow up",
    label: "Follow Up",
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.3)",
    dotColor: "#f59e0b",
    subStatuses: [
      { id: "Call Me Later", label: "Call Me Later" },
      { id: "Call Disconnected", label: "Call Disconnected" },
    ],
  },
  {
    status: "No Contact",
    label: "No Contact",
    color: "#3b82f6",
    bg: "rgba(59, 130, 246, 0.12)",
    border: "rgba(59, 130, 246, 0.3)",
    dotColor: "#3b82f6",
    subStatuses: [
      { id: "Ring Not Received", label: "Ring Not Received" },
      { id: "Switched Off", label: "Switched Off" },
      { id: "Incoming Not Available", label: "Incoming Not Available" },
    ],
  },
  {
    status: "Not Interested",
    label: "Not Interested",
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.12)",
    border: "rgba(239, 68, 68, 0.3)",
    dotColor: "#ef4444",
    subStatuses: [
      { id: "Pricing Issue", label: "Pricing Issue" },
      { id: "Not Required", label: "Not Required" },
      { id: "Evaluating Competitors", label: "Evaluating Competitors" },
    ],
  },
  {
    status: "Junk",
    label: "Junk",
    color: "#94a3b8",
    bg: "rgba(148, 163, 184, 0.12)",
    border: "rgba(148, 163, 184, 0.3)",
    dotColor: "#94a3b8",
    subStatuses: [],
  },
];

interface LeadStatusBadgePopoverProps {
  currentStatus?: LeadStatus | "";
  currentSubStatus?: LeadSubStatus | "";
  isLoading?: boolean;
  disabled?: boolean;
  onUpdate: (status: LeadStatus, subStatus: LeadSubStatus) => Promise<void> | void;
  size?: "sm" | "md" | "lg";
  align?: "left" | "right" | "center";
}

export const LeadStatusBadgePopover: React.FC<LeadStatusBadgePopoverProps> = ({
  currentStatus,
  currentSubStatus,
  isLoading = false,
  disabled = false,
  onUpdate,
  size = "md",
  align = "left",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMainStatus, setSelectedMainStatus] = useState<LeadStatus>(
    (currentStatus ? currentStatus : "Interested") as LeadStatus
  );
  const [coords, setCoords] = useState<{ top: number; left: number; isMobile: boolean }>({
    top: 0,
    left: 0,
    isMobile: false,
  });

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Sync internal selectedMainStatus if currentStatus changes
  useEffect(() => {
    if (currentStatus) {
      setSelectedMainStatus(currentStatus as LeadStatus);
    }
  }, [currentStatus]);

  // Update popup position
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const isMobile = window.innerWidth <= 640;
    if (isMobile) {
      setCoords({ top: 0, left: 0, isMobile: true });
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 300;
    const popoverHeight = 190;

    let left = rect.left;
    if (align === "right") {
      left = rect.right - popoverWidth;
    } else if (align === "center") {
      left = rect.left + rect.width / 2 - popoverWidth / 2;
    }

    // Clamp within viewport
    left = Math.max(12, Math.min(left, window.innerWidth - popoverWidth - 12));

    // Place below or above trigger
    const spaceBelow = window.innerHeight - rect.bottom;
    let top = rect.bottom + 6;
    if (spaceBelow < popoverHeight && rect.top > popoverHeight) {
      top = rect.top - popoverHeight - 6;
    }

    setCoords({ top, left, isMobile: false });
  }, [align]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleResize = () => updatePosition();
      const handleScroll = () => {
        if (window.innerWidth > 640) updatePosition();
      };
      window.addEventListener("resize", handleResize);
      window.addEventListener("scroll", handleScroll, true);
      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("scroll", handleScroll, true);
      };
    }
  }, [isOpen, updatePosition]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const activeConfig = LEAD_STATUS_CONFIG.find((c) => c.status === currentStatus);
  const activeSubStatusItem = activeConfig?.subStatuses.find((s) => s.id === currentSubStatus);

  const selectedMainConfig =
    LEAD_STATUS_CONFIG.find((c) => c.status === selectedMainStatus) ||
    LEAD_STATUS_CONFIG[0];

  const handleSelectStatus = async (
    status: LeadStatus,
    subStatus: LeadSubStatus
  ) => {
    if (disabled || isLoading) return;
    setIsOpen(false);
    await onUpdate(status, subStatus);
  };

  const handleMainStatusClick = (status: LeadStatus) => {
    setSelectedMainStatus(status);
    if (status === "Junk") {
      handleSelectStatus("Junk", "");
    }
  };

  const triggerLabel = activeConfig ? activeConfig.label : "Select Status";
  const subLabel = activeSubStatusItem?.label;
  const fullTitle = activeConfig
    ? subLabel
      ? `${activeConfig.label} • ${subLabel} (Click to change)`
      : `${activeConfig.label} (Click to change)`
    : "Select Status (Click to change)";

  return (
    <div className={`chained-status-container chained-status-${size}`}>
      {/* TRIGGER BADGE PILL */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || isLoading}
        onClick={() => {
          if (!disabled && !isLoading) {
            setIsOpen((prev) => !prev);
          }
        }}
        className={`chained-status-pill ${
          activeConfig
            ? `status-${activeConfig.status.toLowerCase().replace(/\s+/g, "-")}`
            : "status-unassigned"
        } ${isOpen ? "active-open" : ""}`}
        style={
          activeConfig
            ? {
                backgroundColor: activeConfig.bg,
                borderColor: activeConfig.border,
                color: activeConfig.color,
              }
            : undefined
        }
        title={fullTitle}
      >
        {isLoading ? (
          <span className="chained-status-spinner" />
        ) : (
          <span
            className="chained-status-dot"
            style={{
              backgroundColor: activeConfig ? activeConfig.dotColor : "#94a3b8",
            }}
          />
        )}

        <span className="chained-status-text">
          <span className="main-label">{triggerLabel}</span>
          {subLabel && (
            <span className="sub-label">
              <span className="dot-sep">•</span>
              <span className="sub-label-text">{subLabel}</span>
            </span>
          )}
        </span>

        <span className="chained-status-caret" aria-hidden="true">
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {/* PORTALLED POPUP / DROPDOWN */}
      {isOpen &&
        createPortal(
          coords.isMobile ? (
            /* MOBILE OVERLAY & SHEET */
            <div
              className="chained-status-mobile-backdrop"
              onClick={() => setIsOpen(false)}
            >
              <div
                ref={popoverRef}
                className="chained-status-menu mobile-view"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-label="Select Status"
              >
                <div className="chained-menu-grid">
                  {/* MAIN STATUS LIST */}
                  <div className="chained-menu-col main-col">
                    {LEAD_STATUS_CONFIG.map((item) => {
                      const isSelected = selectedMainStatus === item.status;
                      const isCurrent = currentStatus === item.status;
                      return (
                        <button
                          key={item.status}
                          type="button"
                          className={`chained-menu-item main-item ${
                            isSelected ? "selected" : ""
                          } ${isCurrent ? "current" : ""}`}
                          onClick={() => handleMainStatusClick(item.status)}
                        >
                          <span
                            className="item-dot"
                            style={{ backgroundColor: item.dotColor }}
                          />
                          <span className="item-title">{item.label}</span>
                          {item.subStatuses.length > 0 && (
                            <span className="item-arrow">›</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* SUB-STATUS LIST */}
                  <div className="chained-menu-col sub-col">
                    {selectedMainConfig.subStatuses.length > 0 ? (
                      selectedMainConfig.subStatuses.map((sub) => {
                        const isCurrentFull =
                          currentStatus === selectedMainConfig.status &&
                          currentSubStatus === sub.id;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            className={`chained-menu-item sub-item ${
                              isCurrentFull ? "current-sub" : ""
                            }`}
                            onClick={() =>
                              handleSelectStatus(selectedMainConfig.status, sub.id)
                            }
                          >
                            <span className="item-title">{sub.label}</span>
                            {/* {isCurrentFull && (
                              <span className="item-check">✓</span>
                            )} */}
                          </button>
                        );
                      })
                    ) : (
                      <div className="chained-no-sub">—</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* DESKTOP / TABLET FLOATING MENU */
            <div
              ref={popoverRef}
              className="chained-status-menu desktop-view"
              style={{
                top: `${coords.top}px`,
                left: `${coords.left}px`,
              }}
              role="dialog"
              aria-label="Select Status"
            >
              <div className="chained-menu-grid">
                {/* MAIN STATUS LIST */}
                <div className="chained-menu-col main-col">
                  {LEAD_STATUS_CONFIG.map((item) => {
                    const isSelected = selectedMainStatus === item.status;
                    const isCurrent = currentStatus === item.status;
                    return (
                      <button
                        key={item.status}
                        type="button"
                        className={`chained-menu-item main-item ${
                          isSelected ? "selected" : ""
                        } ${isCurrent ? "current" : ""}`}
                        onMouseEnter={() => setSelectedMainStatus(item.status)}
                        onClick={() => handleMainStatusClick(item.status)}
                      >
                        <span
                          className="item-dot"
                          style={{ backgroundColor: item.dotColor }}
                        />
                        <span className="item-title">{item.label}</span>
                        {item.subStatuses.length > 0 && (
                          <span className="item-arrow">›</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* SUB-STATUS LIST */}
                <div className="chained-menu-col sub-col">
                  {selectedMainConfig.subStatuses.length > 0 ? (
                    selectedMainConfig.subStatuses.map((sub) => {
                      const isCurrentFull =
                        currentStatus === selectedMainConfig.status &&
                        currentSubStatus === sub.id;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          className={`chained-menu-item sub-item ${
                            isCurrentFull ? "current-sub" : ""
                          }`}
                          onClick={() =>
                            handleSelectStatus(selectedMainConfig.status, sub.id)
                          }
                        >
                          <span className="item-title">{sub.label}</span>
                          {/* {isCurrentFull && (
                            <span className="item-check">✓</span>
                          )} */}
                        </button>
                      );
                    })
                  ) : (
                    <div className="chained-no-sub">—</div>
                  )}
                </div>
              </div>
            </div>
          ),
          document.body
        )}
    </div>
  );
};

export default LeadStatusBadgePopover;
