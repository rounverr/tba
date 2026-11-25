import { execute, command, one } from "../database/persistence";
import type { RuntimeEnv } from "../types";
/**
 * TBA - EXTENSION POINT FOR DERIVED APPLICATIONS
 * Adapt this behavior to the application using TBA.
 * Examples: CMS reader profile, CRM customer profile, internal preferences.
 * The core does not automatically create organizations, subscriptions,
 * workspaces or business records. Identity and authorization checks must pass first.
 * Consumers MUST use context.idempotencyKey: delivery can be retried.
 * Do not change roles or permissions from this extension point.
 */
export async function onUserRegistered(
  _user: Readonly<{ id: string; email: string; name: string }>,
  _context: Readonly<{ idempotencyKey: string }>,
): Promise<void> {}
export async function deliverRegistrationEvent(env: RuntimeEnv, id: string) {
  await execute(
    env.DB,
    command(
      "INSERT INTO registration_event(user_id,status,attempts,updated_at) VALUES(?,'pending',0,?) ON CONFLICT DO NOTHING",
      id,
      Date.now(),
    ),
  );
  const claimed = await one(
    env.DB,
    command(
      "UPDATE registration_event SET status='running',attempts=attempts+1,updated_at=? WHERE user_id=? AND (status='pending' OR (status='running' AND updated_at<?)) RETURNING user_id",
      Date.now(),
      id,
      Date.now() - 300000,
    ),
  );
  if (!claimed) return;
  try {
    const u = await one<{ id: string; email: string; name: string }>(
      env.DB,
      command(
        "SELECT id,email,name FROM \"user\" WHERE id=? AND status='active' AND email_verified=TRUE",
        id,
      ),
    );
    if (!u) throw new Error("User not eligible");
    await onUserRegistered(
      Object.freeze(u),
      Object.freeze({ idempotencyKey: `registration:${id}` }),
    );
    await execute(
      env.DB,
      command(
        "UPDATE registration_event SET status='done',updated_at=? WHERE user_id=?",
        Date.now(),
        id,
      ),
    );
  } catch {
    await execute(
      env.DB,
      command(
        "UPDATE registration_event SET status='pending',updated_at=? WHERE user_id=?",
        Date.now(),
        id,
      ),
    );
  }
}
