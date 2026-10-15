import { Request, Response } from "express";
import XLSX from "xlsx";
import Lead from "../models/Lead.js";
import User from "../models/User.js";
import LeadDeletionLog, {
  IDeletedLeadSnapshot,
} from "../models/LeadDeletionLog.js";

// =====================================================
// IMPORT LEADS FROM EXCEL
// =====================================================

interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id?: string;
    _id?: string;
    role?: string;
    name?: string;
    email?: string;
  };
}

export const importLeadsFromExcel = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // -------------------------------------------------
    // CHECK FILE
    // -------------------------------------------------

    if (!req.file) {
      res.status(400).json({
        message: "Excel file is required",
      });

      return;
    }

    // -------------------------------------------------
    // GET LOGGED-IN USER
    // -------------------------------------------------

    const uploadedBy =
      req.userId ||
      req.user?.id ||
      req.user?._id;

    if (!uploadedBy) {
      res.status(401).json({
        message: "User not authenticated",
      });

      return;
    }

    // -------------------------------------------------
    // READ EXCEL FILE
    // -------------------------------------------------

    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
    });

    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      res.status(400).json({
        message: "Excel file does not contain any sheet",
      });

      return;
    }

    const worksheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(
      worksheet,
      {
        defval: "",
      }
    );

    if (!rows.length) {
      res.status(400).json({
        message: "Excel file is empty",
      });

      return;
    }

    // -------------------------------------------------
    // REQUIRED EXCEL COLUMNS
    // -------------------------------------------------

    const requiredColumns = [
      "Name",
      "Phone",
    ];

    const excelColumns = Object.keys(rows[0]);

    const missingColumns = requiredColumns.filter(
      (column) => !excelColumns.includes(column)
    );

    if (missingColumns.length > 0) {
      res.status(400).json({
        message: "Required Excel columns are missing",
        missingColumns,
        expectedColumns: [
          "Sr No",
          "Name",
          "Phone",
          "Email",
          "Company",
          "Source",
        ],
      });

      return;
    }

    // -------------------------------------------------
    // PROCESS ROWS
    // -------------------------------------------------

    const validLeads = [];
    const failedRows = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      const excelRowNumber = i + 2;

      const name = String(row["Name"] || "").trim();
      const phone = String(row["Phone"] || "").trim();
      const email = String(row["Email"] || "").trim();
      const company = String(row["Company"] || "").trim();
      const source = String(row["Source"] || "").trim();

      // -------------------------------------------------
      // VALIDATE NAME
      // -------------------------------------------------

      if (!name) {
        failedRows.push({
          row: excelRowNumber,
          reason: "Name is required",
        });

        continue;
      }

      // -------------------------------------------------
      // VALIDATE PHONE
      // -------------------------------------------------

      if (!phone) {
        failedRows.push({
          row: excelRowNumber,
          reason: "Phone is required",
        });

        continue;
      }

      // -------------------------------------------------
      // CREATE LEAD OBJECT
      // -------------------------------------------------

      validLeads.push({
       srNo:
  row["Sr No"] !== undefined &&
  row["Sr No"] !== null &&
  row["Sr No"] !== "" &&
  !isNaN(Number(row["Sr No"]))
    ? Number(row["Sr No"])
    : undefined,

        name,
        phone,
        email,
        company,
        source,

        // Notes are explicitly NOT imported from Excel sheet - managed on dashboard
        notes: "",

        // New leads always start here
        status: "Select",
        subStatus: "",

        // Automatically identify uploader
        uploadedBy,
      });
    }

    // -------------------------------------------------
    // INSERT INTO DATABASE
    // -------------------------------------------------

    let imported = 0;

    if (validLeads.length > 0) {
      const insertedLeads = await Lead.insertMany(
        validLeads
      );

      imported = insertedLeads.length;
    }

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    res.status(200).json({
      message: "Leads imported successfully",

      totalRows: rows.length,

      imported,

      failed: failedRows.length,

      failedRows,
    });
  } catch (error) {
    console.error(
      "Import leads Excel error:",
      error
    );

    res.status(500).json({
      message: "Failed to import leads from Excel",
    });
  }
};



// =====================================================
// GET MY LEADS
// SALES USER
// =====================================================

export const getMyLeads = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const uploadedBy =
      req.userId ||
      req.user?.id ||
      req.user?._id;

    if (!uploadedBy) {
      res.status(401).json({
        message: "User not authenticated",
      });
      return;
    }

    const leads = await Lead.find({
      uploadedBy,
    })
      .sort({ createdAt: -1 })
      .populate("uploadedBy", "name email role jobPosition status");

    res.status(200).json({
      message: "My leads fetched successfully",
      leads,
    });
  } catch (error) {
    console.error("Get my leads error:", error);

    res.status(500).json({
      message: "Failed to fetch leads",
    });
  }
};


// =====================================================
// GET ALL LEADS
// ADMIN ONLY
// =====================================================

