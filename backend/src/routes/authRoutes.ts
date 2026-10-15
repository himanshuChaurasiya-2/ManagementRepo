import { Router } from "express";
import {
  login,
  changePassword,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

// Public route
router.post("/login", login);

// Protected route
router.post("/change-password", protect, changePassword);

export default router;