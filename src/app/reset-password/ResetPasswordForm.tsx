"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/ui/AppIcon";

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>();

  const password = watch("password") ?? "";
  const confirmPassword = watch("confirmPassword") ?? "";
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setSubmitError("Invalid reset link. Please request a new one.");
      return;
    }
    if (!passwordsMatch) return;

    setIsLoading(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not reset password.");
      setIsSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not reset password.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-negative/10 flex items-center justify-center mx-auto mb-6">
          <Icon name="ExclamationTriangleIcon" size={32} className="text-negative" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Invalid Reset Link</h2>
        <p className="text-sm text-muted-foreground mb-6">
          This password reset link is invalid or has expired. Please request a new one.
        </p>
        <Link href="/forgot-password" className="text-primary font-semibold hover:underline">
          Request New Link
        </Link>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-positive/10 flex items-center justify-center mx-auto mb-6">
          <Icon name="CheckCircleIcon" size={32} className="text-positive" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Password Reset Complete</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Your password has been successfully reset. You can now sign in with your new password.
        </p>
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          <Icon name="ArrowLeftIcon" size={16} />
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-1">Create New Password</h2>
        <p className="text-sm text-muted-foreground">
          Your new password must be at least 10 characters.
        </p>
      </div>

      {/* Password */}
      <div>
        <label
          htmlFor="reset-password"
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          New Password
        </label>
        <div className="relative">
          <input
            id="reset-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••••"
            {...register("password", {
              required: "Password is required",
              minLength: {
                value: 10,
                message: "Password must be at least 10 characters",
              },
            })}
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
            <Icon name={showPassword ? "EyeSlashIcon" : "EyeIcon"} size={16} />
          </button>
        </div>
        {errors.password && (
          <p className="mt-1.5 text-xs text-negative">{errors.password.message}</p>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label
          htmlFor="reset-confirm-password"
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          Confirm New Password
        </label>
        <input
          id="reset-confirm-password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="••••••••••"
          {...register("confirmPassword", {
            required: "Please confirm your password",
            validate: (value) => value === password || "Passwords do not match",
          })}
          className={`w-full px-4 py-2.5 bg-input border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${
            errors.confirmPassword ? "border-negative" : "border-border"
          }`}
        />
        {errors.confirmPassword && (
          <p className="mt-1.5 text-xs text-negative">{errors.confirmPassword.message as string}</p>
        )}
      </div>

      {/* Error */}
      {submitError && (
        <div className="flex items-start gap-2 p-3 bg-negative/10 border border-negative/20 rounded-lg">
          <Icon name="ExclamationTriangleIcon" size={14} className="text-negative mt-0.5 shrink-0" />
          <p className="text-xs text-negative">{submitError}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading || !passwordsMatch}
        className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{ minHeight: 42 }}
      >
        {isLoading ? (
          <>
            <Icon name="ArrowPathIcon" size={16} className="animate-spin" />
            <span>Resetting…</span>
          </>
        ) : (
          "Reset Password"
        )}
      </button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/" className="text-primary font-semibold hover:underline">
          ← Back to Sign In
        </Link>
      </p>
    </form>
  );
}