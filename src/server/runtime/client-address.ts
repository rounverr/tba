import { BlockList, isIP, SocketAddress } from "node:net";

function address(value: string) {
  if (value.includes("%")) return null;
  const family = isIP(value);
  if (family === 4) return { ip: value, family: "ipv4" as const };
  if (family !== 6) return null;
  const ip = new SocketAddress({ address: value, family: "ipv6" }).address;
  return ip.startsWith("::ffff:")
    ? { ip: ip.slice(7), family: "ipv4" as const }
    : { ip, family: "ipv6" as const };
}

export function clientAddress(config = "") {
  const trusted = { ipv4: new BlockList(), ipv6: new BlockList() };
  for (const entry of config.trim() ? config.split(",") : []) {
    const [value, prefix, ...extra] = entry.trim().split("/");
    const parsed = address(value);
    if (
      !parsed ||
      extra.length ||
      (prefix !== undefined &&
        (!/^[1-9]\d{0,2}$/.test(prefix) ||
          Number(prefix) > (parsed.family === "ipv4" ? 32 : 128) ||
          isIP(value) !== (parsed.family === "ipv4" ? 4 : 6)))
    )
      throw new Error(
        "TRUSTED_PROXIES requires explicit IP addresses or nonzero CIDR prefixes",
      );
    if (prefix === undefined)
      trusted[parsed.family].addAddress(parsed.ip, parsed.family);
    else
      trusted[parsed.family].addSubnet(
        parsed.ip,
        Number(prefix),
        parsed.family,
      );
  }

  return (remote: string | undefined, forwarded: string[] | undefined) => {
    const peer = address(remote || "");
    if (!peer) return "unknown";
    if (
      !trusted[peer.family].check(peer.ip, peer.family) ||
      forwarded?.length !== 1 ||
      forwarded[0].length > 2048
    )
      return peer.ip;
    const hops = forwarded[0].split(",");
    if (hops.length > 32) return peer.ip;
    const chain = hops.map((hop) => address(hop.trim()));
    for (const hop of chain) if (!hop) return peer.ip;
    for (const hop of chain.reverse()) {
      if (hop && !trusted[hop.family].check(hop.ip, hop.family)) return hop.ip;
    }
    return peer.ip;
  };
}
