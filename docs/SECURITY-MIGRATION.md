# Security model and deployment gate

This branch is a validation candidate. Release the Firestore rules and changed
Firebase client together, after the legacy data migration. The standalone
showcase has a separate build and uses synthetic data.

## Identities and roles

Public registration creates only `student` profiles with empty academic fields.
Admin/staff roles must be assigned by the project owner in a trusted environment
(Firebase console or Admin SDK), after verifying the intended account. There is
no shared secret or privileged self-registration in the browser. Profile deletion,
role changes and academic changes are deliberately unavailable to client SDKs.
This application has no general user-management screen.

The canonical profile fields are `studentId` and `nationalCode`. Read-time adapters
support the older `studentNumber` and `nationalId` aliases without rewriting data.
All aliases and the academic/role fields are protected from contact edits.

## Enrollment ledger

Each course selection has the ID `uid_courseId`. Enrollment/drop changes the
selection, the course's `enrolledCount`, and `enrollment_terms/uid_semester` in one
transaction. The term document stores `studentUid`, `semester`, `totalCredits`,
`lastCourseId` and `updatedAt`. Rules link all three writes with `getAfter`.
The course snapshot comes from the database, never from the object in the UI.

`lastCourseId` permits one course transition per student/term in a commit. A batch
cannot undercount several courses using a single ledger delta. Concurrent changes
conflict on the term document, so the 20-credit limit is rechecked on retry.
Duplicate successful enrollment/cancellation calls are idempotent. A dropped
selection or cancelled reservation can be activated again if capacity and deadline
allow. Course cancellation is permitted until the course's registration deadline;
reservation cancellation does not require a still-open booking deadline.

New profiles have `enrollmentVersion: 1`, which is immutable through client rules.
Legacy profiles without that marker cannot enroll/drop until their existing records
are checked and a trusted migration initializes the ledger. Treating an unknown
legacy total as zero would allow students to bypass the credit limit.

## Required legacy migration, before live release

Run the read-only inventory with the existing Firebase CLI login, then prepare a plan offline. Use a private local output directory outside the repository. The inventory records each document's update time and stores raw Firestore values with checksums. It is gathered over several requests, so take a fresh inventory during the approved maintenance window for the migration.

```sh
node scripts/read-only-backup.mjs FIREBASE_TOOLS_ROOT university-portal-demo OUTPUT_DIRECTORY
node scripts/migration-plan.mjs SNAPSHOT_JSON PLAN_JSON OWNER_DECISIONS_JSON
node --test validation/migration.test.mjs
```

The decisions file lists `verifiedPrivilegedUids` and `legacyJalaliSlotIds` after
owner review. For a confirmed Jalali date with a time interval, the planner uses
the start of that interval in Tehran time as the booking deadline and retains
the original date and time fields. Use an empty JSON object when there are no
decisions to apply.

## Apply and verify

The runner regenerates the plan from the reviewed snapshot and decisions and
compares the entire inventory with the current database. It applies all field
patches and ledger creations in one atomic Firestore commit. Each patch requires
the backed-up document version, and each creation requires the document to be
absent. Afterward, the runner checks the inventory against the expected result.
[Firestore commit reference](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/commit)

The workflow rehearses the apply process against a local emulator using synthetic
data. A stale document or a ledger created after the preflight rejects the whole
commit. A refreshed plan for an already migrated database produces zero writes.

For the live release, confirm the maintenance window and database operation
with the owner. Save the current rules and deployed client revision. Freeze
Firestore writers, including clients on the old version and administrative
jobs, before taking a fresh backup and reviewing the resulting plan. The runner
checks existing document versions. The write freeze also protects against new
documents arriving after the preflight.

```sh
node scripts/apply-migration.mjs --production SNAPSHOT_JSON PLAN_JSON OWNER_DECISIONS_JSON FIREBASE_TOOLS_ROOT --maintenance-active
```

The command applies the reviewed plan to `university-portal-demo` using the
existing Firebase CLI account. The maintenance flag confirms an operator action.
If the commit response or verification fails, keep maintenance active and take
a fresh inventory to determine the database state before retrying. Once the
result is verified, release the compatible client and rules and check the
authorized smoke scenarios before reopening writes. Review the console indexes
before any index deployment.

## Parent management

Staff can change capacity while it stays at least the current count, and can
activate/deactivate reservation availability. A course/slot with active records
cannot be deleted or have snapshot-defining metadata changed. This prevents
orphaned active records and changing credits/semester behind a student's ledger.
Historical cancelled records retain their snapshots when an empty parent is deleted.

## Validation and limits

Dependency repairs retain Firebase 12.17.1 and the Vite 6 major version. Vite is
updated to 6.4.6; patched nanoid, source-map-js and re2js are recorded in the lock.
An explicit scoped override pins Firestore's Node-only gRPC dependency to 1.14.7
because its upstream dependency pinned an older version. Emulator integration tests
exercise that Node path. Review/remove the override when upstream adopts a patched
version. `npm audit fix --force` is not used; its suggested Firebase downgrade is
inappropriate for this application. The workflow checks known high advisories in
the project's installed dependency graph. A zero audit count is not proof of
application security and does not cover the separate firebase-tools CLI graph.

Relevant upstream advisories:

- https://github.com/advisories/GHSA-m9gg-hp2v-232j
- https://github.com/advisories/GHSA-9jrq-w75r-8gcw
- https://github.com/advisories/GHSA-gg6h-894w-4m9c

The GitHub workflow uses a `demo-` project ID, local emulator address and synthetic
data only. It exercises both accepted workflows and direct malicious writes, plus
concurrent capacity and credit-limit requests. Emulator testing does not validate
real Authentication configuration, deployed rule/index parity, network availability
from Iran, or production data. Those require separate release checks.
