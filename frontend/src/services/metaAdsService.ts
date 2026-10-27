import api from "./api";

export interface MetaAdAccount {
  id: string; // "act_1234567890"
  account_id: string; // "1234567890"
  name: string;
  currency: string;
  account_status: number;
}

export interface MetaCampaignMetric {
  id: string;
  name: string;
  status: string;
  objective?: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  budgetFormatted: string;
  imageUrl?: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  purchases: number;
  sales: number;
  leads: number;
  results: number;
  resultType: string;
  cpr: number; // Cost Per Result
  cpl: number; // Cost Per Lead
  purchaseValue: number;
  cpa: number;
  roas: number;
  addToCart?: number;
  initiateCheckout?: number;
  performanceStatus: "best" | "underperforming" | "average";
  startTime?: string;
  createdTime?: string;
}

export interface MetaAdSetMetric {
  id: string;
  name: string;
  campaignId: string;
  campaignName: string;
  status: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  budgetFormatted: string;
  optimizationGoal?: string;
  billingEvent?: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  purchases: number;
  sales: number;
  leads: number;
  results: number;
  resultType: string;
  cpr: number;
  cpl: number;
  purchaseValue: number;
  cpa: number;
  roas: number;
  addToCart?: number;
  initiateCheckout?: number;
  performanceStatus: "best" | "underperforming" | "average";
  startTime?: string;
  createdTime?: string;
}

export interface MetaAdMetric {
  id: string;
  name: string;
  adsetId: string;
  adsetName: string;
  campaignId: string;
  campaignName: string;
  status: string;
  budgetFormatted: string;
  imageUrl?: string;
  adTitle?: string;
  adBody?: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  purchases: number;
  sales: number;
  leads: number;
  results: number;
  resultType: string;
  cpr: number;
  cpl: number;
  purchaseValue: number;
  cpa: number;
  roas: number;
  addToCart?: number;
  initiateCheckout?: number;
  performanceStatus: "best" | "underperforming" | "average";
  createdTime?: string;
}

export interface MetaGeoMetric {
  region: string;
  country?: string;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  purchaseValue: number;
  roas: number;
  cpa: number;
}

export interface MetaTimeMetric {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  purchaseValue: number;
  roas: number;
  cpa: number;
}

export interface MetaPlacementMetric {
  publisherPlatform: string;
  platformPosition: string;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  purchaseValue: number;
  roas: number;
}

export interface MetaInsightsSummary {
  adAccountId: string;
  adAccountName: string;
  currency: string;
  datePreset: string;
  since?: string;
  until?: string;
  summary: {
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    cpm: number;
    reach: number;
    frequency: number;
    purchases: number;
    sales: number;
    leads: number;
    results: number;
    resultType: string;
    cpr: number;
    cpl: number;
    purchaseValue: number;
    roas: number;
    cpa: number;
    addToCart: number;
    initiateCheckout: number;
  };
  campaigns: MetaCampaignMetric[];
  adsets?: MetaAdSetMetric[];
  ads?: MetaAdMetric[];
  geographics?: MetaGeoMetric[];
  timeTrends?: MetaTimeMetric[];
  placements?: MetaPlacementMetric[];
  fetchedAt: string;
}

export interface RealtimeInsightsResponse {
  success: boolean;
  message?: string;
  isUnlinked?: boolean;
  company: {
    _id: string;
    companyName: string;
    email: string;
    metaAdsConfig?: {
      adAccountId?: string;
      adAccountName?: string;
      currency?: string;
      accountStatus?: number;
      connectedAt?: string;
    };
  };
  insights: MetaInsightsSummary;
}

export interface AvailableAccountsResponse {
  success: boolean;
  count: number;
  accounts: MetaAdAccount[];
  message?: string;
}

// Fetch available Ad Accounts from Meta Marketing API
export const fetchAvailableMetaAccounts = async (customToken?: string): Promise<AvailableAccountsResponse> => {
  const response = await api.get<AvailableAccountsResponse>("/meta/accounts", {
    params: customToken ? { accessToken: customToken } : undefined,
  });
  return response.data;
};

// Link selected Meta Ad Account to a Company
export const linkMetaAccountToCompany = async (
  companyId: string,
  accountData: { adAccountId: string; adAccountName: string; currency: string; accountStatus?: number }
) => {
  const response = await api.post(`/meta/companies/${companyId}/link`, accountData);
  return response.data;
};

// Unlink Meta Ad Account from a Company
export const unlinkMetaAccountFromCompany = async (companyId: string) => {
  const response = await api.delete(`/meta/companies/${companyId}/unlink`);
  return response.data;
};

// Fetch Real-time Meta Insights for Company
export const fetchCompanyRealtimeInsights = async (
  companyId: string,
  datePreset: string = "this_month"
): Promise<RealtimeInsightsResponse> => {
  const response = await api.get<RealtimeInsightsResponse>(`/meta/companies/${companyId}/insights`, {
    params: { datePreset },
  });
  return response.data;
};

export interface EntityBreakdownsResult {
  entityId: string;
  level: "campaign" | "adset" | "ad";
  socialMediaReaches: {
    publisherPlatform: string;
    platformPosition: string;
    reach: number;
    impressions: number;
    spend: number;
    purchases: number;
    revenue: number;
    roas: number;
  }[];
  geographicalReaches: {
    region: string;
    country?: string;
    reach: number;
    impressions: number;
    spend: number;
    purchases: number;
    revenue: number;
    roas: number;
    cpa: number;
  }[];
  timeSlotReaches: {
    date?: string;
    timeSlot: string;
    slotGroup: string;
    reach: number;
    impressions: number;
    spend: number;
    purchases: number;
    revenue: number;
  }[];
  dailyTimeline: {
    date: string;
    reach: number;
    impressions: number;
    spend: number;
    purchases: number;
    revenue: number;
    roas: number;
  }[];
}

// Fetch entity-specific breakdowns (social media reaches, geographical reaches, time slots)
export const fetchEntityBreakdowns = async (
  companyId: string,
  entityId: string,
  level: "campaign" | "adset" | "ad" = "campaign",
  datePreset: string = "this_month",
  specificDate?: string
): Promise<{ success: boolean; breakdowns: EntityBreakdownsResult }> => {
  const response = await api.get<{ success: boolean; breakdowns: EntityBreakdownsResult }>(
    `/meta/companies/${companyId}/entity-breakdowns`,
    {
      params: { entityId, level, datePreset, specificDate },
    }
  );
  return response.data;
};

