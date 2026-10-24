"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  formatChatMessageLinks,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useChat,
  useLocalParticipant,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";

type CallType = "community" | "workspace";

function CallRoom() {
  const { chatMessages, isSending, send } = useChat();
  const { isCameraEnabled, isMicrophoneEnabled, isScreenShareEnabled, localParticipant } = useLocalParticipant();
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);
  const [chatOpen, setChatOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight });
  }, [chatMessages.length, chatOpen]);

  const toggleMedia = async (action: "microphone" | "camera" | "screenShare") => {
    setActionError("");
    setPendingAction(action);
    try {
      if (action === "microphone") {
        await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
      } else if (action === "camera") {
        await localParticipant.setCameraEnabled(!isCameraEnabled);
      } else {
        await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
      }
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Could not update call controls.");
    } finally {
      setPendingAction("");
    }
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSending) return;
    setActionError("");
    try {
      await send(trimmedMessage);
      setMessage("");
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Could not send the in-call message.");
    }
  };

  const mediaButtonClass = (enabled: boolean) =>
    `flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition disabled:cursor-wait disabled:opacity-50 ${
      enabled
        ? "border-border bg-secondary text-foreground hover:bg-secondary/80"
        : "border-negative/40 bg-negative/10 text-negative hover:bg-negative/20"
    }`;

  return (
    <>
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <main className="min-w-0 flex-1 overflow-y-auto p-3 sm:p-5">
          {actionError && (
            <p role="alert" className="mb-3 rounded-lg border border-negative/30 bg-negative/10 p-3 text-sm text-negative">
              {actionError}
            </p>
          )}
          <div
            className="grid auto-rows-fr gap-3 sm:gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))" }}
          >
            {tracks.map((track) => (
              <ParticipantTile
                key={`${track.participant.identity}-${track.source}`}
                trackRef={track}
                className="aspect-video min-h-48 overflow-hidden rounded-xl bg-neutral-900"
              />
            ))}
          </div>
        </main>

        {chatOpen && (
          <>
            <button
              type="button"
              aria-label="Close in-call chat"
              onClick={() => setChatOpen(false)}
              className="absolute inset-0 z-10 bg-black/30 md:hidden"
            />
            <aside
              aria-label="In-call chat"
              className="absolute inset-y-0 right-0 z-20 flex w-full max-w-sm flex-col border-l border-border bg-card shadow-xl md:static md:w-80 md:shrink-0"
            >
              <header className="flex min-h-14 items-center justify-between border-b border-border px-4">
                <h3 className="font-semibold text-foreground">Call chat</h3>
                <button
                  type="button"
                  onClick={() => setChatOpen(false)}
                  aria-label="Close chat"
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m6 6 12 12M18 6 6 18" />
                  </svg>
                </button>
              </header>
              <div ref={messageListRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3" aria-live="polite">
                {chatMessages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No messages yet. Share a thought or link with the call.</p>
                ) : chatMessages.map((entry) => (
                  <article key={entry.id} className="rounded-xl bg-secondary px-3 py-2">
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <p className="truncate text-xs font-semibold text-foreground">{entry.from?.name || entry.from?.identity || "Participant"}</p>
                      <time className="shrink-0 text-[10px] text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </time>
                    </div>
                    <p className="break-words text-sm text-foreground">{formatChatMessageLinks(entry.message)}</p>
                  </article>
                ))}
              </div>
              <form onSubmit={sendMessage} className="flex gap-2 border-t border-border p-3">
                <input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  maxLength={2000}
                  placeholder="Message or paste a link"
                  aria-label="In-call message"
                  className="min-w-0 flex-1 rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
                />
                <button
                  type="submit"
                  disabled={!message.trim() || isSending}
                  aria-label="Send in-call message"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                    <path d="M2.3 20.7 22 12 2.3 3.3l-.1 6.8 14.1 1.9-14.1 1.9.1 6.8Z" />
                  </svg>
                </button>
              </form>
            </aside>
          </>
        )}
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-border bg-card p-3">
        <button
          type="button"
          onClick={() => void toggleMedia("microphone")}
          disabled={pendingAction === "microphone"}
          aria-pressed={isMicrophoneEnabled}
          className={mediaButtonClass(isMicrophoneEnabled)}
        >
          <span aria-hidden="true">{isMicrophoneEnabled ? "🎙" : "🔇"}</span>
          {isMicrophoneEnabled ? "Mute mic" : "Unmute mic"}
        </button>
        <button
          type="button"
          onClick={() => void toggleMedia("camera")}
          disabled={pendingAction === "camera"}
          aria-pressed={isCameraEnabled}
          className={mediaButtonClass(isCameraEnabled)}
        >
          <span aria-hidden="true">{isCameraEnabled ? "▣" : "▧"}</span>
          {isCameraEnabled ? "Camera on" : "Camera off"}
        </button>
        <button
          type="button"
          onClick={() => void toggleMedia("screenShare")}
          disabled={pendingAction === "screenShare"}
          aria-pressed={isScreenShareEnabled}
          className={mediaButtonClass(isScreenShareEnabled)}
        >
          <span aria-hidden="true">▱</span>
          {isScreenShareEnabled ? "Stop sharing" : "Share screen"}
        </button>
        <button
          type="button"
          onClick={() => setChatOpen((open) => !open)}
          aria-pressed={chatOpen}
          aria-label={chatOpen ? "Close call chat" : "Open call chat"}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
            chatOpen ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-foreground hover:bg-secondary/80"
          }`}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
          </svg>
          Chat
          {chatMessages.length > 0 && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">{chatMessages.length}</span>}
        </button>
      </footer>
      <RoomAudioRenderer />
    </>
  );
}

export function LiveKitCall({
  type,
  resourceId,
  title,
  onClose,
}: {
  type: CallType;
  resourceId: string;
  title: string;
  onClose: () => void;
}) {
  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/livekit/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, resourceId }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not join the call.");
        if (typeof data.token !== "string" || typeof data.url !== "string") {
          throw new Error("The call service returned an invalid response.");
        }
        if (!cancelled) {
          setToken(data.token);
          setServerUrl(data.url);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not join the call.");
      });
    return () => {
      cancelled = true;
    };
  }, [type, resourceId]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-2 sm:p-6" role="dialog" aria-modal="true" aria-label={`${title} video call`}>
      <section className="flex h-[min(94vh,900px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground">Members can start or join this shared call</p>
          </div>
          <button type="button" onClick={onClose} className="min-h-11 shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary">Leave call</button>
        </header>
        {error ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <p role="alert" className="max-w-lg rounded-xl border border-negative/30 bg-negative/10 p-4 text-sm text-negative">{error}</p>
          </div>
        ) : !token || !serverUrl ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Connecting to call…</div>
        ) : (
          <LiveKitRoom
            token={token}
            serverUrl={serverUrl}
            connect
            video
            audio
            onError={(reason) => setError(`Could not connect to the call: ${reason.message}`)}
            onDisconnected={onClose}
            data-lk-theme="default"
            className="flex min-h-0 flex-1 flex-col"
          >
            <CallRoom />
          </LiveKitRoom>
        )}
      </section>
    </div>
  );
}
