/** Return "YYYY-MM-DD" from a Date, ISO string, or whatever the DB returns. */
export function toDateStr(d: Date | string): string {
  if (typeof d === "string") return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

/** Return "YYYY-MM-DDTHH:mm:ss.sssZ" (full ISO) from a Date or string. */
export function toIso(d: Date | string): string {
  if (typeof d === "string") return d;
  return d.toISOString();
}

/** Compare by date descending (most recent first). */
export function byCreatedAtDesc(a: { createdAt: Date | string }, b: { createdAt: Date | string }): number {
  const da = typeof a.createdAt === "string" ? a.createdAt : a.createdAt.toISOString();
  const db = typeof b.createdAt === "string" ? b.createdAt : b.createdAt.toISOString();
  return db.localeCompare(da);
}
