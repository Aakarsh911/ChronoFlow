import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import React from "react";
import { Sidebar } from "../components/Sidebar";
import { Navbar } from "../components/Navbar";
import ProtectedRoute from "../components/ProtectedRoute";

export default async function FocusLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const userImage = session?.user?.image || undefined;
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar userImage={userImage} />
        <Sidebar />
        <main className="ml-16 pt-16">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
