import { lstat, readFile, realpath, stat } from "node:fs/promises";
import * as path from "node:path";

export function contained(
  root: string,
  candidate: string,
  paths: Pick<typeof path, "relative" | "isAbsolute" | "sep"> = path,
) {
  const relative = paths.relative(root, candidate);
  return (
    !paths.isAbsolute(relative) &&
    relative !== ".." &&
    !relative.startsWith(".." + paths.sep)
  );
}

export async function publicRoot(directory: string, allowMissing = false) {
  const info = await lstat(directory).catch((error: NodeJS.ErrnoException) => {
    if (allowMissing && error.code === "ENOENT") return null;
    throw error;
  });
  if (!info) return directory;
  if (!info.isDirectory() || info.isSymbolicLink())
    throw new Error("dist must be a real directory");
  return realpath(directory);
}

export function requestPath(target: string) {
  const raw = target.split("?", 1)[0];
  if (!raw.startsWith("/") || raw.startsWith("//") || /%2f|%5c/i.test(raw))
    return null;
  try {
    const decoded = decodeURIComponent(raw);
    return safeSegments(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

export function safeSegments(value: string) {
  // Backslashes and colons include Windows separators and alternate streams.
  // A remaining percent could be decoded differently by another layer.
  if (/[\\:%<>?"|*#\u0000-\u001f\u007f]/.test(value)) return false;
  return !value
    .split("/")
    .some(
      (part) =>
        part.startsWith(".") ||
        /[. ]$/.test(part) ||
        /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(part),
    );
}

export async function readPublicAsset(root: string, pathname: string) {
  try {
    const actual = await realpath(path.resolve(root, "." + pathname));
    if (
      !contained(root, actual) ||
      path.extname(actual) !== path.extname(pathname) ||
      !safeSegments(path.relative(root, actual).split(path.sep).join("/")) ||
      !(await stat(actual)).isFile()
    )
      return null;
    return await readFile(actual);
  } catch (error) {
    const { code } = error as NodeJS.ErrnoException;
    if (code === "ENOENT" || code === "ENOTDIR" || code === "ELOOP")
      return null;
    throw error;
  }
}
