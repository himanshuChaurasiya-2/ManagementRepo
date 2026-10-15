import mongoose, { Document, Schema } from "mongoose";

// =====================================================
// DELETED LEAD SNAPSHOT INTERFACE
// =====================================================

export interface IDeletedLeadSnapshot {
  leadId: string;
  srNo?: number;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  source?: string;
  status: string;
  subStatus?: string;
  notes?: string;
  uploadedBy?: mongoose.Types.ObjectId;
  uploadedByName?: string;
  createdAt?: Date;
}

// =====================================================
// LEAD DELETION LOG INTERFACE
// =====================================================

export interface ILeadDeletionLog extends Document {
  deletedBy: mongoose.Types.ObjectId;
  deletedByName: string;
  deletedByEmail: string;
  deletedByRole: string;
  deletedAt: Date;
  count: number;
  deletedLeads: IDeletedLeadSnapshot[];
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// SCHEMA
// =====================================================

const deletedLeadSnapshotSchema = new Schema<IDeletedLeadSnapshot>(
  {
    leadId: { type: String, required: true },
    srNo: { type: Number },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: "" },
    company: { type: String, default: "" },
    source: { type: String, default: "" },
    status: { type: String, default: "Select" },
    subStatus: { type: String, default: "" },
    notes: { type: String, default: "" },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
    uploadedByName: { type: String, default: "" },
    createdAt: { type: Date },
  },
  { _id: false }
);

const leadDeletionLogSchema = new Schema<ILeadDeletionLog>(
  {
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    deletedByName: {
      type: String,
      required: true,
    },
    deletedByEmail: {
      type: String,
      required: true,
    },
    deletedByRole: {
      type: String,
      required: true,
      enum: ["admin", "sales"],
    },
    deletedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    count: {
      type: Number,
      required: true,
      min: 1,
    },
    deletedLeads: {
      type: [deletedLeadSnapshotSchema],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ILeadDeletionLog>(
  "LeadDeletionLog",
  leadDeletionLogSchema
);
