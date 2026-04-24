
import axios from "axios";

// BASE_URL CONFIG — comment/uncomment to switch environments:
// const BASE_URL = "http://localhost:5000/api/v1";        // TEST  (local)
const BASE_URL = "https://wfc-backend-server.onrender.com/api/v1"; // PROD

export const SERVER_URL = BASE_URL.replace("/api/v1", ""); // server root (for image src)

const CustomBaseUrl = axios.create({
  baseURL: BASE_URL,
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

