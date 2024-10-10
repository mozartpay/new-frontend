module.exports = {    
  // ignoredRouteFiles: ["**/.*"],
  appDirectory: "app",
  browserBuildDirectory: "/build/client",
  publicPath: "/build/",
  getServerBuildDirectory: "/build/server",
  assetsBuildDirectory: "/build",
  serverBuildPath: "/build/server/index.js",
  devServerPort: 8888,
  
    // serverModuleFormat: "cjs",
  
  // Removed 'disable-css-side-effects' plugin to resolve build errors
  plugins: [/* other plugins */],
};