import { vitePlugin } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { netlifyPlugin } from "@netlify/remix-adapter/plugin";

export default defineConfig({
  plugins: [
    vitePlugin({
      ignoredRouteFiles: ["**/.*"],
      appDirectory: "app",
      // Use a completely different build directory structure
      buildDirectory: "dist"
    }),
    netlifyPlugin(),
    tsconfigPaths(),
  ],
  optimizeDeps: {
    include: []
  },
  build: {
    // Set a completely different output directory
    outDir: "build",
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  },
  server: {
    fs: {
      strict: false
    }
  },
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg'],
});