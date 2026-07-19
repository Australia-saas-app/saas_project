import { AxiosError } from "axios";

export const getApiErrorMessage = (error: unknown, defaultMessage?: string): string => {
  if (error instanceof AxiosError) {
    return error.response?.data?.message || error.message || defaultMessage || "An API error occurred";
  }
  if (error instanceof Error) {
    return error.message || defaultMessage || "An error occurred";
  }
  return defaultMessage || "An unknown error occurred";
};
