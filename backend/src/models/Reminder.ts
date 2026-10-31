import mongoose, { Document, Schema } from "mongoose";

export interface IReminder extends Document {
  userId: mongoose.Types.ObjectId;
  companyName?: string;
  title: string;
  description?: string;
  date: Date;
  startTime?: string;
  endTime?: string;
  priority: "low" | "medium" | "high";
  reminderMinutes: number;
  status: "pending" | "completed";
  repeat: "none" | "daily" | "weekly" | "monthly";
  createdAt: Date;
  updatedAt: Date;
}

const reminderSchema = new Schema<IReminder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    companyName: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    date: {
      type: Date,
      required: true,
    },

    startTime: {
      type: String,
    },

    endTime: {
      type: String,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    reminderMinutes: {
      type: Number,
      default: 10,
    },

    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },

    repeat: {
      type: String,
      enum: ["none", "daily", "weekly", "monthly"],
      default: "none",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IReminder>("Reminder", reminderSchema);