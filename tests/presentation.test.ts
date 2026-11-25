import { describe, it, expect } from "vitest";
import { permissions } from "../src/server/policy";
import {
  activityLabel,
  auditAuthor,
  auditResource,
  manualMfaKey,
  permissionLabels,
  recoveryText,
} from "../src/lib/presentation";

describe("Human readable security presentation", () => {
  it("identifies audit authors without attributing unavailable accounts to the system", () => {
    expect(
      auditAuthor({
        actor: "person",
        actor_name: "Dev Rounver",
        email: "dev@example.test",
      }),
    ).toEqual({ name: "Dev Rounver", email: "dev@example.test" });
    expect(auditAuthor({ actor: null, actor_name: null, email: null })).toEqual(
      { name: "Sistema", email: "Sistema" },
    );
    expect(
      auditAuthor({ actor: "deleted", actor_name: null, email: null }),
    ).toEqual({ name: "Usuario no disponible", email: "Correo no disponible" });
    expect(
      auditAuthor({
        actor: "person",
        actor_name: "  ",
        email: "person@example.test",
      }),
    ).toEqual({ name: "Sin nombre", email: "person@example.test" });
  });
  it("labels every assignable permission without exposing its internal key", () => {
    for (const permission of permissions) {
      expect(permissionLabels[permission]).toBeTruthy();
      expect(permissionLabels[permission]).not.toContain(permission);
    }
  });
  it("uses neutral labels for future audit actions and unavailable resources", () => {
    expect(
      auditResource({
        action: "role.updated",
        resource: "viewer",
        resource_role_name: "Consulta",
      }),
    ).toBe("Visualizador");
    expect(activityLabel("mfa.enabled")).toBe(
      "Verificación en dos pasos activada",
    );
    expect(activityLabel("extension.unknown")).toBe("Actividad registrada");
    expect(activityLabel("user.deleted")).toBe("Usuario eliminado");
    expect(
      auditResource({ action: "user.deleted", resource: "gone@example.test" }),
    ).toBe("Cuenta de usuario: gone@example.test");
    expect(auditResource({ resource: "missing-id" })).toBe(
      "Cuenta no disponible",
    );
    expect(auditResource({ resource_email: "person@example.test" })).toBe(
      "person@example.test",
    );
    expect(
      auditResource({ action: "role.updated", resource_role_name: "Editor" }),
    ).toBe("Editor");
    expect(
      auditResource({ action: "settings.registration", resource: "approval" }),
    ).toBe("Registro con aprobación");
  });
  it("extracts the manual key only from a valid TOTP setup URI", () => {
    expect(
      manualMfaKey("otpauth://totp/Test?secret=JBSWY3DPEHPK3PXP&issuer=Test"),
    ).toBe("JBSWY3DPEHPK3PXP");
    for (const invalid of [
      "",
      "invalid",
      "https://example.test/?secret=untrusted",
      "otpauth://hotp/Test?secret=untrusted",
    ])
      expect(manualMfaKey(invalid)).toBe("");
  });
  it("describes the affected resource without repeating the actor email", () => {
    const own = {
      actor: "self",
      resource: "self",
      resource_email: "person@example.test",
    };
    expect(auditResource({ ...own, action: "login.first_factor" })).toBe(
      "Inicio de sesión",
    );
    expect(auditResource({ ...own, action: "mfa.verify" })).toBe(
      "Segundo factor",
    );
    expect(auditResource({ ...own, action: "mfa.recovery" })).toBe(
      "Códigos de recuperación",
    );
    expect(auditResource({ ...own, action: "profile.update" })).toBe(
      "Perfil de la cuenta",
    );
    expect(
      auditResource({
        ...own,
        action: "user.updated",
        actor: "admin",
        resource_name: "Test Person",
      }),
    ).toBe("Cuenta de usuario: Test Person");
    expect(auditResource({ ...own, action: "sessions.revoked" })).toBe(
      "Sesiones de la cuenta",
    );
  });
  it("exports every recovery code once with first-factor and storage guidance", () => {
    const text = recoveryText("Test", ["one-test-code", "another-test-code"]);
    expect(text).toContain("somewhere private");
    expect(text).toContain("verify your email");
    expect(text.split("one-test-code")).toHaveLength(2);
    expect(text).toContain("one-test-code\nanother-test-code\n");
  });
});
