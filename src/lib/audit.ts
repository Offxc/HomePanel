import { db } from "@/lib/db";

type Action =
  | "signin.success"
  | "signin.denied"
  | "signout"
  | "todo.delete"
  | "event.delete"
  | "shop.delete"
  | "note.delete"
  | "ratelimit.hit";

export async function audit(action: Action, opts: { actorId?: string | null; detail?: string } = {}) {
  try {
    await db.auditLog.create({
      data: {
        action,
        actorId: opts.actorId ?? null,
        detail: opts.detail?.slice(0, 500) ?? null,
      },
    });
  } catch (err) {
    // Never let audit failure break a request, but surface it on the server.
    console.error("[audit] failed", action, err);
  }
}
