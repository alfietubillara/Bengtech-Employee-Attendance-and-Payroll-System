import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        beng: {
          ink: "#17201b",
          green: "#0f7a49",
          lime: "#98c93c",
          gold: "#f1b832",
          mist: "#f5f8f4"
        }
      },
      boxShadow: {
        soft: "0 12px 28px rgba(23, 32, 27, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
