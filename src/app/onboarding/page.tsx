"use client";

import React from "react";
import AppLayout from "@/components/AppLayout";
import OnboardingShell from "./components/OnboardingShell";

export default function OnboardingPage() {
  return (
    <AppLayout activePath="/onboarding">
      <OnboardingShell />
    </AppLayout>
  );
}
