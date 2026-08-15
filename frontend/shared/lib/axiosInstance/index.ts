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

    const accessToken = getCookie("accessToken");
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
      try {
        const res = await getNewAccessToken();
        const accessToken = res?.data?.accessToken;
        if (accessToken) {
          config.headers["Authorization"] = `Bearer ${accessToken}`;
          setCookie("accessToken", accessToken);
          return axiosInstance(config);
        }
      } catch (refreshError) {
        logger.warn("Token refresh failed", refreshError, "AxiosInstance");
      }
    }
    // Normalize every failure into an ApiError (status + message + fieldErrors)
    // so call sites never need to inspect raw axios internals.
    const apiError = toApiError(error);
    if (apiError.status >= 500) {
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
