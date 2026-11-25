import legacyLabels from "./i18n/legacy-labels.json";
import { defaultLanguage, type Language } from "./i18n/config";
import { panelText } from "./i18n/panel";
export function downloadRecoveryCodes(
  appName: string,
  codes: string[],
  language: Language = defaultLanguage,
) {
  const url = URL.createObjectURL(
    new Blob(
      [
        `${appName} - ${panelText(language, legacyLabels.recoveryCodes)}\n\n${panelText(language, "recoveryFileHint")}\n\n${codes.join("\n")}\n`,
      ],
      {
        type: "text/plain;charset=utf-8",
      },
    ),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = panelText(language, "recoveryFileName");
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
