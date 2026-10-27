import React, { useState, useEffect } from "react";
import { Alert, Spinner } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import {
  fetchAvailableMetaAccounts,
  linkMetaAccountToCompany,
  unlinkMetaAccountFromCompany,
  type MetaAdAccount,
} from "../../services/metaAdsService";

interface LinkMetaAccountModalProps {
  show: boolean;
  onHide: () => void;
  companyId: string;
  companyName: string;
  currentConfig?: {
    adAccountId?: string;
    adAccountName?: string;
    currency?: string;
    accountStatus?: number;
  };
  onSuccess: (updatedName?: string) => void;
}

export const LinkMetaAccountModal: React.FC<LinkMetaAccountModalProps> = ({
  show,
  onHide,
  companyId,
  companyName,
  currentConfig,
  onSuccess,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<MetaAdAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(currentConfig?.adAccountId || "");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load accessible ad accounts when modal opens
  useEffect(() => {
    if (show) {
      loadAccounts();
    }
  }, [show]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAvailableMetaAccounts();
      if (res.success && res.accounts) {
        setAccounts(res.accounts);
        if (!selectedAccountId && res.accounts.length > 0) {
          setSelectedAccountId(res.accounts[0].id);
        }
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load ad accounts from Meta. Please make sure META_ACCESS_TOKEN is set in backend/.env"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async () => {
    if (!selectedAccountId) {
      setError("Please select an ad account from the list");
      return;
    }

    const selectedAcc = accounts.find((a) => a.id === selectedAccountId);
    if (!selectedAcc) return;

    try {
      setSaving(true);
      setError(null);
      await linkMetaAccountToCompany(companyId, {
        adAccountId: selectedAcc.id,
        adAccountName: selectedAcc.name,
        currency: selectedAcc.currency,
        accountStatus: selectedAcc.account_status,
      });

      setSuccessMsg(`Successfully linked to ${selectedAcc.name}!`);
      setTimeout(() => {
        onSuccess(selectedAcc.name);
        onHide();
      }, 700);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to link Meta Ad Account");
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async () => {
    const confirm = window.confirm(`Are you sure you want to unlink the Meta Ad Account from ${companyName}?`);
    if (!confirm) return;

    try {
      setSaving(true);
      await unlinkMetaAccountFromCompany(companyId);
      onSuccess(undefined);
      onHide();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to unlink account");
    } finally {
      setSaving(false);
    }
  };

  const selectedAccountInfo = accounts.find((a) => a.id === selectedAccountId);

  // Filter accounts by search query
  const filteredAccounts = accounts.filter((acc) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      acc.name.toLowerCase().includes(q) ||
      acc.id.toLowerCase().includes(q) ||
      acc.currency.toLowerCase().includes(q)
    );
  });

  if (!show || !isAdmin) return null;

  return (
    <div
      className="report-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onHide();
      }}
    >
      <div className="report-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="report-modal-header">
          <h3>🔗 Connect Meta Ad Account — {companyName}</h3>
          <button type="button" className="report-modal-close" onClick={onHide} title="Close">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="report-modal-body">
          {error && (
            <Alert variant="danger" className="py-2" style={{ fontSize: "13px" }}>
              {error}
            </Alert>
          )}
          {successMsg && (
            <Alert variant="success" className="py-2" style={{ fontSize: "13px" }}>
              {successMsg}
            </Alert>
          )}

          <p style={{ fontSize: "13px", color: "var(--text-secondary, #94a3b8)", margin: "0 0 16px 0", lineHeight: 1.5 }}>
            Search and select the client's ad account from your agency portfolio. Live telemetry will update automatically.
          </p>

          {loading ? (
            <div style={{ textAlign: "center", padding: "30px 10px" }}>
              <Spinner animation="border" variant="primary" size="sm" />
              <span style={{ marginLeft: "10px", fontSize: "13.5px", color: "#94a3b8" }}>
                Querying accessible Meta Ad Accounts...
              </span>
            </div>
          ) : accounts.length === 0 ? (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                padding: "16px",
                borderRadius: "10px",
              }}
            >
              <p style={{ margin: 0, fontSize: "13px", color: "#fca5a5" }}>
                ⚠️ No ad accounts found. Please ensure <code>META_ACCESS_TOKEN</code> is set in <code>backend/.env</code> with <code>ads_read</code> permissions.
              </p>
            </div>
          ) : (
            <div>
              {/* Searchable input with interactive dropdown */}
              <div style={{ position: "relative", marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", textTransform: "uppercase", fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: "6px" }}>
                  Search & Select Ad Account:
                </label>

                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder={
                      selectedAccountInfo
                        ? `${selectedAccountInfo.name} (${selectedAccountInfo.currency})`
                        : "Type to search by account name or ID..."
                    }
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    className="filter-select"
                    style={{
                      width: "100%",
                      padding: "10px 32px 10px 14px",
                      fontSize: "13.5px",
                    }}
                  />

                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setShowDropdown(false);
                      }}
                      className="filter-clear-btn"
                      title="Clear search"
                      aria-label="Clear search query"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showDropdown && (
                  <div className="link-account-dropdown-menu">
                    {filteredAccounts.map((acc) => (
                      <div
                        key={acc.id}
                        className={`link-account-dropdown-item ${selectedAccountId === acc.id ? "selected" : ""}`}
                        onClick={() => {
                          setSelectedAccountId(acc.id);
                          setSearchQuery("");
                          setShowDropdown(false);
                        }}
                      >
                        <div>
                          <div className="link-account-name">{acc.name}</div>
                          <div className="link-account-sub">ID: {acc.id}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span className="link-account-currency-badge">
                            {acc.currency}
                          </span>
                        </div>
                      </div>
                    ))}

                    {filteredAccounts.length === 0 && (
                      <div className="link-account-dropdown-empty">
                        No matching Meta Ad Account found for "{searchQuery}".
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Account Info Card */}
              {selectedAccountInfo && (
                <div className="link-account-info-card">
                  <div>
                    <span className="link-account-info-label">Account: </span>
                    <strong className="link-account-info-val">{selectedAccountInfo.name}</strong>
                  </div>
                  <div>
                    <span className="link-account-info-label">ID: </span>
                    <strong className="link-account-info-id">{selectedAccountInfo.id}</strong>
                  </div>
                  <div>
                    <span className="link-account-info-label">Currency: </span>
                    <strong className="link-account-info-val">{selectedAccountInfo.currency}</strong>
                  </div>
                  <div>
                    <span className="link-account-info-label">Status: </span>
                    <span style={{ color: selectedAccountInfo.account_status === 1 ? "#10b981" : "#ef4444", fontWeight: 700 }}>
                      {selectedAccountInfo.account_status === 1 ? "🟢 Active" : "⚠️ Disabled"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="report-modal-footer">
          {currentConfig?.adAccountId && (
            <button
              type="button"
              className="btn-unlink-account"
              onClick={handleUnlink}
              disabled={saving}
            >
              <span>🗑️</span>
              <span>Unlink Account</span>
            </button>
          )}
          {/* <button type="button" className="btn btn-secondary" onClick={onHide} disabled={saving}>
            Cancel
          </button> */}
          <button
            type="button"
            className="btn-link-ad-account"
            onClick={handleLink}
            disabled={saving || accounts.length === 0}
          >
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                <span>Linking...</span>
              </>
            ) : (
              <>
                <span>🔗</span>
                <span>Link Ad Account</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
