"use server";

import { cookies } from "next/headers";
import { FieldValues } from "react-hook-form";
import { z } from "zod";
import envConfig from "@/src/shared/config";
import axios from "axios";
import {
  parseApiError,
  getLoginErrorMessage,
  AUTH_MESSAGES,
  isNetworkOrTimeoutError,
} from "@/src/lib/api-error";
import logger from "@/src/lib/logger";

const axiosInstance = axios.create({
  baseURL: envConfig.apiBaseURL,
});

import { normalizeContact } from "@/src/lib/normalize-contact";

export interface IDecodedToken {
  id: string;
  email: string;
  role: string;
  name: string;
  status: string;
  iat?: number;
  exp?: number;
}

const log = logger.child("AuthService");

const AUTH_REQUEST_TIMEOUT = 10000;

/**
 * Secure cookies require HTTPS. On a GCP VM served over http://IP:port,
 * Secure cookies are dropped by the browser and login appears to fail.
 * Prefer COOKIE_SECURE=true|false; otherwise infer from NEXT_PUBLIC_SITE_URL.
 */
function shouldUseSecureCookies(): boolean {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  if (process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://")) return true;
  if (process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http://")) return false;
  if (typeof window !== "undefined") {
    if (window.location.protocol === "http:") return false;
    if (window.location.protocol === "https:") return true;
  }

  return false;
}

/** Shared cookie options – Lax for same-site forms; Secure only when HTTPS. */
function getCookieOptions(rememberMe: boolean = false) {
  const options: any = {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax" as const,
    path: "/",
  };
  if (rememberMe) {
    options.maxAge = 604800; // 7 days
  }
  return options;
}

/** Refresh tokens live longer than access tokens (30 days). */
function getRefreshCookieOptions(rememberMe: boolean = false) {
  const options = getCookieOptions(rememberMe);
  if (rememberMe) {
    options.maxAge = 2592000;
  }
  return options;
}

/**
 * Persist auth tokens from a backend response payload. Handles both
 * `token`/`accessToken` naming and stores `refreshToken` when present so the
 * axios 401-retry refresh flow can actually succeed.
 */
async function persistSessionTokens(payload: unknown, rememberMe: boolean = false) {
  const data = payload as
    { token?: string; accessToken?: string; refreshToken?: string; user?: any } | undefined;
  const accessToken = data?.token || data?.accessToken;
  if (!accessToken) return;

  const cookieStore = await cookies();
  cookieStore.set("accessToken", accessToken, getCookieOptions(rememberMe));
  if (data?.refreshToken) {
    cookieStore.set("refreshToken", data.refreshToken, getRefreshCookieOptions(rememberMe));
  }
  if (data?.user) {
    // Strip large / binary fields that would bloat the cookie and trigger
    // ERR_RESPONSE_HEADERS_TOO_BIG. Profile photos and document URLs can be
    // base64 strings of hundreds of KB — cookies must stay under ~4 KB.
    const {
      profilePhoto: _photo,
      idDocument: _doc,
      avatarUrl: _avatar,
      documentUrl: _docUrl,
      ...safeUser
    } = data.user as any;
    cookieStore.set("user", JSON.stringify(safeUser), getCookieOptions(rememberMe));
  }
}

/**
 * Server-side request validation (never trust the client payload).
 * Schemas are intentionally permissive about extra fields – each role's
 * registration form sends different attributes – but core credentials
 * are always validated here before leaving the server action.
 */
const serverLoginSchema = z.object({
  identifier: z.string().trim().min(1).max(256),
  password: z.string().min(1).max(256),
});

const serverRegisterSchema = z
  .object({
    email: z.string().trim().email().max(256).optional(),
    contact: z.string().trim().min(3).max(256).optional(),
    password: z.string().min(8).max(256),
  })
  .loose()
  .refine((value) => Boolean(value.email || value.contact), {
    message: "An email address or contact is required",
  });

function encodeBase64Url(value: string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}



export const registerUser = async (userData: FieldValues) => {
  const validation = serverRegisterSchema.safeParse(userData);
  if (!validation.success) {
    const issue = validation.error.issues[0];
    return {
      success: false,
      message: issue ? `${issue.path.join(".") || "form"}: ${issue.message}` : "Invalid registration data"
    };
  }

  try {
    const payload: Record<string, unknown> = { ...userData };
    if (!payload["businessCategoryId"] && payload["businessCategoryMain"]) {
      payload["businessCategoryId"] = payload["businessCategoryMain"];
    }
    if (!payload["subBusinessCategoryId"] && payload["businessCategorySub"]) {
      payload["subBusinessCategoryId"] = payload["businessCategorySub"];
    }
    if (
      typeof payload["subBusinessCategoryId"] === "string" &&
      !(payload["subBusinessCategoryId"] as string).trim()
    ) {
      delete payload["subBusinessCategoryId"];
    }
    if ("confirmPassword" in payload) delete payload["confirmPassword"];
    if ("rememberMe" in payload) delete payload["rememberMe"];
    if ("termsAccepted" in payload) delete payload["termsAccepted"];
    if ("agreeToTerms" in payload) delete payload["agreeToTerms"];
    if ("contact" in payload) {
      if (typeof payload["contact"] === "string" && payload["contact"].includes("@")) {
        payload["email"] = payload["contact"];
      } else if (typeof payload["contact"] === "string") {
        payload["phone"] = payload["contact"];
      }
      delete payload["contact"];
    }

    const { data } = await axiosInstance.post("/sso/auth/user/register", payload);

    return data;
  } catch (error: unknown) {
    console.error("registerUser Error:", error);
    const message = parseApiError(error, AUTH_MESSAGES.loginFailed);
    logger.warn("Registration failed", { reason: message });
    return { success: false, message };
  }
};

export const sendRegistrationOtp = async (payload: { email?: string; phone?: string; type?: string }) => {
  try {
    const { data } = await axiosInstance.post("/sso/auth/send-otp", payload);
    return data;
  } catch (error: unknown) {
    return { success: false, message: parseApiError(error, "Failed to send OTP") };
  }
};

export const verifyRegistrationOtp = async (payload: { email?: string; phone?: string; otp: string; type?: string }) => {
  try {
    const { data } = await axiosInstance.post("/sso/auth/verify-otp/generic", payload);
    return data;
  } catch (error: unknown) {
    return { success: false, message: parseApiError(error, "Failed to verify OTP") };
  }
};

export const verifyOtpAndLogin = async (payload: { email?: string; phone?: string; otp: string; accountType: string; password?: string; rememberMe?: boolean }) => {
  try {
    // 1. Verify OTP
    const verifyPayload = {
      email: payload.email,
      phone: payload.phone,
      otp: payload.otp,
    };
    const { data: verifyData } = await axiosInstance.post("/sso/auth/user/verify-otp", verifyPayload);

    if (!verifyData?.success) {
      return { success: false, message: verifyData?.message || "OTP verification failed" };
    }

    // 2. Login to get token
    if (payload.password) {
      const loginPayload = {
        email: payload.email,
        phone: payload.phone,
        password: payload.password,
        accountType: payload.accountType,
      };
      const { data: loginData } = await axiosInstance.post("/sso/auth/user/login", loginPayload, {
        timeout: AUTH_REQUEST_TIMEOUT,
      });

      if (loginData?.success) {
        await persistSessionTokens(loginData?.data, Boolean(payload.rememberMe));
        return loginData;
      }
    }

    return verifyData;
  } catch (error: unknown) {
    const message = parseApiError(error, "Verification failed");
    logger.warn("OTP verification failed", { reason: message });
    return { success: false, message };
  }
};

export const changeRegisteredPassword = async (input: {
  email: string;
  currentPassword: string;
  newPassword: string;
}) => {
  if (input.newPassword !== input.newPassword.trim()) {
    return { success: false, message: "Password cannot contain leading or trailing spaces" };
  }
  if (input.newPassword.length < 8) {
    return { success: false, message: "New password must be at least 8 characters" };
  }

  try {
    const { data } = await axiosInstance.patch("/sso/auth/change-password", {
      email: input.email,
      oldPassword: input.currentPassword,
      newPassword: input.newPassword,
    });
    return { success: true, message: data.message || "Password updated successfully" };
  } catch (error: any) {
    const msg = error?.response?.data?.message || parseApiError(error, "Current password is incorrect");
    return { success: false, message: msg };
  }
};

export const verifyAccountPassword = async (email: string, password: string, accountType?: string) => {
  try {
    const cleanEmail = (email || "").trim().toLowerCase();
    const payload: any = {
      email: cleanEmail,
      password,
    };
    if (accountType) {
      payload.accountType = accountType;
    }
    const { data } = await axiosInstance.post("/sso/auth/verify-password", payload);
    if (!data?.success) {
      return { success: false, message: data?.message || "Invalid email or password" };
    }
    return {
      success: true,
      message: "Password verified",
      twoFactorEnabled: data?.data?.twoFactorEnabled ?? false,
      twoFactorMethod: data?.data?.twoFactorMethod ?? "",
    };
  } catch (error: any) {
    const msg = parseApiError(error, "Invalid email or password");
    return { success: false, message: msg };
  }
};

export const loginUser = async (userData: FieldValues) => {
  const identifier = String(userData.email ?? userData.contact ?? "");
  const password = String(userData.password ?? "");
  const rememberMe = Boolean(userData.rememberMe);

  const validation = serverLoginSchema.safeParse({ identifier, password });
  if (!validation.success) {
    return { success: false, message: AUTH_MESSAGES.invalidCredentials };
  }



  try {
    const loginPayload: Record<string, any> = {
      ...userData,
      email: normalizeContact(identifier).includes("@") ? normalizeContact(identifier) : identifier,
    };
    delete loginPayload.rememberMe;
    delete loginPayload.contact;
    delete loginPayload.identifier;
    const { data } = await axiosInstance.post("/sso/auth/user/login", loginPayload, {
      timeout: AUTH_REQUEST_TIMEOUT,
    });

    if (data?.success) {
      await persistSessionTokens(data?.data, rememberMe);
      return data;
    }

    return {
      success: false,
      message: typeof data?.message === "string" && data.message.trim()
        ? data.message
        : AUTH_MESSAGES.invalidCredentials
    };
  } catch (error: unknown) {
    console.error("loginUser Error:", error);
    const axiosError = error as any;
    if (axiosError?.response?.data?.error === "mfa_required" || axiosError?.response?.data?.requiresOtp) {
      return { success: false, message: "mfa_required", requiresOtp: true };
    }
    if (axiosError?.response?.data?.error === "NEW_DEVICE_OTP_REQUIRED") {
      return {
        success: false,
        message: "NEW_DEVICE_OTP_REQUIRED",
        requiresOtp: true,
        isNewDevice: true,
        capturedIp: axiosError?.response?.data?.data?.capturedIp
      };
    }
    if (axiosError?.response?.status === 403) {
      const errCode = axiosError.response.data?.error;
      if (["pending", "suspended", "dormant", "blocked", "closed"].includes(errCode)) {
        return { success: false, message: JSON.stringify({ type: "STATUS_ERROR", status: errCode }) };
      }
    }
    const message = getLoginErrorMessage(error);
    logger.warn("Login failed", { reason: message });
    return { success: false, message };
  }
};

export const logout = async () => {
  const cookieStore = await cookies();
  try {
    await axiosInstance.post("/auth/logout");
  } catch {
    // ignore logout API errors
  }
  cookieStore.delete("accessToken");
  cookieStore.delete("refreshToken");
  cookieStore.delete("user");
};

export const getCurrentUser = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    let payload = parts[1];
    payload = payload.replace(/-/g, "+").replace(/_/g, "/");
    while (payload.length % 4 !== 0) payload += "=";
    const json = Buffer.from(payload, "base64").toString("utf8");
    const parsed = JSON.parse(json) as Record<string, unknown>;

    // Merge fields from the lightweight "user" cookie (name, email, etc.)
    const userCookie = cookieStore.get("user")?.value;
    let merged: any = {
      ...parsed,
      id: (parsed.id as string) ?? (parsed.sub as string) ?? (parsed.userId as string),
      userId: (parsed.userId as string) ?? (parsed.sub as string),
      role: (parsed.role as string) ?? (parsed.accountType as string),
    };
    if (userCookie) {
      try {
        const userObj = JSON.parse(userCookie);
        merged = { ...merged, ...userObj };
      } catch { }
    }

    // Fetch fresh DB data (profilePhoto, idDocument, kycStatus, nationality, etc.)
    // The cookie strips heavy fields so we MUST call /me to get them on every page load.
    try {
      const { data } = await axiosInstance.get("/sso/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 60000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      if (data?.success && data?.data) {
        const {
          profilePhoto,
          idDocument,
          kycStatus,
          nationality,
          dateOfBirth,
          governmentId,
          governmentIdType,
          permanentAddress,
          kycApplicationData,
          status,
          fullName,
          email,
          phone,
          currency,
          accountType,
          twoFactorEnabled,
          twoFactorMethod,
          createdAt,
          publicId,
          internalId,
        } = data.data;
        // Merge only DB-sourced fields; don't overwrite JWT claims
        if (profilePhoto !== undefined) merged.profilePhoto = profilePhoto;
        if (idDocument !== undefined) merged.idDocument = idDocument;
        if (kycStatus !== undefined) merged.kycStatus = kycStatus;
        if (nationality !== undefined) merged.nationality = nationality;
        if (dateOfBirth !== undefined) merged.dateOfBirth = dateOfBirth;
        if (governmentId !== undefined) merged.governmentId = governmentId;
        if (governmentIdType !== undefined) merged.governmentIdType = governmentIdType;
        if (permanentAddress !== undefined) merged.permanentAddress = permanentAddress;
        if (kycApplicationData !== undefined) merged.kycApplicationData = kycApplicationData;
        if (status !== undefined) merged.status = status;
        if (fullName !== undefined && !merged.fullName) merged.fullName = fullName;
        if (email !== undefined && !merged.email) merged.email = email;
        if (phone !== undefined) merged.phone = phone;
        if (currency !== undefined) merged.currency = currency;
        if (accountType !== undefined) merged.accountType = accountType;
        if (twoFactorEnabled !== undefined) merged.twoFactorEnabled = twoFactorEnabled;
        if (twoFactorMethod !== undefined) merged.twoFactorMethod = twoFactorMethod;
        if (createdAt !== undefined) merged.createdAt = createdAt;
        if (publicId !== undefined) {
          merged.userId = publicId;
          merged.publicId = publicId;
        }
        if (internalId !== undefined) merged.internalId = internalId;
      }
    } catch (error: any) {
      if (error?.response?.status === 401 || error?.status === 401) {
        cookieStore.delete("accessToken");
        cookieStore.delete("refreshToken");
        cookieStore.delete("user");
        return null;
      }
      // /me call failed (network/timeout) — fall back to cookie data only
    }

    return merged;
  } catch {
    try {
      cookieStore.delete("accessToken");
    } catch { }
    return null;
  }
};

