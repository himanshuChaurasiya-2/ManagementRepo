import { Router } from "express";
import {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
} from "../controllers/companyController.js";

import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";

const router = Router();

// =================================
// Read access
// Admin + Sales users
// =================================
router.get("/", protect, getCompanies);
router.get("/:id", protect, getCompanyById);

// =================================
// Admin only
// =================================
router.post("/", protect, adminOnly, createCompany);
router.patch("/:id", protect, adminOnly, updateCompany);
router.delete("/:id", protect, adminOnly, deleteCompany);

export default router;