import mongoose, { Document, Schema } from "mongoose";

// =====================================================
// STATUS TYPES
// =====================================================

export type LeadStatus =
  | "Select"
  | "Interested"
  | "Not Interested"
  | "No Contact"
  | "Follow up"
  | "Junk";

// =====================================================
// SUB STATUS TYPES
// =====================================================

export type LeadSubStatus =
  // Interested
  | "Hot"
  | "Warm"
  | "Cold"

  // Not Interested
  | "Pricing Issue"
  | "Not Required"
  | "Evaluating Competitors"

  // No Contact
  | "Ring Not Received"
  | "Switched Off"
  | "Incoming Not Available"

  // Followup
  | "Call Me Later"
  | "Call Disconnected"

  // Junk has no sub-status
  | "";

// =====================================================
// LEAD INTERFACE
// =====================================================

export interface ILead extends Document {
  srNo?: number;

  name: string;
  phone: string;
  email?: string;
  company?: string;
  source?: string;

  status: LeadStatus;
  subStatus: LeadSubStatus;

  notes?: string;

  uploadedBy: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// LEAD SCHEMA
// =====================================================

const leadSchema = new Schema<ILead>(
  {
    // -------------------------------------------------
    // EXCEL SR. NO.
    // -------------------------------------------------

    srNo: {
      type: Number,
    },

    // -------------------------------------------------
    // LEAD DETAILS
    // -------------------------------------------------

    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      default: "",
    },

    company: {
      type: String,
      trim: true,
      default: "",
    },

    source: {
      type: String,
      trim: true,
      default: "",
    },

    // -------------------------------------------------
    // NOTES (WRITTEN ON LEAD DASHBOARD, NOT EXCEL)
    // -------------------------------------------------

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    // -------------------------------------------------
    // MAIN STATUS
    // -------------------------------------------------

    status: {
      type: String,
      enum: [
        "Select",
        "Interested",
        "Not Interested",
        "No Contact",
        "Follow up",
        "Junk",
      ],
      default: "Select",
    },

    // -------------------------------------------------
    // SUB STATUS
    // -------------------------------------------------

    subStatus: {
      type: String,
      enum: [
        "Hot",
        "Warm",
        "Cold",

        "Pricing Issue",
        "Not Required",
        "Evaluating Competitors",

        "Ring Not Received",
        "Switched Off",
        "Incoming Not Available",

        "Call Me Later",
        "Call Disconnected",

        "",
      ],
      default: "",
    },

    // -------------------------------------------------
    // USER WHO UPLOADED THE LEAD
    // -------------------------------------------------

    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },

  {
    timestamps: true,
  }
);

export default mongoose.model<ILead>("Lead", leadSchema);