import axios from "axios";

export const apiBaseUrl = process.env.REACT_APP_BACKEND_URL || "";

const api = axios.create({
  baseURL: `${apiBaseUrl}/api`,
  
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("halwaji_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const formatApiError = (e, fallback = "حدث خطأ، حاول مرة أخرى") => {
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((x) => x?.msg || "").filter(Boolean).join(" ");
  return fallback;
};

export const formatPrice = (n) => `${Number(n).toFixed(3)} د.ب`;

export default api;
