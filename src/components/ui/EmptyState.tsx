import React from "react";
import Icon from "@/components/ui/AppIcon";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Icon
          name={icon as Parameters<typeof Icon>[0]["name"]}
          size={24}
          className="text-primary"
        />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all duration-150"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
