import { vitePlugin } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { netlifyPlugin } from "@netlify/remix-adapter/plugin";

export default defineConfig({
  plugins: [
    vitePlugin({
      ignoredRouteFiles: ["**/.*"],
      appDirectory: "app",
      buildDirectory: "public/build",
      assetsBuildDirectory: "public/build",
      publicPath: "/build/",
      serverBuildDirectory: "build"
    }),
    netlifyPlugin(),
    tsconfigPaths(),
  ],
  optimizeDeps: {
    include: []
  },
  build: {
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
