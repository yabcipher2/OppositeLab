"use client";

import React, { useEffect } from "react";
import Icon from "@/components/ui/AppIcon";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const sizeClasses = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${sizeClasses[size]} bg-card border border-border rounded-xl shadow-2xl animate-slide-up`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="Close modal"
          >
            <Icon name="XMarkIcon" size={16} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
