"use client";
import { signOut } from "next-auth/react";
export function LogoutButton() {
  return (
    <button onClick={()=>signOut({ callbackUrl: '/login' })} className="mt-4 inline-flex items-center px-3 py-1.5 rounded border text-sm hover:bg-neutral-100">
      Logout
    </button>
  );
}
