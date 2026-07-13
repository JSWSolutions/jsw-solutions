import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // JSW brand palette (sampled from the existing site)
        sand: "#e8ddc1", // page background
        "sand-dark": "#ddd0ac",
        ink: "#1c1c1c", // near-black headings
        brand: {
          green: "#3f6021", // logo / accents
          "green-dark": "#2c451a",
          orange: "#df6f1e", // highlight text / buttons
          "orange-dark": "#c25f18",
          blue: "#1f4e79", // invoice/data accents
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
