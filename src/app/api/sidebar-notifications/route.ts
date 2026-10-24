import { NextRequest, NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { getDatabase } from "@/lib/mongodb";
import { handleApiError } from "@/lib/server/http";

const sections = ["discover", "match", "workspace", "community", "admin"] as const;
type Section = (typeof sections)[number];

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();

    const db = await getDatabase();
    const userId = user._id.toHexString();
    const inAppMatchRequests = typeof user.preferences?.inAppMatchRequests === "boolean"
      ? user.preferences.inAppMatchRequests
      : user.preferences?.matchUpdates !== false;
    const inAppCommunityActivity = typeof user.preferences?.inAppCommunityActivity === "boolean"
      ? user.preferences.inAppCommunityActivity
      : true;
    const now = new Date();
    const storedReadAt = user.sidebarNotificationsReadAt as Record<string, Date | string> | undefined;
    const readAt = {} as Record<Section, Date>;
    const missing: Partial<Record<Section, Date>> = {};
    for (const section of sections) {
      const value = storedReadAt?.[section];
      if (value) {
        readAt[section] = value instanceof Date ? value : new Date(value);
      } else {
        readAt[section] = now;
        missing[section] = now;
      }
    }
    if (Object.keys(missing).length) {
      await db.collection("users").updateOne(
        { _id: user._id },
        { $set: Object.fromEntries(Object.entries(missing).map(([section, date]) => [`sidebarNotificationsReadAt.${section}`, date])) },
      );
    }

    const [discover, match, pendingRequests, projects, memberships, admin] = await Promise.all([
      !inAppMatchRequests
        ? Promise.resolve(0)
        : db.collection("matchRequests").countDocuments({
            recipientId: userId,
            status: "pending",
            createdAt: { $gt: readAt.discover },
          }),
      !inAppMatchRequests
        ? Promise.resolve(0)
        : db.collection("matches").countDocuments({ memberIds: userId, status: "active", createdAt: { $gt: readAt.match } }),
      !inAppMatchRequests ? Promise.resolve(0) : db.collection("matchRequests").countDocuments({
        recipientId: userId,
        status: "pending",
        createdAt: { $gt: readAt.match },
      }),
      db.collection("projects").find({ memberIds: userId }, { projection: { _id: 1 } }).toArray(),
      db.collection("communityMemberships").find(
        { userId },
        { projection: { communityId: 1, notificationsMuted: 1, lastReadAt: 1, joinedAt: 1 } },
      ).toArray(),
      user.role === "admin"
        ? db.collection("users").countDocuments({ createdAt: { $gt: readAt.admin }, _id: { $ne: user._id } })
        : Promise.resolve(0),
    ]);
    const projectIds = projects.map((project) => project._id.toHexString());
    const communityMemberships = memberships.filter(
      (membership) => !membership.notificationsMuted && typeof membership.communityId === "string",
    );

    const [workspaceActivity, workspaceComments, community] = await Promise.all([
      projectIds.length && user.preferences?.inAppWorkspaceUpdates !== false
        ? db.collection("workspaceActivity").countDocuments({
            projectId: { $in: projectIds },
            actorId: { $ne: userId },
            createdAt: { $gt: readAt.workspace },
          })
        : Promise.resolve(0),
      projectIds.length && user.preferences?.inAppWorkspaceUpdates !== false
        ? db.collection("workspaceComments").countDocuments({
            projectId: { $in: projectIds },
            authorId: { $ne: userId },
            createdAt: { $gt: readAt.workspace },
          })
        : Promise.resolve(0),
      communityMemberships.length && inAppCommunityActivity
        ? Promise.all(communityMemberships.map((membership) => {
            const membershipReadAt = membership.lastReadAt ?? membership.joinedAt ?? readAt.community;
            return db.collection("communityMessages").countDocuments({
              communityId: membership.communityId,
              authorId: { $ne: userId },
              $or: [
                { createdAt: { $gt: membershipReadAt } },
                { editedAt: { $gt: membershipReadAt } },
              ],
            });
          })).then((counts) => counts.reduce((total, count) => total + count, 0))
        : Promise.resolve(0),
    ]);

    return NextResponse.json({
      counts: {
        discover,
        match,
        pendingRequests,
        workspace: workspaceActivity + workspaceComments,
        community,
        admin,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const body = await request.json();
    if (!sections.includes(body.section)) {
      return NextResponse.json({ error: "Choose a valid notification section." }, { status: 400 });
    }
    const section = body.section as Section;
    await (await getDatabase()).collection("users").updateOne(
      { _id: user._id },
      { $set: { [`sidebarNotificationsReadAt.${section}`]: new Date() } },
    );
    return NextResponse.json({ read: true });
  } catch (error) {
    return handleApiError(error);
  }
}
