# @damatjs/orm-migration Unreleased

## Changed

Migration discovery prefers a resolved module's explicit `migrations`
directory, including all-module listing. Model discovery accepts aggregate
exports and file-per-model provider directories.

## Action required

String callers continue to use `<resolver>/migrations`.
