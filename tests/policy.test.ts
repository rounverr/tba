import { describe, it, expect } from "vitest";
import { isSafePublicRole, canAccess, isLocalUrl } from "../src/server/policy";
describe("Authorization invariants", () => {
  it.each(["pending", "suspended", "disabled"])(
    "denies %s users even with verified MFA",
    (status) => expect(canAccess(status, true, true, true)).toBe(false),
  );
  it("denies unverified email", () =>
    expect(canAccess("active", false, false, false)).toBe(false));
  it("denies MFA pending", () =>
    expect(canAccess("active", true, true, false)).toBe(false));
  it("allows active verified account with no MFA", () =>
    expect(canAccess("active", true, false, false)).toBe(true));
  it.each([
    ["users.read"],
    ["users.edit"],
    ["roles.manage"],
    ["settings.manage"],
    ["audit.read"],
  ])("forbids administrative public permissions: %s", (p) =>
    expect(
      isSafePublicRole({ isPublic: true, isAdmin: false, permissions: [p] }),
    ).toBe(false),
  );
  it("forbids public admin flag", () =>
    expect(
      isSafePublicRole({ isPublic: true, isAdmin: true, permissions: [] }),
    ).toBe(false));
  it("accepts minimal public role", () =>
    expect(
      isSafePublicRole({
        isPublic: true,
        isAdmin: false,
        permissions: ["app.read"],
      }),
    ).toBe(true));
  it("never treats production as local", () =>
    expect(isLocalUrl("https://localhost.evil.example")).toBe(false));
});
