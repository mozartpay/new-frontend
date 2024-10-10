module.exports = {    
  // ignoredRouteFiles: ["**/.*"],
  appDirectory: "app",
  browserBuildDirectory: "/public/build/client",
  publicPath: "/public/build/",
  getServerBuildDirectory: "/public/build/server",
  assetsBuildDirectory: "/public/build",
  serverBuildPath: "/public/build/server/index.js",
  devServerPort: 8888,
  
    // serverModuleFormat: "cjs",
  
  // Removed 'disable-css-side-effects' plugin to resolve build errors
  plugins: [/* other plugins */],
};