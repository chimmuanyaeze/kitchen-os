"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase"; // Pulling in the 'supabase'

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // This function handles creating a NEW account
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
    } else {
      // If successful, send them to the home page!
      router.push("/");
    }
    setLoading(false);
  };

  // This function handles logging into an EXISTING account
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
    } else {
      router.push("/");
    }
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 pb-24">
      <div className="w-full max-w-sm bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-6">
          Welcome to Kitchen OS
        </h1>
        
        {/* If there is an error, we show it here in a red box */}
        {errorMessage && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">
            {errorMessage}
          </div>
        )}

        <form className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="chef@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="flex flex-col gap-2 mt-4">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-blue-600 text-white p-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Loading..." : "Log In"}
            </button>
            
            <button
              onClick={handleSignUp}
              disabled={loading}
              className="w-full bg-gray-100 text-gray-900 p-2 rounded-md font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              Create Account
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}