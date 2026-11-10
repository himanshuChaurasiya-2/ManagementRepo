import { useEffect, useState } from "react";
import axios from "axios";
import {
  Building2,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  Link2Off,
  MoreHorizontal,
  Search,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import "../pages.css";

interface CompanyData {
  _id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  alternatePhone: string;
  industry: string;
  website: string;
  address: string;
  status: "active" | "inactive";
  notes: string;
  metaAdsConfig?: {
    adAccountId?: string;
    adAccountName?: string;
    currency?: string;
    accountStatus?: number;
    connectedAt?: string;
  };
  createdAt: string;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const SalesCompanies = () => {
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const getToken = () => {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      ""
    );
  };

  const authConfig = () => ({
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_URL}/companies`,
        authConfig()
      );

      if (response.data.success) {
        setCompanies(response.data.companies || []);
      }
    } catch (error: any) {
      console.error("Get companies error:", error);
      showToast(error.response?.data?.message || "Unable to load companies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const copyToClipboard = (text: string, key: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopySuccess(key);
    showToast(`Copied ${label} to clipboard`);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const toggleAccordion = (companyId: string) => {
    setExpandedCompanyId((prev) => (prev === companyId ? null : companyId));
  };

  const getCompanyLogoText = (name: string) => {
    if (!name) return "CO";
    const cleaned = name.trim();
    const parts = cleaned.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return cleaned.slice(0, 3).toUpperCase();
  };

  const filteredCompanies = companies.filter((company) => {
    const query = search.toLowerCase();
    const matchesSearch =
      company.companyName.toLowerCase().includes(query) ||
      (company.contactPerson && company.contactPerson.toLowerCase().includes(query)) ||
      (company.email && company.email.toLowerCase().includes(query)) ||
      (company.industry && company.industry.toLowerCase().includes(query)) ||
      (company.phone && company.phone.toLowerCase().includes(query)) ||
      (company.metaAdsConfig?.adAccountName && company.metaAdsConfig.adAccountName.toLowerCase().includes(query)) ||
      (company.metaAdsConfig?.adAccountId && company.metaAdsConfig.adAccountId.toLowerCase().includes(query));

    const matchesStatus =
      statusFilter === "all" ? true : company.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="company-page">
      {/* TOAST FEEDBACK */}
      {toastMessage && (
        <div className="company-toast">
          <Check size={16} style={{ color: "#10b981", flexShrink: 0 }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="company-header">
        <div>
          <h1>Client Companies</h1>
          <p>
            Overview of your assigned client accounts, partner contacts, and connected Meta advertising assets.
          </p>
        </div>
      </div>

      {/* STATS WITH SHIMMER SUPPORT */}
      <div className="company-stats">
        <div className="company-stat-card">
          <span>Total Companies</span>
          {loading ? (
            <div className="company-shimmer company-shimmer-stat" />
          ) : (
            <strong>{companies.length}</strong>
          )}
        </div>

        <div className="company-stat-card">
          <span>Active Clients</span>
          {loading ? (
            <div className="company-shimmer company-shimmer-stat" />
          ) : (
            <strong className="active-number">
              {companies.filter((c) => c.status === "active").length}
            </strong>
          )}
        </div>

        <div className="company-stat-card">
          <span>Inactive Clients</span>
          {loading ? (
            <div className="company-shimmer company-shimmer-stat" />
          ) : (
            <strong className="inactive-number">
              {companies.filter((c) => c.status === "inactive").length}
            </strong>
          )}
        </div>
      </div>

      {/* CLIENT COMPANIES ACCORDION TABLE CARD */}
      <div className="company-table-card">
        {/* Table Header with Search & Quick Filter Chips */}
        <div className="company-table-header">
          <div className="company-header-title-group">
            <h3>Client Companies</h3>
            <span className="company-count-badge">
              {loading ? "..." : `${filteredCompanies.length} ${filteredCompanies.length === 1 ? "Company" : "Companies"}`}
            </span>
          </div>

          <div className="company-header-controls">
            {/* Quick Status Filter Chips */}
            <div className="company-filter-chips">
              <button
                type="button"
                className={`company-chip ${statusFilter === "all" ? "active" : ""}`}
                onClick={() => setStatusFilter("all")}
              >
                All <span className="chip-num">{companies.length}</span>
              </button>
              <button
                type="button"
                className={`company-chip ${statusFilter === "active" ? "active" : ""}`}
                onClick={() => setStatusFilter("active")}
              >
                Active <span className="chip-num">{companies.filter((c) => c.status === "active").length}</span>
              </button>
              <button
                type="button"
                className={`company-chip ${statusFilter === "inactive" ? "active" : ""}`}
                onClick={() => setStatusFilter("inactive")}
              >
                Inactive <span className="chip-num">{companies.filter((c) => c.status === "inactive").length}</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="company-search-wrapper">
              <span className="company-search-icon" style={{ display: "inline-flex", alignItems: "center" }}>
                <Search size={15} />
              </span>
              <input
                type="text"
                placeholder="Search companies, contacts, emails..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="company-search"
                aria-label="Search client companies"
              />
              {search && (
                <button
                  type="button"
                  className="company-search-clear"
                  onClick={() => setSearch("")}
                  title="Clear search"
                  aria-label="Clear search"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* LOADING SHIMMER SKELETON */}
        {loading ? (
          <div className="company-cards-list">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="company-row-card company-shimmer-card">
                <div className="company-card-header">
                  <div className="company-shimmer company-shimmer-logo" />
                  <div className="company-card-col name-col">
                    <div className="company-shimmer company-shimmer-line company-shimmer-line-sm" />
                    <div className="company-shimmer company-shimmer-line company-shimmer-line-lg" />
                  </div>
                  <div className="company-card-col meta-account-col">
                    <div className="company-shimmer company-shimmer-line company-shimmer-line-sm" />
                    <div className="company-shimmer company-shimmer-line company-shimmer-line-md" />
                  </div>
                  <div className="company-card-col metric-col">
                    <div className="company-shimmer company-shimmer-line company-shimmer-line-sm" />
                    <div className="company-shimmer company-shimmer-line company-shimmer-line-md" />
                  </div>
                  <div className="company-shimmer company-shimmer-dots" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredCompanies.length === 0 ? (
          /* EMPTY STATE */
          <div className="company-empty">
            <div className="company-empty-icon" style={{ display: "inline-flex", justifyContent: "center", alignItems: "center", marginBottom: "12px" }}>
              <Building2 size={46} strokeWidth={1.5} />
            </div>
            <h3>No companies found</h3>
            <p>
              {search || statusFilter !== "all"
                ? "No client company matched your current search and filters."
                : "There are no client companies available at this time."}
            </p>
            {(search || statusFilter !== "all") && (
              <button
                type="button"
                className="company-add-btn"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
              >
                Reset Search & Filters
              </button>
            )}
          </div>
        ) : (
          /* FLOATING ACCORDION CARDS LIST */
          <div className="company-cards-list">
            {filteredCompanies.map((company) => {
              const isExpanded = expandedCompanyId === company._id;

              return (
                <div
                  key={company._id}
                  className={`company-row-card ${isExpanded ? "is-expanded" : ""}`}
                >
                  {/* TOP HEADER ROW */}
                  <div
                    className="company-card-header"
                    onClick={() => toggleAccordion(company._id)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleAccordion(company._id);
                      }
                    }}
                  >
                    {/* LOGO BOX WITH STATUS DOT */}
                    <div className="company-logo-wrapper">
                      <div className="company-logo-box">
                        {getCompanyLogoText(company.companyName)}
                      </div>
                      <span
                        className={`company-logo-status-dot ${company.status}`}
                        title={`Status: ${company.status === "active" ? "Active (Live Lead)" : "Inactive"}`}
                      />
                    </div>

                    {/* NAME COLUMN */}
                    <div className="company-card-col name-col">
                      <span className="company-col-label">Name</span>
                      <div className="company-title-wrapper">
                        <strong className="company-card-title">
                          {company.companyName}
                        </strong>
                        <span className="company-card-industry">
                          {company.industry || "General"}
                        </span>
                      </div>
                    </div>

                    {/* META AD ACCOUNT COLUMN (FOR BIG SCREENS) */}
                    <div className="company-card-col meta-account-col">
                      <span className="company-col-label">Meta Ad Account</span>
                      {company.metaAdsConfig?.adAccountId ? (
                        <div className="company-meta-col-info">
                          <strong className="company-meta-acc-name" title={company.metaAdsConfig.adAccountName}>
                            {company.metaAdsConfig.adAccountName || "Linked"}
                          </strong>
                          <span className="company-meta-acc-id">
                            ID: {company.metaAdsConfig.adAccountId}
                          </span>
                        </div>
                      ) : (
                        <span className="company-meta-unlinked-tag">Not Linked</span>
                      )}
                    </div>

                    {/* CONTACT PERSON COLUMN */}
                    <div className="company-card-col metric-col">
                      <span className="company-col-label">Contact Person</span>
                      <strong className="company-metric-val">
                        {company.contactPerson || "Primary Contact"}
                      </strong>
                    </div>

                    {/* THREE DOTS TOGGLE BUTTON */}
                    <button
                      type="button"
                      className={`company-dots-btn ${isExpanded ? "active" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAccordion(company._id);
                      }}
                      title={isExpanded ? "Collapse details" : "Expand details"}
                      aria-label={isExpanded ? "Collapse details" : "Expand details"}
                      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </div>

                  {/* EXPANDED SECTION */}
                  {isExpanded && (
                    <div className="company-card-expanded-body">
                      {/* ACTION BAR (IF WEBSITE AVAILABLE) */}
                      {company.website && (
                        <div className="company-action-bar">
                          <a
                            href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-action-more"
                            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Globe size={14} />
                            <span>Visit Official Website</span>
                            <ExternalLink size={12} style={{ opacity: 0.7 }} />
                          </a>
                        </div>
                      )}

                      {/* FOUR COMPREHENSIVE DETAIL CARDS */}
                      <div className="company-details-grid">
                        {/* Card 1: Primary Contact */}
                        <div className="company-detail-card">
                          <div className="company-detail-card-title">
                            <span className="detail-icon" style={{ display: "inline-flex", alignItems: "center" }}>
                              <User size={15} />
                            </span>
                            <span>Primary Contact</span>
                          </div>

                          <div className="company-detail-item">
                            <span className="detail-label">Contact Person</span>
                            <span className="detail-value bold">
                              {company.contactPerson || "Not assigned"}
                            </span>
                          </div>

                          <div className="company-detail-item">
                            <span className="detail-label">Email Address</span>
                            <div className="detail-value-copyable">
                              <a
                                href={`mailto:${company.email}`}
                                className="detail-link"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {company.email || "No email"}
                              </a>
                              {company.email && (
                                <button
                                  type="button"
                                  className="btn-copy-chip"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(company.email, `email-${company._id}`, "email");
                                  }}
                                  title="Copy Email"
                                  style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                                >
                                  {copySuccess === `email-${company._id}` ? (
                                    <>
                                      <Check size={12} style={{ color: "#10b981" }} />
                                      <span>Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={12} />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="company-detail-item">
                            <span className="detail-label">Phone Number</span>
                            <div className="detail-value-copyable">
                              <a
                                href={`tel:${company.phone}`}
                                className="detail-link"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {company.phone || "No phone"}
                              </a>
                              {company.phone && (
                                <button
                                  type="button"
                                  className="btn-copy-chip"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(company.phone, `phone-${company._id}`, "phone");
                                  }}
                                  title="Copy Phone"
                                  style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                                >
                                  {copySuccess === `phone-${company._id}` ? (
                                    <>
                                      <Check size={12} style={{ color: "#10b981" }} />
                                      <span>Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={12} />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {company.alternatePhone && (
                            <div className="company-detail-item">
                              <span className="detail-label">Alternate Phone</span>
                              <div className="detail-value-copyable">
                                <a
                                  href={`tel:${company.alternatePhone}`}
                                  className="detail-link"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {company.alternatePhone}
                                </a>
                                <button
                                  type="button"
                                  className="btn-copy-chip"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(company.alternatePhone, `alt-${company._id}`, "alternate phone");
                                  }}
                                  title="Copy Alternate Phone"
                                  style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                                >
                                  {copySuccess === `alt-${company._id}` ? (
                                    <>
                                      <Check size={12} style={{ color: "#10b981" }} />
                                      <span>Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={12} />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}

                          {company.website && (
                            <div className="company-detail-item">
                              <span className="detail-label">Website</span>
                              <a
                                href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                                target="_blank"
                                rel="noreferrer"
                                className="detail-link"
                                style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span>{company.website.replace(/^https?:\/\//, "")}</span>
                                <ExternalLink size={12} style={{ opacity: 0.8 }} />
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Card 2: Company Details */}
                        <div className="company-detail-card">
                          <div className="company-detail-card-title">
                            <span className="detail-icon" style={{ display: "inline-flex", alignItems: "center" }}>
                              <Building2 size={15} />
                            </span>
                            <span>Company Details</span>
                          </div>

                          <div className="company-detail-item">
                            <span className="detail-label">Industry</span>
                            <span className="detail-value bold">
                              {company.industry || "General / Other"}
                            </span>
                          </div>

                          <div className="company-detail-item">
                            <span className="detail-label">Office Address</span>
                            <div className="detail-value-copyable">
                              <span className="detail-value">
                                {company.address || "No physical address provided"}
                              </span>
                              {company.address && (
                                <button
                                  type="button"
                                  className="btn-copy-chip"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(company.address, `addr-${company._id}`, "address");
                                  }}
                                  title="Copy Address"
                                  style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                                >
                                  {copySuccess === `addr-${company._id}` ? (
                                    <>
                                      <Check size={12} style={{ color: "#10b981" }} />
                                      <span>Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={12} />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="company-detail-item">
                            <span className="detail-label">Member Since</span>
                            <span className="detail-value">
                              {company.createdAt
                                ? new Date(company.createdAt).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "Recent"}
                            </span>
                          </div>

                          <div className="company-detail-item">
                            <span className="detail-label">Company Status</span>
                            <span className={`company-status-pill ${company.status}`}>
                              <span className="status-dot" />
                              {company.status === "active" ? "Active Client" : "Inactive"}
                            </span>
                          </div>
                        </div>

                        {/* Card 3: Meta Marketing & Ads */}
                        <div className="company-detail-card">
                          <div className="company-detail-card-title">
                            <span className="detail-icon" style={{ display: "inline-flex", alignItems: "center" }}>
                              <TrendingUp size={15} />
                            </span>
                            <span>Meta Marketing & Ads</span>
                          </div>

                          {company.metaAdsConfig?.adAccountId ? (
                            <>
                              <div className="company-detail-item">
                                <span className="detail-label">Ad Account Name</span>
                                <span className="detail-value bold">
                                  {company.metaAdsConfig.adAccountName || "Meta Ad Account"}
                                </span>
                              </div>

                              <div className="company-detail-item">
                                <span className="detail-label">Account ID</span>
                                <div className="detail-value-copyable">
                                  <span className="detail-value code">
                                    {company.metaAdsConfig.adAccountId}
                                  </span>
                                  <button
                                    type="button"
                                    className="btn-copy-chip"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(
                                        company.metaAdsConfig!.adAccountId!,
                                        `meta-${company._id}`,
                                        "account ID"
                                      );
                                    }}
                                    title="Copy Ad Account ID"
                                    style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                                  >
                                    {copySuccess === `meta-${company._id}` ? (
                                      <>
                                        <Check size={12} style={{ color: "#10b981" }} />
                                        <span>Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={12} />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>

                              {company.metaAdsConfig.currency && (
                                <div className="company-detail-item">
                                  <span className="detail-label">Currency</span>
                                  <span className="detail-value">
                                    {company.metaAdsConfig.currency}
                                  </span>
                                </div>
                              )}

                              <div className="company-detail-item">
                                <span className="detail-label">Integration Status</span>
                                <span className="company-meta-connected-badge">
                                  <span className="status-dot" /> Connected Live
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="company-detail-empty">
                              <span className="empty-icon" style={{ display: "inline-flex", alignItems: "center", opacity: 0.6 }}>
                                <Link2Off size={22} />
                              </span>
                              <p>No Meta Ad Account is linked yet.</p>
                            </div>
                          )}
                        </div>

                        {/* Card 4: Internal Remarks & Notes */}
                        <div className="company-detail-card">
                          <div className="company-detail-card-title">
                            <span className="detail-icon" style={{ display: "inline-flex", alignItems: "center" }}>
                              <FileText size={15} />
                            </span>
                            <span>Internal Remarks</span>
                          </div>

                          <div className="company-notes-display">
                            {company.notes && company.notes.trim() ? (
                              <p className="company-notes-text">{company.notes}</p>
                            ) : (
                              <p className="company-notes-empty">
                                No notes or internal remarks added for this company.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesCompanies;
