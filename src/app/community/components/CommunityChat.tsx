"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { LiveKitCall } from "@/components/LiveKitCall";
import { ImageViewerModal } from "@/components/ImageViewerModal";

export interface Community { id: string; name: string; category: string; description: string; visibility?: "public" | "private"; members: number; joined: boolean; creator: boolean; unreadCount?: number }
interface ChatAttachment { name: string; type: string; url: string }
interface ChatReaction { emoji: string; userIds: string[] }
interface ChatMessage { id: string; authorId: string; authorName: string; authorRole?: string; authorIsAdmin?: boolean; text: string; type?: string; attachments?: ChatAttachment[]; createdAt: string; editedAt?: string | null; replyTo?: { id: string; authorName: string; text: string } | null; reactions?: ChatReaction[]; readBy?: string[]; pinned?: boolean }
interface CommunityMember { id: string; name: string; role: string; owner: boolean; online: boolean }

function FormattedMessage({ text }: { text: string }) {
  const renderInline = (value: string, keyPrefix: string) => value.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={key} className="rounded bg-background/70 px-1 py-0.5 font-mono text-xs">{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={key}>{part.slice(1, -1)}</em>;
    return part;
  });
  const blocks = text.split(/```/);
  return <div className="break-words text-sm">
    {blocks.map((block, index) => index % 2 === 1
      ? <pre key={`code-${index}`} className="my-2 overflow-x-auto rounded-lg bg-background/80 p-2 font-mono text-xs"><code>{block.replace(/^[^\n]*\n/, "")}</code></pre>
      : <p key={`text-${index}`} className="whitespace-pre-wrap">{renderInline(block, `inline-${index}`)}</p>)}
  </div>;
}

export function CommunityChat({ community, onCommunityUpdated }: { community: Community; onClose: () => void; onCommunityUpdated: (community: Community) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
  const [canPinMessages, setCanPinMessages] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [muted, setMuted] = useState(false);
  const [pinningMessage, setPinningMessage] = useState(false);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [canAddMembers, setCanAddMembers] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteNotice, setInviteNotice] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [reportingId, setReportingId] = useState("");
  const [reportReason, setReportReason] = useState("Harassment or abusive content");
  const [reportDetails, setReportDetails] = useState("");
  const [reportNotice, setReportNotice] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [showPins, setShowPins] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState("");
  const [editMessageText, setEditMessageText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [editName, setEditName] = useState(community.name);
  const [editCategory, setEditCategory] = useState(community.category);
  const [editDescription, setEditDescription] = useState(community.description);
  const [editVisibility, setEditVisibility] = useState<"public" | "private">(community.visibility ?? "public");
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [messageResponse, memberResponse] = await Promise.all([
        fetch(`/api/communities/${community.id}/messages`, { cache: "no-store" }),
        fetch(`/api/communities/${community.id}/members`, { cache: "no-store" }),
      ]);
      const [messageData, memberData] = await Promise.all([messageResponse.json(), memberResponse.json()]);
      if (!messageResponse.ok) throw new Error(messageData.error || "Could not load messages.");
      if (!memberResponse.ok) throw new Error(memberData.error || "Could not load members.");
      if (!cancelled) { setMessages(messageData.messages); setPinnedMessages(messageData.pinnedMessages ?? []); setCanPinMessages(Boolean(messageData.canPinMessages)); setCurrentUserId(messageData.currentUserId); setMuted(Boolean(messageData.muted)); setMembers(memberData.members); setCanManage(memberData.canManage); setCanAddMembers(Boolean(memberData.canAddMembers)); setError(""); }
    };
    load().catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load community chat."); });
    const timer = window.setInterval(() => { void load().catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not refresh community chat."); }); }, 3000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [community.id]);

  useEffect(() => () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const sendChatMessage = async (messageText: string, files: File[] = []) => {
    if (sending) return;
    setSending(true);
    try {
      const attachments = await Promise.all(
        files.map(async (file) => {
          const type = file.type.split(";")[0] || "application/octet-stream";
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read the selected file."));
            reader.onerror = () => reject(new Error("Could not read the selected file."));
            reader.readAsDataURL(file);
          });
          return { name: file.name, type, dataUrl: dataUrl.replace(/^data:[^,]*;base64,/, `data:${type};base64,`) };
        }),
      );
      const response = await fetch(`/api/communities/${community.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: messageText, attachments, replyToId: replyingTo?.id ?? null }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not send message.");
      setMessages((current) => [...current, data.message]); setText(""); setReplyingTo(null); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not send message."); }
    finally { setSending(false); }
  };

  const sendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    void sendChatMessage(text);
  };

  const togglePinnedMessage = async (message: ChatMessage) => {
    if (!canPinMessages || pinningMessage) return;
    setPinningMessage(true);
    setError("");
    try {
      const shouldPin = !pinnedMessages.some((pinned) => pinned.id === message.id);
      const response = await fetch(`/api/communities/${community.id}/messages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: shouldPin ? "pin" : "unpin", messageId: message.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update the pinned message.");
      setPinnedMessages((current) => shouldPin ? [...current, { ...message, pinned: true }] : current.filter((item) => item.id !== message.id));
      setMessages((current) => current.map((item) => item.id === message.id ? { ...item, pinned: shouldPin } : item));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update the pinned message.");
    } finally {
      setPinningMessage(false);
    }
  };

  const updateMessage = async (messageId: string, action: string, extra: Record<string, unknown> = {}) => {
    setError("");
    try {
      const response = await fetch(`/api/communities/${community.id}/messages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, messageId, ...extra }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update message.");
      if (action === "edit") {
        setMessages((current) => current.map((message) => message.id === messageId ? { ...message, text: String(extra.text), editedAt: new Date().toISOString() } : message));
        setEditingMessageId("");
      } else if (action === "delete") {
        setMessages((current) => current.filter((message) => message.id !== messageId));
        setPinnedMessages((current) => current.filter((message) => message.id !== messageId));
      } else if (action === "react") {
        setMessages((current) => current.map((message) => {
          if (message.id !== messageId) return message;
          const reactions = message.reactions ?? [];
          const existing = reactions.find((reaction) => reaction.emoji === extra.emoji);
          const updated = existing
            ? reactions.map((reaction) => reaction.emoji !== extra.emoji ? reaction : {
              ...reaction,
              userIds: reaction.userIds.includes(currentUserId)
                ? reaction.userIds.filter((id) => id !== currentUserId)
                : [...reaction.userIds, currentUserId],
            })
            : [...reactions, { emoji: String(extra.emoji), userIds: [currentUserId] }];
          return { ...message, reactions: updated.filter((reaction) => reaction.userIds.length) };
        }));
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update message.");
    }
  };

  const toggleMute = async () => {
    const nextMuted = !muted;
    setError("");
    try {
      const response = await fetch(`/api/communities/${community.id}/messages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mute", muted: nextMuted }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update notification settings.");
      setMuted(Boolean(data.muted));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update notification settings.");
    }
  };

  const toggleRecording = async () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
      setRecording(false);
      return;
    }
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("Audio recording is not supported by this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      recordingChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const extension = blob.type.includes("ogg") ? "ogg" : blob.type.includes("mp4") ? "m4a" : "webm";
        const recordingFile = new File([blob], `voice-message-${Date.now()}.${extension}`, { type: blob.type || "audio/webm" });
        recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        if (blob.size > 0) void sendChatMessage("", [recordingFile]);
      };
      recorder.start();
      setRecording(true);
      setError("");
    } catch (reason) {
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
      setError(reason instanceof Error ? reason.message : "Could not start audio recording.");
    }
  };

  const reportMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = messages.find((item) => item.id === reportingId);
    if (!message) return;
    try {
      const response = await fetch("/api/moderation/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target: `${community.name}: ${message.authorName}'s message`, reason: reportReason, details: reportDetails, communityId: community.id, messageId: message.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not submit report.");
      setReportingId(""); setReportDetails(""); setError(""); setReportNotice("Report sent to the moderation team.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not submit report."); }
  };

  const addMember = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await fetch(`/api/communities/${community.id}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not add member.");
      setEmail("");
      onCommunityUpdated({ ...community, members: data.members ?? community.members + 1 });
      const responseMembers = await fetch(`/api/communities/${community.id}/members`, { cache: "no-store" });
      const memberData = await responseMembers.json();
      if (responseMembers.ok) setMembers(memberData.members);
      setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not add member."); }
  };

  const removeMember = async (member: CommunityMember) => {
    setError("");
    try {
      const response = await fetch(`/api/communities/${community.id}/members`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId: member.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not remove participant.");
      setMembers((current) => current.filter((item) => item.id !== member.id));
      onCommunityUpdated({ ...community, members: data.members });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not remove participant."); }
  };

  const saveCommunityDetails = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch(`/api/communities/${community.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editName, category: editCategory, description: editDescription, visibility: editVisibility }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update community details.");
      onCommunityUpdated({ ...community, ...data.community });
      setEditingCommunity(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update community details."); }
  };

  const createInviteLink = async () => {
    setCreatingInvite(true);
    setError("");
    setInviteNotice("");
    try {
      const response = await fetch(`/api/communities/${community.id}/invite`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create an invitation link.");
      if (typeof data.inviteUrl !== "string") throw new Error("The invitation link was not returned.");
      setInviteUrl(data.inviteUrl);
      try {
        await navigator.clipboard.writeText(data.inviteUrl);
        setInviteNotice("Invitation link copied. Anyone with it can join this community.");
      } catch {
        setInviteNotice("Invitation link is ready. Copy it below to share.");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create an invitation link.");
    } finally {
      setCreatingInvite(false);
    }
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteNotice("Invitation link copied.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not copy the invitation link.");
    }
  };

  const shareInviteLink = (platform: "whatsapp" | "telegram") => {
    const message = "Join my community on OppositeLab";
    const shareUrl = platform === "whatsapp"
      ? `https://api.whatsapp.com/send?text=${encodeURIComponent(`${message}: ${inviteUrl}`)}`
      : `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(message)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  const visibleMessages = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return messages;
    return messages.filter((message) => `${message.authorName} ${message.text} ${message.attachments?.map((item) => item.name).join(" ") ?? ""}`.toLowerCase().includes(query));
  }, [messages, searchText]);

  return <section className="mb-6 grid min-w-0 grid-cols-1 gap-5 rounded-2xl border border-border bg-card p-3 sm:p-5 lg:grid-cols-[minmax(0,1fr)_260px]">
    <div className="min-w-0"><header className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">{community.name} chat</h2><p className="text-xs text-muted-foreground">{community.visibility === "private" ? "Private community · members only" : "Public community"}</p></div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setCallOpen(true)} className="min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110">Start / join call</button><button type="button" onClick={() => void createInviteLink()} disabled={creatingInvite} className="min-h-11 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary disabled:opacity-50">{creatingInvite ? "Creating link…" : "Invite link"}</button><button type="button" title="Search messages" aria-label="Search messages" onClick={() => setSearchOpen((value) => !value)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-sm">🔍</button><button type="button" title="Channel information" aria-label="Channel information" onClick={() => setShowInfo(true)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-sm">ℹ️</button><button type="button" title={muted ? "Unmute notifications" : "Mute notifications"} aria-label={muted ? "Unmute notifications" : "Mute notifications"} onClick={() => void toggleMute()} className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-sm">{muted ? "🔕" : "🔔"}</button><button type="button" onClick={() => setShowMembers(true)} className="flex h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm lg:hidden">Members <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">{members.length}</span></button>{canManage && <button type="button" onClick={() => { setEditName(community.name); setEditCategory(community.category); setEditDescription(community.description); setEditVisibility(community.visibility ?? "public"); setEditingCommunity((value) => !value); }} className="min-h-11 rounded-lg border border-border px-3 py-2 text-sm">{editingCommunity ? "Cancel edit" : "Edit community"}</button>}</div></header>
      {inviteUrl && <div className="mb-3 rounded-lg border border-primary/20 bg-primary/5 p-3"><p className="mb-2 text-xs text-muted-foreground">This unique link invites people to {community.name}.</p><div className="flex flex-col gap-2 sm:flex-row"><input readOnly value={inviteUrl} aria-label="Community invitation link" onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground" /><button type="button" onClick={() => void copyInviteLink()} className="min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Copy link</button><button type="button" onClick={() => shareInviteLink("whatsapp")} className="min-h-11 rounded-lg bg-[#25D366] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1fb85a]">Share to WhatsApp</button><button type="button" onClick={() => shareInviteLink("telegram")} className="min-h-11 rounded-lg bg-[#229ED9] px-3 py-2 text-sm font-semibold text-white hover:bg-[#168ac2]">Share to Telegram</button></div>{inviteNotice && <p role="status" className="mt-2 text-xs text-primary">{inviteNotice}</p>}</div>}
      {searchOpen && <label className="mb-3 block"><span className="sr-only">Search messages</span><input autoFocus value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search messages..." className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm" /></label>}
      {editingCommunity && <form onSubmit={saveCommunityDetails} className="mb-4 grid gap-3 rounded-xl border border-border bg-background p-3 sm:grid-cols-2"><label className="text-xs font-medium">Community name<input required minLength={3} maxLength={80} value={editName} onChange={(event) => setEditName(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm" /></label><label className="text-xs font-medium">Topic<input maxLength={40} value={editCategory} onChange={(event) => setEditCategory(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm" /></label><label className="text-xs font-medium">Visibility<select value={editVisibility} onChange={(event) => setEditVisibility(event.target.value as "public" | "private")} className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"><option value="public">Public — anyone can find and join</option><option value="private">Private — invitation link required</option></select></label><p className="self-end pb-2 text-xs text-muted-foreground">{editVisibility === "private" ? "Only members can see this community. Members can invite others with the community link." : "Anyone can find and join this community."}</p><label className="text-xs font-medium sm:col-span-2">Description<textarea required minLength={10} maxLength={500} rows={3} value={editDescription} onChange={(event) => setEditDescription(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm" /></label><button className="justify-self-end rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Save community details</button></form>}
      {error && <p role="alert" className="mb-3 rounded-lg bg-negative/10 px-3 py-2 text-sm text-negative">{error}</p>}
      {reportNotice && <p role="status" className="mb-3 rounded-lg bg-positive/10 px-3 py-2 text-sm text-positive">{reportNotice}</p>}
      {pinnedMessages.length > 0 && <button type="button" onClick={() => setShowPins(true)} className="mb-3 flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-left">
        <span className="shrink-0 text-primary" aria-hidden="true">📌</span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-primary">{pinnedMessages.length} pinned message{pinnedMessages.length === 1 ? "" : "s"} · {pinnedMessages[0].authorName}</span><span className="block truncate text-sm text-foreground">{pinnedMessages[0].text || pinnedMessages[0].attachments?.map((attachment) => attachment.name).join(", ") || "Attachment"}</span></span><span className="text-xs text-muted-foreground">View all</span>
      </button>}
      <div className="mb-3 flex max-h-96 min-h-48 flex-col gap-2 overflow-y-auto rounded-xl border border-border bg-background p-2" aria-live="polite">
        {visibleMessages.length ? visibleMessages.map((message) => (
          <article id={`message-${message.id}`} key={message.id} className={`max-w-[90%] rounded-xl px-2.5 py-1.5 sm:max-w-[85%] ${message.type === "system" ? "mx-auto bg-transparent text-center text-xs italic text-muted-foreground" : "bg-secondary"}`}>
            {message.type === "system" ? <p>{message.text}</p> : <>
            {message.replyTo && <div className="mb-2 border-l-2 border-primary pl-2 text-xs text-muted-foreground"><span className="font-semibold text-primary">Replying to {message.replyTo.authorName}</span><p className="mt-0.5 line-clamp-2">{message.replyTo.text}</p></div>}
            <p className="text-xs font-semibold">{message.authorName}<span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] ${message.authorRole === "Owner" ? "bg-primary/15 text-primary" : message.authorRole === "Admin" ? "bg-orange-500/15 text-orange-700" : "bg-background text-muted-foreground"}`}>{message.authorRole ?? "Creator"}</span></p>
            {message.pinned && <span className="my-1 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">📌 Pinned</span>}
            {message.text && (editingMessageId === message.id
              ? <form onSubmit={(event) => { event.preventDefault(); void updateMessage(message.id, "edit", { text: editMessageText }); }} className="mt-1 space-y-2"><textarea value={editMessageText} maxLength={2000} onChange={(event) => setEditMessageText(event.target.value)} className="w-full rounded border border-border bg-background p-2 text-sm" /><span className="flex gap-2"><button className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground">Save edit</button><button type="button" onClick={() => setEditingMessageId("")} className="rounded border border-border px-2 py-1 text-xs">Cancel</button></span></form>
              : <FormattedMessage text={message.text} />)}
            {message.attachments?.map((attachment, index) => <div key={`${attachment.name}-${index}`} className="mt-2"><p className="mb-1 break-all text-xs text-muted-foreground">{attachment.name}</p>{attachment.type.startsWith("image/") && attachment.type !== "image/svg+xml" ? <button type="button" onClick={() => { console.log("Image clicked!", attachment); setSelectedImage({ url: attachment.url, name: attachment.name }); setImageViewerOpen(true); }} className="block"><img src={attachment.url} alt={attachment.name} className="max-h-56 max-w-full rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity" /></button> : attachment.type.startsWith("video/") ? <video controls preload="metadata" src={attachment.url} className="max-h-56 max-w-full rounded-lg" /> : attachment.type.startsWith("audio/") ? <audio controls preload="metadata" src={attachment.url} className="max-w-full" /> : <a href={attachment.url} download={attachment.name} className="text-sm font-medium text-primary underline">Download file</a>}</div>)}
            {message.editedAt && <span className="ml-1 text-[10px] italic text-muted-foreground">(edited)</span>}
            {(message.reactions?.length ?? 0) > 0 && <div className="mt-1 flex flex-wrap gap-1">{message.reactions?.filter((reaction) => reaction.userIds.length).map((reaction) => <button key={reaction.emoji} type="button" onClick={() => void updateMessage(message.id, "react", { emoji: reaction.emoji })} className={`min-h-9 rounded-full border px-2 py-0.5 text-xs ${reaction.userIds.includes(currentUserId) ? "border-primary bg-primary/10" : "border-border bg-background"}`}>{reaction.emoji} {reaction.userIds.length}</button>)}</div>}
            <time className="mt-1 block text-right text-[10px] text-muted-foreground">{new Date(message.createdAt).toLocaleString()}{message.authorId === currentUserId && <span className="ml-1" title={message.readBy?.some((id) => id !== currentUserId) ? "Read" : "Sent"}>{message.readBy?.some((id) => id !== currentUserId) ? "✓✓" : "✓"}</span>}</time>
            <div className="mt-1 flex flex-wrap gap-2 border-t border-border/60 pt-1">
              <button type="button" onClick={() => { setReplyingTo(message); setReportingId(""); setReportNotice(""); }} className="min-h-9 text-xs font-medium text-primary underline">Reply</button>
              {["👍", "❤️", "🔥", "🚀"].map((emoji) => <button key={emoji} type="button" aria-label={`React ${emoji}`} onClick={() => void updateMessage(message.id, "react", { emoji })} className="min-h-9 min-w-8 text-xs">{emoji}</button>)}
              <button type="button" onClick={() => { setReportingId(message.id); setReportNotice(""); }} className="min-h-9 text-xs text-muted-foreground underline">Report</button>
              {canPinMessages && <button type="button" disabled={pinningMessage} onClick={() => void togglePinnedMessage(message)} className="min-h-9 text-xs text-muted-foreground underline disabled:opacity-50">{message.pinned ? "Unpin" : "Pin"}</button>}
              {message.authorId === currentUserId && message.text && <button type="button" onClick={() => { setEditingMessageId(message.id); setEditMessageText(message.text); }} className="min-h-9 text-xs text-muted-foreground underline">Edit</button>}
              {(message.authorId === currentUserId || canPinMessages) && <button type="button" onClick={() => { if (window.confirm("Delete this message?")) void updateMessage(message.id, "delete"); }} className="min-h-9 text-xs text-negative underline">Delete</button>}
            </div>
            {reportingId === message.id && <form onSubmit={reportMessage} className="mt-2 space-y-2 border-t border-border pt-2"><label className="block text-xs">Reason<select value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="mt-1 w-full rounded border border-border bg-background p-2"><option>Harassment or abusive content</option><option>Spam or scam</option><option>Hate speech</option><option>Threat or safety concern</option><option>Other</option></select></label><textarea maxLength={2000} value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} placeholder="Add details (optional)" className="w-full rounded border border-border bg-background p-2 text-xs" /><span className="flex gap-2"><button className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground">Send report</button><button type="button" onClick={() => setReportingId("")} className="rounded border border-border px-3 py-1 text-xs">Cancel</button></span></form>}
            </>}
          </article>
        )) : <p className="m-auto text-center text-sm text-muted-foreground">{searchText ? "No messages match your search." : "No messages yet. Start the conversation."}</p>}
      </div>
      {replyingTo && <div className="mb-2 flex items-start justify-between gap-3 rounded-lg border-l-2 border-primary bg-primary/5 px-3 py-2 text-xs"><div className="min-w-0"><p className="font-semibold text-primary">Replying to {replyingTo.authorName}</p><p className="truncate text-muted-foreground">{replyingTo.text}</p></div><button type="button" onClick={() => setReplyingTo(null)} aria-label="Cancel reply" className="text-muted-foreground hover:text-foreground">Cancel</button></div>}
      <form onSubmit={sendMessage} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
        <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,audio/*,.pdf,.txt,.md,.zip,.doc,.docx,.gif" className="hidden" aria-label="Choose files to attach" onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
          const totalSize = files.reduce((total, file) => total + file.size, 0);
          if (files.length > 5) { setError("Attach up to 5 files per message."); return; }
          if (totalSize > 8 * 1024 * 1024) { setError("Attachments must total 8 MB or less."); return; }
          if (files.length) void sendChatMessage(text, files);
        }} />
        <div className="relative">
          <button type="button" onClick={() => setMenuOpen((value) => !value)} disabled={sending} aria-label="Add attachment or code snippet" title="Add attachment or code snippet" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-xl transition hover:border-primary hover:text-primary disabled:opacity-50">+</button>
          {menuOpen && <div className="absolute bottom-12 left-0 z-10 min-w-48 rounded-lg border border-border bg-card p-1 shadow-lg"><button type="button" onClick={() => { setMenuOpen(false); fileInputRef.current?.click(); }} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-secondary">Upload file, image, video, GIF</button><button type="button" onClick={() => { setText((value) => `${value}${value ? "\n" : ""}\`\`\`\n\n\`\`\``); setMenuOpen(false); }} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-secondary">Insert code snippet</button></div>}
        </div>
        <div className="relative">
          <button type="button" onClick={() => setShowEmojiPicker((value) => !value)} aria-label="Choose emoji" title="Emoji picker" className="flex h-10 w-10 items-center justify-center rounded-full border border-border hover:border-primary">☺</button>
          {showEmojiPicker && <div className="absolute bottom-12 left-0 z-10 flex flex-wrap gap-1 rounded-lg border border-border bg-card p-2 shadow-lg">{["😀", "😂", "❤️", "👍", "🔥", "🎉", "🚀", "🙏"].map((emoji) => <button key={emoji} type="button" onClick={() => { setText((value) => `${value}${emoji}`); setShowEmojiPicker(false); }} className="rounded p-1 hover:bg-secondary">{emoji}</button>)}<button type="button" onClick={() => { setShowEmojiPicker(false); fileInputRef.current?.click(); }} className="w-full rounded border-t border-border px-2 py-1 text-left text-xs text-primary">Choose a GIF file</button></div>}
        </div>
        <input maxLength={2000} value={text} onChange={(event) => setText(event.target.value)} placeholder={replyingTo ? `Reply to ${replyingTo.authorName}...` : "Write a message..."} className="order-first min-w-0 w-full rounded-full border border-border bg-input px-4 py-2.5 text-sm sm:order-none sm:flex-1" />
        <button type="button" onClick={() => void toggleRecording()} disabled={sending} aria-label={recording ? "Stop and send voice message" : "Record voice message"} title={recording ? "Stop and send voice message" : "Record voice message"} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition disabled:opacity-50 ${recording ? "border-negative bg-negative/10 text-negative" : "border-border text-foreground hover:border-primary hover:text-primary"}`}>
          {recording ? <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg> : <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" /></svg>}
        </button>
        <button type="submit" disabled={!text.trim() || sending} aria-label={replyingTo ? "Send reply" : "Send message"} title={replyingTo ? "Send reply" : "Send message"} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M2.3 20.7 22 12 2.3 3.3l-.1 6.8 14.1 1.9-14.1 1.9.1 6.8Z" /></svg>
        </button>
      </form>
    </div>
    {showMembers && <button type="button" aria-label="Close members list" onClick={() => setShowMembers(false)} className="fixed inset-0 z-30 bg-black/60 lg:hidden" />}
    <aside className={`fixed inset-y-0 right-0 z-40 w-[min(88vw,320px)] overflow-y-auto border-l border-border bg-card p-5 shadow-xl transition-transform lg:static lg:z-auto lg:w-auto lg:translate-x-0 lg:border-t-0 lg:bg-transparent lg:p-0 lg:shadow-none ${showMembers ? "translate-x-0" : "translate-x-full"}`}><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Members ({members.length})</h3><button type="button" aria-label="Close members list" onClick={() => setShowMembers(false)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-border lg:hidden">✕</button></div><ul className="mt-3 space-y-2">{members.map((member) => <li key={member.id} className="flex min-h-11 items-start justify-between gap-2 text-sm"><span className="flex items-start gap-2"><span aria-label={member.online ? "Online" : "Offline"} title={member.online ? "Online" : "Offline"} className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${member.online ? "bg-green-500" : "bg-gray-400"}`} /><span><span className="font-medium">{member.name}</span>{member.owner && <span className="ml-2 text-xs text-primary">Owner</span>}<span className="block text-xs text-muted-foreground">{member.role}</span></span></span>{canManage && !member.owner && <button type="button" onClick={() => void removeMember(member)} className="min-h-11 shrink-0 text-xs text-negative underline">Remove</button>}</li>)}</ul>
      {canAddMembers && <form onSubmit={addMember} className="mt-5 border-t border-border pt-4"><label className="text-sm font-medium">Add a registered user<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="member@example.com" className="mt-2 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm" /></label><button className="mt-2 w-full rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">Add to community</button><p className="mt-1 text-xs text-muted-foreground">{community.visibility === "private" ? "Only you can invite by email. All members can share the invitation link." : "Any community member can invite people."}</p></form>}
    </aside>
    {showPins && <div role="dialog" aria-modal="true" aria-labelledby="pinned-messages-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl"><div className="mb-4 flex items-center justify-between"><h3 id="pinned-messages-title" className="font-semibold">Pinned messages</h3><button type="button" onClick={() => setShowPins(false)} aria-label="Close pinned messages" className="rounded border border-border px-2 py-1">✕</button></div>{pinnedMessages.map((message) => <button key={message.id} type="button" onClick={() => { setShowPins(false); document.getElementById(`message-${message.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }} className="mb-2 block w-full rounded-lg border border-border p-3 text-left hover:bg-secondary"><p className="text-xs font-semibold">{message.authorName}</p><p className="mt-1 line-clamp-3 text-sm">{message.text || message.attachments?.map((item) => item.name).join(", ") || "Attachment"}</p></button>)}</div></div>}
    {showInfo && <div role="dialog" aria-modal="true" aria-labelledby="channel-info-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"><div className="mb-4 flex items-center justify-between"><h3 id="channel-info-title" className="font-semibold">Channel information</h3><button type="button" onClick={() => setShowInfo(false)} aria-label="Close channel information" className="rounded border border-border px-2 py-1">✕</button></div><p className="font-medium">{community.name}</p><p className="mt-1 text-sm text-muted-foreground">{community.category} · {members.length} members</p><p className="mt-3 whitespace-pre-wrap text-sm">{community.description}</p><p className="mt-3 text-xs text-muted-foreground">{muted ? "Notifications are muted for you." : "Notifications are enabled for you."}</p></div></div>}
  {callOpen && <LiveKitCall type="community" resourceId={community.id} title={`${community.name} community call`} onClose={() => setCallOpen(false)} />}
  <ImageViewerModal
    imageUrl={selectedImage?.url ?? ""}
    imageName={selectedImage?.name ?? ""}
    isOpen={imageViewerOpen}
    onClose={() => {
      setImageViewerOpen(false);
      setSelectedImage(null);
    }}
  />
  </section>;
}
