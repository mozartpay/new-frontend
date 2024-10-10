import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import type { LoaderFunction } from "@remix-run/node";
import LayoutComponent from "./components/layout";
import { UserProvider } from '~/context/UserContext';
import { decrypt } from '~/utils/encryption';
import { createCookie } from "@remix-run/node";

const userCookie = createCookie("user", {
  maxAge: 60 * 6000, // 60 minutes in seconds
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
  sameSite: "lax",
});

// Links for global CSS or other resources
export function links() {
  return [{ rel: "stylesheet", href: "../app/styles/global.css" }];
}
// Global loader
export const loader: LoaderFunction = async ({ request }) => {
  const cookieHeader = request.headers.get("Cookie");
  const userCookieValue = await userCookie.parse(cookieHeader);
  
  let user = null;
  if (userCookieValue) {
    try {
      const decryptedUser = decrypt(userCookieValue);
      user = decryptedUser ? JSON.parse(decryptedUser) : null;
      // Ensure the user object has all the necessary fields
      user = {
        ...user,
        preferredCurrency: user.preferredCurrency || '',
        publicKeyXlm: user.publicKeyXlm || '',
        image: user.image || '',
      };
    } catch (error) {
      console.error('Error parsing decrypted user data:', error);
    }
  }
  return { user };
};

export function Layout({ children }: { children: React.ReactNode }) {
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
          <LayoutComponent>
            {children}
          </LayoutComponent>
        </UserProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

// Error boundary to catch unexpected errors
export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <div>
      <h1>Application Error</h1>
      <p>{error?.message || "An unexpected error occurred."}</p> {/* Add a fallback message */}
    </div>
  );
}

export default function App() {
  return (

      <Outlet />

  );
}
