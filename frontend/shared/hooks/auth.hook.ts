import { loginUser, registerUser, requestPasswordReset, confirmPasswordReset, logout as apiLogout, sendRegistrationOtp, verifyRegistrationOtp } from "@/src/server/AuthService"
import { parseApiError, getLoginErrorMessage } from "@/src/lib/api-error"
import { recordRealActivity } from "@/src/lib/real-activity-logger"
import { resolvePostLoginRedirect } from "@/src/lib/auth-redirect"
import { ROUTES } from "@/src/constants/routes"
import { adminAppPath } from "@/src/constants/app-urls"
import { DEMO_ACCOUNTS, type DemoAccountType } from "@/src/constants/demo-accounts"
import { useUser } from "@/src/context/user.provider"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { FieldValues } from "react-hook-form"
import { toast } from "sonner"
import { accountTypeFromRole } from "@/src/shared/lib/verification-access"
import { completeProfilePath, isProfileComplete } from "@/src/shared/lib/profile-completion"
import { setCookie, deleteCookie } from "@/src/utils/cookie-utils"

type DecodedToken = {
    id?: string;
    email?: string;
    role?: string;
    iat?: number;
    exp?: number;
}

/**
 * Decode a JWT (client-side). Handles base64url padding and returns the payload object or null.
 */
const decodeJwt = (token?: string): DecodedToken | null => {
    if (!token) return null;
    try {
        const parts = token.split('.');
        if (parts.length < 2) return null;
        let payload = parts[1];
        // base64url -> base64
        payload = payload.replace(/-/g, '+').replace(/_/g, '/');
        // pad with '='
        while (payload.length % 4 !== 0) payload += '=';
        // atob may be available in browser; use it when present
        const json = typeof atob === 'function'
            ? atob(payload)
            : Buffer.from(payload, 'base64').toString('utf8');
        return JSON.parse(json) as DecodedToken;
    } catch {
        return null;
    }
}
interface AuthResponse {
    success: boolean;
    message: string;
    data?: {
        // Backend uses `token` for the access JWT
        token?: string;
        refreshToken?: string;
        user?: {
            id: string;
            role?: string;
            email?: string;
        };
    };
}

export const useUserRegistration = () => {
    const router = useRouter();

    return useMutation<AuthResponse, Error, FieldValues>({
        mutationKey: ["USER_REGISTRATION"],
        mutationFn: async (userData) => {
            const result = await registerUser(userData);
            if (!result || !result.success) {
                throw new Error(result?.message || "Registration failed");
            }
            return result as AuthResponse;
        },
        onSuccess: (data) => {
            toast.success('User Account create successfully');
            recordRealActivity("USER_REGISTRATION", `Registered with role: ${data?.data?.user?.role || 'User'}`, { userId: data?.data?.user?.id || "user", email: data?.data?.user?.email, name: (data?.data?.user as any)?.fullName || (data?.data?.user as any)?.firstName });
            // Token is already set server-side via httpOnly cookie – no client-side cookie needed
            const role = data?.data?.user?.role ?? (decodeJwt(data?.data?.token)?.role);
            const userId = data?.data?.user?.id ?? decodeJwt(data?.data?.token)?.id
            const redirectTo = getDashboardRedirect(role, userId);
            router.push(redirectTo);
        },
        onError: (error) => {
            toast.error(parseApiError(error, 'Registration failed'));
        }
    })
}

export const getDashboardRedirect = (role?: string, userId?: string) => {
    const normalized = (role || "").toLowerCase();
    if (normalized === "admin" || normalized === "super_admin") return adminAppPath("/admin/dashboard");
    if (normalized === "affiliate") return "/dashboard/affiliate/dashboard";
    if (normalized === "business" || normalized === "seller") return "/dashboard/business/dashboard";
    return "/dashboard/user/dashboard";
};

