import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export default defineConfig(({ mode }) => {
  const env = {
    ...loadEnv(mode, resolve(__dirname, ".."), ""),
    ...process.env,
  };
  const packageVersion = JSON.parse(
    readFileSync(resolve(__dirname, "../package.json"), "utf8"),
  ).version;
  const apiUrl = env.DEVKIT_API_URL || "http://127.0.0.1:7030";
  const webPort = Number(env.DEVKIT_WEB_PORT || 7040);
  return {
    cacheDir: "../../node_modules/.vite/devkit-web",
    define: {
      "import.meta.env.VITE_DEVKIT_VERSION": JSON.stringify(packageVersion),
    },
    envDir: "..",
    plugins: [tailwindcss(), react()],
    root: __dirname,
    resolve: { dedupe: ["react", "react-dom"] },
    build: { emptyOutDir: true, outDir: "../dist/web" },
    server: {
      host: "127.0.0.1",
      port: webPort,
      proxy: {
        "/api/devkit": {
          changeOrigin: false,
          rewrite: (path) => path.replace(/^\/api\/devkit/u, "") || "/",
          target: apiUrl,
        },
      },
    },
  };
});
