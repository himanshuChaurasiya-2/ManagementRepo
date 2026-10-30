import { Request, Response } from "express";
import Company from "../models/Company.js";
import { AuthRequest } from "../middleware/authMiddleware.js";

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

    const normalizedEmail = email
      .toLowerCase()
      .trim();

    const companyData: any = {
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      alternatePhone:
        alternatePhone?.trim() || "",
      industry: industry.trim(),
      website: website?.trim() || "",
      address: address?.trim() || "",
      status: status || "active",
      notes: notes?.trim() || "",
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
    if (companyName !== undefined) updatePayload.companyName = companyName?.trim();
    if (contactPerson !== undefined) updatePayload.contactPerson = contactPerson?.trim();
    if (email !== undefined) updatePayload.email = email ? email.toLowerCase().trim() : undefined;
    if (phone !== undefined) updatePayload.phone = phone?.trim();
    if (alternatePhone !== undefined) updatePayload.alternatePhone = alternatePhone?.trim() || "";
    if (industry !== undefined) updatePayload.industry = industry?.trim();
    if (website !== undefined) updatePayload.website = website?.trim() || "";
    if (address !== undefined) updatePayload.address = address?.trim() || "";
    if (status !== undefined) updatePayload.status = status;
    if (notes !== undefined) updatePayload.notes = notes?.trim() || "";

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

    if (!note || !note.trim()) {
      res.status(400).json({
        success: false,
        message: "Note content is required",
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

    const author = req.user?.name || "Admin";
    const dateStr = new Date().toLocaleString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const entry = `[${dateStr} • ${author}]: ${note.trim()}`;
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