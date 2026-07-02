import { createAdminClient } from "@/lib/supabase/admin";

export async function writeAudit(input: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  await admin.from("audit_logs").insert({
    actor_id: input.actorId || null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId || null,
    details: input.details || {}
  });
}
