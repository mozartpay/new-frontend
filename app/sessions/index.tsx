import { createCookieSessionStorage, redirect } from "@remix-run/node";

const sessionSecret = typeof process !== "undefined" ? process.env.SESSION_SECRET : undefined;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set");
}

const storage = createCookieSessionStorage({
  cookie: {
    name: "RJ_session",
    secure: typeof window !== "undefined" ? window.ENV?.NODE_ENV === "production" : true,
    secrets: [sessionSecret],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
  },
});

export async function createUserSession(userData: string, redirectTo: string) {
  const session = await storage.getSession();
  session.set("userData", userData);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    },
  });
}

export async function getUserFromSession(request: Request) {
  const session = await getSession(request);
  const userData = session.get("userData");
  if (!userData) return null;
  return JSON.parse(userData);
}

export async function requireUserSession(request: Request) {
  const user = await getUserFromSession(request);
  
  if (!user) {
    throw redirect("/signin");
  }
  
  return user;
}

export async function checkAuthenticatedRedirect(request: Request) {
  const user = await getUserFromSession(request);
  
  if (user) {
    throw redirect("/admin");
  }
  
  return null;
}

export async function getSession(request: Request) {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) {
    console.error("No Cookie header found in the request");
  }
  return cookieHeader
    ? storage.getSession(cookieHeader)
    : storage.getSession();
}

export async function destroyUserSession(request: Request) {
  const session = await getSession(request);
  return redirect("/", {
    headers: {
      "Set-Cookie": await storage.destroySession(session),
    },
  });
}

export async function updateUserPreferences(request: Request, preferences: any) {
  const session = await getSession(request);
  const userData = session.get("userData");
  
  if (!userData) return null;
  
  const user = JSON.parse(userData);
  const updatedUser = {
    ...user,
    preferences: {
      ...user.preferences,
      ...preferences
    }
  };
  
  session.set("userData", JSON.stringify(updatedUser));
  
  return {
    user: updatedUser,
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    },
  };
}

export { storage };

export const commitSession = storage.commitSession;
