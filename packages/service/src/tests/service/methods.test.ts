import { describe, it, expect, mock } from "bun:test";
import { ModelMethods } from "../../service/methods";

/**
 * Tests for ModelMethods. The PgEntityManager and PgRepository are fakes; the
 * methods just forward to repository calls (no DB). Relation loading is driven
 * through fake related repositories returned by the entity manager.
 */

// --- Fake repository --------------------------------------------------------

function makeRepo(overrides: Record<string, any> = {}) {
  return {
    create: mock(async (o: any) => ({ id: 1, ...o.data })),
    createMany: mock(async (o: any) => o.data.map((d: any, i: number) => ({ id: i + 1, ...d }))),
    findOne: mock(async () => ({ id: 1, name: "row" })),
    findMany: mock(async () => [{ id: 1 }, { id: 2 }]),
    update: mock(async (o: any) => [{ id: 1, ...o.set }]),
    delete: mock(async () => 3),
    count: mock(async () => 7),
    exists: mock(async () => true),
    ...overrides,
  };
}

/**
 * Fake EM that returns a single primary repo for `modelName` and arbitrary
 * "related" repos by name. Used to drive relation loading.
 */
function makeEM(opts: {
  primaryRepo?: any;
  relatedRepos?: Record<string, any>;
} = {}) {
  const primaryRepo = opts.primaryRepo ?? makeRepo();
  const relatedRepos = opts.relatedRepos ?? {};
  return {
    primaryRepo,
    relatedRepos,
    getRepository: mock((name: string) => {
      if (relatedRepos[name]) return relatedRepos[name];
      return primaryRepo;
    }),
  } as any;
}

function makeModel(opts: {
  name?: string;
  deletedAtField?: string;
  relations?: any[];
} = {}) {
  return {
    _name: opts.name ?? "user",
    _deletedAtField: opts.deletedAtField,
    toTableSchema: () => ({ relations: opts.relations ?? [] }),
  } as any;
}

// --- Tests ------------------------------------------------------------------

