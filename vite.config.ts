import { defineConfig } from "vite";
import elmonyComponentTagger from "@elmony/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    watch: { ignored: ['**/.elmony/**'] },
  },
  plugins: [...(mode === "development" ? [elmonyComponentTagger()] : []), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
}));