export const useUserLogin = (redirectUrl?: string | null) => {
    const router = useRouter();
    const { refreshUser } = useUser();

    return useMutation<AuthResponse, Error, FieldValues>({
        mutationKey: ["USER_LOGIN", redirectUrl ?? ""],
        mutationFn: async (userData) => {
            const result = await loginUser(userData);
            if (!result || !result.success) {
                if ((result as any)?.isNewDevice) {
                    throw new Error(JSON.stringify({ type: "NEW_DEVICE", capturedIp: (result as any).capturedIp }));
                }
                throw new Error(result?.message || "Login failed");
            }
            return result as AuthResponse;
        },
        onSuccess: async (data) => {
            const dataAny = (data?.data || data) as any;
            const userObj = dataAny?.user;
            const tokenStr = dataAny?.access_token || dataAny?.accessToken || dataAny?.token;
            const decoded = tokenStr ? decodeJwt(tokenStr) : null;
            const role = userObj?.role || userObj?.accountType || decoded?.role || "user";
            const userId = userObj?.id || userObj?.userId || decoded?.id;
            const redirectTo = resolvePostLoginRedirect(redirectUrl, getDashboardRedirect(role, userId));

            if (typeof window !== "undefined") {
                if (tokenStr) {
                    localStorage.setItem("accessToken", tokenStr);
                    localStorage.setItem("token", tokenStr);
                    setCookie("accessToken", tokenStr);
                    setCookie("client_access_token", tokenStr);
                }
                sessionStorage.setItem("show_login_success_toast", "true");
            }
            const email = userObj?.email || decoded?.email;
            const name = userObj?.fullName || userObj?.firstName || userObj?.name;

            if (typeof window !== "undefined") {
                const bc = new BroadcastChannel('session-sync');
                bc.postMessage({ type: 'LOGIN', role });
                bc.close();
            }

            await recordRealActivity(
              "USER_LOGIN",
              `Logged in successfully via ${role} portal`,
              { userId: userObj?.userId || userId || "user", email, name }
            ).catch(() => undefined);
            refreshUser().catch(() => undefined);

            // Redirect after logging activity
            if (typeof window !== "undefined") {
                window.location.assign(redirectTo);
            } else {
                router.refresh();
                router.push(redirectTo);
            }
            return;
        },
        onError: (error) => {
            try {
                const parsed = JSON.parse(error.message);
                if (parsed.type === "STATUS_ERROR") {
                    const statusStr = String(parsed.status);
                    const formattedStatus = statusStr.charAt(0).toUpperCase() + statusStr.slice(1);
                    toast.error(`Account is ${formattedStatus}`);
                    return;
                }
                if (parsed.type === "NEW_DEVICE") {
                    // Handled in component
                    return;
                }
            } catch {
                // Ignore parse error, fallback to default error handler
            }
            toast.error(getLoginErrorMessage(error));
        }
    })
}


export const useForgotPassword = () => {
    return useMutation<{ success: boolean; message?: string }, Error, { email: string }>({
        mutationKey: ["FORGOT_PASSWORD"],
        mutationFn: async (payload) => await requestPasswordReset(payload),
        onSuccess: (data) => {
            toast.success(data?.message || 'Reset link sent to your email');
        },
        onError: (error) => {
            toast.error(parseApiError(error, 'Failed to send reset email'));
        }
    })
}

export const useResetPassword = (token?: string) => {
    return useMutation<{ success: boolean; message?: string }, Error, { password: string }>({
        mutationKey: ["RESET_PASSWORD"],
        mutationFn: async ({ password }) => {
            if (!token) throw new Error('Reset token is missing');
            return await confirmPasswordReset(password, token);
        },
        onSuccess: (data) => {
            toast.success(data?.message || 'Password reset successfully');
        },
        onError: (error) => {
            toast.error(parseApiError(error, 'Failed to reset password'));
        }
    })
}

