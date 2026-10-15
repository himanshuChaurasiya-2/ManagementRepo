import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "./SalesDashboard.css";

interface CompanyData {
  _id: string;
  companyName: string;
  contactPerson: string;
  status: "active" | "inactive";
  createdAt: string;
}

const API_URL = "http://localhost:5000/api";

const SalesDashboard = () => {
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(true);

  const getToken = () => {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      ""
    );
  };

  const loadCompanies = async () => {
    try {
      setLoading(true);

      const response = await axios.get(
        `${API_URL}/companies`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      if (response.data.success) {
        setCompanies(response.data.companies || []);
      }
    } catch (error) {
      console.error("Unable to load companies:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const activeCompanies = companies.filter(
    (company) => company.status === "active"
  ).length;

  const inactiveCompanies = companies.filter(
    (company) => company.status === "inactive"
  ).length;

  return (
    <div className="sales-dashboard">

      {/* HEADER */}
      <div className="sales-dashboard-header">
        <div>
          <h1>Sales Dashboard</h1>
          <p>
            Welcome to your sales workspace.
          </p>
        </div>
      </div>

      {/* STATS */}
      <div className="sales-stats">

        <div className="sales-stat-card">
          <div className="sales-stat-icon">
            🏢
          </div>

          <div>
            <span>Total Clients</span>

            <strong>
              {loading ? "..." : companies.length}
            </strong>
          </div>
        </div>

        <div className="sales-stat-card">
          <div className="sales-stat-icon">
            ✓
          </div>

          <div>
            <span>Active Clients</span>

            <strong>
              {loading ? "..." : activeCompanies}
            </strong>
          </div>
        </div>

        <div className="sales-stat-card">
          <div className="sales-stat-icon">
            ○
          </div>

          <div>
            <span>Inactive Clients</span>

            <strong>
              {loading ? "..." : inactiveCompanies}
            </strong>
          </div>
        </div>

      </div>

      {/* QUICK ACCESS */}
      <div className="sales-section">

        <div className="sales-section-header">
          <div>
            <h2>Quick Access</h2>

            <p>
              Access your sales information.
            </p>
          </div>
        </div>

        <div className="sales-quick-grid">

          <Link
            to="/sales/companies"
            className="sales-quick-card"
          >
            <div className="sales-quick-icon">
              🏢
            </div>

            <div>
              <h3>Companies</h3>

              <p>
                View all client company details.
              </p>
            </div>


          </Link>

          <div className="sales-quick-card disabled">
            <div className="sales-quick-icon">
              👥
            </div>

            <div>
              <h3>Customers</h3>

              <p>
                Customer information.
              </p>
            </div>

            <span className="sales-coming">
              Coming Soon
            </span>
          </div>

          <div className="sales-quick-card disabled">
            <div className="sales-quick-icon">
              📊
            </div>

            <div>
              <h3>Sales Reports</h3>

              <p>
                Track your sales performance.
              </p>
            </div>

            <span className="sales-coming">
              Coming Soon
            </span>
          </div>

        </div>
      </div>

      {/* RECENT CLIENTS */}
      <div className="sales-section">

        <div className="sales-section-header">

          <div>
            <h2>Recent Clients</h2>

            <p>
              Recently added client companies.
            </p>
          </div>

          <Link
            to="/sales/companies"
            className="sales-view-all"
          >
            View All →
          </Link>

        </div>

        <div className="sales-recent-card">

          {loading ? (

            <div className="sales-loading">
              Loading clients...
            </div>

          ) : companies.length === 0 ? (

            <div className="sales-empty">
              No clients available.
            </div>

          ) : (

            <div>

              {companies
                .slice(0, 5)
                .map((company) => (

                  <div
                    className="sales-recent-item"
                    key={company._id}
                  >

                    <div className="sales-company-avatar">
                      {company.companyName
                        ?.charAt(0)
                        ?.toUpperCase() || "C"}
                    </div>

                    <div className="sales-company-info">

                      <strong>
                        {company.companyName}
                      </strong>

                      <span>
                        {company.contactPerson}
                      </span>

                    </div>

                    <span
                      className={`company-status ${company.status}`}
                    >
                      {company.status}
                    </span>

                    <span className="sales-date">
                      {new Date(
                        company.createdAt
                      ).toLocaleDateString()}
                    </span>

                  </div>

                ))}

            </div>
          )}

        </div>
      </div>

    </div>
  );
};

export default SalesDashboard;