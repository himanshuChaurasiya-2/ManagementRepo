import mongoose, { Document, Schema } from "mongoose";

export interface ITask extends Document {
  title: string;
  description?: string;

  // Company assigned to this task
  company: mongoose.Types.ObjectId;

  assignedTo: mongoose.Types.ObjectId;
  assignedBy: mongoose.Types.ObjectId;

  status: "pending" | "in-progress" | "completed";

  priority: "low" | "medium" | "high";

  dueDate?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    // ==========================================
    // COMPANY
    // ==========================================

    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    // ==========================================
    // ASSIGNED USER
    // ==========================================

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ==========================================
    // ASSIGNED BY
    // ==========================================

    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ==========================================
    // STATUS
    // ==========================================

    status: {
      type: String,
      enum: [
        "pending",
        "in-progress",
        "completed",
      ],
      default: "pending",
    },

    // ==========================================
    // PRIORITY
    // ==========================================

    priority: {
      type: String,
      enum: [
        "low",
        "medium",
        "high",
      ],
      default: "medium",
    },

    // ==========================================
    // DUE DATE
    // ==========================================

    dueDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ITask>(
  "Task",
  taskSchema
);