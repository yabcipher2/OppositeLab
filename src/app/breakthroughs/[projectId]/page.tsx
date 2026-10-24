import BreakthroughIndex from "@/components/BreakthroughIndex";
import AppLayout from "@/components/AppLayout";

export default async function BreakthroughPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <AppLayout activePath="/breakthroughs"><BreakthroughIndex projectId={projectId} /></AppLayout>;
}
