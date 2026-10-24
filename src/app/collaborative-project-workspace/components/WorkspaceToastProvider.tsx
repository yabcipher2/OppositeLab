import { Toaster } from "sonner";

export default function WorkspaceToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      theme="dark"
      toastOptions={{
        style: {
          background: "var(--card)",
          border: "1px solid var(--border)",
          color: "var(--foreground)",
          fontSize: "13px",
        },
      }}
    />
  );
}
