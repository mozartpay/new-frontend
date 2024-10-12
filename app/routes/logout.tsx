import { ActionFunction, LoaderFunction, redirect } from "@remix-run/node";
import { useEffect } from "react";
import { useNavigate } from "@remix-run/react";
import { destroyUserSession } from "~/sessions/index";
import { useUser } from '~/context/UserContext';

export const action: ActionFunction = async ({ request }) => {
  return destroyUserSession(request);
};

export const loader: LoaderFunction = async ({ request }) => {
  return destroyUserSession(request);
};

export default function Logout() {
  const { setUser } = useUser();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Clear the user from context
    setUser(null);
    // Redirect to home page
    navigate('/', { replace: true });
  }, [setUser, navigate]);
  
  return null;
}
