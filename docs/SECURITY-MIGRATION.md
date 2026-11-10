# Security model and deployment gate

This branch is a validation candidate. Its Firestore rules and changed client
must be reviewed and released together. No live data was read or migrated while
developing the repair. Do not deploy this branch's rules alone over a legacy database.

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

The following is a deployment checklist, not an automatic migration script:

1. Obtain owner approval for the real database and planned maintenance window.
   Export/backup data. Prevent all enrollment/reservation writes through temporary
   maintenance rules, including writes from older deployed clients; hiding buttons
   is insufficient. Keep ordinary reads available as appropriate.
2. In a trusted Admin SDK process, inventory profiles, courses, selections and
   reservations. Produce a dry-run report of duplicate/noncanonical IDs, missing
   parents, invalid credits/semesters/statuses, inconsistent counters and totals
   over 20. Reconcile exceptions explicitly with the owner; do not discard history.
3. Using authoritative courses and the reconciled active selections, create term
   ledgers and repair course counters. Initialize reservation counters from
   reconciled active reservations. Backfill course `registrationEndsAt` and slot
   `bookingEndsAt` timestamps. The UI creates them using Tehran time; semester
   dates are defined in `src/utils/semesterUtils.js`.
4. Set `enrollmentVersion: 1` only for accounts whose complete history was checked.
   Resolve fields/aliases without overwriting a conflicting canonical identity.
   Validate the results while maintenance remains in effect. If interrupted,
   leave writes disabled and use a restartable migration; never reopen partially
   migrated data.
5. Review existing indexes and deploy compatible client/rules, then run approved
   smoke tests on a dedicated test project before reopening writes. The checked-in
   `firestore.indexes.json` defines no custom indexes; it is not evidence that an
   existing console has no indexes. Do not delete console indexes blindly.

The migration itself remains pending and requires separate approval. If existing
data can be replaced because the project is only a demo, that is a separate owner
decision, not an assumption of this change.

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
