import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// Định tuyến API tới Backend thật
setBaseUrl("http://localhost:5000");

createRoot(document.getElementById("root")!).render(<App />);
