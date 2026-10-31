import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import { sendPasswordResetEmail } from "../services/emailService.js";

const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined in .env");
  }

  return jwt.sign(
    {
      userId,
    },
    secret,
    {
      expiresIn: "1d",
    }
  );
};

// ===============================
// LOGIN
// ===============================

export const login = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
      return;
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    if (user.status !== "active") {
      res.status(403).json({
        success: false,
        message: "Your account has been deactivated",
      });
      return;
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    const token = generateToken(user._id.toString());

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        jobPosition: user.jobPosition || (user.role === "admin" ? "Administrator" : "Sales Representative"),
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

// ===============================
// CHANGE PASSWORD
// ===============================

export const changePassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId;

    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters",
      });
      return;
    }

    if (currentPassword === newPassword) {
      res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
      return;
    }

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const isPasswordCorrect = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isPasswordCorrect) {
      res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      12
    );

    user.password = hashedPassword;
    user.mustChangePassword = false;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while changing password",
    });
  }
};

// ===============================
// FORGOT PASSWORD (REQUEST RESET LINK)
// ===============================

export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      res.status(400).json({
        success: false,
        message: "Email address is required",
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // For security, always respond with a success message to prevent user enumeration
    if (!user || user.status !== "active") {
      res.status(200).json({
        success: true,
        message:
          "If an active account exists with that email, a password reset link has been sent.",
      });
      return;
    }

    // Generate 32-byte secure random token
    const rawToken = crypto.randomBytes(32).toString("hex");

    // Store SHA-256 hash in DB
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await user.save();

    // Send email
    const emailResult = await sendPasswordResetEmail(user.email, user.name, rawToken);

    res.status(200).json({
      success: true,
      message:
        "If an active account exists with that email, a password reset link has been sent.",
      previewUrl: emailResult.previewUrl,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while processing password reset request",
    });
  }
};

const getParamString = (param: string | string[] | undefined): string => {
  if (typeof param === "string") return param;
  if (Array.isArray(param)) return param[0] || "";
  return "";
};

// ===============================
// VERIFY RESET TOKEN
// ===============================

export const verifyResetToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const rawToken = getParamString(req.params.token);

    if (!rawToken) {
      res.status(400).json({
        success: false,
        message: "Reset token is required",
      });
      return;
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: "Password reset link is invalid or has expired",
      });
      return;
    }

    res.status(200).json({
      success: true,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error("Verify reset token error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while verifying reset link",
    });
  }
};

// ===============================
// RESET PASSWORD (USING TOKEN)
// ===============================

export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const rawToken = getParamString(req.params.token);
    const { password } = req.body;

    if (!rawToken) {
      res.status(400).json({
        success: false,
        message: "Reset token is required",
      });
      return;
    }

    if (!password || password.length < 8) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
      return;
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: "Password reset link is invalid or has expired",
      });
      return;
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    user.password = hashedPassword;
    user.mustChangePassword = false;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password has been reset successfully. You can now log in.",
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
// VERIFY INVITATION TOKEN
// ===============================

export const verifyInvitationToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const rawToken = getParamString(req.params.token);

    if (!rawToken) {
      res.status(400).json({
        success: false,
        message: "Invitation token is required",
      });
      return;
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const user = await User.findOne({
      invitationToken: hashedToken,
      invitationExpires: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: "Invitation link is invalid or has expired",
      });
      return;
    }

    res.status(200).json({
      success: true,
      email: user.email,
      name: user.name,
      jobPosition: user.jobPosition,
    });
  } catch (error) {
    console.error("Verify invitation token error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while verifying invitation link",
    });
  }
};

// ===============================
// SET PASSWORD (INVITATION ONBOARDING)
// ===============================

export const setPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const rawToken = getParamString(req.params.token);
    const { password } = req.body;

    if (!rawToken) {
      res.status(400).json({
        success: false,
        message: "Invitation token is required",
      });
      return;
    }

    if (!password || password.length < 8) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
      return;
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const user = await User.findOne({
      invitationToken: hashedToken,
      invitationExpires: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: "Invitation link is invalid or has expired",
      });
      return;
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    user.password = hashedPassword;
    user.mustChangePassword = false;
    user.status = "active";
    user.invitationToken = undefined;
    user.invitationExpires = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password created successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Set password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while setting password",
    });
  }
};