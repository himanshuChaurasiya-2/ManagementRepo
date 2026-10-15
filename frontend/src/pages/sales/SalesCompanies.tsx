import { useEffect, useState } from "react";
import axios from "axios";
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
  createdAt: string;
}

const API_URL = "http://localhost:5000/api";

const SalesCompanies = () => {
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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
        setCompanies(response.data.companies);
      }
    } catch (error: any) {
      console.error("Get companies error:", error);

      alert(
        error.response?.data?.message ||
          "Unable to load companies"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const filteredCompanies = companies.filter((company) => {
    const query = search.toLowerCase();

    return (
      company.companyName
        .toLowerCase()
        .includes(query) ||
      company.contactPerson
        .toLowerCase()
        .includes(query) ||
      company.email
        .toLowerCase()
        .includes(query) ||
      company.industry
        .toLowerCase()
        .includes(query) ||
      company.phone
        .toLowerCase()
        .includes(query)
    );
  });

  return (
    <div className="company-page">

      {/* HEADER */}
      <div className="company-header">
        <div>
          <h1>Companies</h1>

          <p>
            View client companies and their details.
          </p>
        </div>
      </div>

      {/* STATS */}
      <div className="company-stats">

        <div className="company-stat-card">
          <span>Total Companies</span>

          <strong>
            {companies.length}
          </strong>
        </div>

        <div className="company-stat-card">
          <span>Active</span>

          <strong className="active-number">
            {
              companies.filter(
                (company) =>
                  company.status === "active"
              ).length
            }
          </strong>
        </div>

        <div className="company-stat-card">
          <span>Inactive</span>

          <strong className="inactive-number">
            {
              companies.filter(
                (company) =>
                  company.status === "inactive"
              ).length
            }
          </strong>
        </div>

      </div>

      {/* TABLE */}
      <div className="company-table-card">

        <div className="company-table-header">

          <h3>
            Client Companies
          </h3>

          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="company-search"
          />

        </div>

        {loading ? (

          <div className="company-loading">
            Loading companies...
          </div>

        ) : filteredCompanies.length === 0 ? (

          <div className="company-empty">
            <h3>
              No companies found
            </h3>

            <p>
              There are no client companies available.
            </p>
          </div>

        ) : (

          <div className="company-table-wrapper">

            <table className="company-table">

              <thead>
                <tr>
                  <th>Sr. No.</th>
                  <th>Company Name</th>
                  <th>Contact Person</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Alternate Phone</th>
                  <th>Industry</th>
                  <th>Website</th>
                  <th>Address</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Created Date</th>
                </tr>
              </thead>

              <tbody>

                {filteredCompanies.map(
                  (company, index) => (

                    <tr key={company._id}>

                      <td>
                        {index + 1}
                      </td>

                      <td>
                        <strong>
                          {company.companyName}
                        </strong>
                      </td>

                      <td>
                        {company.contactPerson}
                      </td>

                      <td>
                        {company.email}
                      </td>

                      <td>
                        {company.phone}
                      </td>

                      <td>
                        {company.alternatePhone || "—"}
                      </td>

                      <td>
                        {company.industry}
                      </td>

                      <td>
                        {company.website ? (
                          <a
                            href={
                              company.website.startsWith(
                                "http"
                              )
                                ? company.website
                                : `https://${company.website}`
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            Visit
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td>
                        {company.address || "—"}
                      </td>

                      <td>
                        <span
                          className={`company-status ${company.status}`}
                        >
                          {company.status}
                        </span>
                      </td>

                      <td>
                        {company.notes || "—"}
                      </td>

                      <td>
                        {new Date(
                          company.createdAt
                        ).toLocaleDateString()}
                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  );
};

export default SalesCompanies;