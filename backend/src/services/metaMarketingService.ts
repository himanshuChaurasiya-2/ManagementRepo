export interface MetaAdAccount {
  id: string; // e.g. "act_1234567890"
  account_id: string; // "1234567890"
  name: string;
  currency: string;
  account_status: number; // 1 = ACTIVE, 2 = DISABLED, etc.
}

export interface MetaCampaignMetric {
  id: string;
  name: string;
  status: string; // "ACTIVE" | "PAUSED" | "ARCHIVED"
  objective?: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  budgetFormatted: string;
  imageUrl?: string; // Real ad creative image from Meta
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
  adsets: MetaAdSetMetric[];
  ads: MetaAdMetric[];
  geographics: MetaGeoMetric[];
  timeTrends: MetaTimeMetric[];
  placements: MetaPlacementMetric[];
  fetchedAt: Date;
}

const META_GRAPH_VERSION = "v21.0";
const META_BASE_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

/* Get Meta Access Token from environment */
export const getMetaAccessToken = (): string => {
  return process.env.META_ACCESS_TOKEN || "";
};

/* Safe JSON fetch helper with error absorption */
const fetchJsonSafe = async (url: string): Promise<any> => {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      console.warn(`Meta API call returned ${res.status} for ${url.split("?")[0]}:`, errData?.error?.message || res.statusText);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`Meta API network error for ${url.split("?")[0]}:`, err);
    return null;
  }
};

/* Fetch all available Ad Accounts */
export const fetchAccessibleAdAccounts = async (customToken?: string): Promise<MetaAdAccount[]> => {
  const token = customToken || getMetaAccessToken();
  if (!token) {
    throw new Error("META_ACCESS_TOKEN is not configured in backend/.env. Please provide a valid Meta System User or Marketing API token.");
  }

  const url = `${META_BASE_URL}/me/adaccounts?fields=id,account_id,name,currency,account_status&limit=100&access_token=${encodeURIComponent(token)}`;
  const data = await fetchJsonSafe(url);

  if (!data || !data.data) {
    throw new Error("Failed to fetch ad accounts from Meta Graph API. Please verify META_ACCESS_TOKEN.");
  }

  return (data.data || []).map((acc: any) => ({
    id: acc.id.startsWith("act_") ? acc.id : `act_${acc.id}`,
    account_id: acc.account_id || acc.id.replace("act_", ""),
    name: acc.name || `Ad Account ${acc.account_id || acc.id}`,
    currency: acc.currency || "USD",
    account_status: Number(acc.account_status || 1),
  }));
};

/* Helper to extract actions count from Meta actions array */
const extractActionCount = (actions: any[] = [], actionType: string): number => {
  if (!Array.isArray(actions)) return 0;
  const match = actions.find((a: any) => a.action_type === actionType);
  return match ? Number(match.value || 0) : 0;
};

/* Helper to extract conversion value from action_values array */
const extractActionValue = (actionValues: any[] = [], actionType: string): number => {
  if (!Array.isArray(actionValues)) return 0;
  const match = actionValues.find((a: any) => a.action_type === actionType);
  return match ? Number(Number(match.value || 0).toFixed(2)) : 0;
};