export const getAllLeads = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const leads = await Lead.find()
      .populate("uploadedBy", "name email role jobPosition status")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "All leads fetched successfully",
      leads,
    });
  } catch (error) {
    console.error("Get all leads error:", error);

    res.status(500).json({
      message: "Failed to fetch all leads",
    });
  }
};

// =====================================================
// UPDATE LEAD STATUS + SUB STATUS
// USER + ADMIN
// =====================================================

// =====================================================
// UPDATE LEAD STATUS + SUB STATUS
// USER + ADMIN
// =====================================================

export const updateLeadStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, subStatus } = req.body;

    // -------------------------------------------------
    // GET LOGGED-IN USER
    // -------------------------------------------------

    const userId =
      req.userId ||
      req.user?.id ||
      req.user?._id;

    if (!userId) {
      res.status(401).json({
        message: "User not authenticated",
      });

      return;
    }

    // -------------------------------------------------
    // VALID STATUS
    // -------------------------------------------------

    const validStatuses: string[] = [
      "Interested",
      "Not Interested",
      "No Contact",
      "Follow up",
      "Junk",
    ];

    if (!validStatuses.includes(status)) {
      res.status(400).json({
        message: "Invalid lead status",
      });

      return;
    }

    // -------------------------------------------------
    // SUB STATUS MAP
    // -------------------------------------------------

    const subStatusMap: Record<
      string,
      string[]
    > = {
      Interested: [
        "Hot",
        "Warm",
        "Cold",
      ],

      "Not Interested": [
        "Pricing Issue",
        "Not Required",
        "Evaluating Competitors",
      ],

      "No Contact": [
        "Ring Not Received",
        "Switched Off",
        "Incoming Not Available",
      ],

      "Follow up": [
        "Call Me Later",
        "Call Disconnected",
      ],

      Junk: [""],
    };

    // -------------------------------------------------
    // VALIDATE SUB STATUS
    // -------------------------------------------------

    const allowedSubStatuses =
      subStatusMap[status] ?? [];

    const finalSubStatus =
      status === "Junk"
        ? ""
        : subStatus || "";

    if (
      !allowedSubStatuses.includes(
        finalSubStatus
      )
    ) {
      res.status(400).json({
        message:
          "Invalid sub-status for selected status",
      });

      return;
    }

    // -------------------------------------------------
    // FIND LEAD
    // -------------------------------------------------

    const lead = await Lead.findById(id);

    if (!lead) {
      res.status(404).json({
        message: "Lead not found",
      });

      return;
    }

    // -------------------------------------------------
    // CHECK ADMIN
    // -------------------------------------------------

    const userRole =
      req.user?.role
        ?.toString()
        .trim()
        .toLowerCase();

    const isAdmin =
      userRole === "admin" ||
      userRole === "administrator";

    // -------------------------------------------------
    // USER OWNERSHIP CHECK
    // -------------------------------------------------

    if (!isAdmin) {
      const leadOwnerId =
        lead.uploadedBy?.toString();

      if (
        !leadOwnerId ||
        leadOwnerId !==
          userId.toString()
      ) {
        res.status(403).json({
          message:
            "You are not allowed to update this lead",
        });

        return;
      }
    }

    // -------------------------------------------------
    // UPDATE LEAD
    // -------------------------------------------------

    lead.status = status;
    lead.subStatus = finalSubStatus;

    await lead.save();

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    res.status(200).json({
      message:
        "Lead status updated successfully",
      lead,
    });

  } catch (error) {
    console.error(
      "Update lead status error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to update lead status",
    });
  }
};

// =====================================================
// BATCH DELETE LEADS
// USER + ADMIN
// =====================================================

