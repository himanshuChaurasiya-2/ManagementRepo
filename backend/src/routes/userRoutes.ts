import { Router } from "express";
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  resetUserPassword,
  resendInvitation,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";

const router = Router();

// All user-management routes require admin access
router.use(protect, adminOnly);

// Create a new user (admin or sales)
router.post("/", createUser);

// Get all users
router.get("/", getUsers);

// Get a single user
router.get("/:id", getUserById);

// Update user details (name, email, role, jobPosition)
router.patch("/:id", updateUser);

// Activate / deactivate user
router.patch("/:id/status", updateUserStatus);

// Reset user's password
router.patch("/:id/reset-password", resetUserPassword);

// Resend invitation email
router.post("/:id/resend-invitation", resendInvitation);

export default router;