/* Standardized row metric parser with Leads, Sales, CPR, CPL, and Alert Performance Status */
const parseMetricRow = (row: any) => {
  const spend = Number(Number(row.spend || 0).toFixed(2));
  const impressions = Number(row.impressions || 0);
  const clicks = Number(row.clicks || 0);
  const ctr = Number(Number(row.ctr || (impressions > 0 ? (clicks / impressions) * 100 : 0)).toFixed(2));
  const cpc = Number(Number(row.cpc || (clicks > 0 ? spend / clicks : 0)).toFixed(2));
  const cpm = Number(Number(row.cpm || (impressions > 0 ? (spend / impressions) * 1000 : 0)).toFixed(2));

  const actions = row.actions || [];
  const actionValues = row.action_values || [];

  const purchases =
    extractActionCount(actions, "omni_purchase") ||
    extractActionCount(actions, "purchase") ||
    extractActionCount(actions, "offsite_conversion.fb_pixel_purchase");

  const sales = purchases;

  const purchaseValue =
    extractActionValue(actionValues, "omni_purchase") ||
    extractActionValue(actionValues, "purchase") ||
    extractActionValue(actionValues, "offsite_conversion.fb_pixel_purchase");

  const addToCart =
    extractActionCount(actions, "omni_add_to_cart") ||
    extractActionCount(actions, "add_to_cart") ||
    extractActionCount(actions, "offsite_conversion.fb_pixel_add_to_cart");

  const initiateCheckout =
    extractActionCount(actions, "omni_initiated_checkout") ||
    extractActionCount(actions, "initiated_checkout") ||
    extractActionCount(actions, "offsite_conversion.fb_pixel_initiate_checkout");

  // Comprehensive Meta Lead Extraction across all Meta formats
  const omniLeads = extractActionCount(actions, "omni_lead");
  const formLeads =
    extractActionCount(actions, "leadgen_grouped") ||
    extractActionCount(actions, "onsite_conversion.lead_grouped");
  const pixelLeads =
    extractActionCount(actions, "offsite_conversion.fb_pixel_lead") ||
    extractActionCount(actions, "lead");
  const contactLeads =
    extractActionCount(actions, "contact_total") ||
    extractActionCount(actions, "contact") ||
    extractActionCount(actions, "offsite_conversion.fb_pixel_contact");
  const messagingLeads =
    extractActionCount(actions, "onsite_conversion.messaging_conversation_started_7d") ||
    extractActionCount(actions, "onsite_conversion.messaging_first_reply");

  const leads =
    omniLeads > 0
      ? omniLeads
      : formLeads + pixelLeads + contactLeads + messagingLeads;

  const roas =
    row.purchase_roas && row.purchase_roas[0]?.value
      ? Number(Number(row.purchase_roas[0].value).toFixed(2))
      : spend > 0 && purchaseValue > 0
      ? Number((purchaseValue / spend).toFixed(2))
      : 0;

  const costPerActions = row.cost_per_action_type || [];
  const metaCpa =
    extractActionValue(costPerActions, "omni_purchase") ||
    extractActionValue(costPerActions, "purchase") ||
    extractActionValue(costPerActions, "offsite_conversion.fb_pixel_purchase");
  const cpa = metaCpa > 0 ? metaCpa : purchases > 0 ? Number((spend / purchases).toFixed(2)) : 0;

  const metaCpl =
    extractActionValue(costPerActions, "omni_lead") ||
    extractActionValue(costPerActions, "lead") ||
    extractActionValue(costPerActions, "leadgen_grouped") ||
    extractActionValue(costPerActions, "onsite_conversion.lead_grouped") ||
    extractActionValue(costPerActions, "offsite_conversion.fb_pixel_lead");
  const cpl = metaCpl > 0 ? metaCpl : leads > 0 ? Number((spend / leads).toFixed(2)) : 0;

  // Primary Result and CPR (Cost Per Result)
  let results = 0;
  let resultType = "Results";
  if (purchases > 0) {
    results = purchases;
    resultType = "Purchases";
  } else if (leads > 0) {
    results = leads;
    resultType = "Leads";
  } else if (clicks > 0) {
    results = clicks;
    resultType = "Clicks";
  }

  const cpr = results > 0 ? Number((spend / results).toFixed(2)) : 0;

  // Real-time Performance Alert Classification
  let performanceStatus: "best" | "underperforming" | "average" = "average";
  if (roas >= 2.5 || (sales >= 3 && roas >= 2.0) || (leads >= 5 && cpl > 0 && cpl <= 150)) {
    performanceStatus = "best";
  } else if (spend > 0 && (roas < 1.0 || (spend > 150 && sales === 0 && leads === 0))) {
    performanceStatus = "underperforming";
  }

  return {
    spend,
    impressions,
    clicks,
    ctr,
    cpc,
    cpm,
    purchases,
    sales,
    leads,
    results,
    resultType,
    cpr,
    cpl,
    purchaseValue,
    addToCart,
    initiateCheckout,
    roas,
    cpa,
    performanceStatus,
  };
};

