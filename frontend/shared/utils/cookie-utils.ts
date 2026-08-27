/**
 * Retrieves a cookie by its name.
 */
export const getCookie = (name: string): string | null => {
  if (typeof window === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  if (match) {
    return decodeURIComponent(match[2]);
  }
  return null;
};

/**
 * Sets a cookie with a given name, value, and expiration in days.
 */
export const setCookie = (name: string, value: string, days = 7) => {
  if (typeof window === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
};

/**
 * Deletes a cookie by its name across all path and domain variations.
 */
export const deleteCookie = (name: string) => {
  if (typeof window === "undefined") return;
  const pastDate = "Thu, 01 Jan 1970 00:00:00 GMT";
  document.cookie = `${name}=; expires=${pastDate}; path=/; SameSite=Lax`;
  document.cookie = `${name}=; expires=${pastDate}; path=/; SameSite=Strict`;
  document.cookie = `${name}=; expires=${pastDate}; path=/; SameSite=None; Secure`;
  document.cookie = `${name}=; expires=${pastDate}; path=/`;
  document.cookie = `${name}=; expires=${pastDate}`;
  try {
    const host = window.location.hostname;
    document.cookie = `${name}=; expires=${pastDate}; path=/; domain=${host}`;
    document.cookie = `${name}=; expires=${pastDate}; path=/; domain=.${host}`;
    const hostParts = host.split(".");
    if (hostParts.length > 2) {
      const rootDomain = hostParts.slice(-2).join(".");
      document.cookie = `${name}=; expires=${pastDate}; path=/; domain=.${rootDomain}`;
    }
  } catch {}
};
