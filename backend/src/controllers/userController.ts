import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.js";

const generateTemporaryPassword = (): string => {
  return `Temp@${crypto.randomBytes(6).toString("hex")}`;
};

export const createUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, email, jobPosition, role = "sales" } = req.body;

    // Validate required fields
    if (!name || !email) {
      res.status(400).json({
        success: false,
        message: "Name and email are required",
      });
      return;
    }

    // Only sales users should be created through this endpoint
    if (role !== "sales") {
      res.status(400).json({
        success: false,
        message: "Invalid user role",
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "A user with this email already exists",
      });
      return;
    }

    // Generate temporary password
    const temporaryPassword = generateTemporaryPassword();

    // Hash password
    const hashedPassword = await bcrypt.hash(
      temporaryPassword,
      12
    );

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      jobPosition: jobPosition?.trim() || "Sales Representative",
      password: hashedPassword,
      role: "sales",
      status: "active",
      mustChangePassword: true,
    });

    res.status(201).json({
      success: true,
      message: "Sales user created successfully",

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        jobPosition: user.jobPosition,
        role: user.role,
        status: user.status,
        mustChangePassword: user.mustChangePassword,
      },

      // Returned only during creation
      temporaryPassword,
    });
  } catch (error) {
    console.error("Create user error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while creating user",
    });
  }
};


// ===============================
// GET ALL USERS
// ===============================

export const getUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Get users error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while fetching users",
    });
  }
};

// ===============================
// GET USER BY ID
// ===============================

export const getUserById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("-password");

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get user error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while fetching user",
    });
  }
};


// ===============================
// UPDATE USER STATUS
// ===============================

export const updateUserStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "inactive"].includes(status)) {
      res.status(400).json({
        success: false,
        message: "Status must be active or inactive",
      });
      return;
    }

    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Don't allow admin to deactivate themselves
    if (req.userId === user._id.toString()) {
      res.status(400).json({
        success: false,
        message: "You cannot change your own account status",
      });
      return;
    }

    user.status = status;

    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${status === "active" ? "activated" : "deactivated"} successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Update user status error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while updating user status",
    });
  }
};


// ===============================
// RESET USER PASSWORD
// ===============================

export const resetUserPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Don't allow resetting admin password through this endpoint
    if (user.role !== "sales") {
      res.status(400).json({
        success: false,
        message: "Only sales user passwords can be reset here",
      });
      return;
    }

    // Generate new temporary password
    const temporaryPassword = `Temp@${crypto
      .randomBytes(6)
      .toString("hex")}`;

    // Hash temporary password
    const hashedPassword = await bcrypt.hash(
      temporaryPassword,
      12
    );

    // Replace old password
    user.password = hashedPassword;

    // Force password change on next login
    user.mustChangePassword = true;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully",

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },

      temporaryPassword,
    });
  } catch (error) {
    console.error("Reset password error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while resetting password",
    });
  }
};

// ===============================
// UPDATE USER (ROLE, JOB POSITION, NAME, EMAIL)
// ===============================

export const updateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, role, jobPosition } = req.body;

    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    if (name) user.name = name.trim();

    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      if (normalizedEmail !== user.email) {
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
          res.status(409).json({
            success: false,
            message: "A user with this email already exists",
          });
          return;
        }
        user.email = normalizedEmail;
      }
    }

    if (jobPosition !== undefined) {
      user.jobPosition = jobPosition.trim();
    }

    if (role && ["admin", "sales"].includes(role)) {
      user.role = role;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        jobPosition: user.jobPosition,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating user",
    });
  }
};