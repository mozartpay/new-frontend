import { getServerBuildDirectory } from "@remix-run/dev/dist/vite/plugin";

/** @type {import('@remix-run/dev').AppConfig} */
export default {    
  // ignoredRouteFiles: ["**/.*"],
  appDirectory: "app",
  browserBuildDirectory: "public/build",
  publicPath: "/build/",
  getServerBuildDirectory: "netlify/functions/server/build",
  assetsBuildDirectory: "build",
  serverBuildPath: "build/server/index.js",
  devServerPort: 8888,
  
    // serverModuleFormat: "cjs",
  
  // Removed 'disable-css-side-effects' plugin to resolve build errors
  plugins: [/* other plugins */],
};