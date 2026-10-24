import type { Db } from "mongodb";

export type BreakthroughEligibility = {
  eligible: boolean;
  reason: string | null;
  contribution: Array<{ memberId: string; percent: number }>;
  resonancePoint: string;
  wordCount: number;
  completedMilestones: number;
  totalMilestones: number;
};

export async function evaluateBreakthroughEligibility(db: Db, project: {
  _id: { toHexString(): string };
  memberIds?: unknown;
  content?: unknown;
  canvas?: unknown;
}) : Promise<BreakthroughEligibility> {
  const memberIds = Array.isArray(project.memberIds)
    ? project.memberIds.filter((id): id is string => typeof id === "string")
    : [];
  const projectId = project._id.toHexString();
  const content = typeof project.content === "string"
    ? project.content
    : typeof project.canvas === "string"
      ? project.canvas
      : "";
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const [milestones, activity, match] = await Promise.all([
    db.collection("milestones").find({ projectId }).toArray(),
    db.collection("workspaceActivity").find({ projectId }).toArray(),
    memberIds.length === 2
      ? db.collection("matches").findOne({ memberIds: { $all: memberIds }, status: "active" }, { projection: { resonancePoint: 1 } })
      : Promise.resolve(null),
  ]);
  const activityCounts = new Map<string, number>();
  for (const event of activity) {
    if (typeof event.actorId === "string" && memberIds.includes(event.actorId)) {
      activityCounts.set(event.actorId, (activityCounts.get(event.actorId) ?? 0) + 1);
    }
  }
  const totalActivity = memberIds.reduce((total, memberId) => total + (activityCounts.get(memberId) ?? 0), 0);
  const contribution = memberIds.map((memberId) => ({
    memberId,
    percent: totalActivity ? Math.round((activityCounts.get(memberId) ?? 0) / totalActivity * 100) : 0,
  }));
  const completedMilestones = milestones.filter((milestone) => Boolean(milestone.completedAt || milestone.completed || milestone.status === "completed")).length;
  const resonancePoint = typeof match?.resonancePoint === "string" ? match.resonancePoint.trim() : "";
  const reason = memberIds.length !== 2
    ? "A breakthrough must have exactly two collaborators."
    : wordCount < 100
      ? "The workspace draft must contain at least 100 words."
      : milestones.length === 0 || completedMilestones !== milestones.length
        ? "Complete all project milestones before nomination."
        : contribution.length !== 2 || contribution.some((member) => member.percent < 40)
          ? "Each collaborator must contribute at least 40% of recorded workspace edits."
          : !resonancePoint
            ? "Set a resonance point for the collaboration before nomination."
            : null;
  return {
    eligible: reason === null,
    reason,
    contribution,
    resonancePoint,
    wordCount,
    completedMilestones,
    totalMilestones: milestones.length,
  };
}