export const batchDeleteLeads = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { leadIds } = req.body;

    const userId =
      req.userId ||
      req.user?.id ||
      req.user?._id;

    if (!userId) {
      res.status(401).json({
        message: "User not authenticated",
      });
      return;
    }

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      res.status(400).json({
        message: "Please provide an array of lead IDs to delete",
      });
      return;
    }

    const userRole = req.user?.role
      ?.toString()
      .trim()
      .toLowerCase();

    const isAdmin =
      userRole === "admin" ||
      userRole === "administrator";

    // Query: Admins can delete any requested leads; non-admins only their own uploaded leads
    const query: any = { _id: { $in: leadIds } };
    if (!isAdmin) {
      query.uploadedBy = userId;
    }

    // Find leads to be deleted and populate uploader for snapshot
    const leadsToDelete = await Lead.find(query).populate(
      "uploadedBy",
      "name email"
    );

    if (leadsToDelete.length === 0) {
      res.status(404).json({
        message:
          "No matching leads found to delete or you do not have permission to delete them",
      });
      return;
    }

    // Get user details for audit trail snapshot
    const loggedInUser = await User.findById(userId).select(
      "name email role"
    );

    const userName =
      loggedInUser?.name ||
      req.user?.name ||
      "Unknown User";

    const userEmail =
      loggedInUser?.email ||
      req.user?.email ||
      "unknown@domain.com";

    const role: "admin" | "sales" =
      loggedInUser?.role ||
      (isAdmin ? "admin" : "sales");

    // Build deleted lead snapshot array
    const deletedSnapshots: IDeletedLeadSnapshot[] = leadsToDelete.map(
      (lead: any) => {
        const uploaderObj = lead.uploadedBy;
        const uploadedByName =
          typeof uploaderObj === "object" && uploaderObj
            ? uploaderObj.name || uploaderObj.email || ""
            : "";

        return {
          leadId: lead._id.toString(),
          srNo: lead.srNo,
          name: lead.name,
          phone: lead.phone,
          email: lead.email || "",
          company: lead.company || "",
          source: lead.source || "",
          status: lead.status || "Select",
          subStatus: lead.subStatus || "",
          notes: lead.notes || "",
          uploadedBy:
            typeof uploaderObj === "object" && uploaderObj
              ? uploaderObj._id
              : lead.uploadedBy,
          uploadedByName,
          createdAt: lead.createdAt,
        };
      }
    );

    // Create Audit Log with timestamp and snapshot
    const deletionLog = await LeadDeletionLog.create({
      deletedBy: userId,
      deletedByName: userName,
      deletedByEmail: userEmail,
      deletedByRole: role,
      deletedAt: new Date(),
      count: leadsToDelete.length,
      deletedLeads: deletedSnapshots,
    });

    // Delete leads from DB
    const actualIdsToDelete = leadsToDelete.map((l) => l._id);
    await Lead.deleteMany({ _id: { $in: actualIdsToDelete } });

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${leadsToDelete.length} lead${
        leadsToDelete.length > 1 ? "s" : ""
      }`,
      deletedCount: leadsToDelete.length,
      log: deletionLog,
    });
  } catch (error) {
    console.error("Batch delete leads error:", error);
    res.status(500).json({
      message: "Failed to delete leads",
    });
  }
};

// =====================================================
// DELETE SINGLE LEAD
// =====================================================

export const deleteSingleLead = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    req.body.leadIds = [id];
    return batchDeleteLeads(req, res);
  } catch (error) {
    console.error("Delete single lead error:", error);
    res.status(500).json({
      message: "Failed to delete lead",
    });
  }
};

// =====================================================
// GET LEAD DELETION LOGS (AUDIT TRAIL)
// =====================================================

export const getLeadDeletionLogs = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId =
      req.userId ||
      req.user?.id ||
      req.user?._id;

    if (!userId) {
      res.status(401).json({
        message: "User not authenticated",
      });
      return;
    }

    const userRole = req.user?.role
      ?.toString()
      .trim()
      .toLowerCase();

    const isAdmin =
      userRole === "admin" ||
      userRole === "administrator";

    const query: any = {};
    if (!isAdmin) {
      query.deletedBy = userId;
    }

    const logs = await LeadDeletionLog.find(query)
      .sort({ deletedAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      message: "Lead deletion logs fetched successfully",
      logs,
    });
  } catch (error) {
    console.error("Get lead deletion logs error:", error);
    res.status(500).json({
      message: "Failed to fetch deletion logs",
    });
  }
};

// =====================================================
// UPDATE LEAD NOTES
// USER + ADMIN
// =====================================================

export const updateLeadNotes = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    // -------------------------------------------------
    // GET LOGGED-IN USER
    // -------------------------------------------------

    const userId =
      req.userId ||
      req.user?.id ||
      req.user?._id;

    if (!userId) {
      res.status(401).json({
        message: "User not authenticated",
      });
      return;
    }

    // -------------------------------------------------
    // FIND LEAD
    // -------------------------------------------------

    const lead = await Lead.findById(id);

    if (!lead) {
      res.status(404).json({
        message: "Lead not found",
      });
      return;
    }

    // -------------------------------------------------
    // CHECK ADMIN / OWNERSHIP
    // -------------------------------------------------

    const userRole =
      req.user?.role
        ?.toString()
        .trim()
        .toLowerCase();

    const isAdmin =
      userRole === "admin" ||
      userRole === "administrator";

    if (!isAdmin) {
      const leadOwnerId = lead.uploadedBy?.toString();

      if (
        !leadOwnerId ||
        leadOwnerId !== userId.toString()
      ) {
        res.status(403).json({
          message: "You are not allowed to update notes for this lead",
        });
        return;
      }
    }

    // -------------------------------------------------
    // UPDATE LEAD NOTES
    // -------------------------------------------------

    lead.notes = typeof notes === "string" ? notes : "";

    await lead.save();

    res.status(200).json({
      success: true,
      message: "Lead notes updated successfully",
      lead,
    });
  } catch (error) {
    console.error("Update lead notes error:", error);
    res.status(500).json({
      message: "Failed to update lead notes",
    });
  }
};