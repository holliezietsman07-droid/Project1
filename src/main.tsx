import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import "./lib/elmony_preview_probe.ts";

createRoot(document.getElementById("root")!).render(<App />);
