import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  json,
} from "@remix-run/react";
import type { LoaderFunction } from "@remix-run/node";
import LayoutComponent from "./components/layout";
import { UserProvider } from '~/context/UserContext';
import { getUserFromSession } from '~/sessions/index';


// Links for global CSS or other resources
export function links() {
  return [{ rel: "stylesheet", href: "../app/styles/global.css" }];
}

// Global loader
export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUserFromSession(request);
  return json({
    ENV: {
      API_URL: process.env.API_URL,
      user
      // Add other environment variables as needed
    },
  });
};

function Layout() {
  return (
    <LayoutComponent>
      <Outlet />
    </LayoutComponent>
  );
}

// Error boundary to catch unexpected errors
export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <div>
          <h1>Application Error</h1>
          <p>{error?.message || "An unexpected error occurred."}</p>
        </div>
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { user } = useLoaderData<{ user: any }>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <UserProvider initialUser={user}>
          <Layout />
          <ScrollRestoration />
          <Scripts />
        </UserProvider>
      </body>
    </html>
  );
}
