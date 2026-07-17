'use server';

import axiosInstance from "../lib/axiosInstance";

export const registerUser = async (userData: any) => {
    const res = await axiosInstance.post('/auth/register', userData);
    return res.data;
}

export const loginUser = async (userData: any) => {
    const res = await axiosInstance.post('/sso/auth/admin/login', userData);
    return res.data;
}

export const requestPasswordReset = async (payload: { email: string }) => {
    const res = await axiosInstance.post('/sso/auth/admin/forgot-password', payload);
    return res.data;
}

export const confirmPasswordReset = async (payload: { email: string, otp: string, newPassword: string }) => {
    const res = await axiosInstance.post('/sso/auth/admin/reset-password', payload);
    return res.data;
}

export const logout = async () => {
    const res = await axiosInstance.post('/auth/logout');
    return res.data;
}

export const getCurrentUser = async () => {
    try {
        const res = await axiosInstance.get('/auth/me');
        return res.data?.data || null;
    } catch {
        return null;
    }
}

export const getNewAccessToken = async () => {
    const res = await axiosInstance.post('/auth/refresh-token');
    return res.data;
}