export const useLogout = () => {
    const router = useRouter();
    const { user, setUser } = useUser();
    return useMutation<{ success: boolean; message?: string } | void, Error>({
        mutationKey: ["USER_LOGOUT"],
        mutationFn: async () => {
            if (user) {
              await recordRealActivity(
                "USER_LOGOUT",
                "User logged out successfully",
                { userId: (user as any)?.userId || (user as any)?.id || "user", email: (user as any)?.email, name: (user as any)?.fullName }
              ).catch(() => undefined);
            }
            return await apiLogout();
        },
        onSuccess: () => {
            setUser(null);
            toast.success('Logged out');
            if (typeof window !== "undefined") {
              try {
                localStorage.removeItem("accessToken");
                localStorage.removeItem("token");
                deleteCookie("accessToken");
                deleteCookie("client_access_token");
                sessionStorage.setItem("manual_logout", "true");
              } catch {}

              const pathname = window.location.pathname;
              const isLandingPage = pathname === "/" || pathname === "";
              if (isLandingPage) {
                window.location.href = "/";
                return;
              }

              let targetPath = "/account/user/login";
              
              if (
                window.location.port === "3001" ||
                window.location.hostname.startsWith("admin.") ||
                window.location.pathname.startsWith("/admin") ||
                window.location.pathname.startsWith("/account/admin")
              ) {
                targetPath = "/account/admin/login";
              } else if (window.location.pathname.startsWith("/affiliate")) {
                targetPath = "/account/affiliate/registration";
              } else if (window.location.pathname.startsWith("/business")) {
                targetPath = "/account/business/registration";
              }

              window.location.href = targetPath;
            }
        },
        onError: (error) => {
            setUser(null);
            if (typeof window !== "undefined") {
                try {
                  localStorage.removeItem("accessToken");
                  localStorage.removeItem("token");
                  deleteCookie("accessToken");
                  deleteCookie("client_access_token");
                  sessionStorage.setItem("manual_logout", "true");
                } catch {}
                const pathname = window.location.pathname;
                const isLandingPage = pathname === "/" || pathname === "";
                if (isLandingPage) {
                  window.location.href = "/";
                  return;
                }

                let targetPath = "/account/user/login";
                
                if (
                  window.location.port === "3001" ||
                  window.location.hostname.startsWith("admin.") ||
                  window.location.pathname.startsWith("/admin") ||
                  window.location.pathname.startsWith("/account/admin")
                ) {
                  targetPath = "/account/admin/login";
                } else if (window.location.pathname.startsWith("/affiliate")) {
                  targetPath = "/account/affiliate/registration";
                } else if (window.location.pathname.startsWith("/business")) {
                  targetPath = "/account/business/registration";
                }

                window.location.href = targetPath;
            }
        }
    })
}

export const useSendRegistrationOtp = () => {
    return useMutation<{ success: boolean; message?: string }, Error, { email?: string; phone?: string; type?: string }>({
        mutationKey: ["SEND_REGISTRATION_OTP"],
        mutationFn: async (payload) => {
            const res = await sendRegistrationOtp(payload);
            if (!res?.success) throw new Error(res?.message || "Failed to send OTP");
            return res;
        },
        onSuccess: () => {
            // Toast will be handled by the component or we can add it here.
            // Based on user prompt: "toast shows OTP send to email"
            toast.success("OTP sent successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to send OTP");
        }
    });
};

export const useVerifyRegistrationOtp = () => {
    return useMutation<{ success: boolean; message?: string }, Error, { email?: string; phone?: string; otp: string; type?: string }>({
        mutationKey: ["VERIFY_REGISTRATION_OTP"],
        mutationFn: async (payload) => {
            const res = await verifyRegistrationOtp(payload);
            if (!res?.success) throw new Error(res?.message || "Failed to verify OTP");
            return res;
        },
        onSuccess: () => {
            // Success logic handled by component (showing tick mark)
        },
        onError: (error) => {
            toast.error(error.message || "Failed to verify OTP");
        }
    });
};