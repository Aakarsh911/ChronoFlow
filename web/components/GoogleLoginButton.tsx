"use client";
import { signIn } from "next-auth/react";

export default function GoogleLoginButton() {
  return (
    <button
      onClick={() => signIn("google")}
      style={{
        padding: "0.5rem 1rem",
        background: "#4285F4",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        fontWeight: "bold",
      }}
    >
      Sign in with Google
    </button>
  );
}
