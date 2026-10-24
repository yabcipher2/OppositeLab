import React from "react";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-secondary rounded-md ${className}`} />
  );
}

export function MatchCardSkeleton() {
  return (
    <div className="card-elevated p-6 animate-pulse">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-secondary" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-secondary rounded w-1/3" />
          <div className="h-3 bg-secondary rounded w-1/2" />
        </div>
        <div className="w-16 h-16 rounded-full bg-secondary" />
      </div>
      <div className="h-24 bg-secondary rounded-lg mb-4" />
      <div className="grid grid-cols-3 gap-3">
        {["skel-col-1", "skel-col-2", "skel-col-3"].map((k) => (
          <div key={k} className="h-16 bg-secondary rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 7 }: { cols?: number }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={`trow-${i}`} className="px-4 py-3">
          <div
            className="h-4 bg-secondary rounded animate-pulse"
            style={{ width: `${60 + (i % 3) * 20}%` }}
          />
        </td>
      ))}
    </tr>
  );
}
