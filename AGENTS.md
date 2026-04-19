# Agent Notes

- Use the `pnpm` shim resolved from `PATH` for all repo commands.
- Do not invoke `~/.local/share/pnpm/.tools/pnpm-exe/*` directly.
- `pnpm` should run through the system `node` from `which node`, not a bundled standalone pnpm
  runtime.
- If pnpm behavior looks wrong, verify `pnpm exec node -p "process.execPath"` before trying any
  workaround.
