
import axios from "axios";

const CustomBaseUrl = axios.create({
  baseURL: "https://wfc-backend-server.onrender.com/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

CustomBaseUrl.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

export default CustomBaseUrl;

