const trimTrailingSlash = (url: string) => url.replace(/\/$/, "");

function isAdminAppHost(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.port === "3001" || window.location.hostname.startsWith("admin.");
}

export function getAdminAppUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_ADMIN_URL;
  if (fromEnv && !fromEnv.includes("localhost")) return trimTrailingSlash(fromEnv);

  if (typeof window !== "undefined") {
    if (isAdminAppHost()) {
      return window.location.origin;
    }
    const proto = window.location.protocol;
    const host = window.location.hostname;
    const port = window.location.port === "8080" ? "8001" : "3001";
    return `${proto}//${host}:${port}`;
  }

  return "http://localhost:3001";
}

export function getWebAppUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return trimTrailingSlash(fromEnv);

  if (typeof window !== "undefined" && !isAdminAppHost()) {
    return window.location.origin;
  }

  return "http://localhost:3000";
}

export function adminAppPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getAdminAppUrl()}${normalized}`;
}

export function webAppPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getWebAppUrl()}${normalized}`;
}
