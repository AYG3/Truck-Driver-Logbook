import axios from "axios";
import type { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import { toast } from "sonner";

/**
 * Centralized API client configuration
 * All API calls go through this client
 */

// Create the axios instance with base configuration
export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for auth tokens
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    // Handle specific error codes
    if (error.response) {
      switch (error.response.status) {
        case 401:
          toast.error("Unauthorized. Please log in again.");
          break;
        case 403:
          toast.error("You don't have permission to perform this action.");
          break;
        case 404:
          toast.error("Resource not found.");
          break;
        case 500:
          toast.error("Server error. Please try again later.");
          break;
        default:
          // Don't toast for validation errors (400) - let forms handle those
          if (error.response.status !== 400) {
            toast.error("An error occurred. Please try again.");
          }
      }
    } else if (error.request) {
      // Network error - no response received
      toast.error("Network error. Please check your connection.");
    }
    return Promise.reject(error);
  }
);

// Generic API error type
export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, string[]>;
}

// Helper to extract error message from API response
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }
    if (axiosError.message) {
      return axiosError.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}
