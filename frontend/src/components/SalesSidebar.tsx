import { NavLink, useNavigate } from "react-router-dom";

const SalesSidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");

    navigate("/login");
  };

  return (
    <aside className="sales-sidebar">

      <div className="sales-sidebar-logo">
        <h2>Sales Portal</h2>
      </div>

      <nav className="sales-sidebar-nav">

        <NavLink
          to="/sales/dashboard"
          className={({ isActive }) =>
            isActive
              ? "sales-nav-link active"
              : "sales-nav-link"
          }
        >
          <span>📊</span>
          Dashboard
        </NavLink>

        <NavLink
          to="/sales/companies"
          className={({ isActive }) =>
            isActive
              ? "sales-nav-link active"
              : "sales-nav-link"
          }
        >
          <span>🏢</span>
          Companies
        </NavLink>

        <NavLink
          to="/sales/customers"
          className={({ isActive }) =>
            isActive
              ? "sales-nav-link active"
              : "sales-nav-link"
          }
        >
          <span>👥</span>
          Customers
        </NavLink>

        <NavLink
          to="/sales/reports"
          className={({ isActive }) =>
            isActive
              ? "sales-nav-link active"
              : "sales-nav-link"
          }
        >
          <span>📈</span>
          Meta Ads Live
        </NavLink>

        <NavLink
          to="/sales/profile"
          className={({ isActive }) =>
            isActive
              ? "sales-nav-link active"
              : "sales-nav-link"
          }
        >
          <span>👤</span>
          Profile
        </NavLink>

      </nav>

      <div className="sales-sidebar-bottom">

        <button
          className="sales-logout-btn"
          onClick={handleLogout}
        >
          <span>🚪</span>
          Logout
        </button>

      </div>

    </aside>
  );
};

export default SalesSidebar;