import { beforeAll } from "vitest";
import { loadPanelLanguage } from "../../src/lib/i18n/panel";
import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadRecoveryCodes } from "../../src/lib/download";
import { panelText } from "../../src/lib/i18n/panel";
import type { Language } from "../../src/lib/i18n/config";

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Recovery-code downloads", () => {
  it.each<[Language, string]>([
    ["en", "recovery-codes.txt"],
    ["es", "codigos-de-recuperacion.txt"],
    ["pt", "codigos-de-recuperacao.txt"],
    ["de", "wiederherstellungscodes.txt"],
    ["fr", "codes-de-recuperation.txt"],
    ["it", "codici-di-recupero.txt"],
    ["zh", "恢复代码.txt"],
    ["ja", "リカバリーコード.txt"],
    ["hi", "पुनर्प्राप्ति-कोड.txt"],
    ["ar", "رموز-الاسترداد.txt"],
  ])(
    "uses the selected %s language for filename and content",
    async (language, filename) => {
      vi.useFakeTimers();
      const link = { href: "", download: "", click: vi.fn(), remove: vi.fn() };
      const append = vi.fn();
      vi.stubGlobal("document", {
        body: { append },
        createElement: () => link,
      });
      const create = vi
        .spyOn(URL, "createObjectURL")
        .mockReturnValue("blob:recovery-test");
      const revoke = vi
        .spyOn(URL, "revokeObjectURL")
        .mockImplementation(() => {});
      const codes = ["AbCd-12345", "EfGh-67890"];
      downloadRecoveryCodes("TBA", codes, language);
      expect(link.download).toBe(filename);
      expect(link.click).toHaveBeenCalledOnce();
      expect(link.remove).toHaveBeenCalledOnce();
      const blob = create.mock.calls[0][0] as Blob;
      expect(blob.type).toBe("text/plain;charset=utf-8");
      const contents = await blob.text();
      expect(contents).toContain(panelText(language, "recoveryFileHint"));
      expect(contents).toContain(codes.join("\n"));
      expect(contents).not.toContain(filename);
      vi.runOnlyPendingTimers();
      expect(revoke).toHaveBeenCalledWith("blob:recovery-test");
    },
  );
});

beforeAll(async () => {
  await Promise.all(
    (["en", "es", "pt", "de", "fr", "it", "zh", "ja", "hi", "ar"] as const).map(
      loadPanelLanguage,
    ),
  );
});
