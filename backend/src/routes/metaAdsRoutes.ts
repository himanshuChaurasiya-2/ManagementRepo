import { Router } from "express";
import {
  getAvailableMetaAccounts,
  linkMetaAccountToCompany,
  unlinkMetaAccountFromCompany,
  getCompanyRealtimeInsights,
  getEntityBreakdowns,
} from "../controllers/metaAdsController.js";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";

const router = Router();

// Get all accessible Ad Accounts under Agency token (Admin Only)
router.get("/accounts", protect, adminOnly, getAvailableMetaAccounts);

// Link selected Meta Ad Account to a Company (Admin Only)
router.post("/companies/:companyId/link", protect, adminOnly, linkMetaAccountToCompany);

// Unlink Meta Ad Account from a Company (Admin Only)
router.delete("/companies/:companyId/unlink", protect, adminOnly, unlinkMetaAccountFromCompany);

// Fetch Real-time Meta Insights & Campaigns for a Company (Protected for authenticated users)
router.get("/companies/:companyId/insights", protect, getCompanyRealtimeInsights);

// Fetch Entity-Specific Breakdowns (Protected for authenticated users)
router.get("/companies/:companyId/entity-breakdowns", protect, getEntityBreakdowns);

export default router;

