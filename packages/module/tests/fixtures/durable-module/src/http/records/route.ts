import { defineRoute } from "@damatjs/framework/router";
import { PoolManager } from "@damatjs/services";

export const POST = defineRoute(async (context) => {
  const body = (await context.req.json()) as { id: string; value: string };
  await PoolManager.getPool().query(
    `INSERT INTO "standalone_fixture_records" ("id", "value") VALUES ($1, $2)
     ON CONFLICT ("id") DO UPDATE SET "value" = EXCLUDED."value"`,
    [body.id, body.value],
  );
  return context.json(body, 201);
});

export const GET = defineRoute(async (context) => {
  const result = await PoolManager.getPool().query(
    `SELECT "id", "value" FROM "standalone_fixture_records" ORDER BY "id"`,
  );
  return context.json({ records: result.rows });
});
