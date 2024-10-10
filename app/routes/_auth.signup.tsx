import React, { useState, ChangeEvent, useEffect } from "react";
import { Link, useNavigate, Form, useActionData } from "@remix-run/react";
import { json, redirect, ActionFunction, LoaderFunction } from "@remix-run/node";
import { getSession, commitSession } from "~/sessions";
import { encrypt } from "~/utils/encryption";
import { useUser } from "~/context/UserContext";

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get("Cookie"));
  const userJson = session.get("user");

  if (userJson) {
    return redirect("/admin");
  }

  return null;
};

export const action: ActionFunction = async ({ request }) => {
  // Implement signup logic here
  // ...
};

function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  const actionData = useActionData<{ error?: string }>();

  useEffect(() => {
    if (user && user.isAuthorized) {
      navigate('/admin');
    }
  }, [user, navigate]);

  const handleTogglePasswordVisibility = () => setShowPassword(!showPassword);

  const handleSignUp = async () => {
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    try {
      const response = await fetch("https://mozart-api-21ea5fd801a8.herokuapp.com/api/signup/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, password, fullname, number }),
      });

      if (response.ok) {
        const responseData = await response.json();
        const userData: UserData = responseData.user;

        // localStorage.setItem("user", JSON.stringify(userData));
        navigate("/verifyAccount"); 
      } else {
        const data = await response.json();
        setErrorMessage(data.message || "Signup failed");
      }
    } catch (error) {
      setErrorMessage("An error occurred during signup. Please try again.");
    }
  };

  const handleChange = (value?: E164Number) => {
    setNumber(value || '');
  };

  const [showPassword, setShowPassword] = useState(false);
  const [fullname, setName] = useState<string>("");
  const [number, setNumber] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Sign Up</h1>
      <p style={{ marginBottom: '1.5rem', color: 'gray' }}>Enter your name, email, and password to sign up!</p>

      <form onSubmit={(e) => e.preventDefault()}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="fullname" style={{ display: 'block', marginBottom: '0.5rem', textAlign: 'left' }}>
            Full Name <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            id="fullname"
            type="text"
            placeholder="John Doe"
            value={fullname}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', border: '1px solid #ccc', borderRadius: '5px' }}
            required
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', textAlign: 'left' }}>
            Email <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            id="email"
            type="email"
            placeholder="mail@example.com"
            value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', border: '1px solid #ccc', borderRadius: '5px' }}
            required
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', textAlign: 'left' }}>
            Password <span style={{ color: 'red' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #ccc', borderRadius: '5px' }}
              required
            />
            <span
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
              onClick={handleTogglePasswordVisibility}
            >
              {showPassword ? '🙈' : '👁️'}
            </span>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="phone" style={{ display: 'block', marginBottom: '0.5rem', textAlign: 'left' }}>
            Phone Number
          </label>
          <PhoneInput
            id="phone"
            placeholder="Enter phone number"
            value={number}
            onChange={handleChange}
            style={{ width: '100%', padding: '0.75rem', border: '1px solid #ccc', borderRadius: '5px' }}
          />
        </div>

        {errorMessage && <p style={{ color: 'red', marginBottom: '1.5rem' }}>{errorMessage}</p>}

        <button
          type="submit"
          onClick={handleSignUp}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#f56565',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Sign Up
        </button>
      </form>

      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <p>
          Already have an account?{' '}
          <Link to="/signin" style={{ color: '#f56565' }}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignUp;