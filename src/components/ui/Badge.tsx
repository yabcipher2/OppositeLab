import React from "react";

type BadgeVariant =
  | "active"
  | "pending"
  | "stalled"
  | "completed"
  | "archived"
  | "draft"
  | "milestone"
  | "published"
  | "moderator"
  | "admin"
  | "creator";

interface BadgeProps {
  variant: BadgeVariant;
  label?: string;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  active: "bg-positive/10 text-positive border-positive/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  stalled: "bg-negative/10 text-negative border-negative/20",
  completed: "bg-accent/10 text-accent border-accent/20",
  archived: "bg-muted text-muted-foreground border-border",
  draft: "bg-secondary text-muted-foreground border-border",
  milestone: "bg-primary/10 text-primary border-primary/20",
  published: "bg-positive/10 text-positive border-positive/20",
  moderator: "bg-warning/10 text-warning border-warning/20",
  admin: "bg-negative/10 text-negative border-negative/20",
  creator: "bg-primary/10 text-primary border-primary/20",
};

const defaultLabels: Record<BadgeVariant, string> = {
  active: "Active",
  pending: "Pending",
  stalled: "Stalled",
  completed: "Completed",
  archived: "Archived",
  draft: "Draft",
  milestone: "Milestone",
  published: "Published",
  moderator: "Moderator",
  admin: "Admin",
  creator: "Creator",
};

export default function Badge({ variant, label, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border tracking-wide ${variantStyles[variant]} ${className}`}
    >
      {label ?? defaultLabels[variant]}
    </span>
  );
}
