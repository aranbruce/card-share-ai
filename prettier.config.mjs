/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions} */
const config = {
  semi: false,
  // Tailwind v4: CSS entry that @imports tailwindcss (required for correct class order vs theme).
  tailwindStylesheet: "./app/globals.css",
  plugins: ["prettier-plugin-tailwindcss"],
}

export default config
