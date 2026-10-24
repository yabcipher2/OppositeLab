"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import InstallAppButton from "@/components/InstallAppButton";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

type Preferences = {
  discoverable: boolean;
  showLocation: boolean;
  showInterests: boolean;
  showBio: boolean;
  showOnlineStatus: boolean;
  allowCommunityInvites: boolean;
  inAppMatchRequests: boolean;
  emailMatchRequests: boolean;
  inAppWorkspaceUpdates: boolean;
  emailWorkspaceUpdates: boolean;
  inAppCommunityActivity: boolean;
  emailCommunityActivity: boolean;
};
type PreferenceKey = keyof Preferences;
type AccountAction = "deactivate" | "delete";

const defaults: Preferences = {
  discoverable: true, showLocation: true, showInterests: true, showBio: true,
  showOnlineStatus: true, allowCommunityInvites: true,
  inAppMatchRequests: true, emailMatchRequests: true,
  inAppWorkspaceUpdates: true, emailWorkspaceUpdates: true,
  inAppCommunityActivity: true, emailCommunityActivity: false,
};
const privacyOptions: Array<{ key: PreferenceKey; title: string; description: string }> = [
  { key: "discoverable", title: "Appear in Discover", description: "Allow other creators to find and request a match with you." },
  { key: "showLocation", title: "Show my location", description: "Display your location to creators browsing Discover." },
  { key: "showInterests", title: "Show my interests", description: "Display your interests on your Discover profile." },
  { key: "showBio", title: "Show my bio", description: "Display your bio to creators browsing Discover." },
  { key: "showOnlineStatus", title: "Show when I am online", description: "Let project collaborators see your online presence." },
  { key: "allowCommunityInvites", title: "Allow community invitations", description: "Let community members invite you to their communities." },
];
const notificationRows: Array<{ title: string; inApp: PreferenceKey; email: PreferenceKey }> = [
  { title: "Match requests", inApp: "inAppMatchRequests", email: "emailMatchRequests" },
  { title: "Workspace updates", inApp: "inAppWorkspaceUpdates", email: "emailWorkspaceUpdates" },
  { title: "Community activity", inApp: "inAppCommunityActivity", email: "emailCommunityActivity" },
];
const themeOptions = [
  { value: "light", label: "Light", description: "Always use light mode", icon: "☀️" },
  { value: "dark", label: "Dark", description: "Always use dark mode", icon: "🌙" },
  { value: "system", label: "System", description: "Match your OS preference", icon: "💻" },
] as const;
const sizeOptions = [
  { value: "compact", label: "Compact", description: "Tighter spacing, more content" },
  { value: "comfortable", label: "Comfortable", description: "Balanced spacing (default)" },
  { value: "spacious", label: "Spacious", description: "More breathing room" },
] as const;

