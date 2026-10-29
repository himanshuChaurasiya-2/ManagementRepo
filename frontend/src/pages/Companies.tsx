import React, {
  useEffect,
  useState,
} from "react";

import axios from "axios";
import { fetchAvailableMetaAccounts, type MetaAdAccount } from "../services/metaAdsService";
import "./pages.css";


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

interface CompanyForm {
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
  adAccountId?: string;
}

const API_URL =
  "http://localhost:5000/api";

const emptyForm: CompanyForm = {
  companyName: "",
  contactPerson: "",
  email: "",
  phone: "",
  alternatePhone: "",
  industry: "",
  website: "",
  address: "",
  status: "active",
  notes: "",
  adAccountId: "",
};

const Company = () => {
  const [companies, setCompanies] =
    useState<CompanyData[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [showModal, setShowModal] =
    useState(false);

  const [editingCompany, setEditingCompany] =
    useState<CompanyData | null>(null);

  const [form, setForm] =
    useState<CompanyForm>(emptyForm);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<"all" | "active" | "inactive">("all");

  const [expandedCompanyId, setExpandedCompanyId] =
    useState<string | null>(null);

  const [copySuccess, setCopySuccess] =
    useState<string | null>(null);

  const [submitting, setSubmitting] =
    useState(false);

  // Toggle Accordion Row (Only one open at a time - opening one closes others)
  const toggleAccordion = (id: string) => {
    setExpandedCompanyId((prev) => (prev === id ? null : id));
  };

  // Copy to clipboard helper with temporary feedback
  const handleCopyText = (text: string, key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopySuccess(key);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  // Company initial avatar dynamic color palette
  const getAvatarGradient = (name: string) => {
    const gradients = [
      "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
      "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
      "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
      "linear-gradient(135deg, #14b8a6 0%, #0284c7 100%)",
    ];
    let sum = 0;
    for (let i = 0; i < (name || "").length; i++) sum += name.charCodeAt(i);
    return gradients[sum % gradients.length];
  };

  // Meta Ad Accounts searchable dropdown state
  const [metaAccounts, setMetaAccounts] = useState<MetaAdAccount[]>([]);
  const [metaSearch, setMetaSearch] = useState<string>("");
  const [showMetaDropdown, setShowMetaDropdown] = useState<boolean>(false);

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

  // GET COMPANIES

  const loadCompanies = async () => {
    try {
      setLoading(true);

      const response =
        await axios.get(
          `${API_URL}/companies`,
          authConfig()
        );

      if (response.data.success) {
        setCompanies(
          response.data.companies
        );
      }
    } catch (error: any) {
      console.error(
        "Get companies error:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Unable to load companies"
      );
    } finally {
      setLoading(false);
    }
  };

  // Load Meta Ad Accounts for searchable dropdown
  const loadMetaAccounts = async () => {
    try {
      const res = await fetchAvailableMetaAccounts();
      if (res.success && res.accounts) {
        setMetaAccounts(res.accounts);
      }
    } catch (err) {
      console.warn("Could not load Meta Ad Accounts:", err);
    }
  };

  useEffect(() => {
    loadCompanies();
    loadMetaAccounts();
  }, []);

  // FORM CHANGE

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // OPEN ADD MODAL

  const openAddModal = () => {
    setEditingCompany(null);
    setForm(emptyForm);
    setMetaSearch("");
    setShowMetaDropdown(false);
    setShowModal(true);
  };

  // OPEN EDIT MODAL

  const openEditModal = (
    company: CompanyData
  ) => {
    setEditingCompany(company);

    setForm({
      companyName: company.companyName,
      contactPerson:
        company.contactPerson,
      email: company.email,
      phone: company.phone,
      alternatePhone:
        company.alternatePhone || "",
      industry: company.industry,
      website: company.website || "",
      address: company.address || "",
      status: company.status,
      notes: company.notes || "",
      adAccountId: company.metaAdsConfig?.adAccountId || "",
    });

    setMetaSearch("");
    setShowMetaDropdown(false);
    setShowModal(true);
  };

  // SAVE COMPANY

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      const selectedMetaAcc = metaAccounts.find(
        (a) => a.id === form.adAccountId
      );

      const payload: any = {
        ...form,
      };

      if (form.adAccountId && selectedMetaAcc) {
        payload.metaAdsConfig = {
          adAccountId: selectedMetaAcc.id,
          adAccountName: selectedMetaAcc.name,
          currency: selectedMetaAcc.currency,
          accountStatus: selectedMetaAcc.account_status,
        };
      } else if (editingCompany && !form.adAccountId) {
        payload.metaAdsConfig = null;
      }

      if (editingCompany) {
        await axios.patch(
          `${API_URL}/companies/${editingCompany._id}`,
          payload,
          authConfig()
        );
      } else {
        await axios.post(
          `${API_URL}/companies`,
          payload,
          authConfig()
        );
      }

      setShowModal(false);
      setEditingCompany(null);
      setForm(emptyForm);

      await loadCompanies();
    } catch (error: any) {
      console.error(
        "Save company error:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Unable to save company"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // STATUS

  const toggleStatus = async (
    company: CompanyData
  ) => {
    const newStatus =
      company.status === "active"
        ? "inactive"
        : "active";

    if (
      !window.confirm(
        `Are you sure you want to ${
          newStatus === "active"
            ? "activate"
            : "deactivate"
        } ${company.companyName}?`
      )
    ) {
      return;
    }

    try {
      await axios.patch(
        `${API_URL}/companies/${company._id}/status`,
        {
          status: newStatus,
        },
        authConfig()
      );

      await loadCompanies();
    } catch (error: any) {
      console.error(
        "Status update error:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Unable to update status"
      );
    }
  };

  // DELETE

  const deleteCompany = async (
    company: CompanyData
  ) => {
    if (
      !window.confirm(
        `Delete ${company.companyName}? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await axios.delete(
        `${API_URL}/companies/${company._id}`,
        authConfig()
      );

      await loadCompanies();
    } catch (error: any) {
      console.error(
        "Delete company error:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Unable to delete company"
      );
    }
  };

  // SEARCH

  const filteredCompanies = companies.filter((company) => {
    const query = search.toLowerCase();
    const matchesSearch =
      company.companyName.toLowerCase().includes(query) ||
      company.contactPerson.toLowerCase().includes(query) ||
      company.email.toLowerCase().includes(query) ||
      company.industry.toLowerCase().includes(query) ||
      company.phone.toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === "all" ? true : company.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="company-page">

      {/* HEADER */}
      <div className="company-header">
        <div>
          <h1>Companies</h1>
          <p>
            Manage and nurture your client accounts and partnerships.
          </p>
        </div>

        <button
          className="company-add-btn"
          onClick={openAddModal}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Company
        </button>
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
              <span className="company-search-icon">🔍</span>
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
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* LOADING SHIMMER SKELETON */}
        {loading ? (
          <div className="company-table-wrapper">
            <table className="company-table">
              <thead>
                <tr>
                  <th style={{ width: 44 }}></th>
                  <th>Company</th>
                  <th>Contact Person</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="company-shimmer-row">
                    <td>
                      <div className="company-shimmer company-shimmer-toggle" />
                    </td>
                    <td>
                      <div className="company-identity-wrap">
                        <div className="company-shimmer company-shimmer-avatar" />
                        <div className="d-flex flex-column gap-2 flex-grow-1">
                          <div className="company-shimmer company-shimmer-line company-shimmer-line-lg" />
                          <div className="company-shimmer company-shimmer-line company-shimmer-line-sm" />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex flex-column gap-2">
                        <div className="company-shimmer company-shimmer-line company-shimmer-line-md" />
                        <div className="company-shimmer company-shimmer-line company-shimmer-line-sm" />
                      </div>
                    </td>
                    <td>
                      <div className="company-shimmer company-shimmer-badge" />
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="company-actions justify-content-end">
                        <div className="company-shimmer company-shimmer-btn" />
                        <div className="company-shimmer company-shimmer-btn" />
                        <div className="company-shimmer company-shimmer-btn" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredCompanies.length === 0 ? (
          /* EMPTY STATE */
          <div className="company-empty">
            <div className="company-empty-icon">🏢</div>
            <h3>No companies found</h3>
            <p>
              {search || statusFilter !== "all"
                ? "No client company matched your current search and filters."
                : "You haven't added any client companies yet. Let's add your first client!"}
            </p>
            {search || statusFilter !== "all" ? (
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
            ) : (
              <button className="company-add-btn" onClick={openAddModal}>
                + Add Company
              </button>
            )}
          </div>
        ) : (
          /* ACCORDION TABLE */
          <div className="company-table-wrapper">
            <table className="company-table">
              <thead>
                <tr>
                  {/* <th style={{ width: 44 }} aria-label="Expand toggle"></th> */}
                  <th>Company</th>
                  <th>Contact Person</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredCompanies.map((company) => {
                  const isExpanded = expandedCompanyId === company._id;
                  return (
                    <React.Fragment key={company._id}>
                      {/* MAIN ACCORDION ROW */}
                      <tr
                        className={`company-main-row ${isExpanded ? "is-expanded" : ""}`}
                        onClick={() => toggleAccordion(company._id)}
                        tabIndex={0}
                        role="button"
                        aria-expanded={isExpanded}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleAccordion(company._id);
                          }
                        }}
                      >
                        {/* Toggle Chevron Icon */}
                        {/* <td className="col-toggle" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className={`company-chevron-btn ${isExpanded ? "open" : ""}`}
                            onClick={() => toggleAccordion(company._id)}
                            title={isExpanded ? "Collapse client details" : "Expand client details"}
                            aria-label={isExpanded ? "Collapse details" : "Expand details"}
                          >
                            <svg
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>
                        </td> */}

                        {/* Company Identity (Avatar, Name, Industry, Domain) */}
                        <td className="col-company">
                          <div className="company-identity-wrap">
                            <div
                              className="company-avatar"
                              style={{ background: getAvatarGradient(company.companyName) }}
                            >
                              {company.companyName.charAt(0).toUpperCase()}
                            </div>
                            <div className="company-name-group">
                              <div className="company-title-row">
                                <strong className="company-name-text">
                                  {company.companyName}
                                </strong>
                                <span className="company-industry-tag">
                                  {company.industry || "General"}
                                </span>
                              </div>
                              {company.website ? (
                                <a
                                  href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="company-sub-link"
                                  onClick={(e) => e.stopPropagation()}
                                  title={`Visit ${company.website}`}
                                >
                                  {company.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                                </a>
                              ) : (
                                <span className="company-sub-link muted">No website listed</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Contact Person & Email hint */}
                        <td className="col-contact">
                          <div className="company-contact-group">
                            <span className="contact-name">{company.contactPerson}</span>
                            <span className="contact-sub-hint">{company.phone || company.email}</span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="col-status">
                          <span className={`company-status ${company.status}`}>
                            <span className={`status-dot ${company.status}`} />
                            {company.status}
                          </span>
                        </td>

                        {/* Actions Toolbar */}
                        <td className="col-actions" onClick={(e) => e.stopPropagation()}>
                          <div className="company-actions">
                            <button
                              type="button"
                              className="company-action-btn edit-btn"
                              onClick={() => openEditModal(company)}
                              title="Edit company"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              className={`company-action-btn ${company.status === "active" ? "deactivate-btn" : "activate-btn"}`}
                              onClick={() => toggleStatus(company)}
                              title={company.status === "active" ? "Deactivate company" : "Activate company"}
                            >
                              {company.status === "active" ? "Deactivate" : "Activate"}
                            </button>

                            <button
                              type="button"
                              className="company-action-btn delete-btn"
                              onClick={() => deleteCompany(company)}
                              title="Delete company"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* EXPANDABLE ACCORDION ROW */}
                      {isExpanded && (
                        <tr className="company-accordion-tr">
                          <td colSpan={5} className="company-accordion-td">
                            <div className="company-accordion-panel">
                              <div className="company-accordion-grid">
                                {/* Card 1: Contact Information */}
                                <div className="company-detail-card">
                                  <div className="company-detail-card-title">
                                    <span className="detail-icon">📞</span>
                                    <span>Contact Details</span>
                                  </div>

                                  <div className="company-detail-item">
                                    <span className="detail-label">Email Address</span>
                                    <div className="detail-value-copyable">
                                      <a
                                        href={`mailto:${company.email}`}
                                        className="detail-link"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {company.email}
                                      </a>
                                      <button
                                        type="button"
                                        className="btn-copy-chip"
                                        onClick={(e) => handleCopyText(company.email, `email-${company._id}`, e)}
                                        title="Copy email address"
                                      >
                                        {copySuccess === `email-${company._id}` ? "✓ Copied" : "Copy"}
                                      </button>
                                    </div>
                                  </div>

                                  <div className="company-detail-item">
                                    <span className="detail-label">Primary Phone</span>
                                    <div className="detail-value-copyable">
                                      <a
                                        href={`tel:${company.phone}`}
                                        className="detail-link"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {company.phone}
                                      </a>
                                      <button
                                        type="button"
                                        className="btn-copy-chip"
                                        onClick={(e) => handleCopyText(company.phone, `phone-${company._id}`, e)}
                                        title="Copy phone number"
                                      >
                                        {copySuccess === `phone-${company._id}` ? "✓ Copied" : "Copy"}
                                      </button>
                                    </div>
                                  </div>

                                  {company.alternatePhone && (
                                    <div className="company-detail-item">
                                      <span className="detail-label">Alternate Phone</span>
                                      <span className="detail-value">{company.alternatePhone}</span>
                                    </div>
                                  )}

                                  <div className="company-detail-item">
                                    <span className="detail-label">Official Website</span>
                                    {company.website ? (
                                      <a
                                        href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="detail-external-link"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <span>{company.website}</span>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                          <polyline points="15 3 21 3 21 9" />
                                          <line x1="10" y1="14" x2="21" y2="3" />
                                        </svg>
                                      </a>
                                    ) : (
                                      <span className="detail-value muted">Not specified</span>
                                    )}
                                  </div>
                                </div>

                                {/* Card 2: Location & Address */}
                                <div className="company-detail-card">
                                  <div className="company-detail-card-title">
                                    <span className="detail-icon">📍</span>
                                    <span>Location & Industry</span>
                                  </div>

                                  <div className="company-detail-item">
                                    <span className="detail-label">Office Address</span>
                                    <p className="detail-text-block">
                                      {company.address || "No physical address specified for this client."}
                                    </p>
                                  </div>

                                  <div className="company-detail-item">
                                    <span className="detail-label">Industry Classification</span>
                                    <span className="company-industry-chip">
                                      {company.industry || "General"}
                                    </span>
                                  </div>
                                </div>

                                {/* Card 3: Meta Ads Marketing Integration */}
                                <div className="company-detail-card">
                                  <div className="company-detail-card-title">
                                    <span className="detail-icon">⚡</span>
                                    <span>Meta Marketing Ads</span>
                                  </div>

                                  {company.metaAdsConfig?.adAccountId ? (
                                    <div className="meta-ads-connected-box">
                                      <div className="meta-ads-status-badge connected">
                                        <span className="status-dot green" />
                                        <span>Meta Ad Account Linked</span>
                                      </div>
                                      <div className="company-detail-item mt-2">
                                        <span className="detail-label">Account Name</span>
                                        <span className="detail-value bold">{company.metaAdsConfig.adAccountName || "N/A"}</span>
                                      </div>
                                      <div className="company-detail-item">
                                        <span className="detail-label">Account ID</span>
                                        <span className="detail-value mono-badge">{company.metaAdsConfig.adAccountId}</span>
                                      </div>
                                      <div className="company-detail-item">
                                        <span className="detail-label">Currency</span>
                                        <span className="detail-value bold">{company.metaAdsConfig.currency || "USD"}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="meta-ads-empty-box">
                                      <span className="meta-unlinked-icon">⚪</span>
                                      <div>
                                        <div className="meta-unlinked-title">No Meta Account Connected</div>
                                        <p className="meta-unlinked-desc">Edit this company to link their Meta Ads Marketing account.</p>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Card 4: Internal Notes & History */}
                                <div className="company-detail-card">
                                  <div className="company-detail-card-title">
                                    <span className="detail-icon">📝</span>
                                    <span>Client Notes & History</span>
                                  </div>

                                  <div className="company-detail-item">
                                    <span className="detail-label">Internal Remarks</span>
                                    <p className="detail-text-block notes-block">
                                      {company.notes || "No internal notes recorded for this client."}
                                    </p>
                                  </div>

                                  <div className="company-detail-item">
                                    <span className="detail-label">Client Since</span>
                                    <span className="detail-value">
                                      {new Date(company.createdAt).toLocaleDateString(undefined, {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                      })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      {showModal && (

        <div
          className="company-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="company-modal" onClick={(e) => e.stopPropagation()}>
            <div className="company-modal-header">
              <div>
                <h2>
                  {editingCompany
                    ? "Edit Company"
                    : "Add Company"}
                </h2>

                <p>
                  Enter complete client
                  details below.
                </p>
              </div>

              <button
                type="button"
                className="company-close-btn"
                onClick={() => setShowModal(false)}
                title="Close modal"
                aria-label="Close"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
            >

              <div className="company-form">

                <div className="form-field">
                  <label>
                    Company Name *
                  </label>

                  <input
                    name="companyName"
                    value={
                      form.companyName
                    }
                    onChange={handleChange}
                    required
                    placeholder="Enter company name"
                  />
                </div>

                <div className="form-field">
                  <label>
                    Contact Person *
                  </label>

                  <input
                    name="contactPerson"
                    value={
                      form.contactPerson
                    }
                    onChange={handleChange}
                    required
                    placeholder="Enter contact person"
                  />
                </div>

                <div className="form-field">
                  <label>
                    Email *
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="company@email.com"
                  />
                </div>

                <div className="form-field">
                  <label>
                    Phone *
                  </label>

                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="form-field">
                  <label>
                    Alternate Phone
                  </label>

                  <input
                    name="alternatePhone"
                    value={
                      form.alternatePhone
                    }
                    onChange={handleChange}
                    placeholder="Optional"
                  />
                </div>

                <div className="form-field">
                  <label>
                    Industry *
                  </label>

                  <input
                    name="industry"
                    value={form.industry}
                    onChange={handleChange}
                    required
                    placeholder="e.g. IT Services"
                  />
                </div>

                <div className="form-field">
                  <label>
                    Website
                  </label>

                  <input
                    name="website"
                    value={form.website}
                    onChange={handleChange}
                    placeholder="https://example.com"
                  />
                </div>

                <div className="form-field full-width">
                  <label>
                    Address
                  </label>

                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Enter complete address"
                    rows={3}
                  />
                </div>

                <div className="form-field">
                  <label>
                    Status
                  </label>

                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="active">
                      Active
                    </option>

                    <option value="inactive">
                      Inactive
                    </option>
                  </select>
                </div>

                {/* SEARCHABLE META AD ACCOUNT SELECTION */}
                <div className="form-field full-width" style={{ position: "relative" }}>
                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>🔗 Meta Marketing Ad Account (Optional)</span>
                    {form.adAccountId && (
                      <span
                        onClick={() => {
                          setForm((prev) => ({ ...prev, adAccountId: "" }));
                          setMetaSearch("");
                        }}
                        style={{ fontSize: "11px", color: "#ef4444", cursor: "pointer", textDecoration: "underline" }}
                      >
                        Clear Selection
                      </span>
                    )}
                  </label>

                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      placeholder={
                        metaAccounts.length === 0
                          ? "Loading accessible Meta ad accounts..."
                          : form.adAccountId
                          ? (() => {
                              const selected = metaAccounts.find((a) => a.id === form.adAccountId);
                              return selected ? `${selected.name} (${selected.currency}) — [${selected.id}]` : "Search Meta Ad Account...";
                            })()
                          : "Type to search Meta Ad Account by client name or ID..."
                      }
                      value={metaSearch}
                      onChange={(e) => {
                        setMetaSearch(e.target.value);
                        setShowMetaDropdown(true);
                      }}
                      onFocus={() => setShowMetaDropdown(true)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        background: "var(--input-bg, #0f172a)",
                        border: form.adAccountId ? "1px solid #3b82f6" : "1px solid var(--border-color, rgba(255, 255, 255, 0.15))",
                        borderRadius: "8px",
                        color: "var(--text-primary, #f8fafc)",
                        fontSize: "13.5px",
                      }}
                    />

                    {/* Clear search icon button if typing */}
                    {metaSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setMetaSearch("");
                          setShowMetaDropdown(false);
                        }}
                        style={{
                          position: "absolute",
                          right: "10px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "transparent",
                          border: "none",
                          color: "#94a3b8",
                          cursor: "pointer",
                          fontSize: "13px",
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Selected Account Badge */}
                  {form.adAccountId && (
                    <div
                      style={{
                        marginTop: "6px",
                        padding: "6px 10px",
                        background: "rgba(59, 130, 246, 0.1)",
                        border: "1px solid rgba(59, 130, 246, 0.25)",
                        borderRadius: "6px",
                        fontSize: "12px",
                        color: "#93c5fd",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span>✅ Linked:</span>
                      <strong>
                        {(() => {
                          const acc = metaAccounts.find((a) => a.id === form.adAccountId);
                          return acc ? `${acc.name} (${acc.currency})` : form.adAccountId;
                        })()}
                      </strong>
                    </div>
                  )}

                  {/* Dropdown Suggestions List */}
                  {showMetaDropdown && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        background: "#0f172a",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: "8px",
                        marginTop: "4px",
                        maxHeight: "220px",
                        overflowY: "auto",
                        zIndex: 9999,
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                      }}
                    >
                      <div
                        onClick={() => {
                          setForm((prev) => ({ ...prev, adAccountId: "" }));
                          setMetaSearch("");
                          setShowMetaDropdown(false);
                        }}
                        style={{
                          padding: "10px 14px",
                          fontSize: "12.5px",
                          color: "#94a3b8",
                          cursor: "pointer",
                          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        ⚪ None (Don't connect Meta Ad Account now)
                      </div>

                      {metaAccounts
                        .filter((acc) => {
                          if (!metaSearch) return true;
                          const q = metaSearch.toLowerCase();
                          return (
                            acc.name.toLowerCase().includes(q) ||
                            acc.id.toLowerCase().includes(q) ||
                            acc.currency.toLowerCase().includes(q)
                          );
                        })
                        .map((acc) => (
                          <div
                            key={acc.id}
                            onClick={() => {
                              setForm((prev) => ({ ...prev, adAccountId: acc.id }));
                              setMetaSearch("");
                              setShowMetaDropdown(false);
                            }}
                            style={{
                              padding: "10px 14px",
                              fontSize: "13px",
                              cursor: "pointer",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              background: form.adAccountId === acc.id ? "rgba(59, 130, 246, 0.15)" : "transparent",
                              borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)")}
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = form.adAccountId === acc.id ? "rgba(59, 130, 246, 0.15)" : "transparent")
                            }
                          >
                            <div>
                              <div style={{ fontWeight: 600, color: "#f8fafc" }}>{acc.name}</div>
                              <div style={{ fontSize: "11px", color: "#64748b" }}>ID: {acc.id}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontSize: "11px", background: "#1e293b", padding: "2px 6px", borderRadius: "4px", color: "#93c5fd" }}>
                                {acc.currency}
                              </span>
                            </div>
                          </div>
                        ))}

                      {metaAccounts.filter((acc) => {
                        if (!metaSearch) return true;
                        const q = metaSearch.toLowerCase();
                        return (
                          acc.name.toLowerCase().includes(q) ||
                          acc.id.toLowerCase().includes(q)
                        );
                      }).length === 0 && (
                        <div style={{ padding: "14px", fontSize: "12.5px", color: "#94a3b8", textAlign: "center" }}>
                          No matching Meta Ad Account found for "{metaSearch}".
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="form-field full-width">
                  <label>
                    Notes
                  </label>

                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    placeholder="Add notes about this client..."
                    rows={4}
                  />
                </div>

              </div>

              <div className="company-modal-footer">

                <button
                  type="button"
                  className="cancel-btn company-cancel-btn"
                  onClick={() =>
                    setShowModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="company-save-btn"
                  disabled={submitting}
                >
                  {submitting
                    ? "Saving..."
                    : editingCompany
                    ? "Update Company"
                    : "Add Company"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
};

export default Company;