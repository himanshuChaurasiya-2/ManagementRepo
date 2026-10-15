import {
  Navigate,
  Outlet,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

interface RoleRouteProps {
  allowedRoles: ("admin" | "sales")[];
}

const RoleRoute = ({
  allowedRoles,
}: RoleRouteProps) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <Navigate
        to={
          user.role === "admin"
            ? "/admin/dashboard"
            : "/sales/dashboard"
        }
        replace
      />
    );
  }

  return <Outlet />;
};

export default RoleRoute;