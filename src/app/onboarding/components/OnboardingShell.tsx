"use client";

import React, { useEffect, useState } from "react";
import InterestsStep from "./InterestsStep";
import WorldviewStep from "./WorldviewStep";
import MicroHobbiesStep from "./MicroHobbiesStep";
import OnboardingComplete from "./OnboardingComplete";
import Icon from "@/components/ui/AppIcon";

const STEPS = [
  { id: "interests", label: "Digital Interests", icon: "SparklesIcon" },
  { id: "worldview", label: "Worldview", icon: "GlobeAltIcon" },
  { id: "hobbies", label: "Micro-Hobbies", icon: "PuzzlePieceIcon" },
];

export interface OnboardingData {
  interests: string[];
  worldviewSliders: Record<string, number>;
  worldviewPicks: string[];
  microHobbies: string[];
  customHobby: string;
}

const defaultData: OnboardingData = {
  interests: [],
  worldviewSliders: {
    "wv-order": 50,
    "wv-local": 50,
    "wv-empirical": 50,
    "wv-individual": 50,
  },
  worldviewPicks: [],
  microHobbies: [],
  customHobby: "",
};

export default function OnboardingShell() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(defaultData);
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [draftSaving, setDraftSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [advanceAttempted, setAdvanceAttempted] = useState(false);

  useEffect(() => {
    const returnToInterests = () => {
      setCompleted(false);
      setStep(0);
      setSaveError("");
    };
    window.addEventListener("oppositelab:edit-onboarding", returnToInterests);
    return () => window.removeEventListener("oppositelab:edit-onboarding", returnToInterests);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/onboarding", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load your saved interests.");
        return result.onboarding;
      })
      .then((saved) => {
        if (cancelled || !saved) return;
        if (saved.draft?.data) {
          setData((current) => ({ ...current, ...saved.draft.data }));
          setStep(Number.isInteger(saved.draft.step) ? Math.max(0, Math.min(STEPS.length - 1, saved.draft.step)) : 0);
        } else {
          setData((current) => ({ ...current, ...saved }));
          setStep(0);
        }
      })
      .catch((error) => {
        if (!cancelled) setSaveError(error instanceof Error ? error.message : "Could not load your saved interests.");
      })
      .finally(() => { if (!cancelled) setLoadingExisting(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (loadingExisting || completed || saving) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setDraftSaving(true);
      try {
        const response = await fetch("/api/onboarding", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step, data }),
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not save your onboarding progress.");
        setSaveError("");
      } catch (error) {
        if (!controller.signal.aborted) setSaveError(error instanceof Error ? error.message : "Could not save your onboarding progress.");
      } finally {
        if (!controller.signal.aborted) setDraftSaving(false);
      }
    }, 600);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [data, step, loadingExisting, completed, saving]);

  const updateData = (partial: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  const canAdvance = () => {
    if (step === 0) return data.interests.length >= 3;
    if (step === 1) return data.worldviewPicks.length >= 1;
    if (step === 2) return data.microHobbies.length >= 1;
    return true;
  };

  const selectionProgress = () => {
    if (step === 0) return { selected: data.interests.length, required: 3, noun: "interests" };
    if (step === 1) return { selected: data.worldviewPicks.length, required: 1, noun: "thinking archetype" };
    return { selected: data.microHobbies.length, required: 1, noun: "micro-hobby" };
  };

  const handleNext = async () => {
    if (!canAdvance()) {
      setAdvanceAttempted(true);
      return;
    }
    setAdvanceAttempted(false);
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      setSaving(true);
      setSaveError("");
      try {
        const response = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not save onboarding.");
        setCompleted(true);
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "Could not save onboarding.");
      } finally {
        setSaving(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setAdvanceAttempted(false);
      setStep((s) => s - 1);
    }
  };

  if (completed) {
    return <OnboardingComplete data={data} />;
  }

  if (loadingExisting) return <div className="min-h-screen bg-background p-10 text-sm text-muted-foreground">Loading your saved interests…</div>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex flex-col items-stretch justify-between gap-3 border-b border-border px-4 py-5 sm:flex-row sm:items-center sm:px-8">
        <div>
          <h1 className="text-lg font-bold text-foreground tracking-tight">
            Calibrate your signal
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            This data feeds the matching engine — the more precise, the more
            divergent your pair.
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <span className="text-xs font-mono-data text-muted-foreground">
            Step {step + 1} of {STEPS.length}{draftSaving ? " · Saving progress…" : " · Progress saved"}
          </span>
          <div className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i < step
                    ? "w-8 bg-primary"
                    : i === step
                      ? "w-8 bg-primary/60"
                      : "w-4 bg-border"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Step tabs */}
      <div className="overflow-x-auto border-b border-border px-4 sm:px-8">
        <div className="flex min-w-max gap-0">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { if (i < step) { setAdvanceAttempted(false); setStep(i); } }}
              disabled={i > step}
              className={`flex items-center gap-2 px-3 py-3.5 text-sm font-medium border-b-2 transition-all duration-150 sm:px-5 ${
                i === step
                  ? "border-primary text-primary"
                  : i < step
                    ? "border-transparent text-muted-foreground hover:text-foreground cursor-pointer"
                    : "border-transparent text-muted-foreground/40 cursor-not-allowed"
              }`}
            >
              <Icon
                name={s.icon as Parameters<typeof Icon>[0]["name"]}
                size={15}
                className={
                  i === step
                    ? "text-primary"
                    : i < step
                      ? "text-muted-foreground"
                      : "text-muted-foreground/40"
                }
              />
              {s.label}
              {i < step && (
                <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                  <Icon name="CheckIcon" size={9} className="text-primary" />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
          {step === 0 && (
            <InterestsStep
              selected={data.interests}
              onChange={(interests) => updateData({ interests })}
            />
          )}
          {step === 1 && (
            <WorldviewStep
              sliders={data.worldviewSliders}
              picks={data.worldviewPicks}
              onSlidersChange={(worldviewSliders) =>
                updateData({ worldviewSliders })
              }
              onPicksChange={(worldviewPicks) => updateData({ worldviewPicks })}
            />
          )}
          {step === 2 && (
            <MicroHobbiesStep
              selected={data.microHobbies}
              customHobby={data.customHobby}
              onChange={(microHobbies) => updateData({ microHobbies })}
              onCustomChange={(customHobby) => updateData({ customHobby })}
            />
          )}
        </div>
      </div>

      {/* Footer nav */}
      <div className="sticky bottom-0 z-30 border-t border-border bg-card/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur sm:px-8 sm:py-4">
        {advanceAttempted && !canAdvance() && <p role="alert" className="mx-auto mb-3 max-w-5xl rounded-lg border border-warning/30 bg-warning/10 px-4 py-2 text-sm text-warning">{step === 0 ? "Select at least 3 interests to continue." : step === 1 ? "Choose at least 1 thinking archetype to continue." : "Add at least 1 micro-hobby to complete calibration."}</p>}
        {saveError && <p role="alert" className="mx-auto mb-3 max-w-5xl text-sm text-negative">{saveError}</p>}
        <div className="mx-auto flex max-w-5xl flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={handleBack}
          disabled={step === 0}
          className="flex min-h-11 self-start items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 sm:self-auto"
        >
          <Icon name="ChevronLeftIcon" size={16} />
          Back
        </button>

        <div className="flex w-full items-center gap-3 sm:w-auto">
          <span className="hidden text-xs text-muted-foreground sm:inline">Selected: {selectionProgress().selected}/{selectionProgress().required} minimum required</span>
          <button
            onClick={handleNext}
            disabled={saving}
            className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-semibold text-primary-foreground transition-all duration-150 hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none sm:px-5"
          >
            {saving ? "Saving…" : step === STEPS.length - 1 ? "Complete Signal Calibration" : `Continue to Step ${step + 2}`}
            <Icon
              name={
                step === STEPS.length - 1 ? "CheckIcon" : "ChevronRightIcon"
              }
              size={15}
            />
          </button>
        </div>
        </div>
        <p className="mt-2 text-center text-xs font-medium text-muted-foreground sm:hidden">Selected: {selectionProgress().selected}/{selectionProgress().required} minimum required</p>
      </div>
    </div>
  );
}
