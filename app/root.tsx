import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  json,
  LiveReload,
} from "@remix-run/react";
import type { LinksFunction, LoaderFunction } from "@remix-run/node";
import LayoutComponent from "./components/layout";
import { UserProvider } from '~/context/UserContext';
import { getUserFromSession } from '~/sessions/index';
import { CookieConsent } from '~/components/CookieConsent';
import { useCookieConsent } from '~/hooks/useCookieConsent';

// Import the CSS file as a URL
import cookieConsentStyles from '../app/styles/cookieconsent.css?url';

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: cookieConsentStyles },
  { rel: "stylesheet", href: "../app/styles/global.css" }
];

// Global loader
export const loader: LoaderFunction = async ({ request }) => {
  try {
    const user = await getUserFromSession(request);
    const apiUrl = process.env.API_URL;
    const nodeEnv = process.env.NODE_ENV;

    if (!apiUrl) {
      console.error("API_URL is not configured");
      throw new Error("API_URL is not configured");
    }

    return json({
      ENV: {
        NODE_ENV: nodeEnv,
        user,
        API_URL: apiUrl,
      },
    });
  } catch (error) {
    console.error('Root loader error:', error);
    // Return a valid response even in case of error
    return json({
      ENV: {
        NODE_ENV: process.env.NODE_ENV,
        user: null,
        API_URL: process.env.API_URL,
      },
    });
  }
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
  const data = useLoaderData<typeof loader>();
  const { isAccepted } = useCookieConsent();
  const hasGivenConsent = isAccepted('necessary');

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(data.ENV)}`,
          }}
        />
        <UserProvider initialUser={data.ENV.user}>
          <Layout />
          {!hasGivenConsent && <CookieConsent />}
        </UserProvider>
        <ScrollRestoration />
        <Scripts />
      
      </body>
    </html>
  );
}