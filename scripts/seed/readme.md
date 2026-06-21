# @dariah-eric/seed

## Local non-admin personas

First seed the kitchen-sink entities, then create the local authorization personas:

```sh
pnpm data:seed:kitchen-sink
pnpm data:seed:users:non-admin
```

All personas use the password `local-persona-password` and the same TOTP secret
`NRXWGYLMFVYGK4TTN5XGCLLUN52HAIJB`. Add that secret to one authenticator entry and use its current
six-digit code for every persona.

| Persona                     | Email                                           |
| --------------------------- | ----------------------------------------------- |
| Country account             | `local-country@example.com`                     |
| National coordinator        | `local-national-coordinator@example.com`        |
| National coordinator deputy | `local-national-coordinator-deputy@example.com` |
| National coordination staff | `local-national-coordination-staff@example.com` |
| National representative     | `local-national-representative@example.com`     |
| Working-group member        | `local-working-group-member@example.com`        |
| Working-group chair         | `local-working-group-chair@example.com`         |
| No permissions              | `local-unprivileged@example.com`                |

The command is idempotent. It resets these users' password, actor connection, active relation, and
2FA key on every run, and invalidates their existing sessions.
