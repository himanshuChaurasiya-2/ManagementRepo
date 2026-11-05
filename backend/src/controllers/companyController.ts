import { Request, Response } from "express";
import Company from "../models/Company.js";
import { AuthRequest } from "../middleware/authMiddleware.js";
import {
  isValidEmail,
  isValidObjectId,
  sanitizeString,
  sanitizeUrl,
} from "../middleware/security.js";

// =====================================
// CREATE COMPANY
// =====================================

export const createCompany = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      companyName,
      contactPerson,
      email,
      phone,
      alternatePhone,
      industry,
      website,
      address,
      status,
      notes,
      metaAdsConfig,
    } = req.body;

    // Required fields
    if (
      !companyName ||
      !contactPerson ||
      !email ||
      !phone ||
      !industry
    ) {
      res.status(400).json({
        success: false,
        message:
          "Company name, contact person, email, phone and industry are required",
      });

      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
      return;
    }

    const normalizedEmail = email
      .toLowerCase()
      .trim();

    const companyData: any = {
      companyName: sanitizeString(companyName, 150),
      contactPerson: sanitizeString(contactPerson, 100),
      email: normalizedEmail,
      phone: sanitizeString(phone, 30),
      alternatePhone: sanitizeString(alternatePhone, 30),
      industry: sanitizeString(industry, 100),
      website: sanitizeUrl(website),
      address: sanitizeString(address, 300),
      status: status === "inactive" ? "inactive" : "active",
      notes: sanitizeString(notes, 2000),
    };

    if (metaAdsConfig?.adAccountId) {
      companyData.metaAdsConfig = {
        adAccountId: metaAdsConfig.adAccountId.startsWith("act_")
          ? metaAdsConfig.adAccountId
          : `act_${metaAdsConfig.adAccountId}`,
        adAccountName: metaAdsConfig.adAccountName || companyName.trim(),
        currency: metaAdsConfig.currency || "USD",
        accountStatus: Number(metaAdsConfig.accountStatus || 1),
        connectedAt: new Date(),
      };
    }

    const company = await Company.create(companyData);

    res.status(201).json({
      success: true,
      message: "Company created successfully",
      company,
    });
  } catch (error) {
    console.error(
      "Create company error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while creating company",
    });
  }
};

// =====================================
// GET ALL COMPANIES
// =====================================

export const getCompanies = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const companies = await Company.find()
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: companies.length,
      companies,
    });
  } catch (error) {
    console.error(
      "Get companies error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while fetching companies",
    });
  }
};

// =====================================
// GET COMPANY BY ID
// =====================================

export const getCompanyById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid company ID format",
      });
      return;
    }

    const company = await Company.findById(id);

    if (!company) {
      res.status(404).json({
        success: false,
        message: "Company not found",
      });

      return;
    }

    res.status(200).json({
      success: true,
      company,
    });
  } catch (error) {
    console.error(
      "Get company error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while fetching company",
    });
  }
};

// =====================================
// UPDATE COMPANY
// =====================================

export const updateCompany = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid company ID format",
      });
      return;
    }

    const {
      companyName,
      contactPerson,
      email,
      phone,
      alternatePhone,
      industry,
      website,
      address,
      status,
      notes,
      metaAdsConfig,
    } = req.body;

    const updatePayload: any = {};
    if (companyName !== undefined) updatePayload.companyName = sanitizeString(companyName, 150);
    if (contactPerson !== undefined) updatePayload.contactPerson = sanitizeString(contactPerson, 100);
    if (email !== undefined) {
      if (email && !isValidEmail(email)) {
        res.status(400).json({
          success: false,
          message: "Invalid email format",
        });
        return;
      }
      updatePayload.email = email ? email.toLowerCase().trim() : undefined;
    }
    if (phone !== undefined) updatePayload.phone = sanitizeString(phone, 30);
    if (alternatePhone !== undefined) updatePayload.alternatePhone = sanitizeString(alternatePhone, 30);
    if (industry !== undefined) updatePayload.industry = sanitizeString(industry, 100);
    if (website !== undefined) updatePayload.website = sanitizeUrl(website);
    if (address !== undefined) updatePayload.address = sanitizeString(address, 300);
    if (status !== undefined) updatePayload.status = status === "inactive" ? "inactive" : "active";
    if (notes !== undefined) updatePayload.notes = sanitizeString(notes, 2000);

    if (metaAdsConfig !== undefined) {
      if (metaAdsConfig?.adAccountId) {
        updatePayload.metaAdsConfig = {
          adAccountId: metaAdsConfig.adAccountId.startsWith("act_")
            ? metaAdsConfig.adAccountId
            : `act_${metaAdsConfig.adAccountId}`,
          adAccountName: metaAdsConfig.adAccountName || companyName?.trim() || "",
          currency: metaAdsConfig.currency || "USD",
          accountStatus: Number(metaAdsConfig.accountStatus || 1),
          connectedAt: new Date(),
        };
      } else {
        updatePayload.metaAdsConfig = undefined;
      }
    }

    const company =
      await Company.findByIdAndUpdate(
        id,
        updatePayload,
        {
          new: true,
          runValidators: true,
        }
      );

    if (!company) {
      res.status(404).json({
        success: false,
        message: "Company not found",
      });

      return;
    }

    res.status(200).json({
      success: true,
      message: "Company updated successfully",
      company,
    });
  } catch (error) {
    console.error(
      "Update company error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while updating company",
    });
  }
};

// =====================================
// ADD INTERACTIVE NOTE (PERMANENT TIMESTAMPS)
// =====================================

export const addCompanyNote = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid company ID format",
      });
      return;
    }

    if (!note || typeof note !== "string" || !note.trim()) {
      res.status(400).json({
        success: false,
        message: "Note content is required",
      });
      return;
    }

    const cleanNote = sanitizeString(note, 2000);

    const company = await Company.findById(id);
    if (!company) {
      res.status(404).json({
        success: false,
        message: "Company not found",
      });
      return;
    }

    const author = req.user?.name || "Admin";
    const dateStr = new Date().toLocaleString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const entry = `[${dateStr} • ${author}]: ${cleanNote}`;
    const updatedNotes = company.notes ? `${company.notes}\n\n${entry}` : entry;

    company.notes = updatedNotes;
    await company.save();

    res.status(200).json({
      success: true,
      message: "Note added to permanent history",
      company,
    });
  } catch (error: any) {
    console.error("Add company note error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding note",
    });
  }
};

// =====================================
// UPDATE COMPANY STATUS
// =====================================

export const updateCompanyStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid company ID format",
      });
      return;
    }

    if (
      !["active", "inactive"].includes(status)
    ) {
      res.status(400).json({
        success: false,
        message:
          "Status must be active or inactive",
      });

      return;
    }

    const company =
      await Company.findByIdAndUpdate(
        id,
        { status },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!company) {
      res.status(404).json({
        success: false,
        message: "Company not found",
      });

      return;
    }

    res.status(200).json({
      success: true,
      message: `Company ${
        status === "active"
          ? "activated"
          : "deactivated"
      } successfully`,
      company,
    });
  } catch (error) {
    console.error(
      "Update company status error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while updating company status",
    });
  }
};

// =====================================
// DELETE COMPANY
// =====================================

export const deleteCompany = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid company ID format",
      });
      return;
    }

    const company =
      await Company.findByIdAndDelete(id);

    if (!company) {
      res.status(404).json({
        success: false,
        message: "Company not found",
      });

      return;
    }

    res.status(200).json({
      success: true,
      message:
        "Company deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete company error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while deleting company",
    });
  }
};