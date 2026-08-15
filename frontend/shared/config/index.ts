/**
 * Centralized application configuration.
 * All environment-variable access should go through this module.
 */

import validateEnv from "./env";

// Run env validation once at module load (dev only, never throws)
validateEnv();

const envConfig = {
  /** Base URL for the backend host (no path) */
  get backendURL(): string {
    const raw = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3006";
    if (typeof window !== "undefined") {
      if (raw.includes("kong:8000") || raw.includes("kong")) {
        const proto = window.location.protocol;
        const host = window.location.hostname;
        return `${proto}//${host}:8000`;
      }
    }
    return raw;
  },

  /** API version prefix – used in Axios baseURL construction ("" opts out) */
  apiVersion: process.env.NEXT_PUBLIC_API_VERSION ?? "v1",

  /**
   * Versioned REST base URL, e.g. `http://localhost:3006/api/v1`.
   * All relative API paths resolve against this. Set NEXT_PUBLIC_API_VERSION=""
   * to opt out of the version prefix.
   */
  get apiBaseURL(): string {
    if (typeof window !== "undefined") {
      const raw = process.env.NEXT_PUBLIC_BACKEND_URL || "";
      if (raw.includes("kong:8000") || raw.includes("kong")) {
        const proto = window.location.protocol;
        const host = window.location.hostname;
        return this.apiVersion ? `${proto}//${host}:8000/api/${this.apiVersion}` : `${proto}//${host}:8000`;
      }
    }
    return this.apiVersion ? `${this.backendURL}/api/${this.apiVersion}` : this.backendURL;
  },

  /** Human-readable application name used in metadata */
  appName: "Vero",

  /** Current runtime environment */
  appEnv: (process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || "development") as
    "development" | "staging" | "production",

  /** Whether we are running in a development environment */
  get isDev() {
    return this.appEnv === "development";
  },

  /** Whether we are running in production */
  get isProd() {
    return this.appEnv === "production";
  },
} as const;

export type EnvConfig = typeof envConfig;
export default envConfig;
