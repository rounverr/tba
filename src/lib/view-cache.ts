// Private display data lives only in this mounted panel, never in browser storage.
// No polling or prefetching: entries are reused briefly on explicit navigation.
export class ViewCache<T> {
  private entries = new Map<string, { value: T; expiresAt: number }>();
  private identity = "";
  constructor(
    private ttl = 30000,
    private capacity = 8,
  ) {}
  get(key: string, now = Date.now()) {
    const entry = this.entries.get(key);
    if (!entry || entry.expiresAt <= now) {
      this.entries.delete(key);
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry;
  }
  set(key: string, value: T, identity: string, now = Date.now()) {
    if (identity !== this.identity) {
      this.clear();
      this.identity = identity;
    }
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: now + this.ttl });
    while (this.entries.size > this.capacity)
      this.entries.delete(this.entries.keys().next().value!);
  }
  clear() {
    this.entries.clear();
  }
}
