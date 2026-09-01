import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const STANDARD_CHUNK_LIMIT = 500_000;
// Monaco 0.56's editor API is 2.67 MB before gzip. Language support remains split from this lazy core.
const MONACO_CHUNK_LIMIT = 2_800_000;
// Excalidraw ships its editor as a large pre-bundled module. Keep it isolated from Messenger.
const EXCALIDRAW_CHUNK_LIMIT = 2_100_000;
// Mermaid's generated parser is a single 662 kB module and cannot be split safely by Rollup.
const MERMAID_PARSER_CHUNK_LIMIT = 700_000;

export default defineConfig({
  build: {
    chunkSizeWarningLimit: MONACO_CHUNK_LIMIT / 1_000,
    emptyOutDir: true,
    outDir: "../../../dist/devkit/desktop",
    rollupOptions: {
      output: {
        manualChunks: desktopVendorChunk
      }
    },
    sourcemap: true
  },
  cacheDir: "../../../node_modules/.vite/devkit-desktop",
  clearScreen: false,
  plugins: [react(), tailwindcss(), desktopBundleBudget()],
  server: {
    host: "127.0.0.1",
    port: 1420,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] }
  }
});

function desktopBundleBudget(): Plugin {
  return {
    name: "devkit-desktop-bundle-budget",
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk") continue;
        const monaco = Object.keys(output.modules).some((id) => id.includes("/monaco-editor/"));
        const excalidraw = Object.keys(output.modules).some((id) =>
          id.includes("/@excalidraw/excalidraw/")
        );
        const mermaidParser = Object.keys(output.modules).some((id) =>
          id.includes("/@mermaid-js/parser/dist/chunks/")
        );
        const limit = monaco
          ? MONACO_CHUNK_LIMIT
          : excalidraw
            ? EXCALIDRAW_CHUNK_LIMIT
            : mermaidParser
              ? MERMAID_PARSER_CHUNK_LIMIT
              : STANDARD_CHUNK_LIMIT;
        const bytes = new TextEncoder().encode(output.code).byteLength;
        if (bytes > limit) {
          const largestModule = Object.entries(output.modules).sort(
            ([, left], [, right]) => right.renderedLength - left.renderedLength
          )[0]?.[0];
          this.error(
            `${output.fileName} is ${formatKilobytes(bytes)} kB. The ${chunkCategory(monaco, excalidraw, mermaidParser)} chunk limit is ${formatKilobytes(limit)} kB.${largestModule ? ` Largest module: ${largestModule}.` : ""}`
          );
        }
      }
    }
  };
}

function desktopVendorChunk(id: string) {
  const moduleId = id.replaceAll("\\", "/");
  if (!moduleId.includes("/node_modules/")) return;
  if (moduleId.includes("/monaco-editor/")) return "monaco-vendor";
  const tiptapPackage = packageSegment(moduleId, "@tiptap");
  if (tiptapPackage) return `tiptap-${tiptapPackage}`;
  const prosemirrorPackage = packageSegment(moduleId, "prosemirror");
  if (prosemirrorPackage) return `prosemirror-${prosemirrorPackage}`;
  if (matchesPackage(moduleId, ["react-markdown", "remark-gfm", "unified", "micromark"])) {
    return "markdown-vendor";
  }
  if (matchesPackage(moduleId, ["framer-motion", "motion-dom", "motion-utils"])) {
    return "motion-vendor";
  }
  if (matchesPackage(moduleId, ["socket.io-client", "engine.io-client", "socket.io-parser"])) {
    return "socket-vendor";
  }
}

function packageSegment(id: string, namespace: string) {
  const marker = namespace.startsWith("@")
    ? `/node_modules/${namespace}/`
    : `/node_modules/${namespace}-`;
  const packagePath = id.split(marker)[1];
  return packagePath?.split("/")[0];
}

function matchesPackage(id: string, packageNames: string[]) {
  return packageNames.some((packageName) => id.includes(`/node_modules/${packageName}/`));
}

function chunkCategory(monaco: boolean, excalidraw: boolean, mermaidParser: boolean) {
  if (monaco) return "lazy Monaco";
  if (excalidraw) return "lazy Excalidraw";
  if (mermaidParser) return "generated Mermaid parser";
  return "application";
}

function formatKilobytes(bytes: number) {
  return Math.round(bytes / 1_000);
}
