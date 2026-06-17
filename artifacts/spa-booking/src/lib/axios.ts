import axios from "axios";

// Lấy base URL từ biến môi trường, nếu không có thì mặc định dùng string rỗng (sẽ dùng relative URL và chạy qua proxy ở local)
const baseURL = import.meta.env.VITE_API_BASE_URL || "";

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
