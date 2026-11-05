import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware.js";
import Company from "../models/Company.js";
import { isValidObjectId, sanitizeString } from "../middleware/security.js";
import {
  fetchAccessibleAdAccounts,
  fetchAdAccountRealtimeInsights,
  fetchEntityBreakdowns,
  getMetaAccessToken,
} from "../services/metaMarketingService.js";

 // GET ACCESSIBLE AD ACCOUNTS
export const getAvailableMetaAccounts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customToken = req.query.accessToken as string;
    const token = customToken || getMetaAccessToken();

    if (!token) {
      res.status(400).json({
        success: false,
        message: "No META_ACCESS_TOKEN configured. Please set META_ACCESS_TOKEN in backend/.env or provide an access token.",
      });
      return;
    }

    const accounts = await fetchAccessibleAdAccounts(customToken);

    res.status(200).json({
      success: true,
      count: accounts.length,
      accounts,
    });
  } catch (error: any) {
    console.error("Fetch Meta Ad Accounts Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch ad accounts from Meta Marketing API",
    });
  }
};

// LINK AD ACCOUNT TO A COMPANY
export const linkMetaAccountToCompany = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { companyId } = req.params;
    const { adAccountId, adAccountName, currency, accountStatus } = req.body;

    if (!companyId || !isValidObjectId(companyId)) {
      res.status(400).json({ success: false, message: "Valid company ID is required" });
      return;
    }

    if (!adAccountId) {
      res.status(400).json({ success: false, message: "adAccountId is required" });
      return;
    }

    const company = await Company.findById(companyId);
    if (!company) {
      res.status(404).json({ success: false, message: "Company not found" });
      return;
    }

    company.metaAdsConfig = {
      adAccountId: adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`,
      adAccountName: adAccountName || company.companyName,
      currency: currency || "USD",
      accountStatus: Number(accountStatus || 1),
      connectedAt: new Date(),
    };

    await company.save();

    res.status(200).json({
      success: true,
      message: `Meta Ad Account "${company.metaAdsConfig.adAccountName}" linked successfully to ${company.companyName}!`,
      company,
    });
  } catch (error: any) {
    console.error("Link Meta Account Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to link Meta Ad Account to Company",
    });
  }
};

// UNLINK AD ACCOUNT FROM A COMPANY
export const unlinkMetaAccountFromCompany = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { companyId } = req.params;

    if (!companyId || !isValidObjectId(companyId)) {
      res.status(400).json({ success: false, message: "Valid company ID is required" });
      return;
    }

    const company = await Company.findById(companyId);
    if (!company) {
      res.status(404).json({ success: false, message: "Company not found" });
      return;
    }

    company.metaAdsConfig = undefined;
    await company.save();

    res.status(200).json({
      success: true,
      message: `Meta Ad Account unlinked from ${company.companyName}`,
      company,
    });
  } catch (error: any) {
    console.error("Unlink Meta Account Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to unlink Meta Ad Account",
    });
  }
};

// GET REAL-TIME INSIGHTS FOR A COMPANY
export const getCompanyRealtimeInsights = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { companyId } = req.params;

    if (!companyId || !isValidObjectId(companyId)) {
      res.status(400).json({ success: false, message: "Valid company ID is required" });
      return;
    }

    const { datePreset = "this_month" } = req.query;

    const company = await Company.findById(companyId);
    if (!company) {
      res.status(404).json({ success: false, message: "Company not found" });
      return;
    }

    if (!company.metaAdsConfig?.adAccountId) {
      res.status(400).json({
        success: false,
        isUnlinked: true,
        message: `${company.companyName} has not been linked to a Meta Ad Account yet. Please select an ad account from the dropdown.`,
      });
      return;
    }

    const insights = await fetchAdAccountRealtimeInsights(
      company.metaAdsConfig.adAccountId,
      datePreset as string
    );

    res.status(200).json({
      success: true,
      company: {
        _id: company._id,
        companyName: company.companyName,
        email: company.email,
        metaAdsConfig: company.metaAdsConfig,
      },
      insights,
    });
  } catch (error: any) {
    console.error("Get Realtime Insights Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch real-time insights from Meta Marketing API",
    });
  }
};

// GET ENTITY-SPECIFIC BREAKDOWNS (SOCIAL MEDIA REACHES, GEOGRAPHICAL REACHES, TIME SLOTS)
export const getEntityBreakdowns = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { companyId } = req.params;
    const { entityId, level = "campaign", datePreset = "this_month", specificDate } = req.query;

    if (!entityId) {
      res.status(400).json({ success: false, message: "entityId query parameter is required" });
      return;
    }

    const company = await Company.findById(companyId);
    if (!company) {
      res.status(404).json({ success: false, message: "Company not found" });
      return;
    }

    const breakdowns = await fetchEntityBreakdowns(
      entityId as string,
      (level as "campaign" | "adset" | "ad") || "campaign",
      (datePreset as string) || "this_month",
      undefined,
      (specificDate as string) || undefined
    );

    res.status(200).json({
      success: true,
      breakdowns,
    });
  } catch (error: any) {
    console.error("Get Entity Breakdowns Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch entity breakdowns from Meta",
    });
  }
};


