import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const dsRoot = path.resolve(__dirname, "../../bud2-design-system");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@getbud-co/buds/styles": path.resolve(dsRoot, "src/styles/lib.css"),
      "@getbud-co/buds": path.resolve(dsRoot, "src/index.ts"),
      // Ensure dependencies are deduplicated when using linked DS package
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      "react/jsx-runtime": path.resolve(__dirname, "node_modules/react/jsx-runtime"),
      "react/jsx-dev-runtime": path.resolve(__dirname, "node_modules/react/jsx-dev-runtime"),
      "@phosphor-icons/react": path.resolve(__dirname, "node_modules/@phosphor-icons/react"),
    },
  },
  css: {
    modules: {
      localsConvention: "camelCase",
    },
  },
});
