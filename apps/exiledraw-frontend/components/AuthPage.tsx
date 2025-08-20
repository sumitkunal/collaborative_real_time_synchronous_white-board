"use client";
import React, { useState } from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { Route } from "lucide-react";
import { BackendUrl } from "@/config";

export function AuthPage({ isSignedIn }: { isSignedIn: boolean }) {
  const [email, setEmail] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [password, setPassword] = useState("");

  const router = useRouter();
  const searchParams = useSearchParams();

  const handleAuth = async () => {
    try {
      const endpointPath = isSignedIn ? "/signin" : "/signup";
      const payload = isSignedIn
        ? { username: email, password }
        : { username: signupUsername, email, password };
      const response = await axios.post(`${BackendUrl}${endpointPath}`, payload);
      if (isSignedIn) {
        const jwt = response.data.token;
        localStorage.setItem("token", jwt);
        document.cookie = `token=${jwt}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        const redirectTo = searchParams.get("redirect") || "/dashboard";
        router.replace(redirectTo);
      }
      // console.log(response.data);
      if (!isSignedIn) {
        router.push("/signin");
      }
    } catch (error) {
      console.error("Authentication failed:", error);
    }
  };
  return (
    <div className="font-sans flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6 sm:p-12">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-md p-8 space-y-6">
        <h2 className="text-2xl font-bold text-center text-gray-800">
          {isSignedIn ? "Welcome Back!" : "Create an Account"}
        </h2>
        {!isSignedIn && (
          <input
            type="text"
            placeholder="Username"
            className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setSignupUsername(e.target.value)}
          />
        )}
        <input
          type="text"
          placeholder="Email"
          className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          onClick={handleAuth}
          className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition duration-300"
        >
          {isSignedIn ? "Sign In" : "Sign Up"}
        </button>
        <p className="text-center text-gray-600">
          {isSignedIn
            ? "Don't have an account? "
            : "Already have an account? "}
          <span
            className="text-blue-600 cursor-pointer hover:underline"
            onClick={() => router.push(isSignedIn ? "/signup" : "/signin")}
          >
            {isSignedIn ? "Sign Up" : "Sign In"}
          </span>
        </p>
      </div>
    </div>
  );
}