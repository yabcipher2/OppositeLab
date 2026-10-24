"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import Icon from "@/components/ui/AppIcon";
import { INTEREST_CATALOG as interestDomains } from "@/lib/interest-catalog";

interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  role: "creator";
  displayName: string;
}

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

const philosophicalSliders = [
  {
    id: "slider-structure",
    left: "Pure Structure",
    right: "Pure Chaos",
    description: "How do you prefer to approach problems?",
  },
  {
    id: "slider-solo",
    left: "Deep Solo Work",
    right: "Collective Intelligence",
    description: "Where do your best ideas come from?",
  },
  {
    id: "slider-concrete",
    left: "Concrete & Tactile",
    right: "Abstract & Conceptual",
    description: "What kind of thinking energises you?",
  },
];

const STEPS = ["Account", "Interests", "Orientation", "Role"];

export default function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const [step, setStep] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sliderValues, setSliderValues] = useState({
    "slider-structure": 50,
    "slider-solo": 50,
    "slider-concrete": 50,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [signupError, setSignupError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    trigger,
  } = useForm<SignupFormData>({ defaultValues: { role: "creator" } });

  const password = watch("password");

  const toggleTag = (id: string) => {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleNext = async () => {
    if (step === 0) {
      const valid = await trigger([
        "email",
        "password",
        "confirmPassword",
        "displayName",
      ]);
      if (!valid) return;
    }
    if (step === 1 && selectedTags.length < 3) return;
    setStep((s) => s + 1);
  };

  const onSubmit = async (formData: SignupFormData) => {
    setIsLoading(true);
    setSignupError("");
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: formData.displayName,
          email: formData.email,
          password: formData.password,
          interests: interestDomains.filter((domain) => selectedTags.includes(domain.id)).map((domain) => domain.label),
          orientation: sliderValues,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create your account.");
      const pendingInvite = window.sessionStorage.getItem("oppositelab:pending-community-invite");
      if (pendingInvite?.startsWith("/communities/")) {
        window.sessionStorage.removeItem("oppositelab:pending-community-invite");
        window.location.assign(pendingInvite);
      } else {
        window.location.assign("/match-pairing-screen");
      }
    } catch (error) {
      setSignupError(error instanceof Error ? error.message : "Could not create your account.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-1">
          {step === 0 && "Create your account"}
          {step === 1 && "Your interest fingerprint"}
          {step === 2 && "Philosophical orientation"}
          {step === 3 && "Choose your role"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {step === 0 &&
            "This builds your digital footprint — the starting point for your match."}
          {step === 1 &&
            "Select at least 3 domains. Your opposite will share exactly one."}
          {step === 2 &&
            "These sliders calibrate your thinking style — not judged, just measured."}
          {step === 3 &&
            "Creators collaborate. Moderators also help maintain shared spaces."}
        </p>
      </div>
      {signupError && <p role="alert" className="mb-4 rounded-lg border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">{signupError}</p>}

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <React.Fragment key={`step-frag-${label}`}>
            <div className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-200 ${
                  i < step
                    ? "bg-primary text-primary-foreground"
                    : i === step
                      ? "bg-primary/20 text-primary border border-primary/50"
                      : "bg-secondary text-muted-foreground"
                }`}
              >
                {i < step ? <Icon name="CheckIcon" size={10} /> : i + 1}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block ${i === step ? "text-foreground" : "text-muted-foreground"}`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px bg-border relative">
                <div
                  className="absolute inset-y-0 left-0 bg-primary transition-all duration-300"
                  style={{ width: i < step ? "100%" : "0%" }}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 0: Account */}
      {step === 0 && (
        <div className="space-y-5 animate-slide-up">
          <div>
            <label
              htmlFor="signup-name"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Display name
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Shown to your match — be real, not branded.
            </p>
            <input
              id="signup-name"
              type="text"
              placeholder="Your name"
              {...register("displayName", {
                required: "Display name is required",
                minLength: { value: 2, message: "At least 2 characters" },
              })}
              className={`w-full px-4 py-2.5 bg-input border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${errors.displayName ? "border-negative" : "border-border"}`}
            />
            {errors.displayName && (
              <p className="mt-1.5 text-xs text-negative">
                {errors.displayName.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="signup-email"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Email address
            </label>
            <input
              id="signup-email"
              type="email"
              placeholder="you@domain.com"
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /\S+@\S+\.\S+/,
                  message: "Enter a valid email",
                },
              })}
              className={`w-full px-4 py-2.5 bg-input border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${errors.email ? "border-negative" : "border-border"}`}
            />
            {errors.email && (
              <p className="mt-1.5 text-xs text-negative">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="signup-password"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Password
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Minimum 10 characters.
            </p>
            <div className="relative">
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••"
                {...register("password", {
                  required: "Password is required",
                  minLength: { value: 10, message: "At least 10 characters" },
                })}
                className={`w-full px-4 py-2.5 pr-10 bg-input border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${errors.password ? "border-negative" : "border-border"}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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

          <div>
            <label
              htmlFor="signup-confirm"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Confirm password
            </label>
            <input
              id="signup-confirm"
              type="password"
              placeholder="••••••••••"
              {...register("confirmPassword", {
                required: "Please confirm your password",
                validate: (val) => val === password || "Passwords do not match",
              })}
              className={`w-full px-4 py-2.5 bg-input border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${errors.confirmPassword ? "border-negative" : "border-border"}`}
            />
            {errors.confirmPassword && (
              <p className="mt-1.5 text-xs text-negative">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all duration-150"
          >
            Continue to Interests
          </button>
        </div>
      )}

      {/* Step 1: Interests */}
      {step === 1 && (
        <div className="animate-slide-up">
          <div className="flex flex-wrap gap-2 mb-4">
            {interestDomains.map((domain) => {
              const active = selectedTags.includes(domain.id);
              return (
                <button
                  key={domain.id}
                  type="button"
                  onClick={() => toggleTag(domain.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 active:scale-95 ${
                    active
                      ? "tag-active"
                      : "tag-inactive hover:border-muted-foreground"
                  }`}
                >
                  {domain.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mb-6">
            <p
              className={`text-xs font-mono-data ${selectedTags.length < 3 ? "text-warning" : "text-positive"}`}
            >
              {selectedTags.length} selected{" "}
              {selectedTags.length < 3
                ? `— need ${3 - selectedTags.length} more`
                : "— good to go"}
            </p>
            <p className="text-xs text-muted-foreground">
              Your opposite will share exactly one
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="flex-1 py-2.5 bg-secondary text-foreground rounded-lg text-sm font-semibold hover:bg-secondary/80 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={selectedTags.length < 3}
              className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Philosophical orientation */}
      {step === 2 && (
        <div className="space-y-8 animate-slide-up">
          {philosophicalSliders.map((slider) => {
            const val = sliderValues[slider.id as keyof typeof sliderValues];
            return (
              <div key={slider.id}>
                <p className="text-xs text-muted-foreground mb-2">
                  {slider.description}
                </p>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-primary">
                    {slider.left}
                  </span>
                  <span className="text-xs font-mono-data text-muted-foreground">
                    {val}
                  </span>
                  <span className="text-xs font-semibold text-accent">
                    {slider.right}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={val}
                  onChange={(e) =>
                    setSliderValues((prev) => ({
                      ...prev,
                      [slider.id]: parseInt(e.target.value),
                    }))
                  }
                  className="slider-purple w-full"
                  aria-label={slider.description}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">0</span>
                  <span className="text-[10px] text-muted-foreground">50</span>
                  <span className="text-[10px] text-muted-foreground">100</span>
                </div>
              </div>
            );
          })}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-2.5 bg-secondary text-foreground rounded-lg text-sm font-semibold hover:bg-secondary/80 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all duration-150"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Role */}
      {step === 3 && (
        <div className="animate-slide-up">
          <div className="space-y-3 mb-6">
            {[
              {
                value: "creator",
                label: "Creator",
                description: "Get matched with your opposite and co-create projects. Moderator access is granted by an administrator.",
                icon: "PencilSquareIcon",
              },
            ].map((opt) => {
              const isSelected = watch("role") === opt.value;
              return (
                <label
                  key={`role-${opt.value}`}
                  htmlFor={`role-${opt.value}`}
                  className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <input
                    id={`role-${opt.value}`}
                    type="radio"
                    value={opt.value}
                    {...register("role")}
                    className="sr-only"
                  />
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-primary/20" : "bg-secondary"}`}
                  >
                    <Icon
                      name={opt.icon as Parameters<typeof Icon>[0]["name"]}
                      size={18}
                      className={
                        isSelected ? "text-primary" : "text-muted-foreground"
                      }
                    />
                  </div>
                  <div>
                    <p
                      className={`text-sm font-semibold mb-0.5 ${isSelected ? "text-primary" : "text-foreground"}`}
                    >
                      {opt.label}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {opt.description}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="ml-auto shrink-0">
                      <Icon
                        name="CheckCircleIcon"
                        size={18}
                        className="text-primary"
                      />
                    </div>
                  )}
                </label>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground mb-6">
            By joining, you agree to the{" "}
            <button type="button" className="text-primary hover:underline">
              Terms of Service
            </button>{" "}
            and{" "}
            <button type="button" className="text-primary hover:underline">
              Privacy Policy
            </button>
            .
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 py-2.5 bg-secondary text-foreground rounded-lg text-sm font-semibold hover:bg-secondary/80 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={isLoading}
              className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Icon
                    name="ArrowPathIcon"
                    size={14}
                    className="animate-spin"
                  />
                  Building your footprint…
                </>
              ) : (
                "Enter the Lab"
              )}
            </button>
          </div>
        </div>
      )}

      {step === 0 && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-primary font-semibold hover:underline"
          >
            Sign In
          </button>
        </p>
      )}
    </div>
  );
}
