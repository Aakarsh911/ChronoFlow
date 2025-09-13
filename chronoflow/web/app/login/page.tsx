
"use client";
import { signIn, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";


export default function LoginPage() {
  const { status } = useSession();
  useEffect(() => {
    if (status === "authenticated") window.location.replace("/dashboard");
  }, [status]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const googleReady = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CONFIGURED);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", { redirect: false, email, password });
    setLoading(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    window.location.href = "/dashboard";
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center">
        <h1 className="text-3xl font-bold text-teal-600 mb-2 text-center">AI Time Manager</h1>
        <p className="text-gray-500 mb-8 text-center">Intelligent productivity for modern teams</p>
        <h2 className="text-2xl font-semibold mb-2 text-center">Welcome back</h2>
        <p className="text-gray-500 mb-6 text-center">Sign in to your AI Time Manager account</p>
        <button
          disabled={!googleReady}
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="flex items-center justify-center w-full border rounded-lg py-2 mb-4 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <span className="mr-2 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 48 48"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.73 1.22 9.24 3.22l6.91-6.91C36.36 2.36 30.57 0 24 0 14.61 0 6.27 5.48 1.91 13.44l8.51 6.62C12.6 13.16 17.87 9.5 24 9.5z"/><path fill="#34A853" d="M46.09 24.56c0-1.64-.15-3.22-.44-4.76H24v9.04h12.44c-.54 2.92-2.17 5.39-4.63 7.04l7.19 5.59C43.73 37.73 46.09 31.64 46.09 24.56z"/><path fill="#FBBC05" d="M10.42 28.06c-.62-1.84-.98-3.8-.98-5.81s.36-3.97.98-5.81l-8.51-6.62C.32 13.61 0 18.67 0 24s.32 10.39 1.91 15.19l8.51-6.62z"/><path fill="#EA4335" d="M24 48c6.57 0 12.36-2.16 16.91-5.89l-7.19-5.59c-2.01 1.35-4.59 2.15-7.72 2.15-6.13 0-11.4-3.66-13.58-8.56l-8.51 6.62C6.27 42.52 14.61 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></g></svg>
          </span>
          Continue with Google
        </button>
        <div className="flex items-center w-full my-4">
          <hr className="flex-grow border-gray-200" />
          <span className="mx-2 text-gray-400 text-xs">OR CONTINUE WITH</span>
          <hr className="flex-grow border-gray-200" />
        </div>
        <form onSubmit={onSubmit} className="w-full space-y-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <FiMail className="w-5 h-5" />
            </span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border px-10 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200"
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <FiLock className="w-5 h-5" />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border px-10 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200"
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 cursor-pointer focus:outline-none"
              tabIndex={0}
            >
              {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
            </button>
          </div>
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <button
            disabled={loading}
            className="bg-teal-600 text-white px-4 py-2 rounded-lg w-full font-semibold disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <div className="w-full flex flex-col items-center mt-6">
          <a href="/signup" className="text-teal-600 font-medium hover:underline">Sign up</a>
          <a href="/forgot-password" className="text-gray-500 text-sm mt-2 hover:underline">Forgot your password?</a>
        </div>
      </div>
    </main>
  );
}
