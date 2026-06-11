import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "off-bg": "var(--color-off-bg)",
        "off-text": "var(--color-off-text)",
        "off-dot": "var(--color-off-dot)",
        "bri-bg": "var(--color-bri-bg)",
        "bri-text": "var(--color-bri-text)",
        "bri-dot": "var(--color-bri-dot)",
      },
    },
  },
  plugins: [],
};

export default config;
