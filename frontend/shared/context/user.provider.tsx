"use client";

import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";
import { IUser, IDecodedToken } from "../types/auth.types";
import { getCurrentUser, getNewAccessToken, logout } from "../server/AuthService";
import { getUserIdFromAuthUser } from "@/src/shared/lib/demo-user";
import { setStorageUserScope } from "@/src/shared/lib/storage-scope";
import { useIdleTimeout } from "@/src/shared/hooks/useIdleTimeout";

import { setCookie } from "@/src/utils/cookie-utils";

/** Log the user out after 15 minutes of no mouse/keyboard/touch activity. */
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

interface IUserProvider {
  user: IUser | IDecodedToken | null;
  setUser: (user: IUser | IDecodedToken | null) => void;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<IUserProvider | undefined>(undefined);

const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<IUser | IDecodedToken | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const userData = await getCurrentUser();
        if (mounted) {
          if (userData && typeof window !== "undefined") {
            const tok = (userData as any).accessToken || (userData as any).token;
            if (tok) {
              localStorage.setItem("accessToken", tok);
              setCookie("accessToken", tok);
              setCookie("client_access_token", tok);
            }
          }
          setUser(userData);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc = new BroadcastChannel("vero_channel");
        bc.onmessage = (ev) => {
          if (ev.data?.type === "USER_LOGGED_OUT") {
            setUser(null);
          }
        };
      }
    } catch {}

    return () => {
      mounted = false;
      if (bc) bc.close();
    };
  }, []);

  useEffect(() => {
    setStorageUserScope(getUserIdFromAuthUser(user));
    if (typeof window !== "undefined") {
      try {
        const flag = sessionStorage.getItem("show_login_success_toast");
        if (flag) {
          sessionStorage.removeItem("show_login_success_toast");
          toast.success("Login Successfully");
        }
      } catch {}
    }
  }, [user]);

  // Auto logout / silent refresh: schedule a timer slightly before the JWT
  // expires. Try a refresh first; if that fails, end the session cleanly
  // instead of leaving the UI in a logged-in state with a dead token.
  useEffect(() => {
    const exp = user && "exp" in user ? user.exp : undefined;
    if (!exp) return;

    const msUntilExpiry = exp * 1000 - Date.now();
    // Only schedule refresh if token has more than 60 seconds remaining
    if (msUntilExpiry <= 60_000) return;

    const delay = msUntilExpiry - 60_000;

    const timer = setTimeout(async () => {
      try {
        await getNewAccessToken();
        const userData = await getCurrentUser();
        if (userData) setUser(userData);
      } catch {
        // Silent catch: do not force signout on minor refresh errors
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [user]);

  // Activity-based idle logout (separate from JWT expiry).
  const handleIdle = useCallback(async () => {
    try {
      const { recordRealActivity } = await import("@/src/shared/lib/real-activity-logger");
      await recordRealActivity(
        "AUTO_LOGOUT",
        "Session expired due to inactivity",
        { userId: (user as any)?.userId || (user as any)?.id || "user", email: (user as any)?.email, name: (user as any)?.fullName }
      ).catch(() => undefined);
    } catch {}

    await logout().catch(() => undefined);
    setUser(null);
    if (typeof window !== "undefined") {
      try {
        const deviceId = localStorage.getItem("vero_device_id");
        localStorage.clear();
        sessionStorage.clear();
        if (deviceId) localStorage.setItem("vero_device_id", deviceId);
      } catch {
        localStorage.removeItem("user_profile_overrides_v2");
        localStorage.removeItem("user_profile_documents_v2");
      }
      const isAdminApp =
          window.location.port === "3001" ||
          window.location.hostname.startsWith("admin.") ||
          window.location.pathname.startsWith("/admin") ||
          window.location.pathname.startsWith("/account/admin");
      
      const pathname = window.location.pathname;
      const accountType = ((user as any)?.accountType || (user as any)?.role || "").toLowerCase();
      let targetPath = "/account/user/login?reason=inactivity";
      if (isAdminApp) {
        targetPath = "/account/admin/login?reason=inactivity";
      } else if (pathname.includes("/dashboard/business") || pathname.startsWith("/business") || accountType === "business" || accountType === "seller") {
        targetPath = "/account/business/login?reason=inactivity";
      } else if (pathname.includes("/dashboard/affiliate") || pathname.startsWith("/affiliate") || accountType === "affiliate") {
        targetPath = "/account/affiliate/login?reason=inactivity";
      }
      window.location.href = targetPath;
    }
  }, [user]);

  useIdleTimeout({
    timeoutMs: IDLE_TIMEOUT_MS,
    onIdle: handleIdle,
    enabled: Boolean(user),
  });

  const refreshUser = async () => {
    const userData = await getCurrentUser();
    if (userData && typeof window !== "undefined") {
      const tok = (userData as any).accessToken || (userData as any).token;
      if (tok) {
        localStorage.setItem("accessToken", tok);
        setCookie("accessToken", tok);
        setCookie("client_access_token", tok);
      }
    }
    setUser(userData);
  };

  const values = {
    user,
    setUser,
    isLoading,
    setIsLoading,
    refreshUser,
  };

  return <UserContext.Provider value={values}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within the UserProvider context");
  }
  return context;
};

export default UserProvider;
