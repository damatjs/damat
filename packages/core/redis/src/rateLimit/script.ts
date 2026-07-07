/**
 * Atomic sliding-window check: prune, count, and record the request only when
 * it is allowed — rejected calls add nothing and never extend the key TTL, so
 * a flood of rejected requests cannot keep the window from draining.
 *
 * KEYS[1] = window zset.
 * ARGV[1] = window start (epoch ms; entries at or before it are pruned),
 * ARGV[2] = maxRequests, ARGV[3] = now (epoch ms), ARGV[4] = unique member,
 * ARGV[5] = windowMs (key TTL).
 *
 * Returns [1, countBeforeAdd] when allowed, or
 * [0, count, oldestEntryScore] when rejected (score omitted if the set is empty).
 */
export const RATE_LIMIT_SCRIPT = `
  redis.call("zremrangebyscore", KEYS[1], 0, ARGV[1])
  local count = redis.call("zcard", KEYS[1])
  if count < tonumber(ARGV[2]) then
    redis.call("zadd", KEYS[1], ARGV[3], ARGV[4])
    redis.call("pexpire", KEYS[1], ARGV[5])
    return {1, count}
  end
  local oldest = redis.call("zrange", KEYS[1], 0, 0, "WITHSCORES")
  return {0, count, oldest[2]}
`;
