import copy from "./copy.json";
import type { Language } from "../../../lib/i18n/config";
export type MailCopy = typeof copy.en;
export const mailCopy: Record<Language, MailCopy> = copy;
