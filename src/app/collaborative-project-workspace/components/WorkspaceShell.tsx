"use client";

import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/ui/AppIcon";
import { LiveKitCall } from "@/components/LiveKitCall";
import { ImageViewerModal } from "@/components/ImageViewerModal";

type Collaborator = { id: string; name: string; role: string; photo?: string };
type Activity = { id: string; actorId: string; actorName: string; kind: string; createdAt: string };
type Project = {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  memberIds: string[];
  collaborators: Collaborator[];
  activity: Activity[];
};
type Milestone = { id: string; projectId: string; title: string; dueDate: string | null; completedAt: string | null };
type Version = { id: string; title: string; content: string; author: string; createdAt: string };
type WorkspaceComment = { id: string; authorId: string; authorName: string; text: string; createdAt: string };
type OutlineItem = { title: string; offset: number; level: number };
type OnlineMember = { userId: string; name: string; cursorOffset: number | null; isTyping: boolean };

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function relativeTime(value?: string) {
  if (!value) return "Not saved yet";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

function renderInlineFormatting(value: string) {
  return value.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index} className="rounded bg-secondary px-1 py-0.5 font-mono text-sm">{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    return part;
  });
}

function renderDocument(content: string, onImageClick?: (url: string, name: string) => void) {
  let offset = 0;
  let inCodeBlock = false;
  return content.split("\n").map((line, index) => {
    const start = offset;
    offset += line.length + 1;
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      return null;
    }
    if (inCodeBlock) return <pre key={index} className="overflow-x-auto rounded-lg bg-secondary/70 px-4 py-2 font-mono text-sm leading-6 text-foreground">{line || " "}</pre>;
    const heading = /^(#{1,3})\s+(.+)$/.exec(line.trim());
    if (heading) {
      const Tag = `h${heading[1].length}` as "h1" | "h2" | "h3";
      return <Tag id={`workspace-heading-${start}`} key={index} className={`scroll-mt-8 border-l-2 border-primary pl-5 font-bold tracking-tight text-foreground ${Tag === "h1" ? "my-8 text-3xl" : Tag === "h2" ? "my-6 text-2xl" : "my-5 text-xl"}`}>{heading[2]}</Tag>;
    }
    if (!line.trim()) return <div key={index} className="h-4" aria-hidden="true" />;
    const image = /^!\[([^\]]*)\]\((\/api\/workspace\/attachments\?id=[a-f\d]{24})\)$/.exec(line.trim());
    if (image) return <p key={index} className="my-3"><button type="button" onClick={() => onImageClick?.(image[2], image[1])} className="block"><img src={image[2]} alt={image[1]} className="max-h-96 max-w-full rounded-xl object-contain cursor-pointer hover:opacity-90 transition-opacity" /></button></p>;
    const link = /^\[([^\]]+)\]\((\/api\/workspace\/attachments\?id=[a-f\d]{24})\)$/.exec(line.trim());
    if (link) return <p key={index} className="text-lg leading-8"><a href={link[2]} className="text-primary underline" download>{link[1]}</a></p>;
    if (/^[-*]\s+/.test(line.trim())) return <p key={index} className="ml-5 text-lg leading-8 text-foreground">• {renderInlineFormatting(line.trim().slice(2))}</p>;
    return <p key={index} className="text-lg leading-8 text-foreground">{renderInlineFormatting(line)}</p>;
  });
}

