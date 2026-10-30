import { Router } from "express";
import {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  addCompanyNote,
  updateCompanyStatus,
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
// Interactive Notes (Append-only permanent audit trail)
// =================================
router.post("/:id/notes", protect, addCompanyNote);

// =================================
// Admin only
// =================================
router.post("/", protect, adminOnly, createCompany);
router.patch("/:id/status", protect, adminOnly, updateCompanyStatus);
router.patch("/:id", protect, adminOnly, updateCompany);
router.delete("/:id", protect, adminOnly, deleteCompany);

export default router;