/* Fetch real-time insights, campaigns, adsets, ads, geographics, time trends, and placements */
export const fetchAdAccountRealtimeInsights = async (
  adAccountId: string,
  datePreset: string = "maximum",
  customToken?: string
): Promise<MetaInsightsSummary> => {
  const token = customToken || getMetaAccessToken();
  if (!token) {
    throw new Error("META_ACCESS_TOKEN is not configured in backend/.env");
  }

  const formattedAccountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const encodedToken = encodeURIComponent(token);
  const encodedPreset = encodeURIComponent(datePreset);

  // 1. Account Details
  const accDetailsUrl = `${META_BASE_URL}/${formattedAccountId}?fields=name,currency,account_status&access_token=${encodedToken}`;

  // 2. Account-Level Insights
  const accountInsightFields = [
    "spend",
    "impressions",
    "clicks",
    "cpc",
    "cpm",
    "ctr",
    "reach",
    "frequency",
    "actions",
    "action_values",
    "purchase_roas",
    "date_start",
    "date_stop",
  ].join(",");
  const accountInsightsUrl = `${META_BASE_URL}/${formattedAccountId}/insights?fields=${accountInsightFields}&date_preset=${encodedPreset}&access_token=${encodedToken}`;

  // 3. Campaign Insights & List
  const campaignFields = [
    "campaign_id",
    "campaign_name",
    "spend",
    "impressions",
    "clicks",
    "ctr",
    "cpc",
    "cpm",
    "actions",
    "action_values",
    "purchase_roas",
    "cost_per_action_type",
    "objective",
  ].join(",");
  const campaignInsightsUrl = `${META_BASE_URL}/${formattedAccountId}/insights?level=campaign&fields=${campaignFields}&date_preset=${encodedPreset}&limit=100&access_token=${encodedToken}`;
  const campaignsListUrl = `${META_BASE_URL}/${formattedAccountId}/campaigns?fields=id,name,status,daily_budget,lifetime_budget,start_time,created_time&limit=100&access_token=${encodedToken}`;

  // 4. AdSet Insights & List
  const adsetFields = [
    "adset_id",
    "adset_name",
    "campaign_id",
    "campaign_name",
    "spend",
    "impressions",
    "clicks",
    "ctr",
    "cpc",
    "cpm",
    "actions",
    "action_values",
    "purchase_roas",
    "cost_per_action_type",
  ].join(",");
  const adsetInsightsUrl = `${META_BASE_URL}/${formattedAccountId}/insights?level=adset&fields=${adsetFields}&date_preset=${encodedPreset}&limit=100&access_token=${encodedToken}`;
  const adsetsListUrl = `${META_BASE_URL}/${formattedAccountId}/adsets?fields=id,name,status,campaign_id,daily_budget,lifetime_budget,optimization_goal,billing_event,start_time,created_time&limit=100&access_token=${encodedToken}`;

  // 5. Ad Insights & List with Creatives
  const adFields = [
    "ad_id",
    "ad_name",
    "adset_id",
    "adset_name",
    "campaign_id",
    "campaign_name",
    "spend",
    "impressions",
    "clicks",
    "ctr",
    "cpc",
    "cpm",
    "actions",
    "action_values",
    "purchase_roas",
    "cost_per_action_type",
  ].join(",");
  const adInsightsUrl = `${META_BASE_URL}/${formattedAccountId}/insights?level=ad&fields=${adFields}&date_preset=${encodedPreset}&limit=100&access_token=${encodedToken}`;
  const adsListUrl = `${META_BASE_URL}/${formattedAccountId}/ads?fields=id,name,status,adset_id,campaign_id,created_time,creative{image_url,thumbnail_url,title,body}&limit=150&access_token=${encodedToken}`;

  // 6. Geographic Breakdown (Region/State)
  const geoUrl = `${META_BASE_URL}/${formattedAccountId}/insights?fields=spend,impressions,clicks,actions,action_values,purchase_roas&breakdowns=region&date_preset=${encodedPreset}&limit=100&access_token=${encodedToken}`;

  // 7. Time Trend Breakdown (Daily telemetry timeline)
  const timeUrl = `${META_BASE_URL}/${formattedAccountId}/insights?fields=spend,impressions,clicks,actions,action_values,purchase_roas,date_start,date_stop&time_increment=1&date_preset=${encodedPreset}&limit=90&access_token=${encodedToken}`;

  // 8. Placement & Platform Breakdown
  const placementUrl = `${META_BASE_URL}/${formattedAccountId}/insights?fields=spend,impressions,clicks,actions,action_values,purchase_roas&breakdowns=publisher_platform,platform_position&date_preset=${encodedPreset}&limit=100&access_token=${encodedToken}`;

  // Run all queries concurrently in parallel
  const [
    accDetailsData,
    accountInsightsData,
    campaignInsightsData,
    campaignsListData,
    adsetInsightsData,
    adsetsListData,
    adInsightsData,
    adsListData,
    geoData,
    timeData,
    placementData,
  ] = await Promise.all([
    fetchJsonSafe(accDetailsUrl),
    fetchJsonSafe(accountInsightsUrl),
    fetchJsonSafe(campaignInsightsUrl),
    fetchJsonSafe(campaignsListUrl),
    fetchJsonSafe(adsetInsightsUrl),
    fetchJsonSafe(adsetsListUrl),
    fetchJsonSafe(adInsightsUrl),
    fetchJsonSafe(adsListUrl),
    fetchJsonSafe(geoUrl),
    fetchJsonSafe(timeUrl),
    fetchJsonSafe(placementUrl),
  ]);

  const accountName = accDetailsData?.name || formattedAccountId;
  const currency = accDetailsData?.currency || "USD";
  const currSymbol = currency === "INR" ? "₹" : currency === "EUR" ? "€" : "$";

  // Parse Account Summary
  const accRow = accountInsightsData?.data && accountInsightsData.data[0] ? accountInsightsData.data[0] : {};
  const accParsed = parseMetricRow(accRow);
  const reach = Number(accRow.reach || 0);
  const frequency = Number(Number(accRow.frequency || 0).toFixed(2));

  // Build Campaign metadata mapping
  const campaignMetaMap = new Map<
    string,
    { status: string; dailyBudget?: number; lifetimeBudget?: number; name?: string; startTime?: string; createdTime?: string }
  >();
  if (campaignsListData?.data && Array.isArray(campaignsListData.data)) {
    campaignsListData.data.forEach((c: any) => {
      campaignMetaMap.set(c.id, {
        status: c.status || "UNKNOWN",
        dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : undefined,
        lifetimeBudget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : undefined,
        name: c.name,
        startTime: c.start_time,
        createdTime: c.created_time,
      });
    });
  }

  // Build Ad creative and metadata mapping
  const adMetaMap = new Map<
    string,
    {
      status: string;
      imageUrl?: string;
      adTitle?: string;
      adBody?: string;
      adsetId: string;
      campaignId: string;
      name: string;
      createdTime?: string;
    }
  >();
  const campaignFirstImageMap = new Map<string, string>();

  if (adsListData?.data && Array.isArray(adsListData.data)) {
    adsListData.data.forEach((ad: any) => {
      const img = ad.creative?.image_url || ad.creative?.thumbnail_url;
      adMetaMap.set(ad.id, {
        status: ad.status || "UNKNOWN",
        imageUrl: img,
        adTitle: ad.creative?.title,
        adBody: ad.creative?.body,
        adsetId: ad.adset_id,
        campaignId: ad.campaign_id,
        name: ad.name,
        createdTime: ad.created_time,
      });

      if (ad.campaign_id && img && !campaignFirstImageMap.has(ad.campaign_id)) {
        campaignFirstImageMap.set(ad.campaign_id, img);
      }
    });
  }

  // Build AdSet metadata mapping
  const adsetMetaMap = new Map<
    string,
    {
      status: string;
      dailyBudget?: number;
      lifetimeBudget?: number;
      optimizationGoal?: string;
      billingEvent?: string;
      campaignId: string;
      name: string;
      startTime?: string;
      createdTime?: string;
    }
  >();
  if (adsetsListData?.data && Array.isArray(adsetsListData.data)) {
    adsetsListData.data.forEach((as: any) => {
      adsetMetaMap.set(as.id, {
        status: as.status || "UNKNOWN",
        dailyBudget: as.daily_budget ? Number(as.daily_budget) / 100 : undefined,
        lifetimeBudget: as.lifetime_budget ? Number(as.lifetime_budget) / 100 : undefined,
        optimizationGoal: as.optimization_goal,
        billingEvent: as.billing_event,
        campaignId: as.campaign_id,
        name: as.name,
        startTime: as.start_time,
        createdTime: as.created_time,
      });
    });
  }

  // Parse Campaigns
  const campaigns: MetaCampaignMetric[] = (campaignInsightsData?.data || []).map((c: any) => {
    const parsed = parseMetricRow(c);
    const metaInfo = campaignMetaMap.get(c.campaign_id);
    const realImageUrl = campaignFirstImageMap.get(c.campaign_id);

    const budgetFormatted = metaInfo?.dailyBudget
      ? `${currSymbol}${metaInfo.dailyBudget}/day`
      : metaInfo?.lifetimeBudget
      ? `${currSymbol}${metaInfo.lifetimeBudget} lifetime`
      : "Ad Set Budget";

    return {
      id: c.campaign_id,
      name: c.campaign_name || metaInfo?.name || "Unnamed Campaign",
      status: metaInfo?.status || "ACTIVE",
      objective: c.objective || "",
      dailyBudget: metaInfo?.dailyBudget,
      lifetimeBudget: metaInfo?.lifetimeBudget,
      budgetFormatted,
      imageUrl: realImageUrl || undefined,
      spend: parsed.spend,
      impressions: parsed.impressions,
      clicks: parsed.clicks,
      ctr: parsed.ctr,
      cpc: parsed.cpc,
      cpm: parsed.cpm,
      purchases: parsed.purchases,
      sales: parsed.sales,
      leads: parsed.leads,
      results: parsed.results,
      resultType: parsed.resultType,
      cpr: parsed.cpr,
      cpl: parsed.cpl,
      purchaseValue: parsed.purchaseValue,
      cpa: parsed.cpa,
      roas: parsed.roas,
      addToCart: parsed.addToCart,
      initiateCheckout: parsed.initiateCheckout,
      performanceStatus: parsed.performanceStatus,
      startTime: metaInfo?.startTime,
      createdTime: metaInfo?.createdTime,
    };
  });
  campaigns.sort((a, b) => b.spend - a.spend);

  // Parse AdSets
  const adsets: MetaAdSetMetric[] = (adsetInsightsData?.data || []).map((as: any) => {
    const parsed = parseMetricRow(as);
    const metaInfo = adsetMetaMap.get(as.adset_id);

    const budgetFormatted = metaInfo?.dailyBudget
      ? `${currSymbol}${metaInfo.dailyBudget}/day`
      : metaInfo?.lifetimeBudget
      ? `${currSymbol}${metaInfo.lifetimeBudget} lifetime`
      : campaignMetaMap.get(as.campaign_id)?.dailyBudget
      ? `${currSymbol}${campaignMetaMap.get(as.campaign_id)?.dailyBudget}/day (CBO)`
      : "Dynamic Budget";

    return {
      id: as.adset_id,
      name: as.adset_name || metaInfo?.name || "Unnamed Ad Set",
      campaignId: as.campaign_id || metaInfo?.campaignId || "",
      campaignName: as.campaign_name || campaignMetaMap.get(as.campaign_id)?.name || "",
      status: metaInfo?.status || "ACTIVE",
      dailyBudget: metaInfo?.dailyBudget,
      lifetimeBudget: metaInfo?.lifetimeBudget,
      budgetFormatted,
      optimizationGoal: metaInfo?.optimizationGoal,
      billingEvent: metaInfo?.billingEvent,
      spend: parsed.spend,
      impressions: parsed.impressions,
      clicks: parsed.clicks,
      ctr: parsed.ctr,
      cpc: parsed.cpc,
      cpm: parsed.cpm,
      purchases: parsed.purchases,
      sales: parsed.sales,
      leads: parsed.leads,
      results: parsed.results,
      resultType: parsed.resultType,
      cpr: parsed.cpr,
      cpl: parsed.cpl,
      purchaseValue: parsed.purchaseValue,
      cpa: parsed.cpa,
      roas: parsed.roas,
      addToCart: parsed.addToCart,
      initiateCheckout: parsed.initiateCheckout,
      performanceStatus: parsed.performanceStatus,
      startTime: metaInfo?.startTime,
      createdTime: metaInfo?.createdTime,
    };
  });
  adsets.sort((a, b) => b.spend - a.spend);

  // Parse Ads
  const ads: MetaAdMetric[] = (adInsightsData?.data || []).map((ad: any) => {
    const parsed = parseMetricRow(ad);
    const metaInfo = adMetaMap.get(ad.ad_id);
    const parentAdset = adsetMetaMap.get(ad.adset_id);
    const parentCampaign = campaignMetaMap.get(ad.campaign_id);

    const budgetFormatted = parentAdset?.dailyBudget
      ? `${currSymbol}${parentAdset.dailyBudget}/day`
      : parentCampaign?.dailyBudget
      ? `${currSymbol}${parentCampaign.dailyBudget}/day (CBO)`
      : "Ad Set Budget";

    return {
      id: ad.ad_id,
      name: ad.ad_name || metaInfo?.name || "Unnamed Ad",
      adsetId: ad.adset_id || metaInfo?.adsetId || "",
      adsetName: ad.adset_name || adsetMetaMap.get(ad.adset_id)?.name || "",
      campaignId: ad.campaign_id || metaInfo?.campaignId || "",
      campaignName: ad.campaign_name || campaignMetaMap.get(ad.campaign_id)?.name || "",
      status: metaInfo?.status || "ACTIVE",
      budgetFormatted,
      imageUrl: metaInfo?.imageUrl || undefined,
      adTitle: metaInfo?.adTitle,
      adBody: metaInfo?.adBody,
      spend: parsed.spend,
      impressions: parsed.impressions,
      clicks: parsed.clicks,
      ctr: parsed.ctr,
      cpc: parsed.cpc,
      cpm: parsed.cpm,
      purchases: parsed.purchases,
      sales: parsed.sales,
      leads: parsed.leads,
      results: parsed.results,
      resultType: parsed.resultType,
      cpr: parsed.cpr,
      cpl: parsed.cpl,
      purchaseValue: parsed.purchaseValue,
      cpa: parsed.cpa,
      roas: parsed.roas,
      addToCart: parsed.addToCart,
      initiateCheckout: parsed.initiateCheckout,
      performanceStatus: parsed.performanceStatus,
      createdTime: metaInfo?.createdTime,
    };
  });
  ads.sort((a, b) => b.spend - a.spend);

  // Parse Geographics (Regions)
  const geographics: MetaGeoMetric[] = (geoData?.data || [])
    .filter((g: any) => g.region && g.region !== "Unknown")
    .map((g: any) => {
      const parsed = parseMetricRow(g);
      return {
        region: g.region,
        country: g.country,
        spend: parsed.spend,
        impressions: parsed.impressions,
        clicks: parsed.clicks,
        purchases: parsed.purchases,
        purchaseValue: parsed.purchaseValue,
        roas: parsed.roas,
        cpa: parsed.cpa,
      };
    });
  geographics.sort((a, b) => b.spend - a.spend);

  // Parse Time Trends (Daily Timeline)
  const timeTrends: MetaTimeMetric[] = (timeData?.data || []).map((t: any) => {
    const parsed = parseMetricRow(t);
    return {
      date: t.date_start,
      spend: parsed.spend,
      impressions: parsed.impressions,
      clicks: parsed.clicks,
      purchases: parsed.purchases,
      purchaseValue: parsed.purchaseValue,
      roas: parsed.roas,
      cpa: parsed.cpa,
    };
  });
  // Sort from current date to previous date (top-to-down approach)
  timeTrends.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Parse Placements & Platforms
  const placements: MetaPlacementMetric[] = (placementData?.data || [])
    .filter((p: any) => p.publisher_platform)
    .map((p: any) => {
      const parsed = parseMetricRow(p);
      return {
        publisherPlatform: p.publisher_platform,
        platformPosition: p.platform_position || "all",
        spend: parsed.spend,
        impressions: parsed.impressions,
        clicks: parsed.clicks,
        purchases: parsed.purchases,
        purchaseValue: parsed.purchaseValue,
        roas: parsed.roas,
      };
    });
  placements.sort((a, b) => b.spend - a.spend);

  return {
    adAccountId: formattedAccountId,
    adAccountName: accountName,
    currency,
    datePreset,
    since: accRow.date_start,
    until: accRow.date_stop,
    summary: {
      spend: accParsed.spend,
      impressions: accParsed.impressions,
      clicks: accParsed.clicks,
      ctr: accParsed.ctr,
      cpc: accParsed.cpc,
      cpm: accParsed.cpm,
      reach,
      frequency,
      purchases: accParsed.purchases,
      sales: accParsed.sales,
      leads: accParsed.leads,
      results: accParsed.results,
      resultType: accParsed.resultType,
      cpr: accParsed.cpr,
      cpl: accParsed.cpl,
      purchaseValue: accParsed.purchaseValue,
      roas: accParsed.roas,
      cpa: accParsed.cpa,
      addToCart: accParsed.addToCart,
      initiateCheckout: accParsed.initiateCheckout,
    },
    campaigns,
    adsets,
    ads,
    geographics,
    timeTrends,
    placements,
    fetchedAt: new Date(),
  };
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

/* Fetch deep breakdowns (social media reaches, geographical reaches, and time slots) for an individual campaign, adset, or ad */
export const fetchEntityBreakdowns = async (
  entityId: string,
  level: "campaign" | "adset" | "ad" = "campaign",
  datePreset: string = "this_month",
  customToken?: string,
  specificDate?: string
): Promise<EntityBreakdownsResult> => {
  const token = customToken || getMetaAccessToken();
  if (!token) {
    throw new Error("META_ACCESS_TOKEN is not configured in backend/.env");
  }

  const encodedToken = encodeURIComponent(token);
  const encodedPreset = encodeURIComponent(datePreset);

  // 1. Social media reaches (Placements & publisher platforms)
  const platformUrl = `${META_BASE_URL}/${entityId}/insights?breakdowns=publisher_platform,platform_position&fields=reach,impressions,spend,actions,action_values,cpc,cpm,ctr,purchase_roas&date_preset=${encodedPreset}&limit=100&access_token=${encodedToken}`;

  // 2. Geographical reaches (Regions / States)
  const geoUrl = `${META_BASE_URL}/${entityId}/insights?breakdowns=region&fields=reach,impressions,spend,actions,action_values,purchase_roas&date_preset=${encodedPreset}&limit=100&access_token=${encodedToken}`;

  // 3. Hourly time slots (support specific date or preset)
  const hourlyTimeParam = specificDate
    ? `time_range=${encodeURIComponent(JSON.stringify({ since: specificDate, until: specificDate }))}`
    : `date_preset=${encodedPreset}`;
  const hourlyUrl = `${META_BASE_URL}/${entityId}/insights?breakdowns=hourly_stats_aggregated_by_audience_time_zone&fields=impressions,spend,actions,action_values,date_start,date_stop&${hourlyTimeParam}&limit=100&access_token=${encodedToken}`;

  // 4. Daily timeline
  const dailyUrl = `${META_BASE_URL}/${entityId}/insights?time_increment=1&fields=reach,impressions,spend,actions,action_values,purchase_roas,date_start,date_stop&date_preset=${encodedPreset}&limit=90&access_token=${encodedToken}`;

  const [platformData, geoData, hourlyData, dailyData] = await Promise.all([
    fetchJsonSafe(platformUrl),
    fetchJsonSafe(geoUrl),
    fetchJsonSafe(hourlyUrl),
    fetchJsonSafe(dailyUrl),
  ]);

  // Parse social media reaches
  const socialMediaReaches = (platformData?.data || [])
    .filter((p: any) => p.publisher_platform)
    .map((p: any) => {
      const parsed = parseMetricRow(p);
      return {
        publisherPlatform: p.publisher_platform,
        platformPosition: p.platform_position || "all",
        reach: Number(p.reach || p.impressions || 0),
        impressions: parsed.impressions,
        spend: parsed.spend,
        purchases: parsed.purchases,
        revenue: parsed.purchaseValue,
        roas: parsed.roas,
      };
    });
  socialMediaReaches.sort((a: any, b: any) => b.reach - a.reach);

  // Parse geographical reaches
  const geographicalReaches = (geoData?.data || [])
    .filter((g: any) => g.region && g.region !== "Unknown")
    .map((g: any) => {
      const parsed = parseMetricRow(g);
      return {
        region: g.region,
        country: g.country,
        reach: Number(g.reach || g.impressions || 0),
        impressions: parsed.impressions,
        spend: parsed.spend,
        purchases: parsed.purchases,
        revenue: parsed.purchaseValue,
        roas: parsed.roas,
        cpa: parsed.cpa,
      };
    });
  geographicalReaches.sort((a: any, b: any) => b.reach - a.reach);

  // Parse hourly time slots
  let timeSlotReaches = (hourlyData?.data || []).map((h: any) => {
    const parsed = parseMetricRow(h);
    const rawSlot = h.hourly_stats_aggregated_by_audience_time_zone || "00:00 - 01:00";
    const startHour = parseInt(rawSlot.split(":")[0], 10) || 0;
    let slotGroup = "Night";
    if (startHour >= 6 && startHour < 12) slotGroup = "Morning (06:00 - 12:00)";
    else if (startHour >= 12 && startHour < 17) slotGroup = "Afternoon (12:00 - 17:00)";
    else if (startHour >= 17 && startHour < 22) slotGroup = "Evening (17:00 - 22:00)";
    else slotGroup = "Night (22:00 - 06:00)";

    return {
      date: h.date_start || specificDate || "",
      timeSlot: rawSlot,
      slotGroup,
      reach: Number(h.reach || h.impressions || 0),
      impressions: parsed.impressions,
      spend: parsed.spend,
      purchases: parsed.purchases,
      revenue: parsed.purchaseValue,
    };
  });

  // If specificDate was requested and hourly breakdown is empty, check if daily timeline has that date's summary
  if (timeSlotReaches.length === 0 && specificDate) {
    const matchingDaily = (dailyData?.data || []).find((d: any) => d.date_start === specificDate);
    if (matchingDaily) {
      const parsedDaily = parseMetricRow(matchingDaily);
      timeSlotReaches.push({
        date: specificDate,
        timeSlot: "00:00 - 24:00",
        slotGroup: "Full Day",
        reach: Number(matchingDaily.reach || matchingDaily.impressions || 0),
        impressions: parsedDaily.impressions,
        spend: parsedDaily.spend,
        purchases: parsedDaily.purchases,
        revenue: parsedDaily.purchaseValue,
      });
    }
  }

  timeSlotReaches.sort((a: any, b: any) => a.timeSlot.localeCompare(b.timeSlot));

  // Parse daily timeline (sort descending: from current date to previous date)
  const dailyTimeline = (dailyData?.data || []).map((d: any) => {
    const parsed = parseMetricRow(d);
    return {
      date: d.date_start,
      reach: Number(d.reach || d.impressions || 0),
      impressions: parsed.impressions,
      spend: parsed.spend,
      purchases: parsed.purchases,
      revenue: parsed.purchaseValue,
      roas: parsed.roas,
    };
  });
  dailyTimeline.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    entityId,
    level,
    socialMediaReaches,
    geographicalReaches,
    timeSlotReaches,
    dailyTimeline,
  };
};

