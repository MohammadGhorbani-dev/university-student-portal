# Isolated Firestore validation

This workflow exercises the checked-in rules against the local Firestore emulator
using synthetic users and documents. It has no Firebase credentials, never deploys
rules, and refuses to run without the expected emulator address. The project ID
starts with `demo-` so the emulator cannot fall back to live Firebase resources.

This initial baseline intentionally fails when an unsafe write is permitted or a
supported re-registration/rebooking is denied. A completed workflow is not a
security approval: inspect the test outcome and the JSON evidence artifact.
Infrastructure errors also fail the job rather than counting as permission denials.

Run from the repository root with Java 21+, Node 24 and dependencies installed:

```sh
npx --yes --package firebase-tools@15.28.1 firebase emulators:exec --project demo-portal-audit --only firestore --config firebase.validation.json 'node validation/firestore-rules.mjs'
```

The checks cover the originally identified role, counter, ownership, request,
profile and support-message issues. They are a baseline; atomic lifecycle and
concurrency tests must be expanded alongside the corresponding implementation.
