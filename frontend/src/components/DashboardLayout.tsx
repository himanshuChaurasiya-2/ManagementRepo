import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

const DashboardLayout = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();

  // Automatically close mobile navbar on navigation / route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      {/* MOBILE BACKDROP OVERLAY */}
      {mobileNavOpen && (
        <div
          className="app-sidebar-backdrop"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR NAVIGATION */}
      <Sidebar
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* MAIN WRAPPER (TOPBAR + CANVAS) */}
      <div className="app-main-wrapper">
        {/* RESPONSIVE TOPBAR / NAVBAR */}
        <Navbar
          mobileNavOpen={mobileNavOpen}
          onToggleMobileNav={() => setMobileNavOpen((prev) => !prev)}
        />

        {/* MAIN CANVAS */}
        <main className="app-canvas">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;