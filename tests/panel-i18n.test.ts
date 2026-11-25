import { beforeAll } from "vitest";
import { loadPanelLanguage } from "../src/lib/i18n/panel";
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import ts from "typescript";
import { languageCodes } from "../src/lib/i18n/config";
import {
  panelMessages,
  panelSourceKeys,
  panelText,
  panelErrorText,
  roleLabel,
  type PanelKey,
} from "../src/lib/i18n/panel";
import {
  panelAuditAuthor,
  panelAuditResource,
} from "../src/lib/i18n/panel-presentation";

describe("workspace translations", () => {
  it("provides complete catalogs with matching parameters in ten languages", () => {
    const placeholders = (value: string) =>
      [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    for (const language of languageCodes) {
      expect(Object.keys(panelMessages[language]!).sort()).toEqual(
        Object.keys(panelMessages.en).sort(),
      );
      for (const key of Object.keys(panelMessages.en) as PanelKey[]) {
        expect(panelMessages[language]![key].trim()).not.toBe("");
        expect(
          placeholders(panelMessages[language]![key]),
          `${language}.${key}`,
        ).toEqual(placeholders(panelMessages.en[key]));
      }
    }
  });
  it("resolves every literal presentation key used by panel components", () => {
    for (const file of [
      "Admin.tsx",
      ...readdirSync("src/components/admin")
        .filter((file) => file.endsWith(".tsx"))
        .map((file) => `admin/${file}`),
    ]) {
      const source = ts.createSourceFile(
        file,
        readFileSync(`src/components/${file}`, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      function visit(node: ts.Node) {
        if (
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === "p" &&
          node.arguments[0] &&
          ts.isStringLiteral(node.arguments[0])
        ) {
          const key = node.arguments[0].text;
          expect(
            Object.hasOwn(panelMessages.en, key) ||
              Object.hasOwn(panelSourceKeys, key),
            `${file}: ${key}`,
          ).toBe(true);
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  });
  it("reformats saved confirmation parameters for the current language", () => {
    const message = {
      key: "accessChangeDetails" as const,
      values: {
        roleId: "administrator",
        role: "Administrador",
        status: "active",
      },
    };
    expect(panelText("en", message)).toContain(
      "Role: Administrator. Status: Active.",
    );
    expect(panelText("fr", message)).toContain("Administrateur");
    expect(panelText("fr", message)).toContain("Actif");
    const previous = panelMessages.fr!.save;
    try {
      panelMessages.fr!.save = "";
      expect(panelText("fr", "save")).toBe("Save");
    } finally {
      panelMessages.fr!.save = previous;
    }
    expect(panelErrorText("de", "internal.stack.trace")).not.toContain(
      "internal",
    );
    expect(panelText("en", "constructor")).toBe("constructor");
  });
  it("preserves user data and custom role names while translating known defaults", () => {
    expect(roleLabel("de", "administrator", "Administrador")).toBe(
      "Administrator",
    );
    expect(roleLabel("ar", "editor", "Editor")).toBe("محرر");
    expect(roleLabel("ja", "custom", "Administrador")).toBe("Administrador");
    expect(roleLabel("zh", "editor", "Equipo editorial")).toBe(
      "Equipo editorial",
    );
    expect(
      panelAuditAuthor("ja", {
        actor_name: "Sistema",
        email: "person@example.test",
      }),
    ).toEqual({ name: "Sistema", email: "person@example.test" });
    expect(panelAuditAuthor("en", {})).toEqual({
      name: "System",
      email: "System",
    });
    expect(
      panelAuditResource("en", {
        action: "user.deleted",
        resource: "gone@example.test",
      }),
    ).toBe("User account: gone@example.test");
    expect(
      panelAuditResource("en", {
        action: "user.updated",
        actor: "a",
        resource: "b",
        resource_name: "Usuario creado",
      }),
    ).toBe("User account: Usuario creado");
    expect(
      panelAuditResource("fr", {
        action: "role.updated",
        resource: "custom",
        resource_role_name: "Visualizador",
      }),
    ).toBe("Visualizador");
  });
});

beforeAll(async () => {
  await Promise.all(
    (["en", "es", "pt", "de", "fr", "it", "zh", "ja", "hi", "ar"] as const).map(
      loadPanelLanguage,
    ),
  );
});
