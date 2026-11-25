import { mkdtemp, mkdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, posix, win32 } from "node:path";
import { describe, expect, it } from "vitest";
import { clientAddress } from "../src/server/runtime/client-address";
import { databasePath } from "../src/server/runtime/node-storage";
import {
  contained,
  publicRoot,
  readPublicAsset,
  requestPath,
} from "../src/server/runtime/paths";

describe("standalone file boundaries", () => {
  it("checks POSIX roots and whole path segments", () => {
    expect(contained("/srv/dist", "/srv/dist", posix)).toBe(true);
    expect(contained("/srv/dist", "/srv/dist/asset.js", posix)).toBe(true);
    expect(contained("/srv/dist", "/srv/dist/../private", posix)).toBe(false);
    expect(contained("/srv/dist", "/srv/dist-old/asset.js", posix)).toBe(false);
  });

  it("checks Windows volume, UNC share, case and both separators", () => {
    expect(contained("C:\\app\\dist", "c:/APP/dist/img.svg", win32)).toBe(true);
    expect(contained("C:\\app\\dist", "D:\\app\\dist\\img.svg", win32)).toBe(
      false,
    );
    expect(contained("C:\\app\\dist", "C:/app/dist/../secret", win32)).toBe(
      false,
    );
    expect(contained("C:\\app\\dist", "C:/app/dist-old/img.svg", win32)).toBe(
      false,
    );
    expect(
      contained(
        "\\\\server\\share\\dist",
        "//server/share/dist/img.svg",
        win32,
      ),
    ).toBe(true);
    expect(
      contained(
        "\\\\server\\share\\dist",
        "//server/other/dist/img.svg",
        win32,
      ),
    ).toBe(false);
    expect(
      contained("C:\\app\\dist", "//server/share/dist/img.svg", win32),
    ).toBe(false);
    expect(contained("dist", "dist/img.svg", win32)).toBe(true);
  });

  it("rejects ambiguous and encoded paths before URL normalization", () => {
    expect(requestPath("/folder/caf%C3%A9.html?v=%2F")).toBe(
      "/folder/café.html",
    );
    for (const value of [
      "/folder/../index.html",
      "/folder/%2e%2e/index.html",
      "/a%2Fb.html",
      "/a%5Cb.html",
      "/%252e%252e/file.html",
      "/%00.html",
      "/%ZZ",
      "/file.html:stream",
      "/file.html%3astream",
      "/folder.%20/asset.js",
      "/NUL.html",
      "//another/share/asset.js",
      "/.env",
      "http://example.test/index.html",
    ])
      expect(requestPath(value), value).toBeNull();
  });

  it("checks real symlinks, dangling database links and auxiliary files", async () => {
    const directory = await mkdtemp(join(tmpdir(), "tba-paths-"));
    try {
      const dist = join(directory, "dist");
      const asset = join(dist, "index.html");
      const privateDir = join(directory, "private");
      await mkdir(dist);
      await mkdir(privateDir);
      await writeFile(asset, "public");
      const root = await publicRoot(dist);
      expect((await readPublicAsset(root, "/index.html"))?.toString()).toBe(
        "public",
      );

      const external = join(privateDir, "sensitive.html");
      await writeFile(external, "private");
      await symlink(external, join(dist, "external.html"), "file");
      await symlink(privateDir, join(dist, "external-dir"), "junction");
      await writeFile(join(dist, ".hidden.html"), "hidden");
      await symlink(
        join(dist, ".hidden.html"),
        join(dist, "alias.html"),
        "file",
      );
      await writeFile(join(dist, "credentials.json"), "{}");
      await symlink(
        join(dist, "credentials.json"),
        join(dist, "credentials.html"),
        "file",
      );
      await symlink(asset, join(dist, "internal.html"), "file");
      expect(await readPublicAsset(root, "/external.html")).toBeNull();
      expect(
        await readPublicAsset(root, "/external-dir/sensitive.html"),
      ).toBeNull();
      expect(await readPublicAsset(root, "/alias.html")).toBeNull();
      expect(await readPublicAsset(root, "/credentials.html")).toBeNull();
      expect((await readPublicAsset(root, "/internal.html"))?.toString()).toBe(
        "public",
      );

      const publicAlias = join(privateDir, "public-alias");
      await symlink(dist, publicAlias, "junction");
      await expect(publicRoot(publicAlias)).rejects.toThrow("real directory");
      await expect(
        databasePath(join(publicAlias, "inside.db"), dist),
      ).rejects.toThrow("outside dist");
      await expect(
        databasePath(join(publicAlias, "new-folder", "inside.db"), dist),
      ).rejects.toThrow("outside dist");
      await expect(stat(join(dist, "new-folder"))).rejects.toMatchObject({
        code: "ENOENT",
      });

      const dangling = join(privateDir, "dangling.db");
      await symlink(join(dist, "missing.db"), dangling, "file");
      await expect(databasePath(dangling, dist)).rejects.toThrow(
        "unresolved link",
      );
      const db = join(privateDir, "safe.db");
      expect(await databasePath(db, dist)).toBe(
        join(await publicRoot(privateDir), "safe.db"),
      );
      await symlink(asset, db + "-wal", "file");
      await expect(databasePath(db, dist)).rejects.toThrow("auxiliary files");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

describe("standalone client identification", () => {
  it("ignores forwarded addresses from an untrusted socket, including by default", () => {
    expect(clientAddress()("192.0.2.1", undefined)).toBe("192.0.2.1");
    expect(clientAddress()("192.0.2.1", ["203.0.113.1"])).toBe("192.0.2.1");
    expect(clientAddress("10.0.0.0/24")("192.0.2.1", ["203.0.113.1"])).toBe(
      "192.0.2.1",
    );
  });

  it("canonicalizes IPv4-mapped addresses and walks trusted IPv4 and IPv6 proxies", () => {
    const identify = clientAddress("10.0.0.0/24,2001:db8:1::/64,::1");
    expect(identify("::ffff:a00:1", ["192.0.2.3, 2001:DB8:1::F"])).toBe(
      "192.0.2.3",
    );
    expect(identify("::1", ["2001:0DB8:002::00A, 10.0.0.9"])).toBe(
      "2001:db8:2::a",
    );
    expect(identify("10.0.0.1", ["192.0.2.4"])).toBe("192.0.2.4");
    expect(identify("10.0.0.1", ["192.0.2.5"])).toBe("192.0.2.5");
  });

  it("keeps the last untrusted hop despite invented entries on its left", () => {
    const identify = clientAddress("10.0.0.1,10.0.0.2");
    for (const invented of ["198.51.100.1", "198.51.100.2", "2001:db8::1"])
      expect(identify("10.0.0.1", [invented + ", 192.0.2.10, 10.0.0.2"])).toBe(
        "192.0.2.10",
      );
    expect(identify("10.0.0.1", ["10.0.0.2"])).toBe("10.0.0.1");
  });

  it("discards malformed, duplicate and oversized forwarding headers", () => {
    const identify = clientAddress("10.0.0.1");
    for (const headers of [
      ["192.0.2.1", "192.0.2.2"],
      ["192.0.2.1,"],
      ["192.0.2.1:123"],
      ["[2001:db8::a]"],
      ["fe80::a%lo"],
      ["for=192.0.2.1"],
      ["192.0.2.1,".repeat(300)],
    ])
      expect(identify("10.0.0.1", headers)).toBe("10.0.0.1");
    for (const config of [
      "*",
      "0.0.0.0/0",
      "::/0",
      "192.0.2.1/33",
      "::ffff:0:0/96",
    ])
      expect(() => clientAddress(config)).toThrow("TRUSTED_PROXIES");
  });
});
