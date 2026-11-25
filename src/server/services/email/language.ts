import { execute, command, one } from "../../database/persistence";
import type { RuntimeEnv } from "../../types";
import {
  enabledLanguageCodes,
  defaultLanguage,
  type Language,
} from "../../../lib/i18n/config";
const identifier = (id: string) => `mail-language:${id}`;
// Preference metadata only. This namespace never grants identity or authorization.
export async function saveMailLanguage(
  env: Pick<RuntimeEnv, "DB">,
  id: string,
  language: Language,
) {
  const key = identifier(id),
    now = Date.now();
  await execute(
    env.DB,
    command(
      "INSERT INTO verification(id,identifier,value,expires_at,created_at,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at WHERE verification.value<>excluded.value",
      key,
      key,
      language,
      253402300799000,
      now,
      now,
    ),
  );
}
export async function recipientLanguage(
  env: Pick<RuntimeEnv, "DB">,
  id: string,
): Promise<Language> {
  const row = await one<{ value: string }>(
    env.DB,
    command(
      "SELECT value FROM verification WHERE identifier=?",
      identifier(id),
    ),
  );
  return row && enabledLanguageCodes.includes(row.value as Language)
    ? (row.value as Language)
    : defaultLanguage;
}
export async function rememberMailLanguage(
  env: Pick<RuntimeEnv, "DB">,
  id: string,
  language: Language,
) {
  try {
    await saveMailLanguage(env, id, language);
  } catch {
    console.error("mail_language_preference_failed");
  }
}
export const mailLanguageIdentifier = identifier;
