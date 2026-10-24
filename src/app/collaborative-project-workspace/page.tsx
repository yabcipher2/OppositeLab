import React from "react";
import AppLayout from "@/components/AppLayout";
import WorkspaceShell from "./components/WorkspaceShell";

export default function CollaborativeProjectWorkspacePage() {
  return (
    <AppLayout activePath="/collaborative-project-workspace">
      <WorkspaceShell />
    </AppLayout>
  );
}
