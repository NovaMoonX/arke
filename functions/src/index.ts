import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getDatabase, type Database } from "firebase-admin/database";
import { getStorage } from "firebase-admin/storage";

initializeApp();

/** Maximum session age before cleanup (24 hours in milliseconds). */
const MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Scheduled Cloud Function that runs every hour.
 * Deletes sessions (and their associated Storage media) that are 24 hours old
 * or more, based on the `createdAt` timestamp.
 */
export const cleanupExpiredSessions = onSchedule("every 1 hours", async () => {
  const db = getDatabase();
  const bucket = getStorage().bucket();

  const sessionsRef = db.ref("sessions");
  const snapshot = await sessionsRef.once("value");

  if (!snapshot.exists()) {
    console.log("No sessions found. Nothing to clean up.");
    return;
  }

  const sessions = snapshot.val() as Record<
    string,
    { createdAt?: number; [key: string]: unknown }
  >;

  const now = Date.now();
  const deletionPromises: Promise<void>[] = [];

  for (const [pin, session] of Object.entries(sessions)) {
    const createdAt = session.createdAt;

    if (typeof createdAt !== "number") {
      // Session has no createdAt — treat as stale and remove.
      console.log(`Session ${pin} has no createdAt — scheduling removal.`);
      deletionPromises.push(deleteSession(db, bucket, pin));
      continue;
    }

    const age = now - createdAt;

    if (age >= MAX_SESSION_AGE_MS) {
      console.log(
        `Session ${pin} is ${Math.round(age / 3600000)}h old — scheduling removal.`
      );
      deletionPromises.push(deleteSession(db, bucket, pin));
    }
  }

  if (deletionPromises.length === 0) {
    console.log("No expired sessions found.");
    return;
  }

  const results = await Promise.allSettled(deletionPromises);
  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  console.log(
    `Cleanup complete: ${succeeded} sessions deleted, ${failed} failed.`
  );
});

/**
 * Delete a single session — removes all Storage files under
 * `sessions/{pin}/media/` and the entire RTDB node at `sessions/{pin}`.
 */
async function deleteSession(
  db: Database,
  bucket: ReturnType<typeof getStorage>["bucket"] extends (...args: never[]) => infer R ? R : never,
  pin: string
): Promise<void> {
  // 1. Delete all files in Storage under sessions/{pin}/media/
  try {
    const [files] = await bucket.getFiles({
      prefix: `sessions/${pin}/media/`,
    });

    if (files.length > 0) {
      await Promise.all(files.map((file) => file.delete()));
      console.log(
        `Deleted ${files.length} storage file(s) for session ${pin}.`
      );
    }
  } catch (err) {
    console.error(`Failed to delete storage files for session ${pin}:`, err);
  }

  // 2. Remove the session node from RTDB
  try {
    await db.ref(`sessions/${pin}`).remove();
    console.log(`Deleted RTDB node for session ${pin}.`);
  } catch (err) {
    console.error(`Failed to delete RTDB node for session ${pin}:`, err);
  }
}
