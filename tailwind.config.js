const path = require("path");

module.exports = {
  // Scope utilities under .ams-tw only (do NOT use comma selectors —
  // Tailwind appends " .utility", so ".a, .b" becomes ".a, .b .utility"
  // which wrongly applies every utility to .a itself and blanks the POS).
  important: ".ams-tw",
  content: ["./src/modules/ams-pos/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#6576ff",
          50: "#f0f2ff",
          100: "#e0e5ff",
          200: "#c7ceff",
          300: "#a3adff",
          400: "#798bff",
          500: "#6576ff",
          600: "#4f5fd6",
          700: "#2c3782",
          800: "#232c68",
          900: "#1a2150",
        },
        base: {
          DEFAULT: "#364a63",
          soft: "#526484",
          light: "#8091a7",
        },
        body: "#f5f6fa",
        success: "#1ee0ac",
        warning: "#f4bd0e",
        danger: "#e85347",
        info: "#09c2de",
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
};
