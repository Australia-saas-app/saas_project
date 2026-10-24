/**
 * Stable device fingerprinting and identification.
 * Ensures the same physical device retains the same device ID across browser restarts,
 * while different devices produce different device IDs.
 */

function simpleHash(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return hash.toString(36);
}

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("VeroPlatform,Device#1", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("VeroPlatform,Device#1", 4, 17);
    return canvas.toDataURL();
  } catch {
    return "";
  }
}

export function computeStableDeviceFingerprint(): string {
  if (typeof window === "undefined") return "server-device";

  const nav = window.navigator || ({} as Navigator);
  const scr = window.screen || ({} as Screen);

  const parts = [
    nav.userAgent || "",
    nav.platform || "",
    nav.language || "",
    (nav as any).hardwareConcurrency || "",
    (nav as any).deviceMemory || "",
    scr.width || 0,
    scr.height || 0,
    scr.colorDepth || 0,
    scr.pixelDepth || 0,
    Intl?.DateTimeFormat?.()?.resolvedOptions?.()?.timeZone || "",
    getCanvasFingerprint(),
  ];

  const hash = simpleHash(parts.join("###"));
  return `dev_${hash}`;
}

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "server-device";

  // 1. Try reading from localStorage
  try {
    const stored = localStorage.getItem("vero_device_id");
    if (stored && stored.trim().length > 4) {
      return stored;
    }
  } catch {}

  // 2. Try reading from document.cookie
  try {
    const match = document.cookie.match(/(?:^|;\s*)vero_device_id=([^;]+)/);
    if (match?.[1]) {
      const cookieVal = decodeURIComponent(match[1]);
      if (cookieVal && cookieVal.trim().length > 4) {
        try {
          localStorage.setItem("vero_device_id", cookieVal);
        } catch {}
        return cookieVal;
      }
    }
  } catch {}

  // 3. Fallback: generate deterministic fingerprint for this physical device/browser
  const stableId = computeStableDeviceFingerprint();

  try {
    localStorage.setItem("vero_device_id", stableId);
  } catch {}

  try {
    // 1-year persistent cookie
    document.cookie = `vero_device_id=${encodeURIComponent(
      stableId
    )}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {}

  return stableId;
}
