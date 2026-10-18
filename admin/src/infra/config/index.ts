const envConfig = {
  backendURL:
    process.env.NEXT_PUBLIC_API_URL ||
    "/admin/api",
  adminBaseUrl:
    process.env.NEXT_PUBLIC_ADMIN_BASE_URL ||
    process.env.ADMIN_BASE_URL ||
    "http://localhost:3002/admin-service",
  platformBaseUrl:
    process.env.NEXT_PUBLIC_PLATFORM_BASE_URL ||
    process.env.PLATFORM_BASE_URL ||
    "http://localhost:3006/platform-service",
  storageUrl:
    process.env.NEXT_PUBLIC_STORAGE_URL ||
    process.env.STORAGE_URL ||
    "http://localhost:3007/api/files",
};

export default envConfig;
