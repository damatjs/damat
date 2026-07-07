/**
 * In-memory fake implementation of the subset of ioredis used by @damatjs/redis.
 *
 * It is intentionally NOT a complete Redis. It implements only the commands the
 * helper functions in `src/` actually call, with realistic semantics:
 *
 *  - Strings : get, set (with PX/EX/NX flags), setex
 *  - Generic : del (variadic), expire, pexpire, ttl, keys (glob), scan
 *  - Counter : incrby, decrby
 *  - ZSet    : zadd, zcard, zrange (+WITHSCORES), zrangebyscore (+LIMIT),
 *              zrem, zremrangebyscore, zremrangebyrank
 *  - Hash    : hset, hget, hmget, hdel
 *  - Lua     : eval (handlers for the lock compare-and-act, queue dequeue,
 *              single- and multi-window rate-limit, and counter-TTL scripts;
 *              runs are serialized so each script executes atomically, as on a
 *              real server)
 *  - pipeline()/multi() : chained command builder + exec()
 *  - ping    : returns "PONG"
 *
 * Expiry is tracked as an absolute timestamp (ms). It is enforced lazily on
 * read (and via the optional fake clock) so tests can advance time without real
 * timers. Use `FakeRedis.now()` / `client.advanceTime()` for deterministic TTL
 * tests; otherwise it falls back to `Date.now()`.
 */

type ZMember = { member: string; score: number };

interface Entry {
  // For string values
  value?: string;
  // For sorted sets
  zset?: ZMember[];
  // For hashes
  hash?: Map<string, string>;
  // Absolute expiry timestamp in ms, or undefined for no expiry
  expireAt?: number;
}

// ioredis returns exec() results as [error, result] tuples.
type ExecResult = [Error | null, unknown];

