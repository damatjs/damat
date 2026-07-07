/**
 * Atomic multi-window check: evaluate every window and record the request in
 * ALL of them only when EVERY window is under its limit. If any window would
 * reject, nothing is recorded and no key TTL is extended — so a request that is
 * blocked by a later window never "spends" budget in an earlier one.
 *
 * KEYS[1..N] = one zset per window.
 * ARGV[1] = now (epoch ms, also the recorded member score),
 * ARGV[2] = unique member,
 * ARGV[3..] = per-window triplets in KEYS order:
 *   windowStart (entries at or before it are pruned), maxRequests, windowMs.
 *
 * Returns {1} when allowed (recorded everywhere), or
 * {0, windowIndex, count, oldestEntryScore} when rejected — windowIndex is the
 * 1-based position of the rejecting window (oldestEntryScore omitted if empty).
 */
export const MULTI_RATE_LIMIT_SCRIPT = `
  local now = ARGV[1]
  local member = ARGV[2]
  for i = 1, #KEYS do
    local base = 2 + (i - 1) * 3
    redis.call("zremrangebyscore", KEYS[i], 0, ARGV[base + 1])
    local count = redis.call("zcard", KEYS[i])
    if count >= tonumber(ARGV[base + 2]) then
      local oldest = redis.call("zrange", KEYS[i], 0, 0, "WITHSCORES")
      return {0, i, count, oldest[2]}
    end
  end
  for i = 1, #KEYS do
    local base = 2 + (i - 1) * 3
    redis.call("zadd", KEYS[i], now, member)
    redis.call("pexpire", KEYS[i], ARGV[base + 3])
  end
  return {1}
`;
