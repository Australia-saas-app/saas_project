import { loginUser, registerUser, requestPasswordReset, confirmPasswordReset, logout as apiLogout, sendRegistrationOtp, verifyRegistrationOtp } from "@/src/server/AuthService"
import { parseApiError, getLoginErrorMessage } from "@/src/lib/api-error"
import activityLog from "@/src/lib/activity-log"
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
            activityLog.record("USER_REGISTRATION", { role: data?.data?.user?.role });
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

const getDashboardRedirect = (role?: string, userId?: string) => {
    const normalized = role?.toUpperCase();
    if (normalized === "ADMIN" || normalized === "SUPER_ADMIN") return adminAppPath("/admin/dashboard");

    // All other users go to the homepage upon login to see the header profile pill
    return ROUTES.home;
};

export const useUserLogin = (redirectUrl?: string | null) => {
    const router = useRouter();
    const { refreshUser } = useUser();

    return useMutation<AuthResponse, Error, FieldValues>({
        mutationKey: ["USER_LOGIN", redirectUrl ?? ""],
        mutationFn: async (userData) => {
            const result = await loginUser(userData);
            if (!result || !result.success) {
                throw new Error(result?.message || "Login failed");
            }
            return result as AuthResponse;
        },
        onSuccess: async (data) => {
            toast.success('Login Successfully');
            activityLog.record("USER_LOGIN", { role: data?.data?.user?.role });
            await refreshUser();
            const role = data?.data?.user?.role ?? (decodeJwt(data?.data?.token)?.role);
            const userId = data?.data?.user?.id ?? decodeJwt(data?.data?.token)?.id
            const redirectTo = resolvePostLoginRedirect(redirectUrl, getDashboardRedirect(role, userId));
            router.refresh();
            if (typeof window !== "undefined") {
                window.location.assign(redirectTo);
                return;
            }
            router.push(redirectTo);
        },
        onError: (error) => {
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
    return useMutation<{ success: boolean; message?: string } | void, Error>({
        mutationKey: ["USER_LOGOUT"],
        mutationFn: async () => await apiLogout(),
        onSuccess: () => {
            toast.success('Logged out');
            activityLog.record("USER_LOGOUT");
            // Admin app has no public site shell — send admins to admin login.
            const isAdminApp =
                typeof window !== "undefined" &&
                (window.location.port === "3001" ||
                    window.location.hostname.startsWith("admin.") ||
                    window.location.pathname.startsWith("/admin") ||
                    window.location.pathname.startsWith("/account/admin"));
            const loginPath = isAdminApp ? "/account/admin/login" : ROUTES.auth.login;
            router.push(loginPath);
            router.refresh();
        },
        onError: (error) => {
            toast.error(parseApiError(error, 'Logout failed'));
        }
    })
}

export const useSendRegistrationOtp = () => {
    return useMutation<{ success: boolean; message?: string }, Error, { email?: string; phone?: string; type?: string }>({
        mutationKey: ["SEND_REGISTRATION_OTP"],
        mutationFn: async (payload) => await sendRegistrationOtp(payload),
        onSuccess: () => {
            // Toast will be handled by the component or we can add it here.
            // Based on user prompt: "toast shows OTP send to email"
            toast.success("OTP sent successfully");
        },
        onError: (error) => {
            toast.error(parseApiError(error, "Failed to send OTP"));
        }
    });
};

export const useVerifyRegistrationOtp = () => {
    return useMutation<{ success: boolean; message?: string }, Error, { email?: string; phone?: string; otp: string; type?: string }>({
        mutationKey: ["VERIFY_REGISTRATION_OTP"],
        mutationFn: async (payload) => await verifyRegistrationOtp(payload),
        onSuccess: () => {
            // Success logic handled by component (showing tick mark)
        },
        onError: (error) => {
            toast.error(parseApiError(error, "Failed to verify OTP"));
        }
    });
};