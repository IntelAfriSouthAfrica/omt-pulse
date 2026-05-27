import { db } from "./storage";
import { sql } from "drizzle-orm";

export const DEFAULT_FORM_FIELDS = [
  { fieldKey: "incidentDate", label: "Incident Date", fieldType: "date", isRequired: true, isVisible: true, isSystem: true, sortOrder: 1 },
  { fieldKey: "incidentTime", label: "Incident Time", fieldType: "time", isRequired: true, isVisible: true, isSystem: true, sortOrder: 2 },
  { fieldKey: "categoryId", label: "Type", fieldType: "select", isRequired: true, isVisible: true, isSystem: true, sortOrder: 3 },
  { fieldKey: "location", label: "Location", fieldType: "location", isRequired: true, isVisible: true, isSystem: true, sortOrder: 4 },
  { fieldKey: "description", label: "Description", fieldType: "textarea", isRequired: false, isVisible: true, isSystem: true, sortOrder: 5 },
];

export async function seedDatabase() {
  // One-time cleanup: remove attachment records whose files lived on ephemeral
  // disk storage (/uploads/...) and are permanently gone after redeploy.
  // Idempotent — safe to run on every boot; no-op once rows are deleted.
  await db.execute(sql`DELETE FROM incident_attachments WHERE url LIKE '/uploads/%'`);

  // One-time cleanup: nullify stale customMapX/customMapY coordinates on incidents
  // whose customMapId was already cleared by ON DELETE SET NULL (orphaned pins).
  // Idempotent — no-op once all orphaned rows are cleaned.
  await db.execute(sql`
    UPDATE incidents
    SET custom_map_x = NULL, custom_map_y = NULL
    WHERE custom_map_id IS NULL
      AND (custom_map_x IS NOT NULL OR custom_map_y IS NOT NULL)
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      description TEXT NOT NULL,
      changes JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(organization_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id SERIAL PRIMARY KEY,
      organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_push_subs_org_id ON push_subscriptions(organization_id)`);

  // Add responder_arrived_at column if not present (additive migration)
  await db.execute(sql`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS responder_arrived_at TIMESTAMPTZ`);
}
