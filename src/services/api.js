import axios from "axios";

// Default to local ASP.NET Core backend or configured environment URL
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json"
  }
});

// Request interceptor for JWT token injection
api.interceptors.request.use(
  (config) => {
    const savedUser = localStorage.getItem("pharmacy_currentUser");
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        if (user.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      } catch (e) {
        console.error("Failed to parse user token", e);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Unauthorized API access. Redirecting to login...");
    }
    return Promise.reject(error);
  }
);

export default api;
