import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../lib/auth";
import React from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default async function ProtectedRoute({ children }: ProtectedRouteProps) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }

  return <>{children}</>;
}
