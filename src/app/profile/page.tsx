"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { interestLabel } from "@/lib/interest-catalog";
import { ImageViewerModal } from "@/components/ImageViewerModal";

type Profile = { name: string; role: string; location: string; bio: string; interests: string[]; portfolioUrl: string; githubUrl: string; socialUrl: string };
type SavedProfile = Omit<Partial<Profile>, "interests"> & { roleLabel?: string; photo?: string | null; interests?: string[] | string };
type Tab = "profile" | "security" | "notifications";
type Preferences = { inAppMatchRequests: boolean; emailMatchRequests: boolean; inAppWorkspaceUpdates: boolean; emailWorkspaceUpdates: boolean; inAppCommunityActivity: boolean; emailCommunityActivity: boolean };
const defaultPreferences: Preferences = { inAppMatchRequests: true, emailMatchRequests: true, inAppWorkspaceUpdates: true, emailWorkspaceUpdates: true, inAppCommunityActivity: true, emailCommunityActivity: false };
const preferenceOptions: Array<{ key: keyof Preferences; title: string; description: string }> = [
  { key: "inAppMatchRequests", title: "In-App: Match requests", description: "Show match request updates in OppositeLab." },
  { key: "emailMatchRequests", title: "Email: Match requests", description: "Send match request updates to your email address." },
  { key: "inAppWorkspaceUpdates", title: "In-App: Workspace updates", description: "Show workspace updates in OppositeLab." },
  { key: "emailWorkspaceUpdates", title: "Email: Workspace updates", description: "Send workspace updates to your email address." },
  { key: "inAppCommunityActivity", title: "In-App: Community activity", description: "Show community activity in OppositeLab." },
  { key: "emailCommunityActivity", title: "Email: Community activity", description: "Send community activity updates to your email address." },
];
const defaultProfile: Profile = { name: "", role: "", location: "", bio: "", interests: [], portfolioUrl: "", githubUrl: "", socialUrl: "" };

