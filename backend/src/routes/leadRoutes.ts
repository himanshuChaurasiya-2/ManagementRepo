import { Router } from "express";

import {
  importLeadsFromExcel,
  getMyLeads,
  getAllLeads,
  updateLeadStatus,
  updateLeadNotes,
  batchDeleteLeads,
  deleteSingleLead,
  getLeadDeletionLogs,
  reassignLead,
  batchReassignLeads,
} from "../controllers/leadController.js";

import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";

import multer from "multer";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
});


// =====================================================
// GET LEADS (ADMIN = ALL, USER = OWN LEADS)
// =====================================================

router.get(
  "/",
  protect,
  (req, res) => {
    if ((req as any).user?.role === "admin") {
      return getAllLeads(req, res);
    }
    return getMyLeads(req, res);
  }
);

// =====================================================
// USER - GET OWN LEADS
// =====================================================

router.get(
  "/my",
  protect,
  getMyLeads
);


// =====================================================
// ADMIN - GET ALL LEADS
// =====================================================

router.get(
  "/all",
  protect,
  adminOnly,
  getAllLeads
);


// =====================================================
// USER - IMPORT EXCEL
// =====================================================

router.post(
  "/import-excel",
  protect,
  upload.single("file"),
  importLeadsFromExcel
);

// Compatibility alias for import
router.post(
  "/import",
  protect,
  upload.single("file"),
  importLeadsFromExcel
);

// =====================================================
// DELETION LOGS (AUDIT TRAIL)
// =====================================================

router.get(
  "/deletion-logs",
  protect,
  getLeadDeletionLogs
);

// =====================================================
// BATCH DELETE LEADS
// =====================================================

router.post(
  "/batch-delete",
  protect,
  batchDeleteLeads
);

router.delete(
  "/batch",
  protect,
  batchDeleteLeads
);

// =====================================================
// UPDATE LEAD STATUS
// USER + ADMIN
// =====================================================

router.patch(
  "/:id/status",
  protect,
  updateLeadStatus
);

// =====================================================
// UPDATE LEAD NOTES
// USER + ADMIN
// =====================================================

router.patch(
  "/:id/notes",
  protect,
  updateLeadNotes
);

// =====================================================
// DELETE SINGLE LEAD
// =====================================================

router.delete(
  "/:id",
  protect,
  deleteSingleLead
);



// =====================================================
// REASSIGN LEADS (ADMIN ONLY)
// =====================================================

router.patch(
  "/:id/assign",
  protect,
  adminOnly,
  reassignLead
);

router.post(
  "/batch-assign",
  protect,
  adminOnly,
  batchReassignLeads
);

export default router;