describe("ModelMethods", () => {
  describe("getModelDefinition", () => {
    it("returns the wrapped model definition", () => {
      const model = makeModel();
      const m = new ModelMethods(model, "user", makeEM());
      expect(m.getModelDefinition()).toBe(model);
    });
  });

  describe("repository selection", () => {
    it("throws when constructed without an entity manager", () => {
      const m = new ModelMethods(makeModel(), "user", undefined as any);
      expect(m.count()).rejects.toThrow("EntityManager not initialized");
    });

    it("uses the non-transactional repository by default", async () => {
      const em = makeEM();
      const m = new ModelMethods(makeModel(), "user", em);
      await m.count();
      expect(em.getRepository).toHaveBeenCalledWith("user");
    });

    it("uses the transactional repository once a tx EM is set, and reverts on null", async () => {
      const txRepo = makeRepo({ count: mock(async () => 99) });
      const txEm = { getRepository: mock(() => txRepo) } as any;
      const em = makeEM();
      const m = new ModelMethods(makeModel(), "user", em);

      m.setTransactionalEm(txEm);
      expect(await m.count()).toBe(99);
      expect(txEm.getRepository).toHaveBeenCalledWith("user");

      m.setTransactionalEm(null);
      await m.count();
      expect(em.getRepository).toHaveBeenCalledWith("user");
    });
  });

  describe("create / createMany", () => {
    it("forwards create options to repo.create", async () => {
      const repo = makeRepo();
      const m = new ModelMethods(makeModel(), "user", makeEM({ primaryRepo: repo }));
      const res = await m.create({ data: { name: "Ada" }, returning: ["id"] });
      expect(res).toEqual({ id: 1, name: "Ada" });
      expect(repo.create).toHaveBeenCalledTimes(1);
      expect(repo.create.mock.calls[0][0]).toEqual({ data: { name: "Ada" }, returning: ["id"] });
    });

    it("forwards each item then calls repo.createMany", async () => {
      const repo = makeRepo();
      const m = new ModelMethods(makeModel(), "user", makeEM({ primaryRepo: repo }));
      const res = await m.createMany({ data: [{ name: "a" }, { name: "b" }] });
      expect(res).toHaveLength(2);
      expect(repo.createMany).toHaveBeenCalledTimes(1);
    });
  });

  describe("find", () => {
    it("returns the row when no include is requested", async () => {
      const repo = makeRepo({ findOne: mock(async () => ({ id: 5, name: "x" })) });
      const m = new ModelMethods(makeModel(), "user", makeEM({ primaryRepo: repo }));
      const res = await m.find({ where: { id: 5 } });
      expect(res).toEqual({ id: 5, name: "x" });
    });

    it("strips the `include` key before passing options to the repository", async () => {
      const repo = makeRepo({ findOne: mock(async () => ({ id: 1 })) });
      const m = new ModelMethods(
        makeModel({ relations: [] }),
        "user",
        makeEM({ primaryRepo: repo }),
      );
      await m.find({ where: { id: 1 }, include: ["posts"] });
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("returns null when the repository finds nothing", async () => {
      const repo = makeRepo({ findOne: mock(async () => null) });
      const m = new ModelMethods(makeModel(), "user", makeEM({ primaryRepo: repo }));
      expect(await m.find({ where: { id: 999 } })).toBeNull();
    });

    it("returns null even when include is requested but the row is missing", async () => {
      const repo = makeRepo({ findOne: mock(async () => null) });
      const m = new ModelMethods(
        makeModel({ relations: [{ from: "posts", to: "post", type: "hasMany" }] }),
        "user",
        makeEM({ primaryRepo: repo }),
      );
      expect(await m.find({ where: { id: 999 }, include: ["posts"] })).toBeNull();
    });
  });

  describe("findMany", () => {
    it("returns records unchanged when no include is requested", async () => {
      const repo = makeRepo({ findMany: mock(async () => [{ id: 1 }, { id: 2 }]) });
      const m = new ModelMethods(makeModel(), "user", makeEM({ primaryRepo: repo }));
      const res = await m.findMany({ where: { active: true } });
      expect(res).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it("returns an empty array without attempting relation loading", async () => {
      const repo = makeRepo({ findMany: mock(async () => []) });
      const relatedRepo = makeRepo();
      const em = makeEM({ primaryRepo: repo, relatedRepos: { post: relatedRepo } });
      const m = new ModelMethods(
        makeModel({ relations: [{ from: "posts", to: "post", type: "hasMany" }] }),
        "user",
        em,
      );
      const res = await m.findMany({ include: ["posts"] });
      expect(res).toEqual([]);
      expect(relatedRepo.findMany).not.toHaveBeenCalled();
    });
  });

  describe("relation loading", () => {
    it("loads a belongsTo relation via the FK on the current row", async () => {
      const primary = makeRepo({
        findOne: mock(async () => ({ id: 1, author_id: 42 })),
      });
      const authorRepo = makeRepo({ findOne: mock(async () => ({ id: 42, name: "Ada" })) });
      const em = makeEM({ primaryRepo: primary, relatedRepos: { author: authorRepo } });
      const m = new ModelMethods(
        makeModel({
          relations: [
            { from: "author", to: "author", type: "belongsTo", linkedBy: ["author_id"] },
          ],
        }),
        "post",
        em,
      );

      const res: any = await m.find({ where: { id: 1 }, include: ["author"] });
      expect(res.author).toEqual({ id: 42, name: "Ada" });
      expect(authorRepo.findOne).toHaveBeenCalledWith({ where: { id: 42 } });
    });

    it("returns null for a belongsTo relation with no linkedBy column", async () => {
      const primary = makeRepo({ findOne: mock(async () => ({ id: 1 })) });
      const em = makeEM({ primaryRepo: primary, relatedRepos: { author: makeRepo() } });
      const m = new ModelMethods(
        makeModel({ relations: [{ from: "author", to: "author", type: "belongsTo" }] }),
        "post",
        em,
      );
      const res: any = await m.find({ where: { id: 1 }, include: ["author"] });
      expect(res.author).toBeNull();
    });

    it("returns null for a belongsTo relation when the FK value is empty", async () => {
      const primary = makeRepo({ findOne: mock(async () => ({ id: 1, author_id: null })) });
      const em = makeEM({ primaryRepo: primary, relatedRepos: { author: makeRepo() } });
      const m = new ModelMethods(
        makeModel({
          relations: [
            { from: "author", to: "author", type: "belongsTo", linkedBy: ["author_id"] },
          ],
        }),
        "post",
        em,
      );
      const res: any = await m.find({ where: { id: 1 }, include: ["author"] });
      expect(res.author).toBeNull();
    });

    it("loads a hasMany relation using the model name FK by default", async () => {
      const primary = makeRepo({ findOne: mock(async () => ({ id: 7 })) });
      const postRepo = makeRepo({ findMany: mock(async () => [{ id: 1 }, { id: 2 }]) });
      const em = makeEM({ primaryRepo: primary, relatedRepos: { post: postRepo } });
      const m = new ModelMethods(
        makeModel({
          name: "user",
          relations: [{ from: "posts", to: "post", type: "hasMany" }],
        }),
        "user",
        em,
      );

      const res: any = await m.find({ where: { id: 7 }, include: ["posts"] });
      expect(res.posts).toEqual([{ id: 1 }, { id: 2 }]);
      // default FK column is `${model._name}_id` => user_id
      expect(postRepo.findMany).toHaveBeenCalledWith({ where: { user_id: 7 } });
    });

    it("loads a hasMany relation using mappedBy to derive the FK column", async () => {
      const primary = makeRepo({ findOne: mock(async () => ({ id: 7 })) });
      const postRepo = makeRepo({ findMany: mock(async () => [{ id: 9 }]) });
      const em = makeEM({ primaryRepo: primary, relatedRepos: { post: postRepo } });
      const m = new ModelMethods(
        makeModel({
          name: "user",
          relations: [{ from: "posts", to: "post", type: "hasMany", mappedBy: ["owner"] }],
        }),
        "user",
        em,
      );

      await m.find({ where: { id: 7 }, include: ["posts"] });
      expect(postRepo.findMany).toHaveBeenCalledWith({ where: { owner_id: 7 } });
    });

    it("loads a hasOne relation returning a single record", async () => {
      const primary = makeRepo({ findOne: mock(async () => ({ id: 7 })) });
      const profileRepo = makeRepo({ findOne: mock(async () => ({ id: 1, bio: "hi" })) });
      const em = makeEM({ primaryRepo: primary, relatedRepos: { profile: profileRepo } });
      const m = new ModelMethods(
        makeModel({
          name: "user",
          relations: [{ from: "profile", to: "profile", type: "hasOne" }],
        }),
        "user",
        em,
      );

      const res: any = await m.find({ where: { id: 7 }, include: ["profile"] });
      expect(res.profile).toEqual({ id: 1, bio: "hi" });
      expect(profileRepo.findOne).toHaveBeenCalledWith({ where: { user_id: 7 } });
    });

    it("skips include names that don't match any relation", async () => {
      const primary = makeRepo({ findOne: mock(async () => ({ id: 1, name: "x" })) });
      const em = makeEM({ primaryRepo: primary });
      const m = new ModelMethods(
        makeModel({ relations: [{ from: "posts", to: "post", type: "hasMany" }] }),
        "user",
        em,
      );
      const res: any = await m.find({ where: { id: 1 }, include: ["nonexistent"] });
      expect(res).toEqual({ id: 1, name: "x" });
      expect(res.nonexistent).toBeUndefined();
    });

    it("loads relations for every record in findMany", async () => {
      const primary = makeRepo({ findMany: mock(async () => [{ id: 1 }, { id: 2 }]) });
      const postRepo = makeRepo({ findMany: mock(async () => [{ id: 99 }]) });
      const em = makeEM({ primaryRepo: primary, relatedRepos: { post: postRepo } });
      const m = new ModelMethods(
        makeModel({
          name: "user",
          relations: [{ from: "posts", to: "post", type: "hasMany" }],
        }),
        "user",
        em,
      );

      const res: any = await m.findMany({ include: ["posts"] });
      expect(res).toHaveLength(2);
      expect(res[0].posts).toEqual([{ id: 99 }]);
      expect(res[1].posts).toEqual([{ id: 99 }]);
      expect(postRepo.findMany).toHaveBeenCalledTimes(2);
    });

    it("caches relation metadata (toTableSchema called once across loads)", async () => {
      const toTableSchema = mock(() => ({ relations: [] }));
      const model = {
        _name: "user",
        toTableSchema,
      } as any;
      const m = new ModelMethods(model, "user", makeEM());
      await m.find({ where: { id: 1 }, include: ["posts"] });
      await m.find({ where: { id: 2 }, include: ["posts"] });
      expect(toTableSchema).toHaveBeenCalledTimes(1);
    });
  });

  describe("update / delete", () => {
    it("forwards update options to repo.update", async () => {
      const repo = makeRepo({ update: mock(async (o: any) => [{ id: 1, ...o.data }]) });
      const m = new ModelMethods(makeModel(), "user", makeEM({ primaryRepo: repo }));
      const res = await m.update({ where: { id: 1 }, data: { name: "new" } });
      expect(res).toEqual([{ id: 1, name: "new" }]);
      expect(repo.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { name: "new" } });
    });

    it("forwards delete options and returns the affected count", async () => {
      const repo = makeRepo({ delete: mock(async () => 4) });
      const m = new ModelMethods(makeModel(), "user", makeEM({ primaryRepo: repo }));
      const res = await m.delete({ where: { id: 1 } });
      expect(res).toBe(4);
    });
  });

  describe("softDelete / restore", () => {
    it("softDelete sets the default deleted_at field to a Date", async () => {
      const repo = makeRepo();
      const m = new ModelMethods(makeModel({ deletedAtField: undefined }), "user", makeEM({ primaryRepo: repo }));
      await m.softDelete({ where: { id: 1 }, returning: ["id"] });
      const arg = repo.update.mock.calls[0][0];
      expect(arg.set.deleted_at).toBeInstanceOf(Date);
      expect(arg.where).toEqual({ id: 1 });
      expect(arg.returning).toEqual(["id"]);
    });

    it("softDelete honors a custom deletedAt field name", async () => {
      const repo = makeRepo();
      const m = new ModelMethods(makeModel({ deletedAtField: "archived_at" }), "user", makeEM({ primaryRepo: repo }));
      await m.softDelete({ where: { id: 1 } });
      const arg = repo.update.mock.calls[0][0];
      expect(arg.set.archived_at).toBeInstanceOf(Date);
      expect(arg.set.deleted_at).toBeUndefined();
    });

    it("restore nulls out the default deleted_at field", async () => {
      const repo = makeRepo();
      const m = new ModelMethods(makeModel({ deletedAtField: undefined }), "user", makeEM({ primaryRepo: repo }));
      await m.restore({ where: { id: 1 } });
      const arg = repo.update.mock.calls[0][0];
      expect(arg.set).toEqual({ deleted_at: null });
    });

    it("restore honors a custom deletedAt field name", async () => {
      const repo = makeRepo();
      const m = new ModelMethods(makeModel({ deletedAtField: "archived_at" }), "user", makeEM({ primaryRepo: repo }));
      await m.restore({ where: { id: 1 }, returning: ["id"] });
      const arg = repo.update.mock.calls[0][0];
      expect(arg.set).toEqual({ archived_at: null });
      expect(arg.returning).toEqual(["id"]);
    });
  });

  describe("count / exists", () => {
    it("count forwards the where clause and returns the number", async () => {
      const repo = makeRepo({ count: mock(async () => 12) });
      const m = new ModelMethods(makeModel(), "user", makeEM({ primaryRepo: repo }));
      const res = await m.count({ where: { active: true } });
      expect(res).toBe(12);
      expect(repo.count).toHaveBeenCalledWith({ active: true });
    });

    it("count works with no options (undefined where)", async () => {
      const repo = makeRepo({ count: mock(async () => 0) });
      const m = new ModelMethods(makeModel(), "user", makeEM({ primaryRepo: repo }));
      expect(await m.count()).toBe(0);
      expect(repo.count).toHaveBeenCalledWith(undefined);
    });

    it("exists forwards the where clause and returns the boolean", async () => {
      const repo = makeRepo({ exists: mock(async () => false) });
      const m = new ModelMethods(makeModel(), "user", makeEM({ primaryRepo: repo }));
      const res = await m.exists({ where: { email: "x@y.z" } });
      expect(res).toBe(false);
      expect(repo.exists).toHaveBeenCalledWith({ email: "x@y.z" });
    });
  });
});
