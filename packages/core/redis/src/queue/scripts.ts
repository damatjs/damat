/**
 * Atomic dequeue: claim due jobs and (optionally) reclaim stale ones in one
 * server-side script so two workers can never claim the same job.
 *
 * KEYS[1] = pending zset, KEYS[2] = processing zset.
 * ARGV[1] = now (epoch ms) — also used as the claim timestamp,
 * ARGV[2] = reclaim-before timestamp (entries in processing with a claim
 *           time <= this are moved back to pending; -1 disables reclaim),
 * ARGV[3] = max number of jobs to claim.
 *
 * Returns the claimed job ids (possibly empty).
 */
export const DEQUEUE_SCRIPT = `
  local reclaimBefore = tonumber(ARGV[2])
  if reclaimBefore >= 0 then
    local stale = redis.call("zrangebyscore", KEYS[2], 0, reclaimBefore)
    for _, id in ipairs(stale) do
      redis.call("zrem", KEYS[2], id)
      redis.call("zadd", KEYS[1], ARGV[1], id)
    end
  end
  local ids = redis.call("zrangebyscore", KEYS[1], 0, ARGV[1], "LIMIT", 0, tonumber(ARGV[3]))
  for _, id in ipairs(ids) do
    redis.call("zrem", KEYS[1], id)
    redis.call("zadd", KEYS[2], ARGV[1], id)
  end
  return ids
`;
