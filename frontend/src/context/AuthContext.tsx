import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  loginUser,
  changePassword as changePasswordApi,
} from "../services/authService";
import api from "../services/api";

import type { User } from "../types/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<User>;
  logout: () => void;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
}

const AuthContext = createContext<
  AuthContextType | undefined
>(undefined);

export const AuthProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }

    setLoading(false);
  }, []);

  const login = async (
    email: string,
    password: string
  ) => {
    const response = await loginUser({
      email,
      password,
    });

    localStorage.setItem("token", response.token);
    localStorage.setItem(
      "accessToken",
      response.accessToken || response.token
    );
    if (response.refreshToken) {
      localStorage.setItem("refreshToken", response.refreshToken);
    }
    localStorage.setItem(
      "user",
      JSON.stringify(response.user)
    );

    setUser(response.user);

    return response.user;
  };

  const logout = () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      api.post("/auth/logout", { refreshToken }).catch(() => {});
    }

    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");

    setUser(null);
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ) => {
    await changePasswordApi(
      currentPassword,
      newPassword
    );

    if (user) {
      const updatedUser = {
        ...user,
        mustChangePassword: false,
      };

      localStorage.setItem(
        "user",
        JSON.stringify(updatedUser)
      );

      setUser(updatedUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
};