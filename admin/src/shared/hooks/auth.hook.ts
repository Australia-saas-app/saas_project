import { loginUser, registerUser, requestPasswordReset, confirmPasswordReset, logout as apiLogout } from "@/src/infra/api/AuthService"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { FieldValues } from "react-hook-form"
import { toast } from "sonner"

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
        mutationFn: async (userData) => await registerUser(userData),
        onSuccess: (data) => {
            toast.success('User registration successful');
            try {
                // Persist token only in a client cookie (do not store user payload client-side)
                if (data?.data?.token && typeof window !== 'undefined') {
                    document.cookie = `accessToken=${encodeURIComponent(data.data.token)}; path=/; max-age=${604800}; Secure; SameSite=Lax`;
                }
            } catch {
                // ignore
            }
            // Redirect based on user role
            const role = data?.data?.user?.role ?? (decodeJwt(data?.data?.token)?.role);
            if (role === 'BUYER') {
                router.push('/buyer');
            } else if (role === 'SELLER') {
                router.push('/seller');
            } else {
                router.push('/auth/sign-in');
            }
        },
        onError: (error) => {
            toast.error(error?.message || 'Registration failed');
        }
    })
}

export const useUserLogin = () => {
    const router = useRouter();
    
    return useMutation<AuthResponse, Error, FieldValues>({
        mutationKey: ["USER_LOGIN"],
        mutationFn: async (userData) => await loginUser(userData),
        onSuccess: (data) => {
            toast.success('User login successful');
            try {
                // Persist token only in a client cookie (do not store user payload client-side)
                if (data?.data?.token && typeof window !== 'undefined') {
                    document.cookie = `accessToken=${encodeURIComponent(data.data.token)}; path=/; max-age=${604800}; Secure; SameSite=Lax`;
                }
            } catch {
                // ignore
            }
            // Redirect based on user role
            const role = data?.data?.user?.role ?? (decodeJwt(data?.data?.token)?.role);
            if (role === 'BUYER') {
                router.push('/buyer');
            } else if (role === 'SELLER') {
                router.push('/seller');
            } else if (role === 'USER') {
                router.push('/profile');
            } else {
                router.push('/');
            }
        },
        onError: (error) => {
            toast.error(error?.message || 'Login failed');
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
            toast.error(error?.message || 'Failed to send reset email');
        }
    })
}

export const useResetPassword = () => {
    return useMutation<{ success: boolean; message?: string }, Error, { email: string, otp: string, newPassword: string }>({
        mutationKey: ["RESET_PASSWORD"],
        mutationFn: async (payload) => {
            return await confirmPasswordReset(payload);
        },
        onSuccess: (data) => {
            toast.success(data?.message || 'Password reset successfully');
        },
        onError: (error) => {
            toast.error(error?.message || 'Failed to reset password');
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
            try {
                if (typeof window !== 'undefined') {
                    // remove client cookie
                    document.cookie = 'accessToken=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
                }
            } catch {
                // ignore
            }
            router.push('/auth/sign-in');
        },
        onError: (error) => {
            toast.error(error?.message || 'Logout failed');
        }
    })
}