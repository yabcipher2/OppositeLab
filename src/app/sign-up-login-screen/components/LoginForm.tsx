"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";

import Icon from "@/components/ui/AppIcon";

interface LoginFormData {
  email: string;
  password: string;
  remember: boolean;
}

interface LoginFormProps {
  onSwitchToSignup: () => void;
}

export default function LoginForm({ onSwitchToSignup }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ defaultValues: { remember: false } });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setLoginError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not sign in.");
      const pendingInvite = window.sessionStorage.getItem("oppositelab:pending-community-invite");
      if (pendingInvite?.startsWith("/communities/")) {
        window.sessionStorage.removeItem("oppositelab:pending-community-invite");
        window.location.assign(pendingInvite);
      } else {
        window.location.assign("/match-pairing-screen");
      }
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-1">
          Welcome back
        </h2>
        <p className="text-sm text-muted-foreground">
          Sign in to continue to your active collaboration.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Email */}
        <div>
          <label
            htmlFor="login-email"
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@domain.com"
            {...register("email", {
              required: "Email is required",
              pattern: {
                value: /\S+@\S+\.\S+/,
                message: "Enter a valid email address",
              },
            })}
            className={`w-full px-4 py-2.5 bg-input border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${
              errors.email ? "border-negative" : "border-border"
            }`}
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-negative">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-foreground"
            >
              Password
            </label>
            <Link href="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••••"
              {...register("password", { required: "Password is required" })}
              className={`w-full px-4 py-2.5 pr-10 bg-input border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${
                errors.password ? "border-negative" : "border-border"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <Icon
                name={showPassword ? "EyeSlashIcon" : "EyeIcon"}
                size={16}
              />
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs text-negative">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Remember */}
        <div className="flex items-center gap-2">
          <input
            id="remember"
            type="checkbox"
            {...register("remember")}
            className="w-4 h-4 rounded border-border bg-input accent-primary cursor-pointer"
          />
          <label
            htmlFor="remember"
            className="text-sm text-muted-foreground cursor-pointer"
          >
            Keep me signed in for 30 days
          </label>
        </div>

        {/* Error */}
        {loginError && (
          <div className="flex items-start gap-2 p-3 bg-negative/10 border border-negative/20 rounded-lg">
            <Icon
              name="ExclamationTriangleIcon"
              size={14}
              className="text-negative mt-0.5 shrink-0"
            />
            <p className="text-xs text-negative">{loginError}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ minHeight: 42 }}
        >
          {isLoading ? (
            <>
              <Icon name="ArrowPathIcon" size={16} className="animate-spin" />
              <span>Signing in…</span>
            </>
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-muted-foreground">Sign in with the account you created for OppositeLab.</p>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to OppositeLab?{" "}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="text-primary font-semibold hover:underline"
        >
          Join the Lab
        </button>
      </p>
    </div>
  );
}
