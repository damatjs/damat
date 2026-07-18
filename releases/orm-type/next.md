# @damatjs/orm-type Unreleased

## Changed

`OrmModule` may carry resolved entry, model, and migration paths plus package
mutability and package-name metadata. `PoolStats` also reports `activeCount`.

## Action required

Existing descriptors remain valid because every new module field is optional.
Code constructing `PoolStats` must include `activeCount`.
