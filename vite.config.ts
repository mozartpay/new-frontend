import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { netlifyPlugin } from "@netlify/remix-adapter/plugin";

export default defineConfig({
  plugins: [
    remix({
      ignoredRouteFiles: ["**/.*"],
      appDirectory: "app",
      assetsBuildDirectory: "public/build",
      serverBuildPath: "build/index.js",
      publicPath: "/build/",
    }),
    netlifyPlugin(),
    tsconfigPaths(),
  ],
  optimizeDeps: {
    include: ['defindex-sdk']
  },
  build: {
    commonjsOptions: {
      include: [/defindex-sdk/, /node_modules/],
      transformMixedEsModules: true
    }
  },
  server: {
    fs: {
      strict: false
    }
  }
});