export const getNewAccessToken = async () => {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refreshToken")?.value;
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }
    const res = await axiosInstance({
      url: "/auth/refresh-token",
      method: "POST",
      withCredentials: true,
      headers: {
        cookie: `refreshToken=${refreshToken}`,
      },
    });
    // Support refresh-token rotation: persist the new pair when returned.
    if (res.data?.data?.refreshToken) {
      cookieStore.set("refreshToken", res.data.data.refreshToken, getRefreshCookieOptions());
    }
    return res.data;
  } catch (error: unknown) {
    log.warn("Token refresh failed", error);
    throw new Error("Failed to get new access token");
  }
};

export const requestPasswordReset = async (payload: { email: string }) => {
  try {
    const { data } = await axiosInstance.post("/auth/forgot-password", payload, {
      timeout: AUTH_REQUEST_TIMEOUT,
    });
    return data;
  } catch (error: unknown) {
    console.error("requestPasswordReset Error:", error);
    if (isNetworkOrTimeoutError(error)) {
      return {
        success: true,
        message: "If an account exists, a reset code has been sent.",
      };
    }
    const message = parseApiError(error, AUTH_MESSAGES.resetFailed);
    return { success: false, message };
  }
};

export const confirmPasswordReset = async (password: string, token: string) => {
  try {
    const { data } = await axiosInstance.post(
      "/auth/reset-password",
      { password },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: AUTH_REQUEST_TIMEOUT,
      }
    );
    return data;
  } catch (error: unknown) {
    if (isNetworkOrTimeoutError(error)) {
      throw new Error(AUTH_MESSAGES.passwordResetFailed);
    }
    throw new Error(parseApiError(error, AUTH_MESSAGES.passwordResetFailed));
  }
};

