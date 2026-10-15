import { Router } from "express";

import {
  createReminder,
  getMyReminders,
  updateReminder,
  deleteReminder,
  completeReminder,
  importExcelReminders,
} from "../controllers/reminderController.js";

import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

const router = Router();

// Every reminder route requires login
router.use(protect);

router.post("/", createReminder);

router.get("/my", getMyReminders);

router.post(
  "/import-excel",
  upload.single("file"),
  importExcelReminders
);

router.patch("/:id", updateReminder);

router.delete("/:id", deleteReminder);

router.patch("/:id/complete", completeReminder);

export default router;