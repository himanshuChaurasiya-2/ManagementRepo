import axios, { type AxiosRequestConfig } from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Plain axios instance dedicated exclusively to auth refresh to avoid interceptor recursion
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Concurrency queue state for silent token refresh
let isRefreshing = false;

interface QueuedPromise {
  resolve: (token: string) => void;
  reject: (error: any) => void;
}

let failedQueue: QueuedPromise[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ===============================
// REQUEST INTERCEPTOR
// ===============================
const attachAuthToken = (config: any) => {
  const token =
    localStorage.getItem("token") || localStorage.getItem("accessToken");

  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
};

api.interceptors.request.use(attachAuthToken, (error) => Promise.reject(error));
axios.interceptors.request.use(attachAuthToken, (error) => Promise.reject(error));

// ===============================
// RESPONSE INTERCEPTOR (SILENT REFRESH)
// ===============================
const handleResponseSuccess = (response: any) => response;

const handleResponseError = async (error: any, retryClient: any) => {
  const originalRequest = error.config as AxiosRequestConfig & {
    _retry?: boolean;
  };

  if (!error.response || !originalRequest) {
    return Promise.reject(error);
  }

  const status = error.response.status;
  const url = originalRequest.url || "";

  // Never intercept authentication / verification endpoints
  const isExcludedUrl =
    url.includes("/auth/login") ||
    url.includes("/auth/refresh") ||
    url.includes("/auth/logout") ||
    url.includes("/auth/forgot-password") ||
    url.includes("/auth/reset-password") ||
    url.includes("/auth/verify-reset-token") ||
    url.includes("/auth/verify-invitation-token") ||
    url.includes("/auth/set-password");

  if (status === 401 && !isExcludedUrl) {
    const refreshToken = localStorage.getItem("refreshToken");

    // If no refresh token exists in storage, force clean re-login
    if (!refreshToken) {
      if (!window.location.pathname.includes("/login")) {
        localStorage.removeItem("token");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    // If a refresh is already in progress, enqueue this request until resolved
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          if (!originalRequest.headers) {
            originalRequest.headers = {};
          }
          originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
          return retryClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const response = await refreshClient.post("/auth/refresh", {
        refreshToken,
      });

      if (response.data && response.data.success) {
        const newAccessToken =
          response.data.accessToken || response.data.token;
        const newRefreshToken = response.data.refreshToken;

        localStorage.setItem("token", newAccessToken);
        localStorage.setItem("accessToken", newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem("refreshToken", newRefreshToken);
        }

        // Update default Authorization header for both api and axios
        api.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;
        axios.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;

        if (!originalRequest.headers) {
          originalRequest.headers = {};
        }
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);

        return retryClient(originalRequest);
      } else {
        throw new Error("Token refresh response not successful");
      }
    } catch (refreshError) {
      processQueue(refreshError, null);

      localStorage.removeItem("token");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");

      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }

  return Promise.reject(error);
};

api.interceptors.response.use(
  handleResponseSuccess,
  (error) => handleResponseError(error, api)
);

axios.interceptors.response.use(
  handleResponseSuccess,
  (error) => handleResponseError(error, axios)
);

export default api;
