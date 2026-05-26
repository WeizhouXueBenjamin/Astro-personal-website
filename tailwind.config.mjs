import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}"],
  plugins: [daisyui()],
  daisyui: {
    themes: ["dark", "light"],
  },
};
