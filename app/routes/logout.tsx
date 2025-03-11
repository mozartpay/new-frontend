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
  try {
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
  } catch (error) {
    console.error('Logout error:', error);
    
    // Still attempt to clear cookies even if session destruction fails
    const cookieHeader = request.headers.get("Cookie") || "";
    const cookies = cookieHeader.split(';').map(cookie => cookie.trim().split('=')[0]);
    const clearCookieHeaders = cookies.map(cookieName => 
      `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax`
    );

    // Redirect to home with error message
    return redirect('/?error=logout_failed', {
      headers: {
        "Set-Cookie": clearCookieHeaders.join(', ')
      }
    });
  }
}

export default function Logout() {
  const { setUser } = useUser();
  
  useEffect(() => {
    // Clear user state regardless of server-side success/failure
    setUser(null);
    
    // This effect will run after the server-side logout is complete
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    
    if (error === 'logout_failed') {
      // You might want to show a toast or alert here
      console.error('Failed to destroy session completely, but cookies have been cleared');
    }
    
    window.location.href = '/';
  }, [setUser]);
  
  return null;
}
