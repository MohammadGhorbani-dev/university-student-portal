# Isolated Firestore validation

This workflow exercises the checked-in rules against the local Firestore emulator
using synthetic users and documents. It has no Firebase credentials, never deploys
rules, and refuses to run without the expected emulator address. The project ID
starts with `demo-` so the emulator cannot fall back to live Firebase resources.

The workflow runs `firestore-integration.mjs`: accepted application transactions,
direct unsafe writes, ownership, legacy schema boundaries and concurrent capacity/
credit-limit checks. Failures leave JSON evidence in the artifact. Infrastructure
errors also fail rather than counting as permission denials. The original
`firestore-rules.mjs` is preserved as the initial audit probe; it is not the current
acceptance suite.

Run from the repository root with Java 21+, Node 24 and dependencies installed:

```sh
npx --yes --package firebase-tools@15.28.1 firebase emulators:exec --project demo-portal-audit --only firestore --config firebase.validation.json 'node validation/firestore-integration.mjs'
```

See [the deployment gate and legacy migration requirements](../docs/SECURITY-MIGRATION.md).
