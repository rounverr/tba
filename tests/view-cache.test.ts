import { describe, expect, it } from "vitest";
import { ViewCache } from "../src/lib/view-cache";
describe("Bounded private display cache", () => {
  it("expires entries without extending their lifetime on a read", () => {
    const cache = new ViewCache<string>(30, 2);
    cache.set("users", "first", "actor-a", 100);
    expect(cache.get("users", 120)?.value).toBe("first");
    expect(cache.get("users", 130)).toBeUndefined();
  });
  it("evicts the least recently used entry and respects the capacity", () => {
    const cache = new ViewCache<string>(30, 2);
    cache.set("users", "u", "actor-a", 100);
    cache.set("audit", "a", "actor-a", 100);
    cache.get("users", 101);
    cache.set("roles", "r", "actor-a", 102);
    expect(cache.get("audit", 103)).toBeUndefined();
    expect(cache.get("users", 103)?.value).toBe("u");
  });
  it("clears all entries when the account or authorization signature changes", () => {
    const cache = new ViewCache<string>();
    cache.set("users", "private", "actor-a:administrator");
    cache.set("profile", "profile", "actor-a:viewer");
    expect(cache.get("users")).toBeUndefined();
    expect(cache.get("profile")?.value).toBe("profile");
    cache.set("audit", "different", "actor-b");
    expect(cache.get("profile")).toBeUndefined();
  });
  it("invalidates data explicitly after mutation, logout or access rejection", () => {
    const cache = new ViewCache<string>();
    cache.set("users", "private", "actor");
    cache.clear();
    expect(cache.get("users")).toBeUndefined();
  });
});
