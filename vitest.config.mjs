import path from "path"
import { fileURLToPath } from "url"
import { configDefaults, defineConfig } from "vitest/config"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const nodeMajor = Number(process.versions.node.split(".")[0])

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    include: ["lib/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "e2e/**"],
    // Node 25+ enables Web Storage by default. Without --localstorage-file its
    // localStorage getter returns undefined, and Vitest will not replace a
    // global that already exists, so happy-dom's Storage is never installed.
    // Node 24 rejects this flag; Web Storage stays off there unless opted in.
    execArgv: nodeMajor >= 25 ? ["--no-webstorage"] : [],
  },
})
