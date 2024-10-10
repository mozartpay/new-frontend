/** @type {import('@remix-run/dev').AppConfig} */
export default {    
  ignoredRouteFiles: ["**/.*"],
  appDirectory: "app",
  assetsBuildDirectory: "public/build",
  serverBuildPath: "build/server/index.js",
  publicPath: "/build/",
  serverModuleFormat: "cjs",
  // Removed 'disable-css-side-effects' plugin to resolve build errors
  plugins: [/* other plugins */],
};