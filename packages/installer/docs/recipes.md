# Recipes

Recipes are JSON-shaped declarative data. Unknown properties and executable
hooks, scripts, commands, callbacks, or functions are rejected.

Mode selection uses caller override, recipe default, then `source`. An explicit
unsupported mode fails. Source mappings use `*`, `**`, and `?`, apply ignore
rules first, use the first matching mapping, omit unmatched files when mappings
exist, and reject target traversal and symbolic links.

Package mode requires an immutable primary package reference. Additional
packages are name/reference data and become separate typed operations. Usage
hints contain literal tokens and optional target globs; they support advisory
removal warnings but do not transfer integration cleanup responsibility to the
installer.
