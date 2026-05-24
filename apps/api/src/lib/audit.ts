import { requireDb } from "./db";

export async function createAuditLog(input: {
  actorUserId?: string | null;
  libraryId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const db = requireDb();
  await db.query(
    `
    INSERT INTO audit_logs (
      actor_user_id, library_id, action, entity_type, entity_id, metadata, ip_address, user_agent
    )
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
    `,
    [
      input.actorUserId ?? null,
      input.libraryId ?? null,
      input.action,
      input.entityType,
      input.entityId ?? null,
      JSON.stringify(input.metadata ?? {}),
      input.ipAddress ?? null,
      input.userAgent ?? null,
    ],
  );
}