function globToRegExp(pattern: string): RegExp {
  // Redis glob: * matches any (incl. empty), ? matches single char.
  let out = "^";
  for (const ch of pattern) {
    if (ch === "*") out += ".*";
    else if (ch === "?") out += ".";
    else out += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  out += "$";
  return new RegExp(out);
}

export class FakeRedis {
  private store = new Map<string, Entry>();
  // Optional manual clock offset (ms) for deterministic TTL tests.
  private timeOffset = 0;

  // ---- clock -------------------------------------------------------------
  now(): number {
    return Date.now() + this.timeOffset;
  }

  /** Advance the fake clock forward by `ms` milliseconds (for TTL tests). */
  advanceTime(ms: number): void {
    this.timeOffset += ms;
    // Proactively purge anything that has now expired.
    for (const key of [...this.store.keys()]) {
      this.getLive(key);
    }
  }

  // ---- internals ---------------------------------------------------------
  private getLive(key: string): Entry | undefined {
    const e = this.store.get(key);
    if (!e) return undefined;
    if (e.expireAt !== undefined && e.expireAt <= this.now()) {
      this.store.delete(key);
      return undefined;
    }
    return e;
  }

  /** Test-only helper: total number of (live) keys. */
  size(): number {
    let n = 0;
    for (const key of [...this.store.keys()]) {
      if (this.getLive(key)) n++;
    }
    return n;
  }

  /** Test-only helper: wipe everything. */
  reset(): void {
    this.store.clear();
    this.timeOffset = 0;
  }

  // ---- strings -----------------------------------------------------------
  async get(key: string): Promise<string | null> {
    const e = this.getLive(key);
    return e?.value ?? null;
  }

  /**
   * Supports the argument shapes the source uses:
   *   set(key, value)
   *   set(key, value, "PX", ms, "NX")
   * Returns "OK" on success, or null when NX is set and the key already exists.
   */
  async set(key: string, value: string, ...args: unknown[]): Promise<string | null> {
    let expireAt: number | undefined;
    let nx = false;
    let xx = false;

    for (let i = 0; i < args.length; i++) {
      const flag = String(args[i]).toUpperCase();
      if (flag === "PX") {
        expireAt = this.now() + Number(args[++i]);
      } else if (flag === "EX") {
        expireAt = this.now() + Number(args[++i]) * 1000;
      } else if (flag === "NX") {
        nx = true;
      } else if (flag === "XX") {
        xx = true;
      }
    }

    const exists = this.getLive(key) !== undefined;
    if (nx && exists) return null;
    if (xx && !exists) return null;

    this.store.set(key, { value: String(value), expireAt });
    return "OK";
  }

  async setex(key: string, ttlSeconds: number, value: string | number): Promise<string> {
    this.store.set(key, {
      value: String(value),
      expireAt: this.now() + Number(ttlSeconds) * 1000,
    });
    return "OK";
  }

  // ---- generic -----------------------------------------------------------
  async del(...keys: string[]): Promise<number> {
    let n = 0;
    for (const key of keys) {
      if (this.getLive(key) !== undefined) {
        this.store.delete(key);
        n++;
      } else {
        // Even if logically expired, ensure it's gone.
        this.store.delete(key);
      }
    }
    return n;
  }

  async expire(key: string, ttlSeconds: number): Promise<number> {
    const e = this.getLive(key);
    if (!e) return 0;
    e.expireAt = this.now() + Number(ttlSeconds) * 1000;
    return 1;
  }

  async pexpire(key: string, ttlMs: number): Promise<number> {
    const e = this.getLive(key);
    if (!e) return 0;
    e.expireAt = this.now() + Number(ttlMs);
    return 1;
  }

  /** Returns remaining TTL in seconds, -1 if no expiry, -2 if missing. */
  async ttl(key: string): Promise<number> {
    const e = this.getLive(key);
    if (!e) return -2;
    if (e.expireAt === undefined) return -1;
    return Math.ceil((e.expireAt - this.now()) / 1000);
  }

  async pttl(key: string): Promise<number> {
    const e = this.getLive(key);
    if (!e) return -2;
    if (e.expireAt === undefined) return -1;
    return e.expireAt - this.now();
  }

  async keys(pattern: string): Promise<string[]> {
    const re = globToRegExp(pattern);
    const out: string[] = [];
    for (const key of [...this.store.keys()]) {
      if (this.getLive(key) && re.test(key)) out.push(key);
    }
    return out;
  }

  /**
   * Minimal SCAN: ignores cursor pagination and returns everything in one pass.
   * Supports MATCH and COUNT (COUNT is ignored). Returns [nextCursor, keys].
   */
  async scan(_cursor: string | number, ...args: unknown[]): Promise<[string, string[]]> {
    let match = "*";
    for (let i = 0; i < args.length; i++) {
      const flag = String(args[i]).toUpperCase();
      if (flag === "MATCH") match = String(args[++i]);
      else if (flag === "COUNT") i++;
    }
    const keys = await this.keys(match);
    return ["0", keys];
  }

  // ---- counters ----------------------------------------------------------
  async incrby(key: string, amount: number): Promise<number> {
    const e = this.getLive(key);
    const current = e ? parseInt(e.value ?? "0", 10) : 0;
    const next = current + Number(amount);
    if (e) {
      e.value = String(next);
    } else {
      this.store.set(key, { value: String(next) });
    }
    return next;
  }

  async decrby(key: string, amount: number): Promise<number> {
    return this.incrby(key, -Number(amount));
  }

  async incr(key: string): Promise<number> {
    return this.incrby(key, 1);
  }

  async decr(key: string): Promise<number> {
    return this.incrby(key, -1);
  }

  // ---- sorted sets -------------------------------------------------------
  private zsetOf(key: string, create = false): ZMember[] | undefined {
    let e = this.getLive(key);
    if (!e && create) {
      e = { zset: [] };
      this.store.set(key, e);
    }
    if (!e) return undefined;
    if (!e.zset) e.zset = [];
    return e.zset;
  }

  /**
   * zadd(key, score, member, [score, member, ...]) — the only shape used.
   * Returns the number of NEW members added.
   */
  async zadd(key: string, ...args: Array<string | number>): Promise<number> {
    const zset = this.zsetOf(key, true)!;
    let added = 0;
    for (let i = 0; i < args.length; i += 2) {
      const score = Number(args[i]);
      const member = String(args[i + 1]);
      const existing = zset.find((m) => m.member === member);
      if (existing) {
        existing.score = score;
      } else {
        zset.push({ member, score });
        added++;
      }
    }
    return added;
  }

  async zcard(key: string): Promise<number> {
    const zset = this.zsetOf(key);
    return zset ? zset.length : 0;
  }

  /**
   * zrange(key, start, stop, ["WITHSCORES"]) over score-sorted ascending order.
   * Supports negative indexes. Returns [member, member, ...] or, with
   * WITHSCORES, [member, score, member, score, ...].
   */
  async zrange(
    key: string,
    start: number,
    stop: number,
    withScores?: string,
  ): Promise<string[]> {
    const zset = this.zsetOf(key);
    if (!zset || zset.length === 0) return [];
    const sorted = [...zset].sort(
      (a, b) => a.score - b.score || (a.member < b.member ? -1 : 1),
    );
    const len = sorted.length;
    let s = start < 0 ? len + start : start;
    let e = stop < 0 ? len + stop : stop;
    if (s < 0) s = 0;
    if (e >= len) e = len - 1;
    const slice = s > e ? [] : sorted.slice(s, e + 1);
    const ws = String(withScores ?? "").toUpperCase() === "WITHSCORES";
    if (ws) {
      const out: string[] = [];
      for (const m of slice) {
        out.push(m.member, String(m.score));
      }
      return out;
    }
    return slice.map((m) => m.member);
  }

  /**
   * zrangebyscore(key, min, max, ["LIMIT", offset, count]) ascending by score.
   */
  async zrangebyscore(
    key: string,
    min: number | string,
    max: number | string,
    ...args: unknown[]
  ): Promise<string[]> {
    const zset = this.zsetOf(key);
    if (!zset) return [];
    const lo = min === "-inf" ? -Infinity : Number(min);
    const hi = max === "+inf" ? Infinity : Number(max);
    let result = [...zset]
      .filter((m) => m.score >= lo && m.score <= hi)
      .sort((a, b) => a.score - b.score || (a.member < b.member ? -1 : 1))
      .map((m) => m.member);

    for (let i = 0; i < args.length; i++) {
      if (String(args[i]).toUpperCase() === "LIMIT") {
        const offset = Number(args[i + 1]);
        const count = Number(args[i + 2]);
        result = result.slice(offset, count < 0 ? undefined : offset + count);
        i += 2;
      }
    }
    return result;
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    const zset = this.zsetOf(key);
    if (!zset) return 0;
    let removed = 0;
    for (const member of members) {
      const idx = zset.findIndex((m) => m.member === String(member));
      if (idx >= 0) {
        zset.splice(idx, 1);
        removed++;
      }
    }
    return removed;
  }

  /**
   * zremrangebyrank(key, start, stop) — removes members by ascending-score rank
   * (0 = lowest score). Mirrors Redis clamping: negative indexes add the length,
   * start is floored to 0, and start > stop removes nothing. Used to trim the
   * queue's terminal sets to a bounded size. Returns the removed count.
   */
  async zremrangebyrank(
    key: string,
    start: number,
    stop: number,
  ): Promise<number> {
    const zset = this.zsetOf(key);
    if (!zset || zset.length === 0) return 0;
    const sorted = [...zset].sort(
      (a, b) => a.score - b.score || (a.member < b.member ? -1 : 1),
    );
    const len = sorted.length;
    let s = start < 0 ? len + start : start;
    let e = stop < 0 ? len + stop : stop;
    if (s < 0) s = 0;
    if (s > e || s >= len) return 0;
    if (e >= len) e = len - 1;
    const toRemove = new Set(sorted.slice(s, e + 1).map((m) => m.member));
    const kept = zset.filter((m) => !toRemove.has(m.member));
    this.store.get(key)!.zset = kept;
    return len - kept.length;
  }

  /** Removes members with min <= score <= max. Returns the removed count. */
  async zremrangebyscore(
    key: string,
    min: number | string,
    max: number | string,
  ): Promise<number> {
    const zset = this.zsetOf(key);
    if (!zset) return 0;
    const lo = min === "-inf" ? -Infinity : Number(min);
    const hi = max === "+inf" ? Infinity : Number(max);
    const before = zset.length;
    const kept = zset.filter((m) => !(m.score >= lo && m.score <= hi));
    this.store.get(key)!.zset = kept;
    return before - kept.length;
  }

  // ---- hashes ------------------------------------------------------------
  private hashOf(key: string, create = false): Map<string, string> | undefined {
    let e = this.getLive(key);
    if (!e && create) {
      e = { hash: new Map() };
      this.store.set(key, e);
    }
    if (!e) return undefined;
    if (!e.hash) e.hash = new Map();
    return e.hash;
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    const hash = this.hashOf(key, true)!;
    const isNew = !hash.has(field);
    hash.set(field, String(value));
    return isNew ? 1 : 0;
  }

  async hget(key: string, field: string): Promise<string | null> {
    const hash = this.hashOf(key);
    return hash?.get(field) ?? null;
  }

  async hmget(key: string, ...fields: string[]): Promise<(string | null)[]> {
    const hash = this.hashOf(key);
    return fields.map((f) => hash?.get(f) ?? null);
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    const hash = this.hashOf(key);
    if (!hash) return 0;
    let n = 0;
    for (const f of fields) {
      if (hash.delete(f)) n++;
    }
    return n;
  }

  // ---- lua ---------------------------------------------------------------
  // Scripts run one-at-a-time (like real Redis) via this promise chain, so
  // concurrent eval() calls cannot interleave their internal command awaits.
  private evalChain: Promise<unknown> = Promise.resolve();

  /**
   * Fake of the Redis EVAL command (ioredis `redis.eval`), NOT JavaScript's
   * `eval` — the Lua source is never executed; it is only pattern-matched to
   * pick the matching hand-written handler:
   *   "#KEYS"            → MULTI_RATE_LIMIT_SCRIPT (all-or-nothing across windows)
   *   "zremrangebyscore" → RATE_LIMIT_SCRIPT (prune/count/conditionally add)
   *   "zrangebyscore"    → DEQUEUE_SCRIPT (reclaim stale + claim due jobs)
   *   "incrby"           → incrementCounter (INCRBY + arm TTL when absent)
   *   otherwise          → lock compare-and-act (releaseLock / extendLock)
   * Signature mirrors ioredis: eval(script, numKeys, ...keysAndArgs).
   */
  async eval(
    script: string,
    numKeys: number,
    ...keysAndArgs: Array<string | number>
  ): Promise<unknown> {
    const run = () => this.evalDispatch(script, numKeys, ...keysAndArgs);
    const result = this.evalChain.then(run, run);
    this.evalChain = result.catch(() => undefined);
    return result;
  }

  private async evalDispatch(
    script: string,
    numKeys: number,
    ...keysAndArgs: Array<string | number>
  ): Promise<unknown> {
    const keys = keysAndArgs.slice(0, numKeys).map(String);
    const argv = keysAndArgs.slice(numKeys).map(String);
    // The multi-window script is the only one that loops over `#KEYS`; check it
    // before the single-window one since both call zremrangebyscore.
    if (script.includes("#KEYS")) {
      return this.evalMultiRateLimit(keys, argv);
    }
    if (script.includes("zremrangebyscore")) {
      return this.evalRateLimit(keys[0]!, argv);
    }
    if (script.includes("zrangebyscore")) {
      return this.evalDequeue(keys, argv);
    }
    if (script.includes("incrby")) {
      return this.evalIncrementWithTtl(keys[0]!, argv);
    }
    return this.evalLockCompareAndAct(script, keys[0]!, argv);
  }

  /** RATE_LIMIT_SCRIPT: [1, count] when allowed, [0, count, oldestScore?] when not. */
  private async evalRateLimit(key: string, argv: string[]): Promise<unknown[]> {
    const [windowStart, maxRequests, now, member, windowMs] = argv;
    await this.zremrangebyscore(key, 0, Number(windowStart));
    const count = await this.zcard(key);
    if (count < Number(maxRequests)) {
      await this.zadd(key, Number(now), member!);
      await this.pexpire(key, Number(windowMs));
      return [1, count];
    }
    const oldest = await this.zrange(key, 0, 0, "WITHSCORES");
    // Lua drops trailing nils; mirror that when the zset is empty.
    return oldest[1] !== undefined ? [0, count, oldest[1]] : [0, count];
  }

  /**
   * MULTI_RATE_LIMIT_SCRIPT: all-or-nothing across N windows. Prunes and counts
   * every window; on the first over-limit window returns [0, index, count,
   * oldestScore?] recording nothing. Otherwise records in all and returns [1].
   */
  private async evalMultiRateLimit(
    keys: string[],
    argv: string[],
  ): Promise<unknown[]> {
    const now = Number(argv[0]);
    const member = argv[1]!;
    for (let i = 0; i < keys.length; i++) {
      const base = 2 + i * 3;
      await this.zremrangebyscore(keys[i]!, 0, Number(argv[base]));
      const count = await this.zcard(keys[i]!);
      if (count >= Number(argv[base + 1])) {
        const oldest = await this.zrange(keys[i]!, 0, 0, "WITHSCORES");
        // Lua drops trailing nils; mirror that when the window is empty.
        return oldest[1] !== undefined
          ? [0, i + 1, count, oldest[1]]
          : [0, i + 1, count];
      }
    }
    for (let i = 0; i < keys.length; i++) {
      const base = 2 + i * 3;
      await this.zadd(keys[i]!, now, member);
      await this.pexpire(keys[i]!, Number(argv[base + 2]));
    }
    return [1];
  }

  /** DEQUEUE_SCRIPT: reclaim stale processing entries, then claim due ids. */
  private async evalDequeue(keys: string[], argv: string[]): Promise<string[]> {
    const [pending, processing] = keys as [string, string];
    const [now, reclaimBefore, count] = argv.map(Number) as [number, number, number];
    if (reclaimBefore >= 0) {
      const stale = await this.zrangebyscore(processing, 0, reclaimBefore);
      for (const id of stale) {
        await this.zrem(processing, id);
        await this.zadd(pending, now, id);
      }
    }
    const ids = await this.zrangebyscore(pending, 0, now, "LIMIT", 0, count);
    for (const id of ids) {
      await this.zrem(pending, id);
      await this.zadd(processing, now, id);
    }
    return ids;
  }

  /** incrementCounter script: INCRBY, then EXPIRE only when no TTL is set. */
  private async evalIncrementWithTtl(key: string, argv: string[]): Promise<number> {
    const value = await this.incrby(key, Number(argv[0]));
    if ((await this.ttl(key)) < 0) {
      await this.expire(key, Number(argv[1]));
    }
    return value;
  }

  /**
   * Lock compare-and-act scripts:
   *   releaseLock: if get(KEYS[1]) == ARGV[1] then return del(KEYS[1]) else 0 end
   *   extendLock : if get(KEYS[1]) == ARGV[1] then return pexpire(KEYS[1], ARGV[2]) else 0 end
   */
  private async evalLockCompareAndAct(
    script: string,
    key: string,
    argv: string[],
  ): Promise<unknown> {
    const expected = argv[0];
    const current = await this.get(key);
    if (current !== null && current === expected) {
      // The extend script re-arms the TTL via pexpire; everything else deletes.
      if (script.includes("pexpire")) {
        return this.pexpire(key, Number(argv[1]));
      }
      return this.del(key);
    }
    return 0;
  }

  async ping(): Promise<string> {
    return "PONG";
  }

  // ---- pipeline / multi --------------------------------------------------
  pipeline(): FakePipeline {
    return new FakePipeline(this);
  }

  multi(): FakePipeline {
    return new FakePipeline(this);
  }
}

/**
 * Chainable pipeline that buffers commands and runs them on exec().
 * Each buffered op records the method name + args; exec() invokes them in order
 * and returns ioredis-style [error, result] tuples.
 */
export class FakePipeline {
  private ops: Array<{ method: string; args: unknown[] }> = [];

  constructor(private readonly client: FakeRedis) {}

  private push(method: string, args: unknown[]): this {
    this.ops.push({ method, args });
    return this;
  }

  // Only the commands actually chained in the source are exposed here.
  zremrangebyscore(...args: unknown[]): this {
    return this.push("zremrangebyscore", args);
  }
  zremrangebyrank(...args: unknown[]): this {
    return this.push("zremrangebyrank", args);
  }
  zcard(...args: unknown[]): this {
    return this.push("zcard", args);
  }
  zadd(...args: unknown[]): this {
    return this.push("zadd", args);
  }
  zrem(...args: unknown[]): this {
    return this.push("zrem", args);
  }
  pexpire(...args: unknown[]): this {
    return this.push("pexpire", args);
  }
  expire(...args: unknown[]): this {
    return this.push("expire", args);
  }
  hset(...args: unknown[]): this {
    return this.push("hset", args);
  }
  hdel(...args: unknown[]): this {
    return this.push("hdel", args);
  }
  del(...args: unknown[]): this {
    return this.push("del", args);
  }
  set(...args: unknown[]): this {
    return this.push("set", args);
  }
  setex(...args: unknown[]): this {
    return this.push("setex", args);
  }
  get(...args: unknown[]): this {
    return this.push("get", args);
  }
  incrby(...args: unknown[]): this {
    return this.push("incrby", args);
  }
  decrby(...args: unknown[]): this {
    return this.push("decrby", args);
  }

  async exec(): Promise<ExecResult[]> {
    const results: ExecResult[] = [];
    for (const op of this.ops) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fn = (this.client as any)[op.method] as (...a: unknown[]) => Promise<unknown>;
        const value = await fn.apply(this.client, op.args);
        results.push([null, value]);
      } catch (err) {
        results.push([err as Error, null]);
      }
    }
    return results;
  }
}

/**
 * Build a fresh fake Redis instance typed as the ioredis `Redis` the helpers
 * expect. The helper signatures take `Redis` from "@damatjs/deps/ioredis"; the
 * fake implements the used subset, so a cast is required.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createFakeRedis(): FakeRedis & any {
  return new FakeRedis() as FakeRedis & any;
}
