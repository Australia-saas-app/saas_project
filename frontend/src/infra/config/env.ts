export const env = {
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  APP_ENV: process.env.NEXT_PUBLIC_APP_ENV || "development",
  isProduction: process.env.NEXT_PUBLIC_APP_ENV === "production",
  isDevelopment: process.env.NEXT_PUBLIC_APP_ENV === "development",
};
