"use client";

import React, { useEffect, useState } from "react";
import AuthBrandPanel from "./AuthBrandPanel";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";

export default function AuthContainer() {
  const [mode, setMode] = useState<"login" | "signup">("login");

  useEffect(() => {
    const requestedMode = new URLSearchParams(window.location.search).get("mode");
    if (requestedMode === "signup") setMode("signup");
    if (requestedMode === "login") setMode("login");
  }, []);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden">
        <AuthBrandPanel />
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 overflow-y-auto scrollbar-thin">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-purple-cyan flex items-center justify-center">
              <span className="text-xs font-bold text-white">OL</span>
            </div>
            <span className="font-semibold text-foreground">OppositeLab</span>
          </div>

          {/* Mode toggle */}
          <div className="flex bg-secondary rounded-xl p-1 mb-8">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                mode === "login"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                mode === "signup"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Join the Lab
            </button>
          </div>

          <div className="animate-slide-up">
            {mode === "login" ? (
              <LoginForm onSwitchToSignup={() => setMode("signup")} />
            ) : (
              <SignupForm onSwitchToLogin={() => setMode("login")} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
