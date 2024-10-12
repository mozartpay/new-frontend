import { createCookieSessionStorage, redirect } from "@remix-run/node";

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set");
}

const storage = createCookieSessionStorage({
  cookie: {
    name: "RJ_session",
    secure: process.env.NODE_ENV === "production",
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

export async function requireUserSession(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  const user = await getUserFromSession(request);
  if (!user || !user.isAuthorized) {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/signin?${searchParams}`);
  }
  return user;
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

export { storage };

export const commitSession = storage.commitSession;
