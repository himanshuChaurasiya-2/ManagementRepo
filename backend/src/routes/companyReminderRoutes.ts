import { Router } from "express";

import {
  getCompanyReminders,
  createCompanyReminder,
  updateCompanyReminder,
  deleteCompanyReminder,
  updateCompanyReminderStatus,
  importCompanyRemindersFromExcel,
} from "../controllers/companyReminderController.js";

import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

const router = Router();

// =====================================================
// VIEW
// ADMIN + SALES USERS
// =====================================================

router.get("/", protect, getCompanyReminders);

// =====================================================
// ADMIN ONLY
// =====================================================

router.post(
  "/",
  protect,
  adminOnly,
  createCompanyReminder
);

router.post(
  "/import-excel",
  protect,
  adminOnly,
  upload.single("file"),
  importCompanyRemindersFromExcel
);

router.patch(
  "/:id",
  protect,
  adminOnly,
  updateCompanyReminder
);

router.delete(
  "/:id",
  protect,
  adminOnly,
  deleteCompanyReminder
);

router.patch(
  "/:id/status",
  protect,
  adminOnly,
  updateCompanyReminderStatus
);

export default router;