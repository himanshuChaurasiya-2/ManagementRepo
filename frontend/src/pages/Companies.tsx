import {
  useEffect,
  useState,
} from "react";

import axios from "axios";

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

  const [submitting, setSubmitting] =
    useState(false);

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

  // =====================================
  // GET COMPANIES
  // =====================================

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

  useEffect(() => {
    loadCompanies();
  }, []);

  // =====================================
  // FORM CHANGE
  // =====================================

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

  // =====================================
  // OPEN ADD MODAL
  // =====================================

  const openAddModal = () => {
    setEditingCompany(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  // =====================================
  // OPEN EDIT MODAL
  // =====================================

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
    });

    setShowModal(true);
  };

  // =====================================
  // SAVE COMPANY
  // =====================================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      if (editingCompany) {
        await axios.patch(
          `${API_URL}/companies/${editingCompany._id}`,
          form,
          authConfig()
        );
      } else {
        await axios.post(
          `${API_URL}/companies`,
          form,
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

  // =====================================
  // STATUS
  // =====================================

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

  // =====================================
  // DELETE
  // =====================================

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

  // =====================================
  // SEARCH
  // =====================================

  const filteredCompanies =
    companies.filter((company) => {
      const query =
        search.toLowerCase();

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
            Manage your clients and
            company details.
          </p>
        </div>

        <button
          className="company-add-btn"
          onClick={openAddModal}
        >
          + Add Company
        </button>

      </div>

      {/* STATS */}

      <div className="company-stats">

        <div className="company-stat-card">
          <span>
            Total Companies
          </span>

          <strong>
            {companies.length}
          </strong>
        </div>

        <div className="company-stat-card">
          <span>
            Active
          </span>

          <strong className="active-number">
            {
              companies.filter(
                (c) =>
                  c.status === "active"
              ).length
            }
          </strong>
        </div>

        <div className="company-stat-card">
          <span>
            Inactive
          </span>

          <strong className="inactive-number">
            {
              companies.filter(
                (c) =>
                  c.status === "inactive"
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
              Add your first client company.
            </p>

            <button
              className="company-add-btn"
              onClick={openAddModal}
            >
              + Add Company
            </button>
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
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {filteredCompanies.map(
                  (company, index) => (

                    <tr
                      key={company._id}
                    >

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
                        {company.alternatePhone ||
                          "—"}
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
                        {company.address ||
                          "—"}
                      </td>

                      <td>

                        <span
                          className={`company-status ${
                            company.status
                          }`}
                        >
                          {company.status}
                        </span>

                      </td>

                      <td>
                        {company.notes ||
                          "—"}
                      </td>

                      <td>
                        {new Date(
                          company.createdAt
                        ).toLocaleDateString()}
                      </td>

                      <td>

                        <div className="company-actions">

                          <button
                            className="edit-btn"
                            onClick={() =>
                              openEditModal(
                                company
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            className={
                              company.status ===
                              "active"
                                ? "deactivate-btn"
                                : "activate-btn"
                            }
                            onClick={() =>
                              toggleStatus(
                                company
                              )
                            }
                          >
                            {company.status ===
                            "active"
                              ? "Deactivate"
                              : "Activate"}
                          </button>

                          <button
                            className="delete-btn"
                            onClick={() =>
                              deleteCompany(
                                company
                              )
                            }
                          >
                            Delete
                          </button>

                        </div>

                      </td>

                    </tr>

                  )
                )}

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