import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";

import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";
import DashboardLayout from "./components/DashboardLayout";
import SalesLayout from "./layouts/SalesLayout";

import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";

import AdminDashboard from "./pages/admin/AdminDashboard";
import Users from "./pages/admin/Users";
import AdminTasks from "./pages/admin/AdminTasks";
import CompanyCalendar from "./pages/admin/CompanyCalendar";

import SalesDashboard from "./pages/sales/SalesDashboard";
import SalesCompanies from "./pages/sales/SalesCompanies";
import SalesTasks from "./pages/sales/SalesTasks";

import Companies from "./pages/Companies";
import Tasks from "./pages/Tasks";
import MyCalendar from "./pages/MyCalendar";
import CompanyCalendarView from "./pages/sales/CompanyCalendarView";
import ReminderNotification from "./components/ReminderNotification";
import Lead from "./pages/sales/Lead";
import AdminLeads from "./pages/admin/AdminLeads";
import MonthlyReportDashboard from "./pages/reports/MonthlyReportDashboard";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
          <ReminderNotification />
        <Routes>

          {/* PUBLIC ROUTES */}

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/change-password"
            element={<ChangePassword />}
          />

          {/* PROTECTED APPLICATION */}

          <Route element={<ProtectedRoute />}>

            {/* ADMIN APPLICATION */}

            <Route element={<DashboardLayout />}>

              <Route element={<RoleRoute allowedRoles={["admin"]} />}>

                {/* Admin Dashboard */}
                <Route
                  path="/admin/dashboard"
                  element={<AdminDashboard />}
                />

                {/* Admin Tasks */}
                <Route
                  path="/admin/tasks"
                  element={<AdminTasks />}
                />

                {/* Admin Users */}
                <Route
                  path="/admin/users"
                  element={<Users />}
                />

                {/* Admin Companies */}
                <Route
                  path="/companies"
                  element={<Companies />}
                />

                <Route
  path="/admin/leads"
  element={<AdminLeads/>}
/>

                {/* COMPANY CALENDAR :ADMIN ONLY */}

                <Route
                  path="/company-calendar"
                  element={<CompanyCalendar />}
                />

                {/* Monthly Reporting Dashboard */}
                <Route
                  path="/admin/reports"
                  element={<MonthlyReportDashboard />}
                />
                <Route
                  path="/reports"
                  element={<MonthlyReportDashboard />}
                />

              </Route>

            </Route>


            {/* SALES APPLICATION */}

            <Route element={<RoleRoute allowedRoles={["sales"]} />}>

              <Route element={<SalesLayout />}>

                {/* Sales Dashboard */}
                <Route
                  path="/sales/dashboard"
                  element={<SalesDashboard />}
                />

                {/* Sales Companies */}
                <Route
                  path="/sales/companies"
                  element={<SalesCompanies />}
                />

                {/* Sales-specific tasks */}
                <Route
                  path="/sales/tasks-my"
                  element={<SalesTasks />}
                />

                {/* Sales Tasks */}
                <Route
                  path="/sales/tasks"
                  element={<Tasks />}
                />

                {/* Personal Calendar */}
                <Route
                  path="/sales/calendar"
                  element={<MyCalendar />}
                />
                <Route path="sales/leads" element={<Lead/>} />

                {/* Company Calendar - READ ONLY */}
                <Route
                  path="/sales/company-calendar"
                  element={<CompanyCalendarView/>}
                />

                <Route path="/leads" element={<Lead/>} />
                <Route path="/sales/reports" element={<MonthlyReportDashboard />} />

              </Route>

            </Route>

          </Route>


          {/* FALLBACK */}

          <Route
            path="*"
            element={
              <Navigate
                to="/login"
                replace
              />
            }
          />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;