export default function SettingsPage() {
  const [preferences, setPreferences] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [passwordModal, setPasswordModal] = useState(false);
  const [accountAction, setAccountAction] = useState<AccountAction | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [securitySaving, setSecuritySaving] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preferenceRequests = useRef<Partial<Record<PreferenceKey, number>>>({});
  const { theme, setTheme, size, setSize } = useTheme();
  const { signOut, user } = useAuth();
  const router = useRouter();

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load settings.");
        return result.settings;
      })
      .then((settings: Partial<Preferences>) => { if (!cancelled) setPreferences({ ...defaults, ...settings }); })
      .catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load settings."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => {
      cancelled = true;
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const updatePreference = async (key: PreferenceKey, value: boolean) => {
    const requestId = (preferenceRequests.current[key] ?? 0) + 1;
    preferenceRequests.current[key] = requestId;
    setPreferences((current) => ({ ...current, [key]: value }));
    setError("");
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save this setting.");
      if (preferenceRequests.current[key] === requestId) showToast("Settings updated successfully");
    } catch (reason) {
      if (preferenceRequests.current[key] === requestId) {
        setPreferences((current) => ({ ...current, [key]: !value }));
        setError(reason instanceof Error ? reason.message : "Could not save this setting.");
      }
    }
  };

  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(""); setSecuritySaving(true);
    try {
      const response = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not change your password.");
      setPasswordModal(false); setCurrentPassword(""); setNewPassword("");
      showToast("Password changed successfully");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not change your password.");
    } finally { setSecuritySaving(false); }
  };

  const submitAccountAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accountAction) return;
    setError(""); setSecuritySaving(true);
    try {
      const response = await fetch("/api/profile/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: accountAction, password: currentPassword, confirmation }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not process this account action.");
      await signOut();
      router.replace("/sign-up-login-screen");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not process this account action.");
    } finally { setSecuritySaving(false); }
  };

  const inputClass = "mt-1 w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";
  const preferenceToggle = (key: PreferenceKey, title: string, description?: string) => (
    <label key={key} className="flex cursor-pointer items-center justify-between gap-5 py-4">
      <span><span className="block text-sm font-medium text-foreground">{title}</span>{description && <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span>}</span>
      <input type="checkbox" checked={preferences[key]} onChange={(event) => void updatePreference(key, event.target.checked)} disabled={loading} className="h-5 w-5 shrink-0 accent-primary disabled:opacity-50" />
    </label>
  );

  return (
    <AppLayout activePath="/settings">
      <main className="min-h-screen overflow-x-hidden bg-background px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <div className="mx-auto max-w-3xl space-y-6">
          <header><p className="text-xs font-semibold uppercase tracking-widest text-primary">Make it yours</p><h1 className="mt-2 text-3xl font-bold text-foreground">Settings</h1><p className="mt-2 text-sm text-muted-foreground">Manage your notifications, privacy, appearance, and account security.</p></header>
          <InstallAppButton />
          {error && <p role="alert" className="rounded-lg border border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative">{error}</p>}
          {loading ? <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">Loading settings…</p> : <>
            <section className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-7">
              <div><h2 className="text-lg font-semibold text-foreground">Appearance</h2><p className="mt-1 text-sm text-muted-foreground">Choose how OppositeLab looks and feels.</p></div>
              <div><h3 className="mb-2 text-sm font-medium text-foreground">Theme</h3><div className="grid grid-cols-1 gap-3 md:grid-cols-3">{themeOptions.map((option) => <button type="button" key={option.value} aria-pressed={theme === option.value} onClick={() => { if (theme !== option.value) { setTheme(option.value); showToast("Settings updated successfully"); } }} className={`rounded-xl border-2 p-4 text-left transition ${theme === option.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}><span className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-lg">{option.icon}</span><span><span className="block font-medium text-foreground">{option.label}</span><span className="text-xs text-muted-foreground">{option.description}</span></span></span></button>)}</div></div>
              <div><h3 className="mb-2 text-sm font-medium text-foreground">Interface Size</h3><div className="grid grid-cols-1 gap-3 md:grid-cols-3">{sizeOptions.map((option) => <button type="button" key={option.value} aria-pressed={size === option.value} onClick={() => { if (size !== option.value) { setSize(option.value); showToast("Settings updated successfully"); } }} className={`rounded-xl border-2 p-4 text-left transition ${size === option.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}><span className="block font-medium text-foreground">{option.label}</span><span className="text-xs text-muted-foreground">{option.description}</span></button>)}</div></div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
              <div><h2 className="text-lg font-semibold text-foreground">Discoverability &amp; Privacy</h2><p className="mt-1 text-sm text-muted-foreground">Control what other creators can see and how they can find you.</p></div>
              <div className="mt-2 divide-y divide-border">{privacyOptions.map((option) => preferenceToggle(option.key, option.title, option.description))}</div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
              <div><h2 className="text-lg font-semibold text-foreground">Notification Preferences</h2><p className="mt-1 text-sm text-muted-foreground">Choose where to receive each type of activity update.</p></div>
              <div className="mt-4 grid grid-cols-[minmax(0,1fr)_3.25rem_3.25rem] items-center gap-x-2 border-b border-border pb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid-cols-[minmax(0,1fr)_7rem_7rem] sm:gap-x-3"><span>Activity</span><span className="text-center">In-App</span><span className="text-center">Email Alerts</span></div>
              {notificationRows.map((row) => <div key={row.title} className="grid grid-cols-[minmax(0,1fr)_3.25rem_3.25rem] items-center gap-x-2 border-b border-border py-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_7rem_7rem] sm:gap-x-3"><span className="text-sm font-medium text-foreground">{row.title}</span><label className="flex min-h-11 cursor-pointer items-center justify-center"><span className="sr-only">{row.title} in-app notifications</span><input type="checkbox" checked={preferences[row.inApp]} onChange={(event) => void updatePreference(row.inApp, event.target.checked)} className="h-5 w-5 accent-primary" /></label><label className="flex min-h-11 cursor-pointer items-center justify-center"><span className="sr-only">{row.title} email alerts</span><input type="checkbox" checked={preferences[row.email]} onChange={(event) => void updatePreference(row.email, event.target.checked)} className="h-5 w-5 accent-primary" /></label></div>)}
            </section>

            <section className="rounded-2xl border border-primary/20 bg-card p-5 sm:p-7"><div><h2 className="text-lg font-semibold text-foreground">Signal Calibration</h2><p className="mt-1 text-sm text-muted-foreground">Refresh your worldview coordinates and creative interests to improve collaboration matches.</p></div><Link href="/onboarding" className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">🔄 Recalibrate Worldview &amp; Interests</Link></section>

            <section className="rounded-2xl border border-border bg-card p-5 sm:p-7"><div><h2 className="text-lg font-semibold text-foreground">Account Security</h2><p className="mt-1 text-sm text-muted-foreground">Update your password or manage your account.</p></div><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={() => { setCurrentPassword(""); setNewPassword(""); setPasswordModal(true); }} className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-secondary">Change Password</button><button type="button" disabled={user?.role === "admin"} onClick={() => { setAccountAction("deactivate"); setCurrentPassword(""); setConfirmation(""); }} className="rounded-lg border border-warning/40 px-4 py-2.5 text-sm font-semibold text-warning hover:bg-warning/10 disabled:cursor-not-allowed disabled:opacity-50">Deactivate Account</button><button type="button" disabled={user?.role === "admin"} onClick={() => { setAccountAction("delete"); setCurrentPassword(""); setConfirmation(""); }} className="rounded-lg bg-negative px-4 py-2.5 text-sm font-semibold text-white hover:bg-negative/90 disabled:cursor-not-allowed disabled:opacity-50">Delete Account</button></div><p className="mt-3 text-xs text-muted-foreground">Deactivation signs you out; an administrator can restore access. Deletion permanently removes your account and personal profile data. Administrator accounts must transfer administrator access before deactivation or deletion.</p></section>
          </>}
        </div>
      </main>
      {toast && <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-[60] rounded-lg bg-foreground px-4 py-3 text-sm font-medium text-background shadow-lg">{toast}</div>}
      {passwordModal && <div role="dialog" aria-modal="true" aria-labelledby="password-modal-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={changePassword} className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"><h2 id="password-modal-title" className="text-lg font-semibold">Change Password</h2><label className="mt-4 block text-sm font-medium">Current password<input required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className={inputClass} /></label><label className="mt-3 block text-sm font-medium">New password<input required type="password" minLength={10} maxLength={128} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className={inputClass} /><span className="mt-1 block text-xs font-normal text-muted-foreground">Use at least 10 characters.</span></label><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setPasswordModal(false)} className="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button><button disabled={securitySaving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{securitySaving ? "Updating…" : "Update password"}</button></div></form></div>}
      {accountAction && <div role="dialog" aria-modal="true" aria-labelledby="account-action-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={submitAccountAction} className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"><h2 id="account-action-title" className="text-lg font-semibold">{accountAction === "delete" ? "Permanently delete account?" : "Deactivate account?"}</h2><p className="mt-2 text-sm text-muted-foreground">{accountAction === "delete" ? "This permanently removes your account, profile, and account-linked access. This action cannot be undone." : "You will be signed out and your account will be suspended. An administrator can restore access."}</p><label className="mt-4 block text-sm font-medium">Confirm your password<input required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className={inputClass} /></label>{accountAction === "delete" && <label className="mt-3 block text-sm font-medium">Type DELETE to continue<input required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className={inputClass} /></label>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setAccountAction(null)} className="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button><button disabled={securitySaving || (accountAction === "delete" && confirmation !== "DELETE")} className="rounded-lg bg-negative px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{securitySaving ? "Processing…" : accountAction === "delete" ? "Permanently delete" : "Deactivate account"}</button></div></form></div>}
    </AppLayout>
  );
}