function displayInterest(value: string) {
  const catalogLabel = interestLabel(value);
  if (catalogLabel !== value) return catalogLabel;
  return value.replace(/^(int|hobby)-/i, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ProfilePage() {
  const [profile, setProfile] = useState(defaultProfile);
  const [photo, setPhoto] = useState<string | null>(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("profile");
  const [interestInput, setInterestInput] = useState("");
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [preferencesSaved, setPreferencesSaved] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { refreshUser, user } = useAuth();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load your profile.");
        return result.profile;
      })
      .then((savedProfile: SavedProfile) => {
        if (!cancelled) setProfile({
          name: savedProfile.name ?? defaultProfile.name,
          role: savedProfile.roleLabel ?? defaultProfile.role,
          location: savedProfile.location ?? "",
          bio: savedProfile.bio ?? "",
          interests: Array.isArray(savedProfile.interests) ? savedProfile.interests : typeof savedProfile.interests === "string" ? savedProfile.interests.split(",").map((item) => item.trim()).filter(Boolean) : [],
          portfolioUrl: savedProfile.portfolioUrl ?? "",
          githubUrl: savedProfile.githubUrl ?? "",
          socialUrl: savedProfile.socialUrl ?? "",
        });
        if (!cancelled) setPhoto(savedProfile.photo ?? null);
      })
      .catch((loadError) => { if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load your profile."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings", { cache: "no-store" }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load notification preferences.");
      return result.settings;
    }).then((settings: Partial<Preferences>) => { if (!cancelled) setPreferences({ ...defaultPreferences, ...settings }); })
      .catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load notification preferences."); });
    return () => { cancelled = true; };
  }, []);

  const update = (key: Exclude<keyof Profile, "interests">, value: string) => {
    setProfile((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const addInterest = () => {
    const tag = interestInput.trim().replace(/\s+/g, " ");
    if (!tag || profile.interests.some((interest) => interest.toLowerCase() === tag.toLowerCase())) return;
    setProfile((current) => ({ ...current, interests: [...current.interests, tag] }));
    setInterestInput("");
    setSaved(false);
  };

  const removeInterest = (tag: string) => {
    setProfile((current) => ({ ...current, interests: current.interests.filter((interest) => interest !== tag) }));
    setSaved(false);
  };

  const selectPhoto = async (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setError("Choose a JPG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("Profile photos must be 4 MB or smaller.");
      return;
    }
    setPhotoBusy(true);
    setError("");
    try {
      const formData = new FormData();
      formData.set("photo", file);
      const response = await fetch("/api/profile/photo", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not upload your profile photo.");
      setPhoto(result.photo);
      setSaved(false);
      await refreshUser();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload your profile photo.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    setError("");
    try {
      const response = await fetch("/api/profile/photo", { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not remove your profile photo.");
      setPhoto(result.photo);
      setSaved(false);
      await refreshUser();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Could not remove your profile photo.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profile.name, roleLabel: profile.role, location: profile.location, bio: profile.bio, interests: profile.interests, portfolioUrl: profile.portfolioUrl, githubUrl: profile.githubUrl, socialUrl: profile.socialUrl }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save your profile.");
      setSaved(true);
      await refreshUser();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const savePreferences = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setPreferencesSaved(false);
    try {
      const response = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(preferences) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save notification preferences.");
      setPreferencesSaved(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save notification preferences."); }
  };

  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setPasswordSaved(false); setPasswordSaving(true);
    try {
      const response = await fetch("/api/profile/password", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not change your password.");
      setCurrentPassword(""); setNewPassword(""); setPasswordSaved(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not change your password."); }
    finally { setPasswordSaving(false); }
  };

  const inputClass = "mt-1 w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";
  const tabs: Array<{ id: Tab; label: string }> = [{ id: "profile", label: "Profile Details" }, { id: "security", label: "Account & Security" }, { id: "notifications", label: "Notification Preferences" }];

  return (
    <AppLayout activePath="/profile">
      <main className="min-h-screen bg-background px-6 py-8 lg:px-10">
        <div className="mx-auto max-w-3xl">
          <header className="mb-7"><p className="text-xs font-semibold uppercase tracking-widest text-primary">Your account</p><h1 className="mt-2 text-3xl font-bold text-foreground">Profile</h1><p className="mt-2 text-sm text-muted-foreground">Edit the details other creators see when they discover you.</p></header>
          {saved && <p role="status" className="mb-4 rounded-lg border border-positive/30 bg-positive/10 px-4 py-3 text-sm text-positive">Profile saved.</p>}
          {preferencesSaved && <p role="status" className="mb-4 rounded-lg border border-positive/30 bg-positive/10 px-4 py-3 text-sm text-positive">Notification preferences saved.</p>}
          {passwordSaved && <p role="status" className="mb-4 rounded-lg border border-positive/30 bg-positive/10 px-4 py-3 text-sm text-positive">Password changed successfully.</p>}
          {error && <p role="alert" className="mb-4 rounded-lg border border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative">{error}</p>}
          <div className="mb-5 flex flex-wrap gap-2 border-b border-border pb-3" role="tablist" aria-label="Profile settings">
            {tabs.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={`rounded-lg px-4 py-2.5 text-sm font-semibold ${tab === item.id ? "bg-primary text-primary-foreground" : "border border-border text-foreground hover:bg-secondary"}`}>{item.label}</button>)}
          </div>
          {tab === "profile" && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4"><span className="text-sm text-foreground">Want to update your worldview calibration?</span><Link href="/onboarding" className="rounded-lg border border-primary/30 bg-card px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10">🔄 Recalibrate Signal Coordinates</Link></div>}
          {loading ? <p className="py-12 text-center text-sm text-muted-foreground">Loading your profile…</p> : tab === "profile" ? (
          <form onSubmit={saveProfile} className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-7">
            <section aria-labelledby="profile-photo-heading">
              <h2 id="profile-photo-heading" className="text-sm font-medium text-foreground">Profile photo</h2>
              <p className="mt-1 text-xs text-muted-foreground">Choose a JPG, PNG, WebP, or GIF up to 4 MB.</p>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary text-xl font-semibold text-muted-foreground" aria-label={photo ? "Selected profile photo preview" : "No profile photo selected"}>
                  {photo ? <button type="button" onClick={() => { setSelectedImage({ url: photo, name: "Your profile photo" }); setImageViewerOpen(true); }} className="h-full w-full"><img src={photo} alt="Profile photo preview" className="h-full w-full object-cover cursor-pointer hover:opacity-90 transition-opacity" /></button> : profile.name.trim().slice(0, 1).toUpperCase() || "?"}
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    aria-label="Choose profile photo"
                    onChange={(event) => {
                      selectPhoto(event.currentTarget.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                  <button type="button" disabled={photoBusy} onClick={() => photoInputRef.current?.click()} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary hover:text-primary disabled:opacity-60">
                    {photoBusy ? "Uploading..." : photo ? "Edit photo" : "Upload photo"}
                  </button>
                  {photo && <button type="button" disabled={photoBusy} onClick={() => void removePhoto()} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:text-negative disabled:opacity-60">Remove photo</button>}
                </div>
              </div>
            </section>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="text-sm font-medium text-foreground">Display name<input required maxLength={60} value={profile.name} onChange={(event) => update("name", event.target.value)} className={inputClass} /></label>
              <label className="text-sm font-medium text-foreground">Creative Discipline / Title<input required maxLength={80} placeholder="e.g., Full-Stack Developer, Systems Designer" value={profile.role} onChange={(event) => update("role", event.target.value)} className={inputClass} /></label>
            </div>
            <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium text-foreground">System role</span><span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-primary">{user?.role ?? "Creator"}</span><span className="text-xs text-muted-foreground">This account permission cannot be edited from your profile.</span></div>
            <label className="block text-sm font-medium text-foreground">Location<input maxLength={100} value={profile.location} onChange={(event) => update("location", event.target.value)} className={inputClass} /></label>
            <label className="block text-sm font-medium text-foreground">About you<textarea required rows={4} maxLength={500} value={profile.bio} onChange={(event) => update("bio", event.target.value)} className={inputClass} /></label>
            <section aria-labelledby="profile-interests-heading"><h2 id="profile-interests-heading" className="text-sm font-medium text-foreground">Interests</h2><p className="mt-1 text-xs text-muted-foreground">Add interests as tags. Existing calibration slugs are shown as readable labels.</p><div className="mt-3 flex flex-wrap gap-2">{profile.interests.map((tag) => <span key={tag} className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm text-foreground">{displayInterest(tag)}<button type="button" aria-label={`Remove ${displayInterest(tag)}`} onClick={() => removeInterest(tag)} className="rounded-full px-1 text-muted-foreground hover:bg-negative/10 hover:text-negative">×</button></span>)}{!profile.interests.length && <span className="text-sm text-muted-foreground">No interests added yet.</span>}</div><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input value={interestInput} onChange={(event) => setInterestInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addInterest(); } }} placeholder="Add an interest..." maxLength={60} className={`${inputClass} mt-0 min-w-0`} /><button type="button" onClick={addInterest} disabled={!interestInput.trim()} className="min-h-11 shrink-0 self-end rounded-lg border border-border px-4 py-2 text-sm font-medium disabled:opacity-50">Add tag</button></div></section>
            <section className="space-y-4 border-t border-border pt-5"><h2 className="text-base font-semibold text-foreground">Social &amp; external links</h2><label className="block text-sm font-medium text-foreground">Portfolio Website URL<input type="url" maxLength={300} placeholder="https://yourportfolio.com" value={profile.portfolioUrl} onChange={(event) => update("portfolioUrl", event.target.value)} className={inputClass} /></label><label className="block text-sm font-medium text-foreground">GitHub Username / Link<input maxLength={300} placeholder="username or https://github.com/username" value={profile.githubUrl} onChange={(event) => update("githubUrl", event.target.value)} className={inputClass} /></label><label className="block text-sm font-medium text-foreground">Twitter / X or LinkedIn profile<input maxLength={300} placeholder="https://..." value={profile.socialUrl} onChange={(event) => update("socialUrl", event.target.value)} className={inputClass} /></label></section>
            <div className="flex justify-end"><button type="submit" disabled={saving} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving..." : "Save changes"}</button></div>
          </form>
          ) : tab === "security" ? <div className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-7"><section><h2 className="text-lg font-semibold text-foreground">Account &amp; Security</h2><label className="mt-4 block text-sm font-medium text-foreground">Email address<input readOnly value={user?.email ?? ""} className={`${inputClass} cursor-not-allowed opacity-75`} /></label><p className="mt-1 text-xs text-muted-foreground">Contact support to change your account email.</p></section><form onSubmit={changePassword} className="space-y-4 border-t border-border pt-5"><h3 className="font-semibold text-foreground">Change password</h3><label className="block text-sm font-medium text-foreground">Current password<input required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className={inputClass} /></label><label className="block text-sm font-medium text-foreground">New password<input required type="password" minLength={10} maxLength={128} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className={inputClass} /><span className="mt-1 block text-xs font-normal text-muted-foreground">Use at least 10 characters.</span></label><div className="flex justify-end"><button type="submit" disabled={passwordSaving} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">{passwordSaving ? "Updating…" : "Update password"}</button></div></form></div> : <form onSubmit={savePreferences} className="rounded-2xl border border-border bg-card p-5 sm:p-7"><h2 className="text-lg font-semibold text-foreground">Notification Preferences</h2><p className="mt-1 text-sm text-muted-foreground">Choose what appears on your profile and which activity notifications you receive.</p><div className="mt-4 divide-y divide-border">{preferenceOptions.map((option) => <label key={option.key} className="flex cursor-pointer items-center justify-between gap-5 py-4"><span><span className="block text-sm font-medium text-foreground">{option.title}</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{option.description}</span></span><input type="checkbox" checked={preferences[option.key]} onChange={(event) => { setPreferences((current) => ({ ...current, [option.key]: event.target.checked })); setPreferencesSaved(false); }} className="h-5 w-5 shrink-0 accent-primary" /></label>)}</div><div className="mt-5 flex justify-end"><button type="submit" className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Save preferences</button></div></form>}
        </div>
      </main>
      <ImageViewerModal
        imageUrl={selectedImage?.url ?? ""}
        imageName={selectedImage?.name ?? ""}
        isOpen={imageViewerOpen}
        onClose={() => {
          setImageViewerOpen(false);
          setSelectedImage(null);
        }}
      />
    </AppLayout>
  );
}
