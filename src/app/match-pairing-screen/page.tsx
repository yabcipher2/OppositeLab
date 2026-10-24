import React from "react";
import AppLayout from "@/components/AppLayout";
import MatchDashboard from "./components/MatchDashboard";

export default function MatchPairingPage() {
  return (
    <AppLayout activePath="/match-pairing-screen">
      <MatchDashboard />
    </AppLayout>
  );
}
