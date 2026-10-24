"use client";

import React from "react";
import ForgotPasswordForm from "./ForgotPasswordForm";
import AuthBrandPanel from "@/app/sign-up-login-screen/components/AuthBrandPanel";

export default function ForgotPasswordPage() {
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

          <div className="animate-slide-up">
            <ForgotPasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
}