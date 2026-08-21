import envConfig from "@/src/config";
import { getNewAccessToken } from "@/src/server/AuthService";
import { toApiError } from "@/src/lib/api-error";
import logger from "@/src/lib/logger";
import axios from "axios";
import { getCookie, setCookie } from "@/src/utils/cookie-utils";

const axiosInstance = axios.create({
  baseURL: envConfig.apiBaseURL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Log the baseURL in development for debugging (uses structured logger)
if (envConfig.isDev) {
  logger.debug("Axios baseURL configured", { url: envConfig.apiBaseURL }, "AxiosInstance");
}

axiosInstance.interceptors.request.use(
  async function (config) {
    if (typeof window !== "undefined") {
      if (!config.baseURL || config.baseURL.includes("kong:8000") || config.baseURL.includes("kong")) {
        config.baseURL = envConfig.apiBaseURL || "/api/v1";
      }
      if (config.url && (config.url.includes("http://kong:8000/api/v1") || config.url.includes("http://kong:8000"))) {
        config.url = config.url.replace(/https?:\/\/kong(:8000)?\/api\/v1/g, "/api/v1").replace(/https?:\/\/kong(:8000)?/g, "/api");
      }
    }

    const accessToken =
      getCookie("client_access_token") ||
      getCookie("accessToken") ||
      (typeof window !== "undefined"
        ? localStorage.getItem("accessToken") ||
          localStorage.getItem("token") ||
          sessionStorage.getItem("accessToken") ||
          sessionStorage.getItem("token")
        : null);

    // Only attach Authorization if it isn't already explicitly set
    if (accessToken && !(config.headers && "Authorization" in config.headers)) {
      // Use Bearer prefix to match the REST standard and serverFetch.ts
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  function (error) {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  function onFulfilled(response) {
    return response;
  },
  async function onRejected(error) {
    const config = error?.config;
    const isRefreshCall =
      typeof config?.url === "string" && config.url.includes("/auth/refresh-token");
    if (error?.response?.status === 401 && !config?._retry && !isRefreshCall) {
      config._retry = true;
      if (typeof window !== "undefined") {
        try {
          const res = await getNewAccessToken().catch(() => null);
          const accessToken = res?.data?.accessToken;
          if (accessToken) {
            config.headers["Authorization"] = `Bearer ${accessToken}`;
            localStorage.setItem("accessToken", accessToken);
            setCookie("accessToken", accessToken);
            setCookie("client_access_token", accessToken);
            return axiosInstance(config);
          }
        } catch (refreshError) {
          logger.warn("Token refresh failed", refreshError, "AxiosInstance");
          if (typeof window !== "undefined") {
            const pathname = window.location.pathname;
            if (pathname.includes("/dashboard") || pathname.startsWith("/business") || pathname.startsWith("/affiliate") || pathname.startsWith("/user")) {
              let rolePath = "user";
              if (pathname.includes("/business")) rolePath = "business";
              else if (pathname.includes("/affiliate")) rolePath = "affiliate";
              window.location.href = `/account/${rolePath}/login?reason=session_expired`;
            }
          }
        }
      }
    }
    // Normalize every failure into an ApiError (status + message + fieldErrors)
    // so call sites never need to inspect raw axios internals.
    const apiError = toApiError(error);
    if (apiError.status >= 500 && !(config as any)?.silent && !(config as any)?.skipErrorLog) {
      logger.error(
        "API request failed",
        { url: config?.url, status: apiError.status },
        "AxiosInstance"
      );
    }
    return Promise.reject(apiError);
  }
);

export default axiosInstance;
