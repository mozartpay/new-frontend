/// <reference types="@remix-run/dev" />
/// <reference types="@remix-run/node/globals" />
/// <reference types="@remix-run/node" />
/// <reference types="vite/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    NETLIFY: 'true' | 'false';
    // Add other environment variables here
    // For example:
    API_URL: string;
    DATABASE_URL: string;
    NODE_ENV: 'development' | 'production' | 'test';
  }
}
