import { Router } from "express";
import {
  login,
  changePassword,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  verifyInvitationToken,
  setPassword,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

// Public routes
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.get("/verify-reset-token/:token", verifyResetToken);
router.post("/reset-password/:token", resetPassword);
router.get("/verify-invitation-token/:token", verifyInvitationToken);
router.post("/set-password/:token", setPassword);

// Protected routes
router.post("/change-password", protect, changePassword);

export default router;