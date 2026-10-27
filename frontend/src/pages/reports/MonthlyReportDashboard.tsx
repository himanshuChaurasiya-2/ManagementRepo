import React, { useEffect, useState } from "react";
import axios from "axios";
import { Spinner } from "react-bootstrap";
import {
  fetchCompanyRealtimeInsights,
  fetchEntityBreakdowns,
  type MetaInsightsSummary,
  type RealtimeInsightsResponse,
  type MetaCampaignMetric,
  type MetaAdSetMetric,
  type MetaAdMetric,
  type EntityBreakdownsResult,
} from "../../services/metaAdsService";
import { LinkMetaAccountModal } from "./LinkMetaAccountModal";
import { useAuth } from "../../context/AuthContext";
import "./reports.css";

interface CompanyItem {
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
}

type ActiveTab = "campaigns" | "adsets" | "ads" | "geographics" | "time" | "placements";
type ModalTab = "overview" | "social" | "geo" | "time";

const DATE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7d", label: "Last 7 Days" },
  { value: "last_14d", label: "Last 14 Days" },
  { value: "last_30d", label: "Last 30 Days" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "maximum", label: "Lifetime (All Time)" },
];

const API_URL = "http://localhost:5000/api";

// Focus functionality removed per user specification

export const MonthlyReportDashboard: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const tabsScrollRef = React.useRef<HTMLDivElement>(null);
  const modalTabsScrollRef = React.useRef<HTMLDivElement>(null);
  const scrollModalTabsLeft = () => {
    if (modalTabsScrollRef.current) {
      modalTabsScrollRef.current.scrollBy({ left: -160, behavior: "smooth" });
    }
  };
  const scrollModalTabsRight = () => {
    if (modalTabsScrollRef.current) {
      modalTabsScrollRef.current.scrollBy({ left: 160, behavior: "smooth" });
    }
  };
  const scrollTabsLeft = () => {
    if (tabsScrollRef.current) {
      tabsScrollRef.current.scrollBy({ left: -220, behavior: "smooth" });
    }
  };
  const scrollTabsRight = () => {
    if (tabsScrollRef.current) {
      tabsScrollRef.current.scrollBy({ left: 220, behavior: "smooth" });
    }
  };
  const [datePreset, setDatePreset] = useState<string>("this_month");

  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [insights, setInsights] = useState<MetaInsightsSummary | null>(null);
  const [isUnlinked, setIsUnlinked] = useState<boolean>(false);
  const [alertInfo, setAlertInfo] = useState<{ type: "success" | "danger" | "info"; message: string } | null>(null);
  const [alertPaused, setAlertPaused] = useState<boolean>(false);

  // Link account modal
  const [showLinkModal, setShowLinkModal] = useState<boolean>(false);

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<ActiveTab>("campaigns");

  // Detail Popups
  const [selectedCampaign, setSelectedCampaign] = useState<MetaCampaignMetric | null>(null);
  const [selectedAdset, setSelectedAdset] = useState<MetaAdSetMetric | null>(null);
  const [selectedAd, setSelectedAd] = useState<MetaAdMetric | null>(null);

  // Modal sub-tabs & deep breakdown state
  const [modalTab, setModalTab] = useState<ModalTab>("overview");
  const [entityBreakdowns, setEntityBreakdowns] = useState<EntityBreakdownsResult | null>(null);
  const [loadingBreakdowns, setLoadingBreakdowns] = useState<boolean>(false);

  // Filter & Sort state for Campaigns (CPL & CPM & Search)
  const [campaignSort, setCampaignSort] = useState<"none" | "cpl_asc" | "cpl_desc" | "cpm_asc" | "cpm_desc">("none");
  const [campaignFilterMetric, setCampaignFilterMetric] = useState<"all" | "cpl" | "cpm">("all");
  const [campaignFilterMin, setCampaignFilterMin] = useState<string>("");
  const [campaignFilterMax, setCampaignFilterMax] = useState<string>("");
  const [campaignBreakpointMetric, setCampaignBreakpointMetric] = useState<"cpl" | "cpm">("cpl");
  const [campaignBreakpoint, setCampaignBreakpoint] = useState<string>("");
  const [campaignSearch, setCampaignSearch] = useState<string>("");

  // Filter & Sort state for Ad Sets (CPL & CPM & Search)
  const [adsetSort, setAdsetSort] = useState<"none" | "cpl_asc" | "cpl_desc" | "cpm_asc" | "cpm_desc">("none");
  const [adsetFilterMetric, setAdsetFilterMetric] = useState<"all" | "cpl" | "cpm">("all");
  const [adsetFilterMin, setAdsetFilterMin] = useState<string>("");
  const [adsetFilterMax, setAdsetFilterMax] = useState<string>("");
  const [adsetBreakpointMetric, setAdsetBreakpointMetric] = useState<"cpl" | "cpm">("cpl");
  const [adsetBreakpoint, setAdsetBreakpoint] = useState<string>("");
  const [adsetSearch, setAdsetSearch] = useState<string>("");

  // Filter & Sort state for Ads (CPL & CPM & Search)
  const [adSort, setAdSort] = useState<"none" | "cpl_asc" | "cpl_desc" | "cpm_asc" | "cpm_desc">("none");
  const [adFilterMetric, setAdFilterMetric] = useState<"all" | "cpl" | "cpm">("all");
  const [adFilterMin, setAdFilterMin] = useState<string>("");
  const [adFilterMax, setAdFilterMax] = useState<string>("");
  const [adBreakpointMetric, setAdBreakpointMetric] = useState<"cpl" | "cpm">("cpl");
  const [adBreakpoint, setAdBreakpoint] = useState<string>("");
  const [adSearch, setAdSearch] = useState<string>("");

  // Focus Telemetry & Deep Breakdowns
  // Focus functionality removed
  // focusedBreakdowns removed

  // Two inputs for Time Slot Selection (Start Timing & End Timing) + Specific Date Filter
  const [selectedTimeSlotDate, setSelectedTimeSlotDate] = useState<string>("");
  const [startTimeSlot, setStartTimeSlot] = useState<string>("");
  const [endTimeSlot, setEndTimeSlot] = useState<string>("");

  const todayStr = new Date().toISOString().split("T")[0];

  const getEntityStartDate = (): string => {
    const active = selectedCampaign || selectedAdset || selectedAd;
    if (!active) return "2024-01-01";
    if ("startTime" in active && active.startTime) return active.startTime.split("T")[0];
    if ("createdTime" in active && active.createdTime) return active.createdTime.split("T")[0];
    if (entityBreakdowns?.dailyTimeline && entityBreakdowns.dailyTimeline.length > 0) {
      const dates = [...entityBreakdowns.dailyTimeline].map((d) => d.date).sort();
      return dates[0];
    }
    if (insights?.timeTrends && insights.timeTrends.length > 0) {
      const dates = [...insights.timeTrends].map((t) => t.date).sort();
      return dates[0];
    }
    return "2024-01-01";
  };

  // Searchable Company Selector state
  const [companySearchInput, setCompanySearchInput] = useState<string>("");
  const [showCompanyDropdown, setShowCompanyDropdown] = useState<boolean>(false);
  const companyDropdownRef = React.useRef<HTMLDivElement>(null);

  // Active Toolbar Filter & Sort Popup state (Title of active section or null)
  const [activeFilterPopup, setActiveFilterPopup] = useState<string | null>(null);
  const [popupRightOffset, setPopupRightOffset] = useState<number>(0);
  const filterPopupRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(e.target as Node)) {
        setShowCompanyDropdown(false);
      }
      if (filterPopupRef.current && !filterPopupRef.current.contains(e.target as Node)) {
        setActiveFilterPopup(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Clamps the filter & sort popup horizontally so it NEVER overflows off-screen on the left or right
  React.useEffect(() => {
    if (!activeFilterPopup || !filterPopupRef.current) return;
    const updateOffset = () => {
      if (!filterPopupRef.current) return;
      const rect = filterPopupRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const popupWidth = Math.min(340, viewportWidth - 24);
      const margin = 12;
      const leftEdge = rect.right - popupWidth;
      if (leftEdge < margin) {
        setPopupRightOffset(-(margin - leftEdge));
      } else {
        setPopupRightOffset(0);
      }
    };
    updateOffset();
    window.addEventListener("resize", updateOffset);
    window.addEventListener("scroll", updateOffset, { passive: true });
    return () => {
      window.removeEventListener("resize", updateOffset);
      window.removeEventListener("scroll", updateOffset);
    };
  }, [activeFilterPopup]);

  // Load companies
  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/companies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success && res.data.companies?.length) {
        setCompanies(res.data.companies);
        if (!selectedCompanyId) {
          setSelectedCompanyId(res.data.companies[0]._id);
        }
      }
    } catch (err: any) {
      console.error("Failed to load companies:", err);
    }
  };

  // Fetch real-time Meta insights whenever selected company or date preset changes
  useEffect(() => {
    if (selectedCompanyId) {
      loadRealtimeInsights(false);
    }
  }, [selectedCompanyId, datePreset]);

  // Focus entity breakdowns effect removed

  const loadRealtimeInsights = async (isManualSync = false) => {
    if (!selectedCompanyId) return;
    try {
      if (isManualSync) setSyncing(true);
      else setLoading(true);

      setAlertInfo(null);
      setIsUnlinked(false);

      const res: RealtimeInsightsResponse = await fetchCompanyRealtimeInsights(selectedCompanyId, datePreset);
      if (res.success && res.insights) {
        setInsights(res.insights);
        setIsUnlinked(false);
        

        // Update local company in list
        setCompanies((prev) =>
          prev.map((c) => (c._id === selectedCompanyId ? { ...c, metaAdsConfig: res.company?.metaAdsConfig } : c))
        );

        if (isManualSync) {
          setAlertInfo({
            type: "success",
            message: `Live Meta data synchronized successfully at ${new Date().toLocaleTimeString()}!`,
          });
        }
      }
    } catch (err: any) {
      if (err?.response?.data?.isUnlinked) {
        setIsUnlinked(true);
        setInsights(null);
      } else {
        setAlertInfo({
          type: "danger",
          message: err?.response?.data?.message || err?.message || "Failed to load real-time Meta data",
        });
      }
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  // Open modal handlers with automatic breakdowns loader
  const openCampaignModal = (camp: MetaCampaignMetric) => {
    setSelectedCampaign(camp);
    setModalTab("overview");
    setSelectedTimeSlotDate(todayStr);
    setStartTimeSlot("");
    setEndTimeSlot("");
    loadBreakdownsForEntity(camp.id, "campaign", todayStr);
  };

  const openAdsetModal = (as: MetaAdSetMetric) => {
    setSelectedAdset(as);
    setModalTab("overview");
    setSelectedTimeSlotDate(todayStr);
    setStartTimeSlot("");
    setEndTimeSlot("");
    loadBreakdownsForEntity(as.id, "adset", todayStr);
  };

  const openAdModal = (ad: MetaAdMetric) => {
    setSelectedAd(ad);
    setModalTab("overview");
    setSelectedTimeSlotDate(todayStr);
    setStartTimeSlot("");
    setEndTimeSlot("");
    loadBreakdownsForEntity(ad.id, "ad", todayStr);
  };

  const loadBreakdownsForEntity = async (
    entityId: string,
    level: "campaign" | "adset" | "ad",
    specificDate?: string
  ) => {
    if (!selectedCompanyId) return;
    try {
      setLoadingBreakdowns(true);
      const res = await fetchEntityBreakdowns(selectedCompanyId, entityId, level, datePreset, specificDate);
      if (res.success && res.breakdowns) {
        setEntityBreakdowns(res.breakdowns);
      }
    } catch (err) {
      console.warn("Failed to load entity breakdowns:", err);
    } finally {
      setLoadingBreakdowns(false);
    }
  };

  const handleTimeSlotDateChange = (newDate: string) => {
    const minD = getEntityStartDate();
    let validDate = newDate;
    if (minD && validDate < minD) validDate = minD;
    if (validDate > todayStr) validDate = todayStr;
    setSelectedTimeSlotDate(validDate);
    const activeId = selectedCampaign?.id || selectedAdset?.id || selectedAd?.id;
    const activeLvl = selectedCampaign ? "campaign" : selectedAdset ? "adset" : "ad";
    if (activeId && selectedCompanyId) {
      loadBreakdownsForEntity(activeId, activeLvl, validDate);
    }
  };

  const handleResetTimeSlotFilters = () => {
    setSelectedTimeSlotDate(todayStr);
    setStartTimeSlot("");
    setEndTimeSlot("");
    const activeId = selectedCampaign?.id || selectedAdset?.id || selectedAd?.id;
    const activeLvl = selectedCampaign ? "campaign" : selectedAdset ? "adset" : "ad";
    if (activeId && selectedCompanyId) {
      loadBreakdownsForEntity(activeId, activeLvl, todayStr);
    }
  };

  const selectedCompany = companies.find((c) => c._id === selectedCompanyId);
  const currencySymbol = insights?.currency === "INR" ? "₹" : insights?.currency === "EUR" ? "€" : "$";

  const MODAL_TABS_LIST: { id: ModalTab; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "social", label: "Social Media", icon: "📱" },
    { id: "geo", label: "Geographical", icon: "🌍" },
    { id: "time", label: "Time Slot", icon: "⏰" },
  ];

  // Account-Wide Real-Time Telemetry
  const getActiveTelemetry = () => {
    if (!insights) return null;
    const s = insights.summary;
    const perfStatus: "best" | "underperforming" | "neutral" =
      s?.roas && s.roas >= 3 ? "best" : s?.roas && s.roas < 1.5 ? "underperforming" : "neutral";

    return {
      title: "Account Overview",
      budget: "Account-Wide Aggregated",
      performanceStatus: perfStatus,
      spend: s?.spend || 0,
      purchases: s?.purchases || 0,
      sales: s?.purchases || 0,
      leads: s?.leads || 0,
      results: s?.results || s?.purchases || 0,
      resultType: "Purchases",
      cpr: s?.cpa || 0,
      cpl: s?.cpl || 0,
      purchaseValue: s?.purchaseValue || 0,
      roas: s?.roas || 0,
      cpa: s?.cpa || 0,
      cpm: s?.cpm || 0,
      impressions: s?.impressions || 0,
      clicks: s?.clicks || 0,
      ctr: s?.ctr || 0,
      cpc: s?.cpc || 0,
      addToCart: s?.addToCart || 0,
      initiateCheckout: s?.initiateCheckout || 0,
    };
  };

  const activeTelemetry = getActiveTelemetry();

  // Filter & Sort helper for CPL & CPM + Search Query
  const processItems = <
    T extends {
      id: string;
      cpl: number;
      cpm: number;
      name?: string;
      adTitle?: string;
      campaignName?: string;
      adsetName?: string;
    }
  >(
    items: T[],
    sortBy: "none" | "cpl_asc" | "cpl_desc" | "cpm_asc" | "cpm_desc",
    filterMetric: "all" | "cpl" | "cpm",
    filterMin: string,
    filterMax: string,
    searchTerm: string = ""
  ): T[] => {
    let result = [...items];

    // Real-time Search query filtering
    if (searchTerm && searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter((item) => {
        const nameMatch = (item.name || "").toLowerCase().includes(q);
        const titleMatch = (item.adTitle || "").toLowerCase().includes(q);
        const campaignMatch = (item.campaignName || "").toLowerCase().includes(q);
        const adsetMatch = (item.adsetName || "").toLowerCase().includes(q);
        const idMatch = (item.id || "").toLowerCase().includes(q);
        return nameMatch || titleMatch || campaignMatch || adsetMatch || idMatch;
      });
    }

    const minVal = parseFloat(filterMin);
    const maxVal = parseFloat(filterMax);
    const hasMin = !isNaN(minVal);
    const hasMax = !isNaN(maxVal);

    if (filterMetric === "cpl") {
      result = result.filter((item) => {
        if (hasMin && (item.cpl || 0) < minVal) return false;
        if (hasMax && (item.cpl || 0) > maxVal) return false;
        return true;
      });
    } else if (filterMetric === "cpm") {
      result = result.filter((item) => {
        if (hasMin && (item.cpm || 0) < minVal) return false;
        if (hasMax && (item.cpm || 0) > maxVal) return false;
        return true;
      });
    }

    if (sortBy === "cpl_asc") {
      result.sort((a, b) => (a.cpl || 0) - (b.cpl || 0));
    } else if (sortBy === "cpl_desc") {
      result.sort((a, b) => (b.cpl || 0) - (a.cpl || 0));
    } else if (sortBy === "cpm_asc") {
      result.sort((a, b) => (a.cpm || 0) - (b.cpm || 0));
    } else if (sortBy === "cpm_desc") {
      result.sort((a, b) => (b.cpm || 0) - (a.cpm || 0));
    }

    return result;
  };

  // Breakpoint splitting helper
  const splitItemsByBreakpoint = <T extends { id: string; cpl: number; cpm: number }>(
    items: T[],
    metric: "cpl" | "cpm",
    breakpointStr: string
  ): { isSplit: boolean; breakpointVal: number; high: T[]; low: T[] } => {
    const bpVal = parseFloat(breakpointStr);
    if (isNaN(bpVal) || bpVal < 0 || breakpointStr.trim() === "") {
      return { isSplit: false, breakpointVal: 0, high: items, low: [] };
    }

    const high = items.filter((item) => (item[metric] || 0) >= bpVal);
    const low = items.filter((item) => (item[metric] || 0) < bpVal);

    return { isSplit: true, breakpointVal: bpVal, high, low };
  };

  // Processed Campaigns
  const processedCampaigns = processItems(
    insights?.campaigns || [],
    campaignSort,
    campaignFilterMetric,
    campaignFilterMin,
    campaignFilterMax,
    campaignSearch
  );
  const campaignSplit = splitItemsByBreakpoint(
    processedCampaigns,
    campaignBreakpointMetric,
    campaignBreakpoint
  );

  // Processed Ad Sets
  const processedAdsets = processItems(
    insights?.adsets || [],
    adsetSort,
    adsetFilterMetric,
    adsetFilterMin,
    adsetFilterMax,
    adsetSearch
  );
  const adsetSplit = splitItemsByBreakpoint(
    processedAdsets,
    adsetBreakpointMetric,
    adsetBreakpoint
  );

  // Processed Ads
  const processedAds = processItems(
    insights?.ads || [],
    adSort,
    adFilterMetric,
    adFilterMin,
    adFilterMax,
    adSearch
  );
  const adSplit = splitItemsByBreakpoint(
    processedAds,
    adBreakpointMetric,
    adBreakpoint
  );

  // Reaches rendering helper
  const renderBreakdownContent = (breakdownData: EntityBreakdownsResult | null, isLoading: boolean, targetSection?: "overview" | "social" | "geo" | "time") => {
    const effectiveTab = targetSection || modalTab;
    if (isLoading) {
      return (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <Spinner animation="border" variant="primary" size="sm" />
          <p style={{ marginTop: "10px", fontSize: "13px", color: "#94a3b8" }}>
            Fetching deep reaches & time slots from Meta Graph API...
          </p>
        </div>
      );
    }

    if (!breakdownData) {
      return (
        <div style={{ textAlign: "center", padding: "30px", color: "#94a3b8", fontSize: "13px" }}>
          No reach or time slot data available for this item in this date range.
        </div>
      );
    }

    if (effectiveTab === "social") {
      return (
        <div>
          {breakdownData.socialMediaReaches.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px", color: "#94a3b8" }}>No social media reach data reported.</div>
          ) : (
            <div className="responsive-table-wrap">
              <table className="meta-analytics-table">
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th>Placement</th>
                    <th>Unique Reach</th>
                    <th>Impressions</th>
                    <th>Spend</th>
                    <th>Sales</th>
                    <th>ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdownData.socialMediaReaches.map((p, idx) => (
                    <tr key={`${p.publisherPlatform}-${p.platformPosition}-${idx}`}>
                      <td style={{ fontWeight: 700, textTransform: "capitalize" }}>
                        {p.publisherPlatform === "facebook"
                          ? "Facebook"
                          : p.publisherPlatform === "instagram"
                          ? "Instagram"
                          : p.publisherPlatform === "messenger"
                          ? "Messenger"
                          : `${p.publisherPlatform}`}
                      </td>
                      <td style={{ color: "#94a3b8", textTransform: "capitalize" }}>{p.platformPosition.replace(/_/g, " ")}</td>
                      <td style={{ fontWeight: 700, color: "#38bdf8" }}>{p.reach.toLocaleString()}</td>
                      <td>{p.impressions.toLocaleString()}</td>
                      <td>{currencySymbol}{p.spend.toLocaleString()}</td>
                      <td style={{ color: "#3b82f6", fontWeight: 700 }}>{p.purchases}</td>
                      <td>
                        <strong style={{ color: p.roas >= 3 ? "#10b981" : p.roas >= 2 ? "#3b82f6" : "#f59e0b" }}>
                          {p.roas}x
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    if (effectiveTab === "geo") {
      return (
        <div>
          {breakdownData.geographicalReaches.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px", color: "#94a3b8" }}>No geographical reach data reported.</div>
          ) : (
            <div className="responsive-table-wrap">
              <table className="meta-analytics-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Region / State</th>
                    <th>Unique Reach</th>
                    <th>Impressions</th>
                    <th>Spend</th>
                    <th>Orders</th>
                    <th>ROAS</th>
                    <th>CPA</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdownData.geographicalReaches.map((g, idx) => (
                    <tr key={`${g.region}-${idx}`}>
                      <td style={{ color: "#94a3b8", fontWeight: 700 }}>#{idx + 1}</td>
                      <td style={{ fontWeight: 700, color: "#fff" }}>{g.region} {g.country ? `(${g.country})` : ""}</td>
                      <td style={{ fontWeight: 700, color: "#38bdf8" }}>{g.reach.toLocaleString()}</td>
                      <td>{g.impressions.toLocaleString()}</td>
                      <td>{currencySymbol}{g.spend.toLocaleString()}</td>
                      <td style={{ color: "#3b82f6", fontWeight: 700 }}>{g.purchases}</td>
                      <td>
                        <strong style={{ color: g.roas >= 3 ? "#10b981" : g.roas >= 2 ? "#3b82f6" : "#f59e0b" }}>
                          {g.roas}x
                        </strong>
                      </td>
                      <td>{g.cpa > 0 ? `${currencySymbol}${g.cpa}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    if (effectiveTab === "time") {
      const parseTimeToMinutes = (t: string): number | null => {
        if (!t || !t.trim()) return null;
        const parts = t.trim().split(":");
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1] || "0", 10);
        if (isNaN(h)) return null;
        return h * 60 + (isNaN(m) ? 0 : m);
      };

      const getSlotRangeMinutes = (timeSlotStr: string): { startMin: number; endMin: number } => {
        const parts = timeSlotStr.split("-");
        const startPart = parts[0]?.trim() || "00:00";
        const endPart = parts[1]?.trim() || "24:00";

        const sH = parseInt(startPart.split(":")[0], 10) || 0;
        const sM = parseInt(startPart.split(":")[1], 10) || 0;

        let eH = parseInt(endPart.split(":")[0], 10);
        let eM = parseInt(endPart.split(":")[1], 10) || 0;

        if (isNaN(eH)) {
          eH = sH + 1;
        }
        if (eH === 0 && sH >= 23) {
          eH = 24;
          eM = 0;
        } else if (endPart.includes(":59")) {
          eH = eH + 1;
          eM = 0;
        }

        return {
          startMin: sH * 60 + sM,
          endMin: eH * 60 + eM,
        };
      };

      const userStartMin = parseTimeToMinutes(startTimeSlot);
      const userEndMin = parseTimeToMinutes(endTimeSlot);
      const hasActiveTimeFilter = userStartMin !== null || userEndMin !== null;
      const displayDate = selectedTimeSlotDate || todayStr;

      const filteredTimeSlots = breakdownData.timeSlotReaches.filter((ts) => {
        if (!hasActiveTimeFilter) return true;
        const { startMin, endMin } = getSlotRangeMinutes(ts.timeSlot);

        if (userStartMin !== null && userEndMin !== null) {
          if (userStartMin <= userEndMin) {
            return startMin < userEndMin && endMin > userStartMin;
          } else {
            // Overnight range e.g. 22:00 to 06:00
            return endMin > userStartMin || startMin < userEndMin;
          }
        } else if (userStartMin !== null) {
          return endMin > userStartMin;
        } else if (userEndMin !== null) {
          return startMin < userEndMin;
        }
        return true;
      });

      const totalFilteredReach = filteredTimeSlots.reduce((acc, curr) => acc + curr.reach, 0);
      const totalFilteredSpend = filteredTimeSlots.reduce((acc, curr) => acc + curr.spend, 0);
      const totalFilteredOrders = filteredTimeSlots.reduce((acc, curr) => acc + curr.purchases, 0);
      const totalFilteredRevenue = filteredTimeSlots.reduce((acc, curr) => acc + curr.revenue, 0);

      const minDate = getEntityStartDate();

      return (
        <div>
          {/* Controls: Styled Date Input + Start Timing + End Timing */}
          <div className="modal-time-filter-bar">
            <div className="d-flex align-items-center gap-2">
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary, #fff)" }}>
                Audience Reach by Time Slot
              </span>
              <span className="card-tag py-0 px-2" style={{ fontSize: "11px", fontWeight: 700 }}>
                {filteredTimeSlots.length} {filteredTimeSlots.length === 1 ? "Slot" : "Slots"}
              </span>
            </div>

            <div className="d-flex flex-wrap align-items-center" style={{gap: 8, marginTop: 4}}>
              {/* DATE SELECTOR INPUT */}
              <div className="modal-time-filter-item">
                <label style={{ color: "var(--text-secondary, #94a3b8)", fontSize: "13px", fontWeight: 700, }}>Date:</label>
                <input
                  type="date"
                  className="modal-time-input"
                  min={minDate}
                  max={todayStr}
                  value={displayDate}
                  onChange={(e) => handleTimeSlotDateChange(e.target.value)}
                  style={{ width: "135px" }}
                  title={`Select date between campaign/adset start date (${minDate}) and today (${todayStr})`}
                  aria-label="Select date for time slot telemetry"
                />
              </div>

              {/* START TIMING INPUT */}
              <div className="modal-time-filter-item">
                <label style={{ color: "var(--text-secondary, #94a3b8)", fontSize: "13px", fontWeight: 700, }}>Start:</label>
                <input
                  type="time"
                  className="modal-time-input"
                  value={startTimeSlot}
                  onChange={(e) => setStartTimeSlot(e.target.value)}
                  style={{ width: "105px" }}
                  title="Select start timing (e.g. 09:00)"
                  aria-label="Select start timing"
                />
              </div>

              {/* END TIMING INPUT */}
              <div className="modal-time-filter-item">
                <label style={{ color: "var(--text-secondary, #94a3b8)", fontSize: "13px", fontWeight: 700, }}>End:</label>
                <input
                  type="time"
                  className="modal-time-input"
                  value={endTimeSlot}
                  onChange={(e) => setEndTimeSlot(e.target.value)}
                  style={{ width: "105px" }}
                  title="Select end timing (e.g. 18:00)"
                  aria-label="Select end timing"
                />
              </div>

              {/* RESET BUTTON */}
              {(selectedTimeSlotDate !== todayStr || startTimeSlot || endTimeSlot) && (
                <button
                  type="button"
                  className="modal-time-filter-reset-btn"
                  onClick={handleResetTimeSlotFilters}
                  title="Reset date & timing filters"
                >
                  ✕ Reset
                </button>
              )}
            </div>
          </div>

          {/* DYNAMIC METRIC SUMMARY BAR */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: "8px 0" }}>
            <span className="metric-chip" style={{ fontSize: "11px", padding: "3px 8px" }}>
              📅 Date: <strong>{displayDate}</strong>
            </span>
            <span className="metric-chip" style={{ fontSize: "11px", padding: "3px 8px" }}>
              ⏱️ Timing: <strong>{startTimeSlot || "00:00"} — {endTimeSlot || "24:00"}</strong>
            </span>
            <span className="metric-chip highlight-blue" style={{ fontSize: "11px", padding: "3px 8px" }}>
              👥 Reach: <strong>{totalFilteredReach.toLocaleString()}</strong>
            </span>
            <span className="metric-chip highlight-amber" style={{ fontSize: "11px", padding: "3px 8px" }}>
              💸 Spend: <strong>{currencySymbol}{totalFilteredSpend.toLocaleString()}</strong>
            </span>
            <span className="metric-chip highlight-green" style={{ fontSize: "11px", padding: "3px 8px" }}>
              🛒 Orders: <strong>{totalFilteredOrders}</strong>
            </span>
            <span className="metric-chip" style={{ fontSize: "11px", padding: "3px 8px", color: "#10b981", fontWeight: 700 }}>
              💰 Revenue: <strong>{currencySymbol}{totalFilteredRevenue.toLocaleString()}</strong>
            </span>
          </div>

          {/* TIME SLOTS DATA TABLE (Time Slot Group removed) */}
          <div className="responsive-table-wrap">
            <table className="meta-analytics-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time Slot</th>
                  <th>Audience Reach</th>
                  <th>Impressions</th>
                  <th>Spend</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {filteredTimeSlots.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "28px", color: "var(--text-secondary, #94a3b8)" }}>
                      No audience reach recorded for {displayDate} ({startTimeSlot || "00:00"} to {endTimeSlot || "24:00"}).
                    </td>
                  </tr>
                ) : (
                  filteredTimeSlots.map((ts, idx) => (
                    <tr key={`${ts.date || displayDate}-${ts.timeSlot}-${idx}`}>
                      <td style={{ fontWeight: 600, color: "#38bdf8" }}>{ts.date || displayDate}</td>
                      <td style={{ fontWeight: 700 }}>{ts.timeSlot}</td>
                      <td style={{ fontWeight: 700 }}>{ts.reach.toLocaleString()}</td>
                      <td>{ts.impressions.toLocaleString()}</td>
                      <td>{currencySymbol}{ts.spend.toLocaleString()}</td>
                      <td style={{ color: "#3b82f6", fontWeight: 700 }}>{ts.purchases}</td>
                      <td style={{ color: "#10b981", fontWeight: 700 }}>{currencySymbol}{ts.revenue.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* RESTORED DAILY TRAJECTORY & TIMELINE DATA TABLE */}
          {breakdownData.dailyTimeline && breakdownData.dailyTimeline.length > 0 && (
            <div style={{ marginTop: "24px" }}>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h4 style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text-primary, #e2e8f0)", margin: 0 }}>
                  Daily Trajectory & Timeline
                </h4>
                <span className="card-tag py-0 px-2" style={{ fontSize: "10.5px" }}>
                  {breakdownData.dailyTimeline.length} Days
                </span>
              </div>
              <div className="responsive-table-wrap">
                <table className="meta-analytics-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Daily Reach</th>
                      <th>Spend</th>
                      <th>Orders</th>
                      <th>Revenue</th>
                      <th>ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdownData.dailyTimeline.map((d, idx) => (
                      <tr key={`${d.date}-${idx}`}>
                        <td style={{ fontWeight: 700, color: "#38bdf8" }}>
                          {new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </td>
                        <td style={{ fontWeight: 700 }}>{d.reach.toLocaleString()}</td>
                        <td>{currencySymbol}{d.spend.toLocaleString()}</td>
                        <td style={{ color: "#3b82f6", fontWeight: 700 }}>{d.purchases}</td>
                        <td style={{ color: "#10b981", fontWeight: 700 }}>{currencySymbol}{d.revenue.toLocaleString()}</td>
                        <td>
                          <strong style={{ color: d.roas >= 3 ? "#10b981" : d.roas >= 2 ? "#3b82f6" : "#f59e0b" }}>
                            {d.roas}x
                          </strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  // ==========================================
  // CPL & CPM FILTER, SORT, SEARCH & BREAKPOINT POPUP TOOLBAR
  // ==========================================
  const renderFilterSortToolbar = (
    title: string,
    count: number,
    sortBy: "none" | "cpl_asc" | "cpl_desc" | "cpm_asc" | "cpm_desc",
    setSortBy: (val: "none" | "cpl_asc" | "cpl_desc" | "cpm_asc" | "cpm_desc") => void,
    filterMetric: "all" | "cpl" | "cpm",
    setFilterMetric: (val: "all" | "cpl" | "cpm") => void,
    filterMin: string,
    setFilterMin: (val: string) => void,
    filterMax: string,
    setFilterMax: (val: string) => void,
    breakpointMetric: "cpl" | "cpm",
    setBreakpointMetric: (val: "cpl" | "cpm") => void,
    breakpoint: string,
    setBreakpoint: (val: string) => void,
    searchTerm: string,
    setSearchTerm: (val: string) => void
  ) => {
    const isPopupOpen = activeFilterPopup === title;
    const hasActiveFilters =
      sortBy !== "none" ||
      filterMetric !== "all" ||
      Boolean(filterMin) ||
      Boolean(filterMax) ||
      Boolean(breakpoint) ||
      Boolean(searchTerm.trim());

    return (
      <div className="report-card-title row align-items-center justify-content-between m-0 mb-3 p-0 g-2 position-relative">
        {/* Title and Count */}
        <div className="col-12 col-sm-auto d-flex align-items-center p-0" style={{gap: 6}}>
          {/* <h3 className="m-0" style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "-0.2px" }}>
            {title}
          </h3> */}
          <span className="card-tag py-0 px-2" style={{ fontSize: "11px", fontWeight: 700 }}>
            {count} {count === 1 ? "Item" : "Items"}
          </span>
          {hasActiveFilters && (
            <span className="perf-alert-badge best py-0 px-2" style={{ fontSize: "10px" }} title="Filters active">
              Active Filters
            </span>
          )}
        </div>

        {/* Right Actions: Quick Search Box + Single Filter & Sort Popup Icon Trigger Button */}
        <div className="col-12 col-sm-auto p-0 d-flex align-items-center gap-3 justify-content-between justify-content-sm-end flex-nowrap">
          {/* Quick Search Input with Icon and Clear button */}
          <div className="toolbar-search-wrapper position-relative">
            <span className="toolbar-search-icon">🔍</span>
            <input
              type="text"
              className="toolbar-search-input"
              placeholder={`Search ${title.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label={`Search ${title}`}
            />
            {searchTerm && (
              <button
                type="button"
                className="filter-clear-btn"
                onClick={() => setSearchTerm("")}
                title="Clear search"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Single Filter & Sort Popup Icon Trigger Button with Floating Overlay Popup */}
          <div
            className="toolbar-popup-anchor position-relative d-inline-block"
            ref={isPopupOpen ? filterPopupRef : undefined}
          >
            <button
              type="button"
              className={`toolbar-popup-trigger-btn ${hasActiveFilters ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                if (isPopupOpen) {
                  setActiveFilterPopup(null);
                } else {
                  const anchorEl = (e.currentTarget as HTMLElement).closest(".toolbar-popup-anchor");
                  if (anchorEl) {
                    const rect = anchorEl.getBoundingClientRect();
                    const viewportWidth = window.innerWidth;
                    const popupWidth = Math.min(340, viewportWidth - 24);
                    const margin = 12;
                    const leftEdge = rect.right - popupWidth;
                    if (leftEdge < margin) {
                      setPopupRightOffset(-(margin - leftEdge));
                    } else {
                      setPopupRightOffset(0);
                    }
                  }
                  setActiveFilterPopup(title);
                }
              }}
              title="Open Sort, Filter & Breakpoint controls"
              aria-label="Toggle filters and sorting popup"
            >
              <span>⚙️</span>
              {hasActiveFilters && <span className="toolbar-popup-badge-dot" />}
            </button>

            {/* Floating Elevated Pop-up Card: Floats OVER all cards below, right below the button */}
            {isPopupOpen && (
              <div
                className="toolbar-filter-popup-overlay"
                style={{ right: `${popupRightOffset}px` }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="toolbar-filter-popup-header">
                  <div className="d-flex align-items-center" style={{gap: 4}}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary, #fff)" }}>
                      ⚙️ {title} Options
                    </span>
                    {hasActiveFilters && (
                      <span className="perf-alert-badge best py-0 px-2" style={{ fontSize: "9.5px" }}>
                        Active
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="toolbar-filter-popup-close"
                    onClick={() => setActiveFilterPopup(null)}
                    title="Close popup"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                <div className="toolbar-filter-popup-body d-flex flex-column gap-3">
                  {/* 1. Sort Controls */}
                  <div className="toolbar-popup-section">
                    <label className="toolbar-popup-label">Sort Order</label>
                    <select
                      className="toolbar-select w-100"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      aria-label="Sort by CPL or CPM"
                    >
                      <option value="none">Default (Spend / ROAS)</option>
                      <option value="cpl_asc">CPL: Low to High</option>
                      <option value="cpl_desc">CPL: High to Low</option>
                      <option value="cpm_asc">CPM: Low to High</option>
                      <option value="cpm_desc">CPM: High to Low</option>
                    </select>
                  </div>

                  {/* 2. Filter by CPL / CPM */}
                  <div className="toolbar-popup-section">
                    <label className="toolbar-popup-label">Filter by Metric</label>
                    <select
                      className="toolbar-select w-100 mb-2"
                      value={filterMetric}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setFilterMetric(val);
                        if (val === "all") {
                          setFilterMin("");
                          setFilterMax("");
                        }
                      }}
                      aria-label="Filter by metric"
                    >
                      <option value="all">Show All (No filter)</option>
                      <option value="cpl">Filter by CPL ({currencySymbol})</option>
                      <option value="cpm">Filter by CPM ({currencySymbol})</option>
                    </select>

                    {filterMetric !== "all" && (
                      <div className="toolbar-filter-range-row">
                        <div className="toolbar-filter-range-inputs">
                          <input
                            type="number"
                            className="toolbar-input"
                            placeholder="Min"
                            value={filterMin}
                            onChange={(e) => setFilterMin(e.target.value)}
                          />
                          <span className="toolbar-range-sep">-</span>
                          <input
                            type="number"
                            className="toolbar-input"
                            placeholder="Max"
                            value={filterMax}
                            onChange={(e) => setFilterMax(e.target.value)}
                          />
                        </div>
                        {(filterMin || filterMax) && (
                          <button
                            type="button"
                            className="toolbar-btn-clear"
                            onClick={() => {
                              setFilterMin("");
                              setFilterMax("");
                            }}
                            title="Clear min/max range"
                          >
                            ✕ Clear
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 3. Breakpoint Split */}
                  <div className="toolbar-popup-section">
                    <label className="toolbar-popup-label">Breakpoint Split Screen</label>
                    <div className="toolbar-breakpoint-box w-100">
                      <div className="d-flex align-items-center justify-content-between w-100 mb-1">
                        <span className="toolbar-label-pill breakpoint text-nowrap">⚡ Breakpoint</span>
                        <select
                          className="toolbar-select border-0 py-0 px-2"
                          value={breakpointMetric}
                          onChange={(e) => setBreakpointMetric(e.target.value as any)}
                          style={{ fontSize: "11px", background: "rgba(255,255,255,0.08)", width: "auto" }}
                          aria-label="Breakpoint metric selection"
                        >
                          <option value="cpl">CPL</option>
                          <option value="cpm">CPM</option>
                        </select>
                      </div>
                      <div className="toolbar-breakpoint-input-row">
                        <input
                          type="number"
                          className="toolbar-input flex-grow-1"
                          placeholder={`Cutoff threshold ${currencySymbol}`}
                          value={breakpoint}
                          onChange={(e) => setBreakpoint(e.target.value)}
                          title="Enter threshold value to split screen into High vs Low value cards"
                        />
                        {breakpoint && (
                          <button
                            type="button"
                            className="toolbar-btn-reset-single"
                            onClick={() => setBreakpoint("")}
                            title="Reset breakpoint threshold"
                          >
                            ✕ Reset
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 4. Footer with Styled Reset and Done Action */}
                  <div className="toolbar-popup-footer d-flex align-items-center justify-content-between pt-3 mt-1">
                    <div>
                      {hasActiveFilters ? (
                        <button
                          type="button"
                          className="toolbar-btn-reset-all"
                          onClick={() => {
                            setSortBy("none");
                            setFilterMetric("all");
                            setFilterMin("");
                            setFilterMax("");
                            setBreakpoint("");
                            setSearchTerm("");
                          }}
                          title="Clear all active sorting, filtering, search and breakpoint splits"
                        >
                          <span>🔄</span>
                          <span>Reset All Filters</span>
                        </button>
                      ) : (
                        <span className="text-secondary" style={{ fontSize: "11px" }}>
                          No active filters
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="toolbar-btn-apply"
                      onClick={() => setActiveFilterPopup(null)}
                      title="Apply and close"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // BREAKPOINT SPLIT CARDS CONTAINER HELPER
  // ==========================================
  const renderSectionCards = <T extends { id: string; cpl: number; cpm: number }>(
    items: T[],
    isSplit: boolean,
    bpMetric: "cpl" | "cpm",
    bpVal: number,
    highList: T[],
    lowList: T[],
    renderCard: (item: T, isSplit: boolean) => React.ReactNode,
    emptyMessage: string
  ) => {
    if (items.length === 0) {
      return (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary, #94a3b8)" }}>
          {emptyMessage}
        </div>
      );
    }

    if (isSplit) {
      return (
        <div className="breakpoint-split-grid">
          {/* Higher Values Column - Left Side */}
          <div className="breakpoint-column">
            <div className="breakpoint-column-header high">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-1">
                <span className="breakpoint-header-title">
                  ▲ High {bpMetric.toUpperCase()} (≥ {currencySymbol}{bpVal})
                </span>
                <span className="breakpoint-count-badge high">
                  {highList.length} {highList.length === 1 ? "card" : "cards"}
                </span>
              </div>
            </div>

            {highList.length === 0 ? (
              <div className="breakpoint-empty-state">
                No cards with {bpMetric.toUpperCase()} ≥ {currencySymbol}{bpVal}
              </div>
            ) : (
              <div className="cards-dense-grid-split">
                {highList.map((item) => renderCard(item, true))}
              </div>
            )}
          </div>

          {/* Lower Values Column - Right Side */}
          <div className="breakpoint-column">
            <div className="breakpoint-column-header low">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-1">
                <span className="breakpoint-header-title">
                  ▼ Low {bpMetric.toUpperCase()} (&lt; {currencySymbol}{bpVal})
                </span>
                <span className="breakpoint-count-badge low">
                  {lowList.length} {lowList.length === 1 ? "card" : "cards"}
                </span>
              </div>
            </div>

            {lowList.length === 0 ? (
              <div className="breakpoint-empty-state">
                No cards with {bpMetric.toUpperCase()} &lt; {currencySymbol}{bpVal}
              </div>
            ) : (
              <div className="cards-dense-grid-split">
                {lowList.map((item) => renderCard(item, true))}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="cards-dense-grid">
        {items.map((item) => renderCard(item, false))}
      </div>
    );
  };

      // ==========================================
  // UNIFORM CARD RENDERER: CAMPAIGNS (BIG CARD, TOP BADGES, CLEAR COVER IMAGE, DATA AT BOTTOM)
  // ==========================================
  const renderCampaignCard = (camp: MetaCampaignMetric, _isSplit: boolean) => (
    <div
      key={camp.id}
      className={`uniform-metric-card ${camp.imageUrl ? "has-cover-image" : "no-cover-image"}`}
      style={
        camp.imageUrl
          ? {
              backgroundImage: `url(${camp.imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
      onClick={() => openCampaignModal(camp)}
      role="button"
      tabIndex={0}
      title="Click to view full campaign details & reaches"
    >
      <div className="campaign-card-overlay" />

      {/* 1. TOP OF THE CARD: Status, Alert & ROAS Badges */}
      <div className="card-top-badges-wrap" style={{ position: "relative", zIndex: 3 }}>
        <div className="align-items-center " style={{ display: "flex", gap: "4px" }}>
          {camp.performanceStatus === "best" ? (
            <span className="perf-alert-badge best py-1 px-2" title="Top Performing Campaign" style={{ fontSize: "9.5px" }}>
              🔥 Top
            </span>
          ) : camp.performanceStatus === "underperforming" ? (
            <span className="perf-alert-badge underperforming py-1 px-2" title="Underperforming Campaign" style={{ fontSize: "9.5px" }}>
              ⚠️ Alert
            </span>
          ) : null}
          <span
            className={`campaign-status-badge py-1 px-2 ${
              camp.status === "ACTIVE" ? "campaign-status-active" : "campaign-status-paused"
            }`}
            style={{ fontSize: "9px" }}
          >
            {camp.status === "ACTIVE" ? "Active" : "Paused"}
          </span>
        </div>

        {camp.roas > 0 && (
          <span
            className="metric-chip py-1 px-2 fw-bold"
            style={{
              fontSize: "9.5px",
              color: camp.roas >= 3 ? "#10b981" : camp.roas >= 2 ? "#3b82f6" : "#f59e0b",
            }}
          >
            {camp.roas}x
          </span>
        )}
      </div>

      {/* 2. MIDDLE AREA: Open clear space showing the cover image */}

      {/* 3. BOTTOM OF THE CARD: Title and all performance details */}
      <div className="card-bottom-content-wrap mt-auto" style={{ position: "relative", zIndex: 2 }}>
        {/* Title */}
        <div className="mb-1">
          <div className="campaign-card-name text-truncate" title={camp.name}>
            {camp.name}
          </div>
        </div>

        {/* Metric Chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
          <span className="metric-chip highlight-amber" title="Campaign Budget" style={{ fontSize: "9.5px", padding: "1px 5px" }}>
            💰 {camp.budgetFormatted}
          </span>
          <span className="metric-chip highlight-green" title="Confirmed Sales / Orders" style={{ fontSize: "9.5px", padding: "1px 5px" }}>
            🛒 {camp.sales}
          </span>
          {camp.leads > 0 && (
            <span className="metric-chip highlight-purple" title="Captured Leads" style={{ fontSize: "9.5px", padding: "1px 5px" }}>
              📋 {camp.leads}L
            </span>
          )}
          <span className="metric-chip highlight-blue" title="Primary Result & CPR" style={{ fontSize: "9.5px", padding: "1px 5px" }}>
            🎯 {camp.results} ({currencySymbol}{camp.cpr})
          </span>
          <span
            className="metric-chip highlight-cpl"
            style={{ fontSize: "9.5px", padding: "1px 5px" }}
            title="Cost Per Lead"
          >
            CPL: {camp.cpl > 0 ? `${currencySymbol}${camp.cpl}` : "—"}
          </span>
          <span
            className="metric-chip highlight-cpm"
            style={{ fontSize: "9.5px", padding: "1px 5px" }}
            title="Cost Per 1,000 Impressions"
          >
            CPM: {currencySymbol}{camp.cpm}
          </span>
        </div>

        {/* Spend & Revenue */}
        <div className="card-footer-metrics d-flex justify-content-between align-items-center pt-1">
          <div>
            <span className="card-metric-sub">Spend: </span>
            <strong className="card-metric-val">{currencySymbol}{camp.spend.toLocaleString()}</strong>
          </div>
          <div>
            <span className="card-metric-sub">Rev: </span>
            <strong className="card-rev-val">{currencySymbol}{camp.purchaseValue.toLocaleString()}</strong>
          </div>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // UNIFORM CARD RENDERER: AD SETS (BIG CARD, TOP BADGES, CLEAR COVER IMAGE, DATA AT BOTTOM)
  // ==========================================
  const renderAdsetCard = (as: MetaAdSetMetric, _isSplit: boolean) => (
    <div
      key={as.id}
      className="uniform-metric-card no-cover-image"
      onClick={() => openAdsetModal(as)}
      role="button"
      tabIndex={0}
      title="Click to view full ad set details & reaches"
    >
      <div className="campaign-card-overlay" />

      {/* 1. TOP OF THE CARD: Status, Alert & ROAS Badges */}
      <div className="card-top-badges-wrap" style={{ position: "relative", zIndex: 3 }}>
        <div className="align-items-center " style={{ display: "flex", gap: "4px" }}>
          {as.performanceStatus === "best" ? (
            <span className="perf-alert-badge best py-1 px-2" title="Top Performing Ad Set" style={{ fontSize: "9.5px" }}>
              🔥 Top
            </span>
          ) : as.performanceStatus === "underperforming" ? (
            <span className="perf-alert-badge underperforming py-1 px-2" title="Underperforming Ad Set" style={{ fontSize: "9.5px" }}>
              ⚠️ Alert
            </span>
          ) : null}
          <span
            className={`campaign-status-badge py-1 px-2 ${
              as.status === "ACTIVE" ? "campaign-status-active" : "campaign-status-paused"
            }`}
            style={{ fontSize: "9px"}}
          >
            {as.status === "ACTIVE" ? "Active" : "Paused"}
          </span>
        </div>

        {as.roas > 0 && (
          <span
            className="metric-chip py-1 px-2 fw-bold"
            style={{
              fontSize: "9.5px",
              color: as.roas >= 3 ? "#10b981" : as.roas >= 2 ? "#3b82f6" : "#f59e0b",
            }}
          >
            {as.roas}x
          </span>
        )}
      </div>

      {/* 2. MIDDLE AREA: Open clear space showing the cover image */}

      {/* 3. BOTTOM OF THE CARD: Ad Set Name, Campaign & details */}
      <div className="card-bottom-content-wrap mt-auto" style={{ position: "relative", zIndex: 2 }}>
        <div className="mb-1">
          <div className="campaign-card-name text-truncate" title={as.name}>
            {as.name}
          </div>
          <div className="campaign-card-sub text-truncate" title={as.campaignName}>
            {as.campaignName || "Associated Campaign"}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
          <span className="metric-chip highlight-amber" style={{ fontSize: "9.5px", padding: "1px 5px" }}>💰 {as.budgetFormatted}</span>
          <span className="metric-chip highlight-green" style={{ fontSize: "9.5px", padding: "1px 5px" }}>🛒 {as.sales}</span>
          {as.leads > 0 && <span className="metric-chip highlight-purple" style={{ fontSize: "9.5px", padding: "1px 5px" }}>📋 {as.leads}L</span>}
          <span className="metric-chip highlight-blue" style={{ fontSize: "9.5px", padding: "1px 5px" }}>
            🎯 {as.results} ({currencySymbol}{as.cpr})
          </span>
          <span
            className="metric-chip highlight-cpl"
            style={{ fontSize: "9.5px", padding: "1px 5px" }}
            title="Cost Per Lead"
          >
            CPL: {as.cpl > 0 ? `${currencySymbol}${as.cpl}` : "—"}
          </span>
          <span
            className="metric-chip highlight-cpm"
            style={{ fontSize: "9.5px", padding: "1px 5px" }}
            title="Cost Per 1,000 Impressions"
          >
            CPM: {currencySymbol}{as.cpm}
          </span>
        </div>

        <div className="card-footer-metrics d-flex justify-content-between align-items-center pt-1">
          <div>
            <span className="card-metric-sub">Spend: </span>
            <strong className="card-metric-val">{currencySymbol}{as.spend.toLocaleString()}</strong>
          </div>
          <div>
            <span className="card-metric-sub">Rev: </span>
            <strong className="card-rev-val">{currencySymbol}{as.purchaseValue.toLocaleString()}</strong>
          </div>
          <div>
            <span className="card-metric-sub">Clk: </span>
            <span className="card-clk-val">{as.clicks.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // UNIFORM CARD RENDERER: ADS (BIG CARD, TOP BADGES, CLEAR COVER IMAGE, DATA AT BOTTOM)
  // ==========================================
  const renderAdCard = (ad: MetaAdMetric, _isSplit: boolean) => (
    <div
      key={ad.id}
      className={`uniform-metric-card ${ad.imageUrl ? "has-cover-image" : "no-cover-image"}`}
      style={
        ad.imageUrl
          ? {
              backgroundImage: `url(${ad.imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
      onClick={() => openAdModal(ad)}
      role="button"
      tabIndex={0}
      title="Click to view full ad details & reaches"
    >
      <div className="campaign-card-overlay" />

      {/* 1. TOP OF THE CARD: Status, Alert & ROAS Badges */}
      <div className="card-top-badges-wrap" style={{ position: "relative", zIndex: 3 }}>
        <div className="align-items-center " style={{ display: "flex", gap: "4px" }}>
          {ad.performanceStatus === "best" ? (
            <span className="perf-alert-badge best py-1 px-2" title="Top Performing Ad" style={{ fontSize: "9.5px" }}>🔥 Top</span>
          ) : ad.performanceStatus === "underperforming" ? (
            <span className="perf-alert-badge underperforming py-1 px-2" title="Underperforming Ad" style={{ fontSize: "9.5px" }}>⚠️ Alert</span>
          ) : null}

          <span
            className={`campaign-status-badge py-1 px-2 ${
              ad.status === "ACTIVE" ? "campaign-status-active" : "campaign-status-paused"
            }`}
            style={{ fontSize: "9px" }}
          >
            {ad.status === "ACTIVE" ? "Active" : "Paused"}
          </span>
        </div>

        {ad.roas > 0 && (
          <span
            className="metric-chip py-1 px-2 fw-bold"
            style={{
              fontSize: "9.5px",
              color: ad.roas >= 3 ? "#10b981" : ad.roas >= 2 ? "#3b82f6" : "#f59e0b",
            }}
          >
            {ad.roas}x
          </span>
        )}
      </div>

      {/* 2. MIDDLE AREA: Open clear space showing the ad creative image */}

      {/* 3. BOTTOM OF THE CARD: Title and all performance details */}
      <div className="card-bottom-content-wrap mt-auto" style={{ position: "relative", zIndex: 2 }}>
        <div className="mb-1">
          <div className="campaign-card-name text-truncate" title={ad.adTitle || ad.name}>
            {ad.adTitle || ad.name}
          </div>
          <div className="campaign-card-sub text-truncate" title={ad.name}>
            {ad.name || "Ad Creative"}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
          <span className="metric-chip highlight-amber" style={{ fontSize: "9.5px", padding: "1px 5px" }}>💰 {ad.budgetFormatted}</span>
          <span className="metric-chip highlight-green" style={{ fontSize: "9.5px", padding: "1px 5px" }}>🛒 {ad.sales}</span>
          {ad.leads > 0 && <span className="metric-chip highlight-purple" style={{ fontSize: "9.5px", padding: "1px 5px" }}>📋 {ad.leads}L</span>}
          <span className="metric-chip highlight-blue" style={{ fontSize: "9.5px", padding: "1px 5px" }}>
            🎯 {ad.results} ({currencySymbol}{ad.cpr})
          </span>
          <span
            className="metric-chip highlight-cpl"
            style={{ fontSize: "9.5px", padding: "1px 5px" }}
            title="Cost Per Lead"
          >
            CPL: {ad.cpl > 0 ? `${currencySymbol}${ad.cpl}` : "—"}
          </span>
          <span
            className="metric-chip highlight-cpm"
            style={{ fontSize: "9.5px", padding: "1px 5px" }}
            title="Cost Per 1,000 Impressions"
          >
            CPM: {currencySymbol}{ad.cpm}
          </span>
        </div>

        <div className="card-footer-metrics d-flex justify-content-between align-items-center pt-1">
          <div>
            <span className="card-metric-sub">Spend: </span>
            <strong className="card-metric-val">{currencySymbol}{ad.spend.toLocaleString()}</strong>
          </div>
          <div>
            <span className="card-metric-sub">Rev: </span>
            <strong className="card-rev-val">{currencySymbol}{ad.purchaseValue.toLocaleString()}</strong>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="reports-container container-fluid px-2 px-sm-3 px-md-4">
      {/* Top Header: In-line with Company and Date controls on large screens */}
      <div className="reports-header row align-items-center justify-content-between g-3 m-0 mb-4 p-0">
        <div className="col-12 col-lg-auto p-0">
          <h1 className="reports-title">Real-Time Performance Reports</h1>
          <p className="reports-subtitle">
            Live Meta Marketing API telemetry &bull; Campaigns, Ad Sets, Ads, Geographics & Time Analytics
          </p>
        </div>

        <div className="col-12 col-lg-auto p-0 d-flex justify-content-start justify-content-lg-end">
          <div className="reports-actions-responsive">
            <button
              type="button"
              className="btn-primary-glow"
              onClick={() => loadRealtimeInsights(true)}
              disabled={syncing || loading || isUnlinked}
              title="Fetch updated live values from the Meta dashboard"
            >
              <span className={syncing ? "spinning-icon" : ""}>🔄</span>
              <span>{syncing ? "Fetching Updates..." : "Refresh Live Data"}</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                className="btn-outline-soft"
                onClick={() => setShowLinkModal(true)}
                title="Switch or link Meta Ad Account"
              >
                <span>🔗</span>
                <span>Change Ad Account</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alert Notification */}
      {alertInfo && (
        <div
          className={`report-alert-clean report-alert-${alertInfo.type}`}
          onMouseEnter={() => setAlertPaused(true)}
          onMouseLeave={() => setAlertPaused(false)}
        >
          <div className="report-alert-body">
            <span className="report-alert-icon">
              {alertInfo.type === "success" ? "✓" : alertInfo.type === "danger" ? "✕" : "ℹ"}
            </span>
            <div className="report-alert-text">{alertInfo.message}</div>
            <button
              type="button"
              className="report-alert-close"
              onClick={() => setAlertInfo(null)}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div
            className={`report-alert-progress ${alertPaused ? "paused" : ""}`}
            onAnimationEnd={() => setAlertInfo(null)}
          />
        </div>
      )}

      {/* Linear Filter Bar: Company + Date + Synced Timer */}
      <div className="filter-linear-container container-fluid p-3 mb-4">
        <div className="row g-3 align-items-center m-0 p-0">
          {/* Company Selector */}
          <div className="col-12 col-md-7 col-lg-8 p-0">
            <div className="filter-responsive-group">
              <label className="filter-linear-label">Company:</label>
              <div className="filter-input-rel flex-grow-1" ref={companyDropdownRef}>
                <input
                  type="text"
                  placeholder={selectedCompany ? selectedCompany.companyName : "Search company by name..."}
                  value={companySearchInput}
                  onChange={(e) => {
                    setCompanySearchInput(e.target.value);
                    setShowCompanyDropdown(true);
                  }}
                  onFocus={() => setShowCompanyDropdown(true)}
                  className="filter-linear-input w-100"
                  style={{
                    paddingRight: companySearchInput ? "28px" : "12px",
                    borderColor: showCompanyDropdown ? "#3b82f6" : undefined,
                  }}
                />

                {companySearchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setCompanySearchInput("");
                      setShowCompanyDropdown(false);
                    }}
                    className="filter-clear-btn"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}

                {/* Suggestions Popup (Always same width as input) */}
                {showCompanyDropdown && (
                  <div className="filter-dropdown-menu">
                    {companies
                      .filter((c) => {
                        if (!companySearchInput) return true;
                        return c.companyName.toLowerCase().includes(companySearchInput.toLowerCase());
                      })
                      .map((c) => (
                        <div
                          key={c._id}
                          className={`filter-dropdown-item ${selectedCompanyId === c._id ? "active" : ""}`}
                          onClick={() => {
                            setSelectedCompanyId(c._id);
                            setCompanySearchInput("");
                            setShowCompanyDropdown(false);
                          }}
                        >
                          <div>
                            <div className="company-item-name">{c.companyName}</div>
                            <div className="company-item-sub">
                              {c.metaAdsConfig?.adAccountId ? (
                                <span style={{ color: "#3b82f6" }}>
                                  {c.metaAdsConfig.adAccountName || c.metaAdsConfig.adAccountId}
                                </span>
                              ) : (
                                <span style={{ color: "#f59e0b" }}>Not linked</span>
                              )}
                            </div>
                          </div>
                          {selectedCompanyId === c._id && (
                            <span style={{ fontSize: "11px", color: "#10b981", fontWeight: 700 }}>Active</span>
                          )}
                        </div>
                      ))}

                    {companies.filter((c) =>
                      c.companyName.toLowerCase().includes(companySearchInput.toLowerCase())
                    ).length === 0 && (
                      <div className="filter-dropdown-empty">
                        No company found for "{companySearchInput}".
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Date field */}
          <div className="col-12 col-md-5 col-lg-4 p-0">
            <div className="filter-responsive-group">
              <label className="filter-linear-label">Date:</label>
              <div className="filter-input-rel flex-grow-1">
                <select
                  className="filter-linear-select w-100"
                  value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value)}
                >
                  {DATE_PRESETS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
        {/* Bottom Left: Synced Timer & Status */}
        <div className="filter-synced-bottom-left row m-0 mt-2 pt-2 border-top border-secondary-subtle">
          <div className="col-12 p-0 d-flex align-items-center flex-wrap gap-2">
            {selectedCompany?.metaAdsConfig?.adAccountId ? (
              <div className="synced-timer-tag">
                <span>
                  Account: <strong style={{ color: "#38bdf8" }}>{selectedCompany.metaAdsConfig.adAccountName || selectedCompany.metaAdsConfig.adAccountId}</strong>
                </span>
                {insights?.fetchedAt && (
                  <span className="synced-time-text">
                    &bull; Synced at {new Date(insights.fetchedAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
            ) : (
              <div className="synced-timer-tag">
                <span className="synced-dot amber" />
                <span style={{ color: "#f59e0b" }}>No Ad Account Linked</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <Spinner animation="border" variant="primary" />
          <p style={{ marginTop: "14px", color: "var(--text-secondary, #94a3b8)", fontSize: "14px" }}>
            Querying Meta Marketing API in real time...
          </p>
        </div>
      ) : isUnlinked ? (
        /* Empty State: Unlinked Account */
        <div className="report-card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔗</div>
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary, #fff)" }}>
            Connect Meta Ad Account for {selectedCompany?.companyName}
          </h3>
          <p style={{ color: "var(--text-secondary, #94a3b8)", maxWidth: "540px", margin: "8px auto 24px auto", fontSize: "13.5px" }}>
            {isAdmin
              ? "To fetch real-time ad spend, purchases, ROAS, and campaign analytics without uploading any manual CSVs, select this client's ad account from the dropdown."
              : "No Meta Ad Account is currently linked for this client. Please contact an administrator to link the client's ad account."}
          </p>
          {isAdmin ? (
            <button
              type="button"
              className="btn-primary-glow btn-link-ad-account"
              onClick={() => setShowLinkModal(true)}
            >
              <span>🔗</span>
              <span>Select & Link Ad Account from Dropdown</span>
            </button>
          ) : (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 18px",
                borderRadius: "10px",
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                color: "#f59e0b",
                fontSize: "13.5px",
                fontWeight: 600,
              }}
            >
              <span>⚠️</span>
              <span>Administrator access is required to link or change ad accounts</span>
            </div>
          )}
        </div>
      ) : insights && activeTelemetry ? (
        <div>
          {/* TOP KPI CARDS: DYNAMIC EXECUTIVE REAL-TIME TELEMETRY */}
          <div className="sections-grid row m-0 mb-3 p-0">
            <div className="col-12 p-0">
              <div className="report-card p-2 p-md-3">
                

                <div className="report-card-title row g-2 align-items-center justify-content-between m-0 mb-2 p-0">
                  <div className="col-12 col-sm-auto p-0 d-flex align-items-center gap-2 flex-wrap">
                    <h3 className="m-0" style={{ fontSize: "15px", fontWeight: 700 }}>
                      ⚡ Real-Time Performance Overview
                    </h3>
                    {activeTelemetry.performanceStatus === "best" ? (
                      <span className="perf-alert-badge best py-0 px-2" title="Strong ROAS & Conversion Performance" style={{ fontSize: "10px" }}>
                        🔥 Top Performer
                      </span>
                    ) : activeTelemetry.performanceStatus === "underperforming" ? (
                      <span className="perf-alert-badge underperforming py-0 px-2" title="Underperforming" style={{ fontSize: "10px" }}>
                        ⚠️ Alert
                      </span>
                    ) : null}
                  </div>
                  <div className="col-12 col-sm-auto p-0">
                    <span className="card-tag py-0 px-2" style={{ fontSize: "11px" }}>
                      {insights.since && insights.until ? `${insights.since} to ${insights.until}` : datePreset} &bull; {insights.currency}
                    </span>
                  </div>
                </div>

                {/* 6 Primary KPI Tiles in a single compact row */}
                <div className="kpi-grid-dense">
                  {/* Spend */}
                  <div className="kpi-tile">
                    <span className="kpi-tile-label">Ad Spend</span>
                    <span className="kpi-tile-value">
                      {currencySymbol}{activeTelemetry.spend.toLocaleString()}
                    </span>
                    <span className="kpi-tile-sub text-truncate">
                      {activeTelemetry.budget}
                    </span>
                  </div>

                  {/* Purchases / Sales */}
                  <div className="kpi-tile">
                    <span className="kpi-tile-label">Sales (Orders)</span>
                    <span className="kpi-tile-value" style={{ color: "#3b82f6" }}>
                      {activeTelemetry.sales.toLocaleString()}
                    </span>
                    <span className="kpi-tile-sub">
                      CPA: {currencySymbol}{activeTelemetry.cpa}
                    </span>
                  </div>

                  {/* Leads */}
                  <div className="kpi-tile">
                    <span className="kpi-tile-label">Leads</span>
                    <span className="kpi-tile-value" style={{ color: "#8b5cf6" }}>
                      {activeTelemetry.leads.toLocaleString()}
                    </span>
                    <span className="kpi-tile-sub">
                      CPL: {activeTelemetry.cpl > 0 ? `${currencySymbol}${activeTelemetry.cpl}` : "—"}
                    </span>
                  </div>

                  {/* Primary Results & CPR */}
                  <div className="kpi-tile">
                    <span className="kpi-tile-label text-truncate">Result: {activeTelemetry.resultType}</span>
                    <span className="kpi-tile-value" style={{ color: "#ec4899" }}>
                      {activeTelemetry.results.toLocaleString()}
                    </span>
                    <span className="kpi-tile-sub">
                      CPR: {activeTelemetry.cpr > 0 ? `${currencySymbol}${activeTelemetry.cpr}` : "—"}
                    </span>
                  </div>

                  {/* Purchase Value / Revenue */}
                  <div className="kpi-tile">
                    <span className="kpi-tile-label">Revenue</span>
                    <span className="kpi-tile-value" style={{ color: "#10b981" }}>
                      {currencySymbol}{activeTelemetry.purchaseValue.toLocaleString()}
                    </span>
                    <span className="kpi-tile-sub" style={{ color: "#10b981" }}>
                      Gross Attributed
                    </span>
                  </div>

                  {/* ROAS */}
                  <div className="kpi-tile">
                    <span className="kpi-tile-label">ROAS</span>
                    <span
                      className="kpi-tile-value"
                      style={{ color: activeTelemetry.roas >= 3 ? "#10b981" : activeTelemetry.roas >= 2 ? "#3b82f6" : "#f59e0b" }}
                    >
                      {activeTelemetry.roas}x
                    </span>
                    <span className="kpi-tile-sub">Return on Spend</span>
                  </div>
                </div>

                {/* Secondary Metrics: Small boxes with full label and value */}
                <div className="secondary-metrics-grid">
                  <div className="secondary-metric-box">
                    <span className="sec-metric-label">👁️ Total Impressions</span>
                    <span className="sec-metric-val">{activeTelemetry.impressions.toLocaleString()}</span>
                  </div>
                  <div className="secondary-metric-box">
                    <span className="sec-metric-label">🖱️ Link Clicks</span>
                    <span className="sec-metric-val">{activeTelemetry.clicks.toLocaleString()}</span>
                  </div>
                  <div className="secondary-metric-box">
                    <span className="sec-metric-label">⚡ Click-Through Rate</span>
                    <span className="sec-metric-val">{activeTelemetry.ctr}% CTR</span>
                  </div>
                  <div className="secondary-metric-box">
                    <span className="sec-metric-label">💰 Cost Per Click</span>
                    <span className="sec-metric-val">{currencySymbol}{activeTelemetry.cpc} CPC</span>
                  </div>
                  <div className="secondary-metric-box">
                    <span className="sec-metric-label">🛒 Adds to Cart</span>
                    <span className="sec-metric-val">{activeTelemetry.addToCart.toLocaleString()}</span>
                  </div>
                  <div className="secondary-metric-box">
                    <span className="sec-metric-label">💳 Initiated Checkouts</span>
                    <span className="sec-metric-val">{activeTelemetry.initiateCheckout.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* HORIZONTAL TAB SELECTION WITH LEFT & RIGHT ARROWS */}
          <div className="horizontal-tabs-bar-container">
            <button
              type="button"
              className="tab-arrow-nav-btn left"
              onClick={scrollTabsLeft}
              title="Scroll tabs left"
              aria-label="Scroll tabs left"
            >
              ‹
            </button>
            <div className="horizontal-tabs-scroll-track" ref={tabsScrollRef}>
              <button
                type="button"
                className={`horizontal-tab-pill ${activeTab === "campaigns" ? "active" : ""}`}
                onClick={() => setActiveTab("campaigns")}
              >
                <span>Campaigns</span>
                <span className="tab-pill-badge">{processedCampaigns.length}</span>
              </button>
              <button
                type="button"
                className={`horizontal-tab-pill ${activeTab === "adsets" ? "active" : ""}`}
                onClick={() => setActiveTab("adsets")}
              >
                <span>Ad Sets</span>
                <span className="tab-pill-badge">{processedAdsets.length}</span>
              </button>
              <button
                type="button"
                className={`horizontal-tab-pill ${activeTab === "ads" ? "active" : ""}`}
                onClick={() => setActiveTab("ads")}
              >
                <span>Ads</span>
                <span className="tab-pill-badge">{processedAds.length}</span>
              </button>
              <button
                type="button"
                className={`horizontal-tab-pill ${activeTab === "geographics" ? "active" : ""}`}
                onClick={() => setActiveTab("geographics")}
              >
                <span>Geographics</span>
                <span className="tab-pill-badge">{(insights.geographics || []).length}</span>
              </button>
              <button
                type="button"
                className={`horizontal-tab-pill ${activeTab === "time" ? "active" : ""}`}
                onClick={() => setActiveTab("time")}
              >
                <span>Time & Daily</span>
                <span className="tab-pill-badge">{(insights.timeTrends || []).length}</span>
              </button>
              <button
                type="button"
                className={`horizontal-tab-pill ${activeTab === "placements" ? "active" : ""}`}
                onClick={() => setActiveTab("placements")}
              >
                <span>Social Reaches</span>
                <span className="tab-pill-badge">{(insights.placements || []).length}</span>
              </button>
            </div>
            <button
              type="button"
              className="tab-arrow-nav-btn right"
              onClick={scrollTabsRight}
              title="Scroll tabs right"
              aria-label="Scroll tabs right"
            >
              ›
            </button>
          </div>

          <div className="horizontal-tabs-content-area">
          {/* TAB 1: CAMPAIGNS BREAKDOWN */}
          {activeTab === "campaigns" && (
            <div className="sections-grid">
              <div className="col-12">
                <div className={`report-card ${activeFilterPopup === "Campaign Performance" ? "has-active-popup" : ""}`}>
                  {renderFilterSortToolbar(
                    "Campaign Performance",
                    processedCampaigns.length,
                    campaignSort,
                    setCampaignSort,
                    campaignFilterMetric,
                    setCampaignFilterMetric,
                    campaignFilterMin,
                    setCampaignFilterMin,
                    campaignFilterMax,
                    setCampaignFilterMax,
                    campaignBreakpointMetric,
                    setCampaignBreakpointMetric,
                    campaignBreakpoint,
                    setCampaignBreakpoint,
                    campaignSearch,
                    setCampaignSearch
                  )}

                  {renderSectionCards(
                    processedCampaigns,
                    campaignSplit.isSplit,
                    campaignBreakpointMetric,
                    campaignSplit.breakpointVal,
                    campaignSplit.high,
                    campaignSplit.low,
                    renderCampaignCard,
                    "No campaigns found matching your filter criteria."
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AD SETS BREAKDOWN */}
          {activeTab === "adsets" && (
            <div className="sections-grid">
              <div className="col-12">
                <div className={`report-card ${activeFilterPopup === "Ad Sets" ? "has-active-popup" : ""}`}>
                  {renderFilterSortToolbar(
                    "Ad Sets",
                    processedAdsets.length,
                    adsetSort,
                    setAdsetSort,
                    adsetFilterMetric,
                    setAdsetFilterMetric,
                    adsetFilterMin,
                    setAdsetFilterMin,
                    adsetFilterMax,
                    setAdsetFilterMax,
                    adsetBreakpointMetric,
                    setAdsetBreakpointMetric,
                    adsetBreakpoint,
                    setAdsetBreakpoint,
                    adsetSearch,
                    setAdsetSearch
                  )}

                  {renderSectionCards(
                    processedAdsets,
                    adsetSplit.isSplit,
                    adsetBreakpointMetric,
                    adsetSplit.breakpointVal,
                    adsetSplit.high,
                    adsetSplit.low,
                    renderAdsetCard,
                    "No ad sets found matching your filter criteria."
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ADS BREAKDOWN & CREATIVE PREVIEW */}
          {activeTab === "ads" && (
            <div className="sections-grid">
              <div className="col-12">
                <div className={`report-card ${activeFilterPopup === "Individual Ads & Creatives" ? "has-active-popup" : ""}`}>
                  {renderFilterSortToolbar(
                    "Individual Ads & Creatives",
                    processedAds.length,
                    adSort,
                    setAdSort,
                    adFilterMetric,
                    setAdFilterMetric,
                    adFilterMin,
                    setAdFilterMin,
                    adFilterMax,
                    setAdFilterMax,
                    adBreakpointMetric,
                    setAdBreakpointMetric,
                    adBreakpoint,
                    setAdBreakpoint,
                    adSearch,
                    setAdSearch
                  )}

                  {renderSectionCards(
                    processedAds,
                    adSplit.isSplit,
                    adBreakpointMetric,
                    adSplit.breakpointVal,
                    adSplit.high,
                    adSplit.low,
                    renderAdCard,
                    "No individual ads found matching your filter criteria."
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GEOGRAPHICS BREAKDOWN */}
          {activeTab === "geographics" && (
            <div className="sections-grid">
              <div className="col-12">
                <div className="report-card">
                  <div className="report-card-title d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div className="d-flex align-items-center flex-wrap" style={{gap: 4}}>
                      <h3 className="m-0">Geographic Reaches</h3>
                      <span className="card-tag">Account-Wide Global Reaches</span>
                    </div>
                    <span className="card-tag">
                      `${(insights.geographics || []).length} Regions Tracked`
                    </span>
                  </div>

                  {(insights.geographics || []).length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary, #94a3b8)" }}>
                      No geographic data reported for this time period from Meta.
                    </div>
                  ) : (
                    <div className="responsive-table-wrap">
                      <table className="meta-analytics-table">
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Region / State</th>
                            <th>Spend</th>
                            <th>Orders</th>
                            <th>Attributed Revenue</th>
                            <th>ROAS</th>
                            <th>CPA</th>
                            <th>Impressions</th>
                            <th>Clicks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(insights.geographics || []).map((geo, idx) => (
                            <tr key={`${geo.region}-${idx}`}>
                              <td style={{ color: "#94a3b8", fontWeight: 700 }}>#{idx + 1}</td>
                              <td style={{ fontWeight: 600 }}>{geo.region}</td>
                              <td>{currencySymbol}{geo.spend.toLocaleString()}</td>
                              <td style={{ color: "#3b82f6", fontWeight: 700 }}>{geo.purchases}</td>
                              <td style={{ color: "#10b981", fontWeight: 700 }}>{currencySymbol}{geo.purchaseValue.toLocaleString()}</td>
                              <td>
                                <strong style={{ color: geo.roas >= 3 ? "#10b981" : geo.roas >= 2 ? "#3b82f6" : "#f59e0b" }}>
                                  {geo.roas}x
                                </strong>
                              </td>
                              <td>{currencySymbol}{geo.cpa.toFixed(2)}</td>
                              <td>{geo.impressions.toLocaleString()}</td>
                              <td>{geo.clicks.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: TIME TRENDS & TIME SLOTS BREAKDOWN */}
          {activeTab === "time" && (
            <div className="sections-grid">
              <div className="col-12">
                <div className="report-card">
                  <div className="report-card-title d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div className="d-flex align-items-center flex-wrap" style={{gap: 4}}>
                      <h3 className="m-0">Time & Daily Timeline</h3>
                      <span className="card-tag">Account-Wide Daily Timeline</span>
                    </div>
                  </div>

                  {(insights.timeTrends || []).length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary, #94a3b8)" }}>
                      No daily timeline data reported for this time period from Meta.
                    </div>
                  ) : (
                    <div className="responsive-table-wrap">
                      <table className="meta-analytics-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Spend</th>
                            <th>Orders</th>
                            <th>Attributed Revenue</th>
                            <th>ROAS</th>
                            <th>CPA</th>
                            <th>Impressions</th>
                            <th>Clicks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...(insights.timeTrends || [])]
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map((trend, idx) => (
                              <tr key={`${trend.date}-${idx}`}>
                                <td style={{ fontWeight: 600 }}>{trend.date}</td>
                              <td>{currencySymbol}{trend.spend.toLocaleString()}</td>
                              <td style={{ color: "#3b82f6", fontWeight: 700 }}>{trend.purchases}</td>
                              <td style={{ color: "#10b981", fontWeight: 700 }}>{currencySymbol}{trend.purchaseValue.toLocaleString()}</td>
                              <td>
                                <strong style={{ color: trend.roas >= 3 ? "#10b981" : trend.roas >= 2 ? "#3b82f6" : "#f59e0b" }}>
                                  {trend.roas}x
                                </strong>
                              </td>
                              <td>{currencySymbol}{trend.cpa.toFixed(2)}</td>
                              <td>{trend.impressions.toLocaleString()}</td>
                              <td>{trend.clicks.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PLACEMENTS & SOCIAL MEDIA REACHES BREAKDOWN */}
          {activeTab === "placements" && (
            <div className="sections-grid">
              <div className="col-12">
                <div className="report-card">
                  <div className="report-card-title d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-2 flex-wrap" style={{gap: 4}}>
                      <h3 className="m-0">Social Media Reaches (Facebook, Instagram, Messenger)</h3>
                      <span className="card-tag">Account-Wide Publisher Reaches</span>
                    </div>
                  </div>

                  {(insights.placements || []).length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary, #94a3b8)" }}>
                      No placement breakdown data reported for this time period from Meta.
                    </div>
                  ) : (
                    <div className="responsive-table-wrap">
                      <table className="meta-analytics-table">
                        <thead>
                          <tr>
                            <th>Publisher Platform</th>
                            <th>Placement Position</th>
                            <th>Spend</th>
                            <th>Orders</th>
                            <th>Revenue</th>
                            <th>ROAS</th>
                            <th>Impressions</th>
                            <th>Clicks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(insights.placements || []).map((pl, idx) => (
                            <tr key={`${pl.publisherPlatform}-${pl.platformPosition}-${idx}`}>
                              <td style={{ fontWeight: 600, textTransform: "capitalize" }}>
                                {pl.publisherPlatform === "facebook" ? "📘 Facebook" : pl.publisherPlatform === "instagram" ? "📸 Instagram" : pl.publisherPlatform === "messenger" ? "💬 Messenger" : `🌐 ${pl.publisherPlatform}`}
                              </td>
                              <td style={{ color: "var(--text-secondary, #94a3b8)", textTransform: "capitalize" }}>{pl.platformPosition.replace(/_/g, " ")}</td>
                              <td>{currencySymbol}{pl.spend.toLocaleString()}</td>
                              <td style={{ color: "#3b82f6", fontWeight: 700 }}>{pl.purchases}</td>
                              <td style={{ color: "#10b981", fontWeight: 700 }}>{currencySymbol}{pl.purchaseValue.toLocaleString()}</td>
                              <td>
                                <strong style={{ color: pl.roas >= 3 ? "#10b981" : pl.roas >= 2 ? "#3b82f6" : "#f59e0b" }}>
                                  {pl.roas}x
                                </strong>
                              </td>
                              <td>{pl.impressions.toLocaleString()}</td>
                              <td>{pl.clicks.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
            </div>
          </div>
        ) : null}

      {/* CAMPAIGN DETAIL MODAL POPUP */}
      {selectedCampaign && (
        <div
          className="report-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedCampaign(null);
          }}
        >
          <div
            className="report-modal-card"
            style={{ maxWidth: "780px", width: "95%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="report-modal-header row align-items-center justify-content-between m-0 p-3">
              <div className="col d-flex align-items-center flex-wrap p-0" style={{gap: 6}}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, lineHeight: 1.4 }}>
                  {selectedCampaign.name}
                </h3>
                {selectedCampaign.performanceStatus === "best" ? (
                  <span className="perf-alert-badge best">🔥 Top Performer</span>
                ) : selectedCampaign.performanceStatus === "underperforming" ? (
                  <span className="perf-alert-badge underperforming">⚠️ Underperforming</span>
                ) : null}
                <span
                  className={`campaign-status-badge ${
                    selectedCampaign.status === "ACTIVE" ? "campaign-status-active" : "campaign-status-paused"
                  }`}
                  style={{ fontSize: "11px", padding: "3px 9px" }}
                >
                  {selectedCampaign.status === "ACTIVE" ? "Active" : "Paused"}
                </span>
              </div>
              <div className="col-auto p-0 ms-2">
                <button
                  type="button"
                  className="report-modal-close"
                  onClick={() => setSelectedCampaign(null)}
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </div>

                        {/* Modal Horizontal Tabs with Left & Right Arrows */}
            <div className="modal-horizontal-tabs-container">
              <button
                type="button"
                className="tab-arrow-nav-btn left"
                onClick={scrollModalTabsLeft}
                title="Scroll tabs left"
                aria-label="Scroll tabs left"
              >
                ‹
              </button>
              <div className="modal-horizontal-tabs-track" ref={modalTabsScrollRef}>
                {MODAL_TABS_LIST.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`horizontal-tab-pill ${modalTab === t.id ? "active" : ""}`}
                    onClick={() => setModalTab(t.id)}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="tab-arrow-nav-btn right"
                onClick={scrollModalTabsRight}
                title="Scroll tabs right"
                aria-label="Scroll tabs right"
              >
                ›
              </button>
            </div>

            <div className="report-modal-body">
              {modalTab === "overview" ? (
                <div>
                  {selectedCampaign.imageUrl && (
                    <div
                      style={{
                        position: "relative",
                        borderRadius: "12px",
                        overflow: "hidden",
                        marginBottom: "16px",
                        maxHeight: "220px",
                        border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
                        background: "#000",
                      }}
                    >
                      <img
                        src={selectedCampaign.imageUrl}
                        alt={selectedCampaign.name}
                        style={{ width: "100%", height: "200px", objectFit: "cover", display: "block" }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          bottom: "8px",
                          left: "12px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background: "rgba(0, 0, 0, 0.65)",
                          color: "#fff",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          backdropFilter: "blur(4px)",
                        }}
                      >
                        Real Meta Ad Creative
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      // gap: "10px",
                      padding: "12px 16px",
                      borderRadius: "10px",
                      background: "var(--bg-hover, rgba(255, 255, 255, 0.04))",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
                      fontSize: "12.5px",
                      marginBottom: "16px",
                    }}
                  >
                    <div>
                      <span style={{ color: "var(--text-secondary, #94a3b8)" }}>Campaign ID: </span>
                      <strong style={{ color: "var(--text-primary, #fff)" }}>{selectedCampaign.id}</strong>
                    </div>
                    {selectedCampaign.objective && (
                      <div>
                        <span style={{ color: "var(--text-secondary, #94a3b8)" }}>Objective: </span>
                        <strong style={{ color: "#38bdf8" }}>{selectedCampaign.objective}</strong>
                      </div>
                    )}
                    <div>
                      <span style={{ color: "var(--text-secondary, #94a3b8)" }}>Budget: </span>
                      <strong style={{ color: "#fbbf24" }}>{selectedCampaign.budgetFormatted}</strong>
                    </div>
                  </div>

                  <div className="row g-2 m-0 p-0">
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">Total Spend</div>
                        <div className="campaign-detail-metric-val" style={{ color: "#38bdf8" }}>
                          {currencySymbol}{selectedCampaign.spend.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">Sales (Purchases)</div>
                        <div className="campaign-detail-metric-val" style={{ color: "#60a5fa" }}>
                          {selectedCampaign.sales.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">Leads</div>
                        <div className="campaign-detail-metric-val" style={{ color: "#8b5cf6" }}>
                          {selectedCampaign.leads.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">Result: {selectedCampaign.resultType}</div>
                        <div className="campaign-detail-metric-val" style={{ color: "#ec4899" }}>
                          {selectedCampaign.results.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">Cost Per Result (CPR)</div>
                        <div className="campaign-detail-metric-val">
                          {selectedCampaign.cpr > 0 ? `${currencySymbol}${selectedCampaign.cpr}` : "—"}
                        </div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">Cost Per Lead (CPL)</div>
                        <div className="campaign-detail-metric-val">
                          {selectedCampaign.cpl > 0 ? `${currencySymbol}${selectedCampaign.cpl}` : "—"}
                        </div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">Purchase Value (Revenue)</div>
                        <div className="campaign-detail-metric-val" style={{ color: "#34d399" }}>
                          {currencySymbol}{selectedCampaign.purchaseValue.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">ROAS</div>
                        <div className="campaign-detail-metric-val" style={{ color: selectedCampaign.roas >= 3 ? "#34d399" : "#38bdf8" }}>
                          {selectedCampaign.roas}x
                        </div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">Cost Per Acquisition (CPA)</div>
                        <div className="campaign-detail-metric-val">
                          {selectedCampaign.cpa > 0 ? `${currencySymbol}${selectedCampaign.cpa}` : "—"}
                        </div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">Cost Per Click (CPC)</div>
                        <div className="campaign-detail-metric-val">{currencySymbol}{selectedCampaign.cpc}</div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">CTR (Click Rate)</div>
                        <div className="campaign-detail-metric-val" style={{ color: "#a78bfa" }}>{selectedCampaign.ctr}%</div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">Impressions</div>
                        <div className="campaign-detail-metric-val">{selectedCampaign.impressions.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                renderBreakdownContent(entityBreakdowns, loadingBreakdowns)
              )}
            </div>
            {/* <div className="report-modal-footer d-flex flex-wrap justify-content-end align-items-center gap-2 p-3">
              <button
                type="button"
                className="btn-outline-soft"
                onClick={() => setSelectedCampaign(null)}
              >
                Close
              </button>
            </div> */}
          </div>
        </div>
      )}

      {/* AD SET DETAIL MODAL POPUP */}
      {selectedAdset && (
        <div
          className="report-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedAdset(null);
          }}
        >
          <div
            className="report-modal-card"
            style={{ maxWidth: "780px", width: "95%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="report-modal-header row align-items-center justify-content-between m-0 p-3">
              <div className="col d-flex align-items-center flex-wrap p-0" style={{ gap: 6 }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, lineHeight: 1.4 }}>
                  {selectedAdset.name}
                </h3>
                {selectedAdset.performanceStatus === "best" ? (
                  <span className="perf-alert-badge best">🔥 Top Performer</span>
                ) : selectedAdset.performanceStatus === "underperforming" ? (
                  <span className="perf-alert-badge underperforming">⚠️ Underperforming</span>
                ) : null}
              </div>
              <div className="col-auto p-0 ms-2">
                <button
                  type="button"
                  className="report-modal-close"
                  onClick={() => setSelectedAdset(null)}
                >
                  ✕
                </button>
              </div>
            </div>

                        {/* Modal Horizontal Tabs with Left & Right Arrows */}
            <div className="modal-horizontal-tabs-container">
              <button
                type="button"
                className="tab-arrow-nav-btn left"
                onClick={scrollModalTabsLeft}
                title="Scroll tabs left"
                aria-label="Scroll tabs left"
              >
                ‹
              </button>
              <div className="modal-horizontal-tabs-track" ref={modalTabsScrollRef}>
                {MODAL_TABS_LIST.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`horizontal-tab-pill ${modalTab === t.id ? "active" : ""}`}
                    onClick={() => setModalTab(t.id)}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="tab-arrow-nav-btn right"
                onClick={scrollModalTabsRight}
                title="Scroll tabs right"
                aria-label="Scroll tabs right"
              >
                ›
              </button>
            </div>

            <div className="report-modal-body">
              {modalTab === "overview" ? (
                <div>
                  <div style={{ marginBottom: "14px", fontSize: "12.5px", color: "#94a3b8", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <div>Parent Campaign: <strong style={{ color: "#fff" }}>{selectedAdset.campaignName || "—"}</strong></div>
                    <div>Budget: <strong style={{ color: "#fbbf24" }}>{selectedAdset.budgetFormatted}</strong></div>
                    {selectedAdset.optimizationGoal && (
                      <div>Goal: <strong style={{ color: "#38bdf8" }}>{selectedAdset.optimizationGoal}</strong></div>
                    )}
                  </div>
                  <div className="row g-2 m-0 p-0">
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">Spend</div>
                        <div className="campaign-detail-metric-val">{currencySymbol}{selectedAdset.spend.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">Sales</div>
                        <div className="campaign-detail-metric-val" style={{ color: "#3b82f6" }}>{selectedAdset.sales}</div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">Leads</div>
                        <div className="campaign-detail-metric-val" style={{ color: "#8b5cf6" }}>{selectedAdset.leads}</div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">Result: {selectedAdset.resultType}</div>
                        <div className="campaign-detail-metric-val" style={{ color: "#ec4899" }}>{selectedAdset.results}</div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">Cost Per Result (CPR)</div>
                        <div className="campaign-detail-metric-val">{currencySymbol}{selectedAdset.cpr}</div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">Cost Per Lead (CPL)</div>
                        <div className="campaign-detail-metric-val">{selectedAdset.cpl > 0 ? `${currencySymbol}${selectedAdset.cpl}` : "—"}</div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">Revenue</div>
                        <div className="campaign-detail-metric-val" style={{ color: "#10b981" }}>{currencySymbol}{selectedAdset.purchaseValue}</div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">ROAS</div>
                        <div className="campaign-detail-metric-val" style={{ color: "#38bdf8" }}>{selectedAdset.roas}x</div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">CPC</div>
                        <div className="campaign-detail-metric-val">{currencySymbol}{selectedAdset.cpc}</div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">CTR</div>
                        <div className="campaign-detail-metric-val">{selectedAdset.ctr}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                renderBreakdownContent(entityBreakdowns, loadingBreakdowns)
              )}
            </div>
            {/* <div className="report-modal-footer d-flex flex-wrap justify-content-end align-items-center gap-2 p-3">
              <button type="button" className="btn-outline-soft" onClick={() => setSelectedAdset(null)}>
                Close
              </button>
            </div> */}
          </div>
        </div>
      )}

      {/* AD DETAIL MODAL POPUP */}
      {selectedAd && (
        <div
          className="report-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedAd(null);
          }}
        >
          <div
            className="report-modal-card"
            style={{ maxWidth: "780px", width: "95%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="report-modal-header row align-items-center justify-content-between m-0 p-3">
              <div className="col d-flex align-items-center flex-wrap p-0" style={{gap: 6}}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
                  {selectedAd.name}
                </h3>
                {selectedAd.performanceStatus === "best" ? (
                  <span className="perf-alert-badge best">🔥 Top Performer</span>
                ) : selectedAd.performanceStatus === "underperforming" ? (
                  <span className="perf-alert-badge underperforming">⚠️ Underperforming</span>
                ) : null}
              </div>
              <div className="col-auto p-0 ms-2">
                <button
                  type="button"
                  className="report-modal-close"
                  onClick={() => setSelectedAd(null)}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Horizontal Tabs with Left & Right Arrows */}
            <div className="modal-horizontal-tabs-container">
              <button
                type="button"
                className="tab-arrow-nav-btn left"
                onClick={scrollModalTabsLeft}
                title="Scroll tabs left"
                aria-label="Scroll tabs left"
              >
                ‹
              </button>
              <div className="modal-horizontal-tabs-track" ref={modalTabsScrollRef}>
                {MODAL_TABS_LIST.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`horizontal-tab-pill ${modalTab === t.id ? "active" : ""}`}
                    onClick={() => setModalTab(t.id)}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="tab-arrow-nav-btn right"
                onClick={scrollModalTabsRight}
                title="Scroll tabs right"
                aria-label="Scroll tabs right"
              >
                ›
              </button>
            </div>

            <div className="report-modal-body">
              {modalTab === "overview" ? (
                <div>
                  {selectedAd.imageUrl && (
                    <div style={{ textAlign: "center", marginBottom: "16px" }}>
                      <img
                        src={selectedAd.imageUrl}
                        alt={selectedAd.name}
                        style={{ maxWidth: "100%", maxHeight: "250px", borderRadius: "8px", objectFit: "contain" }}
                      />
                    </div>
                  )}
                  {selectedAd.adTitle && (
                    <div style={{ marginBottom: "6px", fontSize: "14px", fontWeight: 700, color: "#fff" }}>
                      {selectedAd.adTitle}
                    </div>
                  )}
                  {selectedAd.adBody && (
                    <div style={{ marginBottom: "14px", fontSize: "13px", color: "#94a3b8", lineHeight: 1.5 }}>
                      {selectedAd.adBody}
                    </div>
                  )}
                  <div style={{ marginBottom: "14px", fontSize: "12.5px", color: "#94a3b8", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <div>Campaign: <strong style={{ color: "#fff" }}>{selectedAd.campaignName || "—"}</strong></div>
                    <div>Budget: <strong style={{ color: "#fbbf24" }}>{selectedAd.budgetFormatted}</strong></div>
                  </div>
                  <div className="row g-2 m-0 p-0">
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">Spend</div>
                        <div className="campaign-detail-metric-val">{currencySymbol}{selectedAd.spend.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">Sales</div>
                        <div className="campaign-detail-metric-val" style={{ color: "#3b82f6" }}>{selectedAd.sales}</div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">Leads</div>
                        <div className="campaign-detail-metric-val" style={{ color: "#8b5cf6" }}>{selectedAd.leads}</div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">Result: {selectedAd.resultType}</div>
                        <div className="campaign-detail-metric-val" style={{ color: "#ec4899" }}>{selectedAd.results}</div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">Cost Per Result (CPR)</div>
                        <div className="campaign-detail-metric-val">{currencySymbol}{selectedAd.cpr}</div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">Cost Per Lead (CPL)</div>
                        <div className="campaign-detail-metric-val">{selectedAd.cpl > 0 ? `${currencySymbol}${selectedAd.cpl}` : "—"}</div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">Revenue</div>
                        <div className="campaign-detail-metric-val" style={{ color: "#10b981" }}>{currencySymbol}{selectedAd.purchaseValue}</div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">ROAS</div>
                        <div className="campaign-detail-metric-val" style={{ color: "#38bdf8" }}>{selectedAd.roas}x</div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">CPC</div>
                        <div className="campaign-detail-metric-val">{currencySymbol}{selectedAd.cpc}</div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 p-1">
                      <div className="campaign-detail-metric h-100">
                        <div className="campaign-detail-metric-label">CTR</div>
                        <div className="campaign-detail-metric-val">{selectedAd.ctr}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                renderBreakdownContent(entityBreakdowns, loadingBreakdowns)
              )}
            </div>
            {/* <div className="report-modal-footer d-flex flex-wrap justify-content-end align-items-center gap-2 p-3">
              <button type="button" className="btn-outline-soft" onClick={() => setSelectedAd(null)}>
                Close
              </button>
            </div> */}
          </div>
        </div>
      )}

      {/* Link Meta Ad Account (Admin Only) */}
      {isAdmin && showLinkModal && selectedCompany && (
        <LinkMetaAccountModal
          show={showLinkModal}
          onHide={() => setShowLinkModal(false)}
          companyId={selectedCompany._id}
          companyName={selectedCompany.companyName}
          currentConfig={selectedCompany.metaAdsConfig}
          onSuccess={(newName) => {
            loadCompanies();
            loadRealtimeInsights(true);
            if (newName) {
              setAlertInfo({
                type: "success",
                message: `Linked to Meta Ad Account: "${newName}". Live data loaded!`,
              });
            }
          }}
        />
      )}
    </div>
  );
};

export default MonthlyReportDashboard;
