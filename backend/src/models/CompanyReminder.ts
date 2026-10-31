import mongoose, { Document, Schema } from "mongoose";

export interface ICompanyReminder extends Document {
  title: string;
  companyName?: string;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  priority: "low" | "medium" | "high";
  remindBefore: number;
  repeat: "none" | "daily" | "weekly" | "monthly";
  status: "pending" | "completed";
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const companyReminderSchema = new Schema<ICompanyReminder>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    companyName: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    date: {
      type: String,
      required: true,
    },

    startTime: {
      type: String,
      default: "",
    },

    endTime: {
      type: String,
      default: "",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    remindBefore: {
      type: Number,
      default: 10,
    },

    repeat: {
      type: String,
      enum: ["none", "daily", "weekly", "monthly"],
      default: "none",
    },

    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ICompanyReminder>(
  "CompanyReminder",
  companyReminderSchema
);