/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // A deep charcoal-blue "ink" rather than pure black or the
        // cream/terracotta combo that's become an AI-generated-page
        // tell. Named after what they represent in the UI, not generic
        // "primary/secondary" labels, since each one maps to a specific
        // role in the health-score dashboard.
        ink: "#12151B",
        surface: "#1B1F27",
        line: "#2A2F3A",
        parchment: "#E8EAED",
        muted: "#9AA1AC",
        sentinel: "#D9A441", // brand accent - warm amber, distinct from the "safe" green/red severity colors below
        healthy: "#3FB97F",
        critical: "#E5484D",
        high: "#F0883E",
        medium: "#E8C547",
        low: "#5B8DEF",
      },
      fontFamily: {
        // Grotesk sans for UI text/copy, monospace for anything
        // code/data-shaped (commit SHAs, file paths, scores) - grounded
        // in the subject matter (a code review tool) rather than an
        // arbitrary two-font pairing.
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
