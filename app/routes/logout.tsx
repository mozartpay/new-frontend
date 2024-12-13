import { ActionFunction, LoaderFunction, redirect } from "@remix-run/node";
import { useEffect } from "react";
import { destroyUserSession } from "~/sessions/index";
import { useUser } from '~/context/UserContext';

export const action: ActionFunction = async ({ request }) => {
  return await handleLogout(request);
};

export const loader: LoaderFunction = async ({ request }) => {
  return await handleLogout(request);
};

async function handleLogout(request: Request) {
  await destroyUserSession(request);
  
  // Get all cookies
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = cookieHeader.split(';').map(cookie => cookie.trim().split('=')[0]);

  // Create an array of Set-Cookie headers to clear all cookies
  const clearCookieHeaders = cookies.map(cookieName => 
    `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax`
  );

  return redirect('/', {
    headers: {
      "Set-Cookie": clearCookieHeaders.join(', ')
    }
  });
}

export default function Logout() {
  useEffect(() => {
    // This effect will run after the server-side logout is complete
    window.location.href = '/';
  }, []);
  
  return null;
}
