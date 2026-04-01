
import axios from "axios";

const CustomBaseUrl = axios.create({
  baseURL: "https://wfc-backend-server.onrender.com",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, 
});

export default CustomBaseUrl;

