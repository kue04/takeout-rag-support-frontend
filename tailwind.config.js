/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        paper: "#f5f7fb",
        panel: "#ffffff",
        subtle: "#eef2f7",
        line: "#d9e0ea",
        muted: "#596579",
        leaf: "#0f766e",
        amberline: "#b06c16",
        danger: "#b42318",
      },
      boxShadow: {
        workbench: "0 6px 12px rgba(23, 32, 51, 0.08)",
      },
      borderRadius: {
        work: "8px",
      },
    },
  },
  plugins: [],
};
