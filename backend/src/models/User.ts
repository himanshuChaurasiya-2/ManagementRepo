import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "admin" | "sales";
  jobPosition?: string;
  status: "active" | "inactive";
  mustChangePassword: boolean;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  invitationToken?: string;
  invitationExpires?: Date;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["admin", "sales"],
      default: "sales",
    },

    jobPosition: {
      type: String,
      trim: true,
      default: "Sales Representative",
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    mustChangePassword: {
      type: Boolean,
      default: true,
    },

    resetPasswordToken: {
      type: String,
      default: null,
    },

    resetPasswordExpires: {
      type: Date,
      default: null,
    },

    invitationToken: {
      type: String,
      default: null,
    },

    invitationExpires: {
      type: Date,
      default: null,
    },

    refreshToken: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model<IUser>("User", userSchema);

export default User;