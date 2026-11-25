import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Manual audit for tracked text files. Generated files are included.
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const forbidden = /[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/gu;
const decoder = new TextDecoder("utf-8", { fatal: true });
let failures = 0;
let checked = 0;
for (const path of files) {
  const bytes = readFileSync(path);
  if (bytes.includes(0)) continue;
  let content;
  try {
    content = decoder.decode(bytes);
  } catch {
    continue;
  }
  checked++;
  for (const match of content.matchAll(forbidden)) {
    const line = content.slice(0, match.index).split("\n").length;
    console.error(`${path}:${line}: forbidden typographic separator U+${match[0].codePointAt(0).toString(16).toUpperCase()}`);
    failures++;
  }
}
if (failures > 0) {
  console.error(`Typography audit failed: ${failures} occurrences in ${checked} text files.`);
  process.exitCode = 1;
} else {
  console.log(`Typography audit passed: ${checked} tracked text files checked.`);
}
