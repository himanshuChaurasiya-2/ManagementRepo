import { Router } from "express";

import {
  createTask,
  getAllTasks,
  getMyTasks,
  updateTaskStatus,
  updateTask,
  deleteTask,
} from "../controllers/taskController.js";

import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";

const router = Router();

// =================================
// ADMIN ONLY
// =================================

// Create task
router.post(
  "/",
  protect,
  adminOnly,
  createTask
);

// Edit task
router.patch(
  "/:id",
  protect,
  adminOnly,
  updateTask
);

// Delete task
router.delete(
  "/:id",
  protect,
  adminOnly,
  deleteTask
);


// =================================
// ALL LOGGED-IN USERS
// =================================

// All tasks
// Admin + Sales users can see every task
router.get(
  "/",
  protect,
  getAllTasks
);


// =================================
// LOGGED-IN USER
// =================================

// My assigned tasks
router.get(
  "/my",
  protect,
  getMyTasks
);


// =================================
// TASK STATUS
// =================================

// Admin can update any task
// Sales user can update only their own task
router.patch(
  "/:id/status",
  protect,
  updateTaskStatus
);

export default router;