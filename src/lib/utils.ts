import { languageStorageKey } from "./i18n/config";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}
export async function api<T = Record<string, unknown>>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
  language?: string,
  refreshAuthorization = false,
): Promise<T> {
  if (!language) {
    try {
      language =
        document.documentElement.dataset.authLocale ||
        localStorage.getItem(languageStorageKey) ||
        undefined;
    } catch {}
  }
  const response = await fetch(`/api${path}`, {
    signal,
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(language ? { "X-Auth-Language": language } : {}),
      ...(refreshAuthorization ? { "X-TBA-Authorization-Refresh": "1" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json()) as { message?: string; code?: string };
  if (!response.ok)
    throw new ApiError(
      data.message || "We could not complete the operation. Please try again.",
      response.status,
      data.code,
    );
  return data as T;
}
