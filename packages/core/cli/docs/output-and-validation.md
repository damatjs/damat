# Output, diagnostics, and validation

## Output helpers

Presentation helpers receive structural interfaces:

```ts
printError(logger, output, message, suggestion?);
printInfo(logger, output, message, details?);
printSuccess(logger, output, message, details?);
printSection(output, title, lines);
```

Spacing and detail text use `CliOutput`; leveled messages use `CliLogger`.
`formatCommandHelp` returns a string and performs no output.

## Error reporting

The explicit form is:

```ts
reportError(logger, output, error, {
  prefix: "Command failed",
  verbose: false,
});
```

The reporter normalizes non-Error values, preserves meaningful error names,
walks up to five causes, forwards Error objects only in verbose mode, and emits
a verbose hint otherwise. It never reads process arguments or Damat environment
variables.

The compatible three-argument form routes the hint through `logger.info`:

```ts
reportError(logger, error, { prefix: "Command failed" });
```

`getExitCode` returns a `CliError` code and defaults other thrown values to one.

## Validation

```ts
coerceOptions(options, definitions);
applyDefaults(options, definitions);
validateOptions(options, definitions, commandName);
```

The shared execution pipeline runs these in that order. A missing required
option throws `MissingRequiredOptionError`; `executeCommand` converts that error
to a result without invoking the handler.

## Errors

- `CliError` is the base error with an exit code.
- `MissingRequiredOptionError` identifies a required option.
- `ConfigLoadError` preserves the resolved file and cause.
- `CommandRegistrationError` identifies duplicate names or aliases.
- `CommandNotFoundError` is available to command authors.
