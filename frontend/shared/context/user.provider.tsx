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

/** Log the user out after 30 minutes of no mouse/keyboard/touch activity. */
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

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
        if (mounted) setUser(userData);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setStorageUserScope(getUserIdFromAuthUser(user));
  }, [user]);

  // Auto logout / silent refresh: schedule a timer slightly before the JWT
  // expires. Try a refresh first; if that fails, end the session cleanly
  // instead of leaving the UI in a logged-in state with a dead token.
  useEffect(() => {
    const exp = user && "exp" in user ? user.exp : undefined;
    if (!exp) return;

    const msUntilExpiry = exp * 1000 - Date.now();
    // Refresh 60s early; if already (almost) expired, act immediately.
    const delay = Math.max(msUntilExpiry - 60_000, 0);

    const timer = setTimeout(async () => {
      try {
        await getNewAccessToken();
        const userData = await getCurrentUser();
        setUser(userData);
      } catch {
        await logout().catch(() => undefined);
        setUser(null);
        if (typeof window !== "undefined") {
          try {
            localStorage.clear();
            sessionStorage.clear();
          } catch {
            localStorage.removeItem("user_profile_overrides_v2");
            localStorage.removeItem("user_profile_documents_v2");
          }
        }
        toast.warning("Your session has expired. Please sign in again.");
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [user]);

  // Activity-based idle logout (separate from JWT expiry).
  const handleIdle = useCallback(async () => {
    await logout().catch(() => undefined);
    setUser(null);
    if (typeof window !== "undefined") {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        localStorage.removeItem("user_profile_overrides_v2");
        localStorage.removeItem("user_profile_documents_v2");
      }
    }
    toast.warning("You were signed out due to inactivity.");
  }, []);

  useIdleTimeout({
    timeoutMs: IDLE_TIMEOUT_MS,
    onIdle: handleIdle,
    enabled: Boolean(user),
  });

  const refreshUser = async () => {
    const userData = await getCurrentUser();
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
