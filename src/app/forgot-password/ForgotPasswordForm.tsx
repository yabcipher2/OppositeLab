"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import Icon from "@/components/ui/AppIcon";

interface ForgotPasswordFormData {
  email: string;
}

export default function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>();

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not send reset link.");
      setIsSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not send reset link.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-positive/10 flex items-center justify-center mx-auto mb-6">
          <Icon name="CheckCircleIcon" size={32} className="text-positive" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Check your email</h2>
        <p className="text-sm text-muted-foreground mb-6">
          If an account exists for that email, you&apos;ll receive a password reset link shortly.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <Icon name="ArrowLeftIcon" size={16} />
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-1">Forgot password?</h2>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="forgot-email"
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          Email address
        </label>
        <input
          id="forgot-email"
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
          <p className="mt-1.5 text-xs text-negative">{errors.email.message}</p>
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
        disabled={isLoading}
        className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{ minHeight: 42 }}
      >
        {isLoading ? (
          <>
            <Icon name="ArrowPathIcon" size={16} className="animate-spin" />
            <span>Sending…</span>
          </>
        ) : (
          "Send Reset Link"
        )}
      </button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link href="/" className="text-primary font-semibold hover:underline">
          Sign In
        </Link>
      </p>
    </form>
  );
}