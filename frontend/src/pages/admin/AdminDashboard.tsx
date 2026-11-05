import React from "react";
import CrmDashboard from "../../components/CrmDashboard/CrmDashboard";

/**
 * AdminDashboard Page
 * 
 * Exclusively renders the modern, hyper-functional CRM Dashboard
 * powered by live real-time telemetry from leads, tasks, companies,
 * and company calendars.
 */
const AdminDashboard: React.FC = () => {
  return <CrmDashboard embedded={true} />;
};

export default AdminDashboard;