export const verifyRecoveryKey = async (recoveryKey: string) => {
  try {
    const { data } = await axiosInstance.post("/sso/auth/verify-recovery-key", { recoveryKey });
    return data;
  } catch (error: unknown) {
    return { success: false, message: parseApiError(error, "Failed to verify recovery key") };
  }
};

export const resetUserPassword = async (payload: { email?: string; phone?: string; otp?: string; recoveryKey?: string; newPassword: string; accountType?: string }) => {
  try {
    const { data } = await axiosInstance.post("/sso/auth/user/reset-password", payload);
    return data;
  } catch (error: unknown) {
    return { success: false, message: parseApiError(error, "Failed to reset password") };
  }
};

export const completeUserProfile = async (payload: Record<string, any>) => {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  try {
    const safePayload: Record<string, any> = {};

    for (const [k, v] of Object.entries(payload)) {
      // Skip client-side-only helper fields not part of backend user entity
      if (k === "avatarUrl" || k === "documentUrl" || k === "resubmitted" ||
        k === "accountLabel" || k === "secondaryEmail" || k === "countryCode") continue;
      if (v !== undefined && v !== null) {
        safePayload[k] = v;
      }
    }

    const { data } = await axiosInstance.post("/sso/auth/user/complete-profile", safePayload, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: 120000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    // Update the user cookie with light payload fields so refreshUser sees them immediately.
    // CRITICAL: Strip profilePhoto and idDocument from cookieStore to prevent HTTP header size overflow.
    if (data?.success) {
      const userCookie = cookieStore.get("user")?.value;
      if (userCookie) {
        try {
          const userObj = JSON.parse(userCookie);
          const cleanPayload: Record<string, any> = {};
          for (const [k, v] of Object.entries(safePayload)) {
            // Do not store base64 strings or heavy values in HTTP cookies
            if (typeof v === "string" && v.length > 500) continue;
            cleanPayload[k] = v;
          }
          const updatedUser = { ...userObj, ...cleanPayload };
          delete updatedUser.profilePhoto;
          delete updatedUser.idDocument;
          delete updatedUser.avatarUrl;
          delete updatedUser.documentUrl;
          cookieStore.set("user", JSON.stringify(updatedUser), getCookieOptions(false));
        } catch { }
      }
    }

    return data;
  } catch (error: unknown) {
    return { success: false, message: parseApiError(error, "Failed to update profile") };
  }
};

export const applyForKyc = async (userId: string) => {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  try {
    const { data } = await axiosInstance.post(`/sso/auth/users/${userId}/kyc/apply`, {}, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return data;
  } catch (error: unknown) {
    return { success: false, message: parseApiError(error, "Failed to submit application") };
  }
};

export const deleteUserAccount = async (userId?: string) => {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  try {
    const endpoint = userId && userId !== "self" ? `/sso/auth/admin/users/${userId}` : `/sso/auth/user/account`;
    const { data } = await axiosInstance.delete(endpoint, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return data;
  } catch (error: unknown) {
    try {
      const { data } = await axiosInstance.delete("/sso/auth/user/account", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return data;
    } catch {
      return { success: false, message: parseApiError(error, "Failed to delete user account") };
    }
  }
};

export const logActivityToServer = async (payload: any) => {
  let token = "";
  try {
    const cookieStore = await cookies();
    token = cookieStore.get("accessToken")?.value || "";
  } catch {}

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Use USER_PROFILE_BACKEND_URL (set in Docker env) for direct service-to-service calls.
  // Falls back to apiBaseURL for local dev where user-profile runs via host.
  const userProfileBase = process.env.USER_PROFILE_BACKEND_URL;
  const endpoint = token ? "activity" : "activity/internal";

  try {
    if (userProfileBase) {
      // Direct call to user-profile service (Docker/production)
      const url = `${userProfileBase}/${endpoint}`;
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      return res.ok ? await res.json().catch(() => null) : null;
    } else {
      // Local dev: use apiBaseURL (platform gateway)
      const { data } = await axiosInstance.post(`/user-profile-service/${endpoint}`, payload, {
        headers,
        timeout: 15000,
      });
      return data;
    }
  } catch (error: any) {
    console.error("logActivityToServer failed:", error?.response?.data || error.message);
    return null;
  }
};

export const getLogsFromServer = async (limit = 100) => {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  if (!token) return [];
  try {
    const userProfileBase = process.env.USER_PROFILE_BACKEND_URL;
    if (userProfileBase) {
      // Direct call in Docker/production
      const res = await fetch(`${userProfileBase}/activity?limit=${limit}&page=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = res.ok ? await res.json().catch(() => ({})) : {};
      return json?.activities || json?.data?.activities || [];
    } else {
      const { data } = await axiosInstance.get("/user-profile-service/activity", {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit, page: 1 },
        timeout: 15000,
      });
      return data?.activities || data?.data?.activities || [];
    }
  } catch (error: any) {
    console.error("getLogsFromServer failed:", error?.response?.data || error.message);
    return [];
  }
};

export const deleteActivityFromServer = async (logId: string) => {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  if (!token) throw new Error("Not authenticated");
  const { data } = await axiosInstance.delete(`/user-profile-service/activity/${logId}`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 15000,
  });
  return data;
};

export const deleteAllActivitiesFromServer = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  if (!token) throw new Error("Not authenticated");
  const { data } = await axiosInstance.delete("/user-profile-service/activity", {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 15000,
  });
  return data;
};
