export function createRecordingPool(fail = false) {
  const sql: string[] = [];
  let releases = 0;
  const client = {
    query: async (statement: string) => {
      sql.push(statement);
      if (fail && statement === "SELECT 1") throw new Error("query failed");
      if (statement.includes('INSERT INTO "_damat_idempotency_keys"')) {
        return { rows: [{ scope: "test" }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    release: () => {
      releases += 1;
    },
  };
  return {
    client,
    pool: {
      query: client.query,
      connect: async () => client,
    },
    sql,
    releases: () => releases,
  };
}
