import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import AdminNotificationFloat from "./AdminNotificationFloat";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../context/AuthContext";

const DashboardLayout = () => {
  const { user } = useAuth();
  const adminName = user?.name || user?.email?.split("@")[0] || "Administrator";
  const adminInitial = adminName.charAt(0).toUpperCase();

  return (
    <div className="app-shell">
      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN WRAPPER (TOPBAR + CANVAS) */}
      <div className="app-main-wrapper">
        {/* TOPBAR / NAVBAR */}
        <header className="app-topbar">
          <h1 className="app-topbar-title">Dashboard</h1>

          {/* RIGHT SIDE: THEME TOGGLE, NOTIFICATION BELL & USER PROFILE */}
          <div className="app-topbar-right">
            <ThemeToggle compact />
            <AdminNotificationFloat />

            <div className="app-user-profile">
              <div className="app-user-text">
                <span className="app-user-name">{adminName}</span>
                <span className="app-user-role">Administrator</span>
              </div>
              <div className="app-user-avatar">
                {adminInitial}
              </div>
            </div>
          </div>
        </header>

        {/* MAIN CANVAS */}
        <main className="app-canvas">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;