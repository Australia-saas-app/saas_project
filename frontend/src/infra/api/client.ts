import { env } from "../config/env";
import { toast } from "sonner";

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
  skipErrorToast?: boolean;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { params, skipErrorToast, ...customConfig } = options;
    
    const headers = new Headers(customConfig.headers);
    if (!headers.has("Content-Type") && !(customConfig.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    // Attach Authorization token if available (can be pulled from cookies or local storage)
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    let url = `${this.baseURL}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const config: RequestInit = {
      ...customConfig,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      // Parse JSON
      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        throw {
          status: response.status,
          message: data?.message || response.statusText || "An error occurred",
          data
        };
      }

      return data as T;
    } catch (error: any) {
      // Global Error Handler
      console.error(`API Error [${options.method || 'GET'} ${endpoint}]:`, error);
      
      if (!skipErrorToast) {
        if (error.status === 401) {
          toast.error("Your session has expired. Please log in again.");
          // Trigger logout event here
        } else if (error.status === 403) {
          toast.error("You do not have permission to perform this action.");
        } else {
          toast.error(error.message || "Failed to fetch data from the server.");
        }
      }
      throw error;
    }
  }

  get<T>(endpoint: string, options?: FetchOptions) {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  post<T>(endpoint: string, body: any, options?: FetchOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  put<T>(endpoint: string, body: any, options?: FetchOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  delete<T>(endpoint: string, options?: FetchOptions) {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}

export const apiClient = new ApiClient(env.API_URL);