// Memoized components to prevent unnecessary re-renders
const OutlineItem = React.memo(function OutlineItem({ item, index, editing, editorRef, level }: { item: OutlineItem; index: number; editing: boolean; editorRef: React.RefObject<HTMLTextAreaElement>; level: number }) {
  return (
    <button key={`${item.offset}-${item.title}`} type="button" onClick={() => { if (editing) { const editor = editorRef.current; if (editor) { editor.focus(); editor.setSelectionRange(item.offset, item.offset); } } else document.getElementById(`workspace-heading-${item.offset}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm text-muted-foreground hover:bg-secondary hover:text-foreground" style={{ paddingLeft: `${(level - 1) * 14 + 8}px` }}>
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${index % 2 ? "bg-accent" : "bg-primary"}`} /><span className="min-w-0 flex-1 truncate">{item.title}</span>
    </button>
  );
});

const ActivityEvent = React.memo(function ActivityEvent({ event, currentUserId, projectTitle }: { event: Activity; currentUserId: string; projectTitle: string }) {
  return (
    <li key={event.id} className="relative">
      <span className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full border-[3px] border-background ${event.actorId === currentUserId ? "bg-primary" : "bg-accent"}`} />
      <div className="flex items-center gap-2 text-xs">
        <span className={`font-bold ${event.actorId === currentUserId ? "text-primary" : "text-accent"}`}>{event.actorName}</span>
        <span className="text-muted-foreground">{event.kind}</span>
      </div>
      <p className="mt-1 text-sm font-medium text-foreground">{projectTitle}</p>
      <time className="mt-1 block text-xs text-muted-foreground" dateTime={new Date(event.createdAt).toISOString()}>{new Date(event.createdAt).toLocaleString()}</time>
    </li>
  );
});

const MilestoneItem = React.memo(function MilestoneItem({ milestone, onToggle }: { milestone: Milestone; onToggle: () => void }) {
  return (
    <li key={milestone.id} className="flex gap-3 py-3">
      <input type="checkbox" checked={Boolean(milestone.completedAt)} onChange={onToggle} aria-label={`Toggle ${milestone.title}`} className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" />
      <div>
        <p className={`text-sm font-medium ${milestone.completedAt ? "text-muted-foreground line-through" : "text-foreground"}`}>{milestone.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{milestone.dueDate ? `Due ${new Date(milestone.dueDate).toLocaleDateString()}` : "No due date"}</p>
      </div>
    </li>
  );
});

const VersionItem = React.memo(function VersionItem({ version, onRestore }: { version: Version; onRestore: () => void }) {
  return (
    <li key={version.id} className="rounded-xl border border-border bg-card p-4">
      <p className="truncate text-sm font-semibold text-foreground">{version.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{version.author} · {new Date(version.createdAt).toLocaleString()}</p>
      <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{version.content || "Empty document"}</p>
      <button type="button" onClick={onRestore} className="mt-3 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary">Restore this version</button>
    </li>
  );
});

const CommentItem = React.memo(function CommentItem({ comment }: { comment: WorkspaceComment }) {
  return (
    <li key={comment.id} className="rounded-lg bg-background px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-primary">{comment.authorName}</span>
        <time className="text-[10px] text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</time>
      </div>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">{comment.text}</p>
    </li>
  );
});

const CollaboratorAvatar = React.memo(function CollaboratorAvatar({ member, index, online }: { member: Collaborator; index: number; online: boolean }) {
  const initial = member.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return (
    <span key={member.id} title={`${member.name} · ${member.role}${online ? " · online" : ""}`} className={`relative grid h-10 w-10 place-items-center overflow-hidden rounded-full border-2 border-card text-xs font-bold ${index % 2 ? "bg-accent/20 text-accent" : "bg-primary/20 text-primary"}`}>{member.photo ? <img src={member.photo} alt="" className="h-full w-full object-cover" /> : initial}{online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-positive" />}</span>
  );
});

export default function WorkspaceShell() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMobileOutline, setShowMobileOutline] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserName, setCurrentUserName] = useState("You");
  const [resonancePoint, setResonancePoint] = useState("");
  const [resonanceDraft, setResonanceDraft] = useState("");
  const [editingResonance, setEditingResonance] = useState(false);
  const [savingResonance, setSavingResonance] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [activeTab, setActiveTab] = useState<"timeline" | "milestones" | "versions">("timeline");
  const [nominated, setNominated] = useState(false);
  const [nominationSignoffs, setNominationSignoffs] = useState<string[]>([]);
  const [nominationApprovalStatus, setNominationApprovalStatus] = useState<string | null>(null);
  const [nominationCount, setNominationCount] = useState(0);
  const [breakthroughIndex, setBreakthroughIndex] = useState<number | null>(null);
  const [voteCount, setVoteCount] = useState(0);
  const [nominating, setNominating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<WorkspaceComment[]>([]);
  const [sendingComment, setSendingComment] = useState(false);
  const [onlineMembers, setOnlineMembers] = useState<OnlineMember[]>([]);
  const [selectedText, setSelectedText] = useState("");
  const [selectionNotice, setSelectionNotice] = useState("");
  const [callOpen, setCallOpen] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);
  const cursorTimerRef = useRef<number | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const loadWorkspace = useCallback(async (preferredId?: string) => {
    const [workspaceResponse, matchResponse, userResponse, milestoneResponse] = await Promise.all([
      fetch("/api/workspace", { cache: "no-store" }),
      fetch("/api/matches", { cache: "no-store" }),
      fetch("/api/auth/me", { cache: "no-store" }),
      fetch("/api/milestones", { cache: "no-store" }),
    ]);
    const [workspaceData, matchData, userData, milestoneData] = await Promise.all([
      workspaceResponse.json(), matchResponse.json(), userResponse.json(), milestoneResponse.json(),
    ]);
    if (!workspaceResponse.ok) throw new Error(workspaceData.error ?? "Could not load workspace.");
    if (!matchResponse.ok) throw new Error(matchData.error ?? "Could not load match details.");
    if (!userResponse.ok) throw new Error(userData.error ?? "Could not load your profile.");
    const loadedProjects: Project[] = workspaceData.projects ?? [];
    setProjects(loadedProjects);
    const project = loadedProjects.find((item) => item.id === preferredId) ?? loadedProjects[0];
    setActiveId(project?.id ?? "");
    setTitle(project?.title ?? "");
    setContent(project?.content ?? "");
    setCurrentUserId(userData.user?._id ?? "");
    setCurrentUserName(userData.user?.name ?? "You");
    setMilestones(milestoneResponse.ok ? milestoneData.milestones ?? [] : []);
    const activeMatch = (matchData.matches ?? []).find((match: { status: string }) => match.status === "active");
    setResonancePoint(activeMatch?.resonancePoint ?? "");
  }, []);

  useEffect(() => {
    const preferredId = new URLSearchParams(window.location.search).get("projectId") ?? undefined;
    loadWorkspace(preferredId).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load workspace."))
      .finally(() => setLoading(false));
    const handleCommandProject = (event: Event) => {
      const customEvent = event as CustomEvent<{ projectId?: string | null }>;
      if (!customEvent.detail?.projectId) return;
      loadWorkspace(customEvent.detail.projectId).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load the selected workspace."));
    };
    window.addEventListener("oppositelab:workspace-project", handleCommandProject);
    return () => window.removeEventListener("oppositelab:workspace-project", handleCommandProject);
  }, [loadWorkspace]);

  const project = projects.find((item) => item.id === activeId) ?? null;
  const collaborators = project?.collaborators ?? [];
  const onlineCount = onlineMembers.length;
  const projectMilestones = milestones.filter((item) => item.projectId === activeId);
  const completedMilestones = projectMilestones.filter((item) => Boolean(item.completedAt)).length;
  const isMilestoneReached = projectMilestones.length > 0 && completedMilestones === projectMilestones.length;
  const wordCount = useMemo(() => content.trim() ? content.trim().split(/\s+/).length : 0, [content]);
  const outline = useMemo<OutlineItem[]>(() => {
    const result: OutlineItem[] = [];
    let offset = 0;
    for (const line of content.split("\n")) {
      const heading = /^(#{1,3})\s+(.+)$/.exec(line.trim());
      if (heading) result.push({ title: heading[2].trim(), offset, level: heading[1].length });
      offset += line.length + 1;
    }
    return result;
  }, [content]);
  const contributionCounts = useMemo(() => {
    const collaboratorsForBalance = project?.collaborators ?? [];
    const contributors = [
      ...collaboratorsForBalance.filter((member) => member.id === currentUserId),
      ...collaboratorsForBalance.filter((member) => member.id !== currentUserId).slice(0, 1),
    ];
    const counts = new Map<string, { name: string; count: number }>(
      contributors.map((member) => [member.id, { name: member.id === currentUserId ? "You" : member.name, count: 0 }]),
    );
    for (const event of project?.activity ?? []) {
      const previous = counts.get(event.actorId);
      if (previous) counts.set(event.actorId, { ...previous, count: previous.count + 1 });
    }
    const entries = Array.from(counts.entries()).map(([id, value]) => ({ id, ...value }));
    const total = entries.reduce((sum, entry) => sum + entry.count, 0);
    return { entries, total, share: (count: number) => total ? Math.round(count / total * 100) : 0 };
  }, [project?.activity, project?.collaborators, currentUserId]);
  const contributionPercent = contributionCounts.entries.map((entry) => contributionCounts.share(entry.count));
  const contributionWidth = (index: number) => {
    if (!contributionCounts.total) return 100 / Math.max(1, contributionCounts.entries.length);
    if (index === contributionCounts.entries.length - 1) {
      return Math.max(0, 100 - contributionCounts.entries.slice(0, index).reduce((sum, entry) => sum + contributionCounts.share(entry.count), 0));
    }
    return contributionPercent[index] ?? 0;
  };
  const balancedContribution = contributionPercent.length > 1 && contributionPercent[0] >= 40 && contributionPercent[0] <= 60;
  const allMilestonesComplete = projectMilestones.length > 0 && completedMilestones === projectMilestones.length;
  const selectedVersion = versions.find((version) => version.id === selectedVersionId) ?? versions[0] ?? null;
  const versionDiff = useMemo(() => {
    if (!selectedVersion) return { removed: [], added: [] };
    const oldLines = selectedVersion.content.split("\n");
    const currentLines = content.split("\n");
    const currentSet = new Set(currentLines);
    const oldSet = new Set(oldLines);
    return {
      removed: oldLines.filter((line) => line && !currentSet.has(line)),
      added: currentLines.filter((line) => line && !oldSet.has(line)),
    };
  }, [selectedVersion, content]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    const refreshSavedState = async () => {
      try {
        const [workspaceResponse, milestoneResponse, nominationResponse] = await Promise.all([
          fetch("/api/workspace", { cache: "no-store" }),
          fetch("/api/milestones", { cache: "no-store" }),
          fetch(`/api/workspace/nominate?projectId=${encodeURIComponent(activeId)}`, { cache: "no-store" }),
        ]);
        if (!workspaceResponse.ok) return;
        const workspaceData = await workspaceResponse.json();
        const milestoneData = milestoneResponse.ok ? await milestoneResponse.json() : null;
        const nominationData = nominationResponse.ok ? await nominationResponse.json() : null;
        if (cancelled) return;
        const latestProjects: Project[] = workspaceData.projects ?? [];
        setProjects(latestProjects);
        if (milestoneData) setMilestones(milestoneData.milestones ?? []);
        if (nominationData) {
          setNominationCount(Number(nominationData.count) || 0);
          setNominated(Boolean(nominationData.nominated));
          setNominationSignoffs(Array.isArray(nominationData.signoffs) ? nominationData.signoffs.flatMap((signoff: { memberId?: unknown; signed?: unknown }) => typeof signoff.memberId === "string" && signoff.signed ? [signoff.memberId] : []) : []);
          setNominationApprovalStatus(typeof nominationData.approvalStatus === "string" ? nominationData.approvalStatus : null);
          setBreakthroughIndex(typeof nominationData.breakthroughIndex === "number" ? nominationData.breakthroughIndex : null);
          setVoteCount(Number(nominationData.voteCount) || 0);
        }
        if (!editing) {
          const latest = latestProjects.find((item) => item.id === activeId);
          if (latest) { setTitle(latest.title); setContent(latest.content ?? ""); }
        }
      } catch { /* Existing saved data remains visible during a temporary network outage. */ }
    };
    void refreshSavedState();
    const timer = window.setInterval(() => void refreshSavedState(), 12000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [activeId, editing]);

  useEffect(() => {
    if (!activeId) { setNominated(false); setNominationSignoffs([]); setNominationApprovalStatus(null); setNominationCount(0); setBreakthroughIndex(null); setVoteCount(0); return; }
    let cancelled = false;
    fetch(`/api/workspace/nominate?projectId=${encodeURIComponent(activeId)}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => { if (!cancelled) { setNominated(Boolean(data.nominated)); setNominationSignoffs(Array.isArray(data.signoffs) ? data.signoffs.flatMap((signoff: { memberId?: unknown; signed?: unknown }) => typeof signoff.memberId === "string" && signoff.signed ? [signoff.memberId] : []) : []); setNominationApprovalStatus(typeof data.approvalStatus === "string" ? data.approvalStatus : null); setNominationCount(Number(data.count) || 0); setBreakthroughIndex(typeof data.breakthroughIndex === "number" ? data.breakthroughIndex : null); setVoteCount(Number(data.voteCount) || 0); } })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [activeId]);

  useEffect(() => {
    if (!activeId) { setComments([]); return; }
    let cancelled = false;
    fetch(`/api/workspace/comments?projectId=${encodeURIComponent(activeId)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load project comments.");
        if (!cancelled) setComments(data.comments ?? []);
      })
      .catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load project comments."); });
    return () => { cancelled = true; };
  }, [activeId]);

  useEffect(() => {
    if (!activeId) { setOnlineMembers([]); return; }
    let cancelled = false;
    const updatePresence = async () => {
      try {
        await fetch("/api/workspace/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: activeId }) });
        const response = await fetch(`/api/workspace/presence?projectId=${encodeURIComponent(activeId)}`, { cache: "no-store" });
        const data = await response.json();
        if (!cancelled && response.ok) setOnlineMembers(data.online ?? []);
      } catch { /* Presence is best effort; the workspace stays usable offline. */ }
    };
    void updatePresence();
    const timer = window.setInterval(() => void updatePresence(), 3000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [activeId, editing]);

  useEffect(() => () => {
    if (cursorTimerRef.current !== null) window.clearTimeout(cursorTimerRef.current);
  }, []);

  useEffect(() => {
    if (activeTab !== "versions" || !activeId) return;
    let cancelled = false;
    fetch(`/api/workspace/versions?projectId=${encodeURIComponent(activeId)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load versions.");
        if (!cancelled) {
          setVersions(data.versions ?? []);
          setSelectedVersionId((current) => current || data.versions?.[0]?.id || "");
        }
      })
      .catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load versions."); });
    return () => { cancelled = true; };
  }, [activeTab, activeId]);

  function selectProject(id: string) {
    const selected = projects.find((item) => item.id === id);
    if (!selected) return;
    setActiveId(selected.id);
    setTitle(selected.title);
    setContent(selected.content ?? "");
    setSelectedVersionId("");
    setVersions([]);
    setError("");
  }

  async function createProject(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError("");
    try {
      const response = await fetch("/api/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newTitle }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not create project.");
      setNewTitle("");
      await loadWorkspace(data.project.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create project.");
    } finally {
      setCreating(false);
    }
  }

  async function saveProject() {
    if (!activeId) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/workspace", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: activeId, title, content }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save workspace.");
      const event: Activity = { id: `${Date.now()}`, actorId: currentUserId, actorName: currentUserName, kind: "edited", createdAt: data.updatedAt ?? new Date().toISOString() };
      setProjects((items) => items.map((item) => item.id === activeId ? { ...item, title, content, updatedAt: event.createdAt, activity: [event, ...item.activity] } : item));
      setEditing(false);
      if (activeTab === "versions") {
        const versionResponse = await fetch(`/api/workspace/versions?projectId=${encodeURIComponent(activeId)}`, { cache: "no-store" });
        const versionData = await versionResponse.json();
        if (versionResponse.ok) {
          setVersions(versionData.versions ?? []);
          setSelectedVersionId((current) => current || versionData.versions?.[0]?.id || "");
        }
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save workspace.");
    } finally {
      setSaving(false);
    }
  }

  function publishCursor(cursorOffset: number, isTyping: boolean) {
    if (!activeId) return;
    if (cursorTimerRef.current !== null) window.clearTimeout(cursorTimerRef.current);
    cursorTimerRef.current = window.setTimeout(() => {
      void fetch("/api/workspace/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeId, cursorOffset, isTyping }),
      }).catch(() => undefined);
    }, 250);
  }

  function updateSelection(editor: HTMLTextAreaElement) {
    setSelectedText(editor.value.slice(editor.selectionStart, editor.selectionEnd).trim());
    publishCursor(editor.selectionStart, editing);
  }

  function formatSelection(before: string, after = before) {
    const editor = editorRef.current;
    if (!editor) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = content.slice(start, end);
    const replacement = `${before}${selected || "text"}${after}`;
    const nextContent = `${content.slice(0, start)}${replacement}${content.slice(end)}`;
    setContent(nextContent);
    window.requestAnimationFrame(() => {
      editor.focus();
      editor.setSelectionRange(start + before.length, start + before.length + (selected || "text").length);
    });
  }

  async function uploadWorkspaceAttachment(file: File) {
    if (!activeId) return;
    setError("");
    try {
      const form = new FormData();
      form.set("projectId", activeId);
      form.set("file", file);
      const response = await fetch("/api/workspace/attachments", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not upload attachment.");
      const attachment = data.attachment as { name: string; type: string; url: string };
      const markdown = attachment.type.startsWith("image/") && attachment.type !== "image/svg+xml"
        ? `![${attachment.name}](${attachment.url})`
        : `[${attachment.name}](${attachment.url})`;
      setContent((current) => `${current}${current && !current.endsWith("\n") ? "\n" : ""}${markdown}\n`);
      setEditing(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not upload attachment.");
    }
  }

  async function submitSelectionAction(action: "comment" | "suggestion" | "dissonant") {
    if (!activeId || !selectedText) return;
    if (action === "comment") {
      setCommentText(`Regarding “${selectedText}”: `);
      setCommenting(true);
      setSelectedText("");
      return;
    }
    setError("");
    try {
      const label = action === "suggestion" ? "Suggested edit" : "Marked as dissonant";
      const response = await fetch("/api/workspace/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeId, text: `${label}:\n“${selectedText}”` }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? `Could not submit ${action}.`);
      setComments((current) => [...current, data.comment]);
      setSelectedText("");
      setSelectionNotice(action === "suggestion" ? "Suggestion added to project comments." : "Dissonant passage added to project comments.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Could not submit ${action}.`);
    }
  }

  async function saveResonancePoint(event: FormEvent) {
    event.preventDefault();
    if (!activeId || !resonanceDraft.trim()) return;
    setSavingResonance(true);
    setError("");
    try {
      const response = await fetch("/api/workspace/resonance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeId, resonancePoint: resonanceDraft }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save resonance point.");
      setResonancePoint(data.resonancePoint);
      setEditingResonance(false);
      setResonanceDraft("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save resonance point.");
    } finally {
      setSavingResonance(false);
    }
  }

  async function addComment(event: FormEvent) {
    event.preventDefault();
    if (!activeId || !commentText.trim()) return;
    setSendingComment(true);
    setError("");
    try {
      const response = await fetch("/api/workspace/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: activeId, text: commentText }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not add comment.");
      setComments((items) => [...items, data.comment]);
      setCommentText("");
      setCommenting(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not add comment.");
    } finally {
      setSendingComment(false);
    }
  }

  function exportProject() {
    if (!project) return;
    const markdown = `# ${title.trim() || project.title}\n\n${content}`;
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(title.trim() || project.title).replace(/[^a-z0-9-_]+/gi, "-")}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function nominate() {
    if (!activeId || nominated) return;
    setNominating(true);
    setError("");
    try {
      const response = await fetch("/api/workspace/nominate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: activeId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not nominate this project.");
      setNominated(true);
      setNominationSignoffs(Array.isArray(data.signoffs) ? data.signoffs.flatMap((signoff: { memberId?: unknown; signed?: unknown }) => typeof signoff.memberId === "string" && signoff.signed ? [signoff.memberId] : []) : []);
      setNominationApprovalStatus(typeof data.approvalStatus === "string" ? data.approvalStatus : "pending");
      setNominationCount(Number(data.count) || nominationCount + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not nominate this project.");
    } finally {
      setNominating(false);
    }
  }

  async function addMilestone(event: FormEvent) {
    event.preventDefault();
    if (!activeId || !milestoneTitle.trim()) return;
    setError("");
    try {
      const response = await fetch("/api/milestones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: activeId, title: milestoneTitle, dueDate: milestoneDate || undefined }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not add milestone.");
      setMilestones((items) => [...items, data.milestone]);
      setMilestoneTitle("");
      setMilestoneDate("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not add milestone.");
    }
  }

  async function toggleMilestone(milestone: Milestone) {
    try {
      const response = await fetch("/api/milestones", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: milestone.id, completed: !milestone.completedAt }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not update milestone.");
      setMilestones((items) => items.map((item) => item.id === milestone.id ? { ...item, completedAt: data.completedAt } : item));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update milestone.");
    }
  }

  async function restoreVersion(version: Version) {
    if (!activeId || !window.confirm(`Restore “${version.title}” from ${new Date(version.createdAt).toLocaleString()}?`)) return;
    try {
      const response = await fetch("/api/workspace/versions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: activeId, versionId: version.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not restore version.");
      setTitle(data.title);
      setContent(data.content);
      setEditing(false);
      setProjects((items) => items.map((item) => item.id === activeId ? { ...item, title: data.title, content: data.content, updatedAt: data.updatedAt } : item));
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not restore version.");
    }
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading your workspace…</div>;

  if (!projects.length) {
    return (
      <main className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-20 flex min-h-[98px] flex-wrap items-center gap-3 border-b border-border bg-card px-5 py-3 xl:flex-nowrap xl:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3 xl:flex-none xl:w-[170px]">
            <Icon name="DocumentTextIcon" size={19} className="shrink-0 text-muted-foreground" />
            <div className="min-w-0"><p className="truncate text-base font-bold text-foreground">New workspace</p></div>
          </div>
          <span className="whitespace-nowrap rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground">In Progress</span>
          <span className="hidden items-center gap-2 whitespace-nowrap rounded-full border border-border px-3 py-2 text-xs font-semibold text-muted-foreground 2xl:flex"><span className="h-2 w-2 rounded-full bg-muted-foreground" />Waiting for collaborators</span>
          <div className="hidden max-w-[260px] items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground xl:flex"><span className="text-warning">⚡</span><span className="truncate">No resonance point recorded</span></div>
          <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-card bg-primary/20 text-xs font-bold text-primary" title={currentUserName}>{initials(currentUserName)}</span>
          <span className="hidden whitespace-nowrap text-xs text-muted-foreground 2xl:block">No project saved</span>
          <button type="button" disabled className="flex shrink-0 cursor-not-allowed items-center gap-2 whitespace-nowrap rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm font-semibold text-muted-foreground opacity-60"><Icon name="ArrowDownTrayIcon" size={16} />Export</button>
          <button type="button" disabled className="flex shrink-0 cursor-not-allowed items-center gap-2 whitespace-nowrap rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground opacity-60"><Icon name="SparklesIcon" size={16} />Nominate</button>
        </header>
        {error && <p role="alert" className="border-b border-negative/30 bg-negative/10 px-5 py-2 text-sm text-negative">{error}</p>}
        <div className="grid flex-1 grid-cols-1 xl:grid-cols-[minmax(220px,0.36fr)_minmax(0,1fr)_minmax(260px,0.42fr)] 2xl:grid-cols-[minmax(280px,0.44fr)_minmax(0,1fr)_minmax(340px,0.57fr)]">
          <aside className="hidden border-r border-border bg-background px-4 py-6 xl:block 2xl:px-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Project outline</p>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground"><span>0 words</span><span className="text-primary">● {currentUserName}</span></div>
            <div className="mt-6"><div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>Contribution balance</span><span>—</span></div><div className="h-2 rounded-full bg-secondary" /></div>
            <div className="mt-7 rounded-xl border border-dashed border-border p-4 text-sm leading-6 text-muted-foreground">Your document outline will appear here after you create the project and add headings.</div>
          </aside>
          <section className="min-w-0 border-b border-border px-5 py-6 xl:border-b-0 xl:border-r xl:border-border xl:px-5 2xl:px-8">
            <div className="mx-auto max-w-4xl">
              <div className="mb-5 rounded-2xl border border-border bg-card px-5 py-4 sm:px-7"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary"><span className="text-warning">⚡</span>Resonance anchor — always visible</p><p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">A shared resonance point will appear when your project is connected to an active match.</p></div>
              <div className="mb-4 border-t border-border pt-5"><h1 className="border-l-2 border-primary py-2 pl-4 text-2xl font-bold text-foreground sm:text-3xl">Create your shared project</h1><p className="mt-3 pl-5 text-sm leading-6 text-muted-foreground">Start a project. If you have an active match, your partner will be added automatically.</p></div>
              <form onSubmit={createProject} className="space-y-4 border-l-2 border-primary/70 px-5 py-6 sm:px-7"><label htmlFor="new-project-title" className="block text-sm font-medium text-muted-foreground">Project name</label><input id="new-project-title" required maxLength={120} value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="Give your collaboration a name" className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground outline-none focus:border-primary" /><button disabled={creating} className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60">{creating ? "Creating…" : "Create project"}</button></form>
            </div>
          </section>
          <aside className="flex min-h-[620px] min-w-0 flex-col bg-background xl:border-l xl:border-border">
            <div className="flex border-b border-border px-2" role="tablist" aria-label="Workspace side panel">{([["timeline", "ClockIcon", "Timeline"], ["milestones", "TrophyIcon", "Milestones"], ["versions", "ArchiveBoxIcon", "Versions"]] as const).map(([tab, icon, label]) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`flex min-w-0 flex-1 items-center justify-center gap-2 border-b-2 px-2 py-4 text-xs font-semibold transition sm:text-sm ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}><Icon name={icon} size={15} />{label}</button>)}</div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {activeTab === "timeline" && <><h2 className="mb-5 font-semibold text-foreground">Contribution feed</h2><p className="rounded-xl border border-dashed border-border p-5 text-sm leading-6 text-muted-foreground">Project edits will appear here after you create a project and save changes.</p></>}
              {activeTab === "milestones" && <><h2 className="font-semibold text-foreground">Project milestones</h2><p className="mt-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Create a project to add and track milestones.</p></>}
              {activeTab === "versions" && <><h2 className="font-semibold text-foreground">Version history</h2><p className="mt-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Saved project revisions will appear here.</p></>}
            </div>
            <div className="border-t border-border p-5"><div className="rounded-2xl border border-border bg-card p-4"><div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-sm font-semibold"><Icon name="SparklesIcon" size={17} className="text-primary" />Breakthrough index</h3><span className="font-mono-data text-muted-foreground">—</span></div><p className="mt-3 text-xs leading-5 text-muted-foreground">The community can review your project after it has been created and nominated.</p><button type="button" disabled className="mt-4 w-full cursor-not-allowed rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground opacity-60">Nominate for Community Review</button></div></div>
          </aside>
        </div>
      </main>
    );
  }

  const outlineOffsets = outline;

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <header className="relative z-20 flex min-h-[98px] shrink-0 flex-wrap items-center gap-4 border-b border-border bg-card px-5 py-3 xl:flex-nowrap xl:px-7">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Icon name="DocumentTextIcon" size={19} className="shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <label className="sr-only" htmlFor="workspace-project">Workspace project</label>
            <select id="workspace-project" value={activeId} onChange={(event) => selectProject(event.target.value)} className="max-w-[230px] truncate bg-transparent text-base font-bold text-foreground outline-none sm:max-w-[300px]">
              {projects.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{onlineCount > 0 && onlineCount >= collaborators.length ? `${onlineCount} collaborators` : `${collaborators.length} collaborator${collaborators.length === 1 ? "" : "s"}`}</p>
          </div>
        </div>
        <span className={`rounded-lg border px-3 py-2 text-xs font-semibold ${isMilestoneReached ? "border-primary/30 text-primary" : "border-border text-muted-foreground"}`}>
          {isMilestoneReached ? "Milestone Reached" : "In Progress"}
        </span>
        <span className="flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-semibold text-foreground" title={`${onlineCount} of ${collaborators.length} collaborators online`}><span className={`h-2 w-2 rounded-full ${onlineCount ? "bg-positive" : "bg-muted-foreground"}`} />{collaborators.length > 0 && onlineCount >= collaborators.length ? "Both online" : `${onlineCount} online`}</span>
        <div className="hidden max-w-[340px] items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground xl:flex">
          <span className="text-warning">⚡</span><span className="truncate">{resonancePoint || "No resonance point recorded"}</span>
        </div>
        <div className="flex items-center -space-x-2" aria-label="Project collaborators">
          {(project?.collaborators ?? []).slice(0, 4).map((member, index) => (
            <CollaboratorAvatar key={member.id} member={member} index={index} online={onlineMembers.some((onlineMember) => onlineMember.userId === member.id)} />
          ))}
        </div>
        <button type="button" onClick={() => setShowMobileOutline(true)} className="min-h-11 rounded-xl border border-border px-3 text-sm font-semibold text-foreground xl:hidden">Outline</button>
        <span className="hidden text-xs text-muted-foreground md:block">Saved<br />{relativeTime(project?.updatedAt)}</span>
        {project && <button type="button" onClick={() => setCallOpen(true)} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110">Start / join call</button>}
        <button type="button" onClick={exportProject} className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary/70"><Icon name="ArrowDownTrayIcon" size={16} />Export</button>
        <button type="button" onClick={() => void nominate()} disabled={!activeId || nominated || nominating} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-default disabled:opacity-60"><Icon name="SparklesIcon" size={16} />{nominating ? "Submitting…" : nominated ? "Nominated" : "Nominate"}</button>
      </header>

      {callOpen && project && <LiveKitCall type="workspace" resourceId={project.id} title={`${project.title} workspace call`} onClose={() => setCallOpen(false)} />}
      {showMobileOutline && <button type="button" aria-label="Close project outline" onClick={() => setShowMobileOutline(false)} className="fixed inset-0 z-30 bg-black/60 xl:hidden" />}
      <aside className={`fixed inset-y-0 right-0 z-40 w-[min(88vw,360px)] overflow-y-auto border-l border-border bg-card p-5 shadow-xl transition-transform xl:hidden ${showMobileOutline ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">Project outline</h2>
          <button type="button" onClick={() => setShowMobileOutline(false)} aria-label="Close project outline" className="flex h-11 w-11 items-center justify-center rounded-lg border border-border">✕</button>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>{wordCount.toLocaleString()} words</span><span>{collaborators.length} collaborators</span></div>
        <div className="mt-6">
          <div className="mb-2 flex justify-between gap-3 text-xs text-muted-foreground"><span>Contribution balance</span><span className="text-right">{contributionCounts.entries.length ? contributionCounts.entries.map((entry) => `${entry.name} ${contributionCounts.total ? contributionCounts.share(entry.count) : Math.round(100 / contributionCounts.entries.length)}%`).join(" / ") : "—"}</span></div>
          <div className="flex h-2 overflow-hidden rounded-full bg-secondary">
            {contributionCounts.entries.map((entry, index) => <span key={entry.id} className={index === 0 ? "bg-primary" : "bg-accent"} style={{ width: `${contributionWidth(index)}%` }} />)}
          </div>
        </div>
        <nav className="mt-7 space-y-1" aria-label="Project outline">
          {outlineOffsets.length ? outlineOffsets.map((item, index) => (
            <OutlineItem key={`mobile-${item.offset}-${item.title}`} item={item} index={index} editing={editing} editorRef={editorRef} level={item.level} />
          )) : <p className="px-2 py-3 text-xs leading-5 text-muted-foreground">Add Markdown headings using <code className="text-primary"># Heading</code> to build your outline.</p>}
        </nav>
      </aside>

      {error && <p role="alert" className="border-b border-negative/30 bg-negative/10 px-5 py-2 text-sm text-negative">{error}</p>}

      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(240px,0.38fr)_minmax(0,1fr)_minmax(300px,0.48fr)] 2xl:grid-cols-[minmax(280px,0.44fr)_minmax(0,1fr)_minmax(340px,0.57fr)]">
        <aside className="hidden min-h-0 overflow-y-auto border-r border-border bg-background px-5 py-6 xl:block">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Project outline</p>
          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{wordCount.toLocaleString()} words</span><span className="flex gap-3"><span className="text-primary">● {currentUserName}</span>{project?.collaborators.filter((member) => member.id !== currentUserId).map((member) => <span key={member.id} className="text-accent">● {member.name}</span>)}</span></div>
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>Contribution balance</span><span>{contributionCounts.entries.length ? contributionCounts.entries.map((entry) => `${entry.name} ${contributionCounts.total ? contributionCounts.share(entry.count) : Math.round(100 / contributionCounts.entries.length)}%`).join(" / ") : "—"}</span></div>
            <div className="flex h-2 overflow-hidden rounded-full bg-secondary">
              {contributionCounts.entries.map((entry, index) => <span key={entry.id} className={`transition-all ${index === 0 ? "bg-primary" : "bg-accent"}`} style={{ width: `${contributionWidth(index)}%` }} title={`${entry.name}: ${entry.count} saved changes (${contributionCounts.total ? contributionCounts.share(entry.count) : Math.round(100 / Math.max(1, contributionCounts.entries.length))}%)`} />)}
            </div>
            {!contributionCounts.total && <p className="mt-2 text-xs text-muted-foreground">Saved edits appear here as collaborators make changes.</p>}
          </div>
          <nav className="mt-7 space-y-1" aria-label="Project outline">
            {outlineOffsets.length ? outlineOffsets.map((item, index) => (
              <OutlineItem key={`${item.offset}-${item.title}`} item={item} index={index} editing={editing} editorRef={editorRef} level={item.level} />
            )) : <p className="px-2 py-3 text-xs leading-5 text-muted-foreground">Add Markdown headings using <code className="text-primary"># Heading</code> to build your outline.</p>}
          </nav>
        </aside>

        <section className="min-h-0 min-w-0 overflow-y-auto border-b border-border px-5 py-6 xl:border-b-0 xl:border-r xl:border-border xl:px-6 2xl:px-10">
          <div className="mx-auto max-w-4xl">
            <div className="mb-5 rounded-2xl border border-border bg-card px-5 py-4 sm:px-7">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary"><span className="text-warning">⚡</span>Resonance anchor — always visible</p>
              {editingResonance
                ? <form onSubmit={saveResonancePoint} className="mt-3 flex flex-col gap-2 sm:flex-row"><input autoFocus maxLength={500} required value={resonanceDraft} onChange={(event) => setResonanceDraft(event.target.value)} placeholder="What shared point anchors this collaboration?" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" /><button disabled={savingResonance || !resonanceDraft.trim()} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{savingResonance ? "Saving…" : "Save resonance point"}</button><button type="button" onClick={() => { setEditingResonance(false); setResonanceDraft(""); }} className="rounded-lg border border-border px-3 py-2 text-sm">Cancel</button></form>
                : <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><p className="text-sm leading-6 text-foreground sm:text-base">{resonancePoint || "No resonance point has been saved for your active match yet."}</p><button type="button" onClick={() => { setResonanceDraft(resonancePoint); setEditingResonance(true); }} className="shrink-0 rounded-lg border border-primary/40 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5">{resonancePoint ? "Edit resonance point" : "+ Set Resonance Point"}</button></div>}
            </div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
              {editing ? <input aria-label="Project title" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} className="min-w-0 flex-1 border-l-2 border-primary bg-transparent py-2 pl-4 text-2xl font-bold text-foreground outline-none focus:bg-card/40" /> : <h1 className="min-w-0 flex-1 truncate border-l-2 border-primary py-2 pl-4 text-2xl font-bold text-foreground">{title}</h1>}
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{saving ? "Saving…" : `Saved ${relativeTime(project?.updatedAt)}`}</span>
                {!editing && <button type="button" onClick={() => setCommenting((open) => !open)} aria-expanded={commenting} className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:border-primary"><Icon name="ChatBubbleLeftRightIcon" size={16} />Comment{comments.length > 0 && <span className="text-xs text-muted-foreground">{comments.length}</span>}</button>}
                {editing ? <button type="button" onClick={() => void saveProject()} disabled={saving} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? "Saving…" : "Save changes"}</button> : <button type="button" onClick={() => setEditing(true)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:border-primary">Edit</button>}
              </div>
            </div>
            {commenting && <section className="mb-5 rounded-xl border border-border bg-card p-4" aria-label="Project comments"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-foreground">Comments</h2><button type="button" onClick={() => setCommenting(false)} className="text-xs text-muted-foreground hover:text-foreground">Close</button></div>{comments.length ? <ul className="mb-4 max-h-56 space-y-3 overflow-y-auto">{comments.map((comment) => <CommentItem key={comment.id} comment={comment} />)}</ul> : <p className="mb-3 text-sm text-muted-foreground">No comments yet. Start the conversation with your collaborators.</p>}<form onSubmit={addComment} className="flex flex-col gap-2 sm:flex-row"><textarea required maxLength={2000} rows={2} value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Write a comment for your collaborators…" className="min-w-0 flex-1 resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" /><button type="submit" disabled={!commentText.trim() || sendingComment} className="self-end rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{sendingComment ? "Sending…" : "Post comment"}</button></form></section>}
            <label className="sr-only" htmlFor="shared-document">Shared project document</label>
            {editing && <div className="sticky top-0 z-10 -mx-1 mb-3 flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card/95 p-2 shadow-sm backdrop-blur" role="toolbar" aria-label="Document formatting">
              <button type="button" onClick={() => formatSelection("**")} className="rounded-lg border border-border px-3 py-1.5 text-sm font-bold hover:border-primary" aria-label="Bold">B</button>
              <button type="button" onClick={() => formatSelection("*")} className="rounded-lg border border-border px-3 py-1.5 text-sm italic hover:border-primary" aria-label="Italic">I</button>
              <button type="button" onClick={() => formatSelection("## ", "")} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary" aria-label="Heading">H2</button>
              <button type="button" onClick={() => formatSelection("- ", "")} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:border-primary" aria-label="List">List</button>
              <button type="button" onClick={() => formatSelection("```\n", "\n```")} className="rounded-lg border border-border px-3 py-1.5 font-mono text-xs hover:border-primary" aria-label="Code block">Code</button>
              <button type="button" onClick={() => attachmentInputRef.current?.click()} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:border-primary">Attach</button>
              <input ref={attachmentInputRef} type="file" className="hidden" aria-label="Attach file to document" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void uploadWorkspaceAttachment(file); }} />
              <span className="ml-auto text-[11px] text-muted-foreground">Markdown formatting</span>
            </div>}
            {editing && <div className="mb-2 flex flex-wrap gap-2" aria-live="polite">{onlineMembers.filter((member) => member.userId !== currentUserId && member.isTyping && member.cursorOffset !== null).map((member) => {
              const cursorText = content.slice(0, Math.min(member.cursorOffset ?? 0, content.length));
              const line = cursorText.split("\n").length;
              const column = (cursorText.length - cursorText.lastIndexOf("\n"));
              return <span key={member.userId} className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent" title={`${member.name} is typing at line ${line}, column ${column}`}>{member.name} · L{line}:{column}</span>;
            })}</div>}
            {editing ? <div className="relative">
              {selectedText && <div className="absolute -top-11 left-4 z-20 flex gap-1 rounded-xl border border-border bg-card p-1 shadow-lg"><button type="button" onClick={() => void submitSelectionAction("comment")} className="rounded-lg px-2 py-1 text-xs font-semibold hover:bg-secondary">Comment</button><button type="button" onClick={() => void submitSelectionAction("suggestion")} className="rounded-lg px-2 py-1 text-xs font-semibold hover:bg-secondary">Suggest Edit</button><button type="button" onClick={() => void submitSelectionAction("dissonant")} className="rounded-lg px-2 py-1 text-xs font-semibold text-negative hover:bg-negative/10">Mark as Dissonant</button></div>}
              <textarea ref={editorRef} id="shared-document" value={content} onChange={(event) => { setContent(event.target.value); publishCursor(event.currentTarget.selectionStart, true); }} onSelect={(event) => updateSelection(event.currentTarget)} onKeyUp={(event) => updateSelection(event.currentTarget)} onClick={(event) => updateSelection(event.currentTarget)} onBlur={() => publishCursor(editorRef.current?.selectionStart ?? 0, false)} maxLength={200000} placeholder="Write your shared project here. Use Markdown headings (#, ##, ###) to organize sections and build the project outline." className="min-h-[58vh] w-full resize-y border-l-2 border-primary/70 bg-transparent px-5 py-6 text-base leading-8 text-foreground outline-none placeholder:text-muted-foreground/70 focus:bg-card/20 sm:px-7 sm:text-lg" />
            </div> : <article id="shared-document" className="min-h-[58vh] space-y-4 border-l-2 border-primary/70 px-5 py-6 sm:px-7">{content.trim() ? renderDocument(content, (url, name) => { setSelectedImage({ url, name }); setImageViewerOpen(true); }) : <div className="py-10 text-center text-sm text-muted-foreground">This project document is empty. <button type="button" onClick={() => setEditing(true)} className="font-semibold text-primary hover:underline">Start writing</button></div>}</article>}
            {selectionNotice && <p role="status" className="mt-2 text-xs text-positive">{selectionNotice}</p>}
            <div className="flex items-center justify-between border-t border-border py-3 text-xs text-muted-foreground"><span>{wordCount.toLocaleString()} words</span><span>{content.length.toLocaleString()} / 200,000 characters</span></div>
          </div>
        </section>

        <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-background xl:border-l xl:border-border">
          <div className="flex border-b border-border px-2" role="tablist" aria-label="Workspace side panel">
            {([ ["timeline", "ClockIcon", "Timeline"], ["milestones", "TrophyIcon", "Milestones"], ["versions", "ArchiveBoxIcon", "Versions"] ] as const).map(([tab, icon, label]) => (
              <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`flex min-w-0 flex-1 items-center justify-center gap-2 border-b-2 px-2 py-4 text-xs font-semibold transition sm:text-sm ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}><Icon name={icon} size={15} />{label}</button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {activeTab === "timeline" && <>
              <div className="mb-5 flex items-center justify-between gap-3"><h2 className="font-semibold text-foreground">Contribution feed</h2><span className="text-xs text-muted-foreground">{project?.activity.length ?? 0} events</span></div>
              {project?.activity.length ? <ol className="relative ml-3 space-y-6 border-l border-border pl-5">
                {project.activity.map((event) => <ActivityEvent key={event.id} event={event} currentUserId={currentUserId} projectTitle={project?.title ?? ""} />)}
              </ol> : <p className="rounded-xl border border-dashed border-border p-5 text-sm leading-6 text-muted-foreground">Project edits will appear here after a collaborator saves a change.</p>}
            </>}

            {activeTab === "milestones" && <>
              <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold text-foreground">Project milestones</h2><p className="mt-1 text-xs text-muted-foreground">{completedMilestones} of {projectMilestones.length} complete</p></div><span className="text-primary">✧</span></div>
              <div className="mb-5 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${projectMilestones.length ? completedMilestones / projectMilestones.length * 100 : 0}%` }} /></div>
              {projectMilestones.length ? <ul className="divide-y divide-border">{projectMilestones.map((milestone) => <MilestoneItem key={milestone.id} milestone={milestone} onToggle={() => void toggleMilestone(milestone)} />)}</ul> : <p className="mb-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">No milestones for this project yet.</p>}
              <form onSubmit={addMilestone} className="mt-4 space-y-3 border-t border-border pt-4"><label className="block text-xs font-medium text-muted-foreground">Add milestone<input required maxLength={120} value={milestoneTitle} onChange={(event) => setMilestoneTitle(event.target.value)} placeholder="e.g. Finish first draft" className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary" /></label><label className="block text-xs font-medium text-muted-foreground">Due date (optional)<input type="date" value={milestoneDate} onChange={(event) => setMilestoneDate(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground" /></label><button disabled={!milestoneTitle.trim()} className="w-full rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">Add milestone</button></form>
            </>}

            {activeTab === "versions" && <>
              <div className="mb-4"><h2 className="font-semibold text-foreground">Version history</h2><p className="mt-1 text-xs text-muted-foreground">Saved revisions before each document update</p></div>
              {versions.length ? <>
                <label className="mb-3 block text-xs font-medium text-muted-foreground">Compare current canvas with<select value={selectedVersion?.id ?? ""} onChange={(event) => setSelectedVersionId(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground">{versions.map((version) => <option key={version.id} value={version.id}>{version.title} · {new Date(version.createdAt).toLocaleString()}</option>)}</select></label>
                {selectedVersion && <div className="mb-5 rounded-xl border border-border bg-card p-3"><p className="mb-2 text-xs font-semibold text-foreground">Version comparison</p><div className="max-h-52 space-y-1 overflow-y-auto font-mono text-[11px] leading-5">{versionDiff.removed.slice(0, 20).map((line, index) => <p key={`removed-${index}`} className="whitespace-pre-wrap break-words rounded bg-negative/10 px-2 text-negative">− {line}</p>)}{versionDiff.added.slice(0, 20).map((line, index) => <p key={`added-${index}`} className="whitespace-pre-wrap break-words rounded bg-positive/10 px-2 text-positive">+ {line}</p>)}{!versionDiff.removed.length && !versionDiff.added.length && <p className="text-muted-foreground">No line changes from this version.</p>}</div></div>}
                <ul className="space-y-3">{versions.map((version) => <VersionItem key={version.id} version={version} onRestore={() => void restoreVersion(version)} />)}</ul>
              </> : <p className="rounded-xl border border-dashed border-border p-5 text-sm leading-6 text-muted-foreground">Versions are created automatically when a collaborator saves a real change.</p>}
            </>}
          </div>

          <div className="border-t border-border p-5">
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-sm font-semibold"><Icon name="SparklesIcon" size={17} className="text-primary" />Breakthrough index</h3><span className="font-mono-data text-primary">{breakthroughIndex ?? "—"}{breakthroughIndex !== null && <span className="text-xs text-muted-foreground"> / 100</span>}</span></div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">{nominationCount ? `${nominationSignoffs.length} of 2 collaborators signed off${nominationApprovalStatus === "approved" ? " · Published" : nominationApprovalStatus === "pending" ? " · Awaiting review" : ""}; ${voteCount} community vote${voteCount === 1 ? "" : "s"}.` : "Not nominated yet. Both collaborators must sign off before admin review."}</p>
              <ul className="mt-3 space-y-2 text-xs">
                <li className="flex items-center gap-2"><span className={wordCount >= 100 ? "text-positive" : "text-muted-foreground"}>{wordCount >= 100 ? "✓" : "○"}</span><span className="text-muted-foreground">Minimum 100 words written ({wordCount}/100)</span></li>
                <li className="flex items-center gap-2"><span className={balancedContribution ? "text-positive" : "text-muted-foreground"}>{balancedContribution ? "✓" : "○"}</span><span className="text-muted-foreground">Each collaborator contributed at least 40% ({contributionPercent.length ? `${contributionPercent.join("% / ")}%` : "No recorded edits"})</span></li>
                <li className="flex items-center gap-2"><span className={allMilestonesComplete ? "text-positive" : "text-muted-foreground"}>{allMilestonesComplete ? "✓" : "○"}</span><span className="text-muted-foreground">All milestones complete ({completedMilestones}/{projectMilestones.length})</span></li>
                <li className="flex items-center gap-2"><span className={Boolean(resonancePoint.trim()) ? "text-positive" : "text-muted-foreground"}>{resonancePoint.trim() ? "✓" : "○"}</span><span className="text-muted-foreground">Resonance point recorded</span></li>
                <li className="flex items-center gap-2"><span className={nominationSignoffs.length === 2 ? "text-positive" : "text-muted-foreground"}>{nominationSignoffs.length === 2 ? "✓" : "○"}</span><span className="text-muted-foreground">Both collaborators sign off ({nominationSignoffs.length}/2)</span></li>
              </ul>
              <button type="button" onClick={() => void nominate()} disabled={!activeId || nominated || nominating || nominationApprovalStatus === "approved"} className="mt-4 w-full rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">{nominationApprovalStatus === "approved" ? "Published in Breakthroughs" : nominated ? "Signed Off" : nominating ? "Submitting…" : "Sign Off for Community Review"}</button>
            </div>
          </div>
        </aside>
      </div>
      <ImageViewerModal
        imageUrl={selectedImage?.url ?? ""}
        imageName={selectedImage?.name ?? ""}
        isOpen={imageViewerOpen}
        onClose={() => {
          setImageViewerOpen(false);
          setSelectedImage(null);
        }}
      />
    </main>
  );
}
