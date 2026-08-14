import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./app/App.tsx";
import "./styles/index.css";

if (import.meta.env.PROD) {
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
}

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env");
}

const customLocalization = {
  signUp: {
    start: {
      title: "Register Your Club",
      subtitle: "Welcome! Please fill in the details to get started.",
    },
  },
  signIn: {
    start: {
      title: "Club Sign In",
      subtitle: "Access your club dashboard",
    },
  },
  formFieldLabel__firstName: "Club Name",
  formFieldLabel__emailAddress: "Email ID",
  formFieldLabel__password: "Password",
  formFieldLabel__identifier: "Email ID",

  formFieldInputPlaceholder__firstName: "Enter club name",
  formFieldInputPlaceholder__emailAddress: "Enter email address",
  formFieldInputPlaceholder__password: "Enter password",
  formFieldInputPlaceholder__identifier: "Enter email address",
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} localization={customLocalization}>
      <App />
    </ClerkProvider>
  </StrictMode>
);
