import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackStart } from "@tanstack/react-start/vite";
import { tsconfigPaths } from "vite-tsconfig-paths";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const rpcWsBrowser = path.resolve(
  process.cwd(),
  "node_modules/rpc-websockets/dist/index.browser.mjs",
);

export default defineConfig({
  plugins: [
    TanStackStart({
      server: { entry: "src/server.ts" },
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
    nodePolyfills({
      include: ["buffer", "util", "stream", "events"],
      globals: { Buffer: true, global: true, process: false },
    }),
  ],
  resolve: {
    alias: {
      "rpc-websockets/dist/lib/client": rpcWsBrowser,
      "rpc-websockets": rpcWsBrowser,
      "entities/lib/decode.js": path.resolve(process.cwd(), "node_modules/entities/lib/decode.js"),
      "entities/lib/encode.js": path.resolve(process.cwd(), "node_modules/entities/lib/encode.js"),
      entities: path.resolve(process.cwd(), "node_modules/entities"),
    },
  },
});
