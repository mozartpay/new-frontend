import { createCookieSessionStorage } from "@remix-run/node";

const sessionSecret = "your_session_secret_default_secret";

// Create a session storage
const { getSession, commitSession, destroySession } = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: "/",
    sameSite: "lax",
    secrets: [sessionSecret], // Replace with your own secret

  },
});

export { getSession, commitSession, destroySession };