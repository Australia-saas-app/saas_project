import axiosInstanceClient from "@/src/infra/lib/axiosInstance/client";

export const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    try {
        const res = await axiosInstanceClient.post("/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" }
        });
        return res.data?.url || "";
    } catch {
        return "";
    }
}

export const uploadFiles = async (files: File[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach(file => formData.append("files", file));
    try {
        const res = await axiosInstanceClient.post("/upload/multiple", formData, {
            headers: { "Content-Type": "multipart/form-data" }
        });
        return res.data?.urls || [];
    } catch {
        return [];
    }
}
