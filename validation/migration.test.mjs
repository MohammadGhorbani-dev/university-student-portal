import test from 'node:test';
import assert from 'node:assert/strict';
import { planMigration } from '../scripts/migration-plan.mjs';
import { readOnlyBackup, decodeValue } from '../scripts/read-only-backup.mjs';

function fixture() {
  const collections = {
    users: { u: { role: 'student', studentNumber: 'TEST', nationalId: '0001', extra: 'retain' } },
    courses: { c: { credits: 3, capacity: 10, semester: 'fall_2026', enrolledCount: 999 } },
    course_selections: { u_c: { studentUid: 'u', courseId: 'c', credits: 3, semester: 'fall_2026', status: 'active' } },
    reservation_slots: { s: { capacity: 3, reservedCount: 99, date: '2027-01-01', time: '10:00', status: 'active' } },
    student_reservations: { u_s: { studentUid: 'u', slotId: 's', status: 'active' } },
    requests: { r: { message: 'untouched' } }, 'support_tickets/t/messages': { m: { message: 'retained' } },
  };
  const versions = Object.fromEntries(Object.entries(collections).flatMap(([collection, docs]) => Object.keys(docs).map(id => [collection + '/' + id, '2026-11-10T00:00:00.000000Z'])));
  return { format: 'portal-snapshot-v1', projectId: 'demo-migration-test', collections, versions };
}

test('plan preserves the original snapshot and history, normalizes aliases and reconciles counters/ledger', () => {
  const input = fixture(), before = structuredClone(input), plan = planMigration(input);
  assert.deepEqual(input, before);
  assert.equal(plan.structurallyReady, true);
  assert.deepEqual(plan.deletes, []);
  assert.equal(plan.applyImplemented, false);
  assert.equal(plan.changes.find(c => c.path === 'courses/c').patch.enrolledCount, 1);
  assert.equal(plan.changes.find(c => c.path === 'reservation_slots/s').patch.reservedCount, 1);
  assert.equal(plan.changes.find(c => c.path === 'enrollment_terms/u_fall_2026').patch.totalCredits, 3);
  assert(plan.changes.some(c => c.path === 'users/u' && c.patch.studentId === 'TEST'));
  assert(!plan.changes.some(c => c.path.startsWith('requests/') || c.path.includes('/messages/')));
  assert(plan.changes.filter(c => c.operation === 'patch-if-unchanged').every(c => c.expectedUpdateTime));
});
test('identity conflicts block readiness and never overwrite canonical identity', () => {
  const input = fixture(); input.collections.users.u.studentId = 'DIFFERENT';
  const plan = planMigration(input);
  assert(plan.issues.some(i => i.code === 'IDENTITY_CONFLICT'));
  assert(!plan.changes.some(c => c.patch.studentId || c.patch.enrollmentVersion));
});
test('confirmed Jalali interval gets a deadline while its original date/time remain untouched', () => {
  const input = fixture(); input.collections.reservation_slots.s.date = '1402-08-01'; input.collections.reservation_slots.s.time = '10:00-12:00';
  assert.equal(planMigration(input).structurallyReady, false);
  const plan = planMigration(input, { legacyJalaliSlotIds: ['s'] });
  assert.equal(plan.structurallyReady, true);
  assert.equal(plan.changes.find(c => c.path === 'reservation_slots/s').patch.bookingEndsAt.value, '2023-10-23T06:30:00.000Z');
  assert.equal(input.collections.reservation_slots.s.date, '1402-08-01');
  assert(!plan.changes.some(c => 'date' in c.patch || 'time' in c.patch));
  assert.equal(new Set(plan.changes.map(c => c.path)).size, plan.changes.length);
});
test('invalid calendar days and overnight ambiguous intervals stop automatic planning', () => {
  const input = fixture(); input.collections.reservation_slots.s.date = '2027-02-31';
  assert(planMigration(input).issues.some(i => i.code === 'INVALID_SLOT_DATE'));
  input.collections.reservation_slots.s.date = '1402-08-01'; input.collections.reservation_slots.s.time = '20:00-08:00';
  assert(planMigration(input, { legacyJalaliSlotIds: ['s'] }).issues.some(i => i.code === 'INVALID_SLOT_DATE'));
});
test('orphan, duplicate/noncanonical IDs, capacity and credit conflicts require owner decisions', () => {
  for (const scenario of ['orphan', 'noncanonical', 'capacity', 'credits']) {
    const input = fixture();
    if (scenario === 'orphan') delete input.collections.courses.c;
    if (scenario === 'noncanonical') input.collections.course_selections.duplicate = { ...input.collections.course_selections.u_c };
    if (scenario === 'capacity') input.collections.courses.c.capacity = 0;
    if (scenario === 'credits') input.collections.course_selections.u_c.credits = 6;
    const plan = planMigration(input);
    assert.equal(plan.structurallyReady, false, scenario);
    assert.equal(plan.deletes.length, 0);
    assert(!plan.changes.some(c => c.patch.enrollmentVersion));
  }
});
test('term totals above 20 are reported without dropping selections', () => {
  const input = fixture();
  for (let i = 0; i < 7; i++) {
    const id = 'extra-' + i;
    input.collections.courses[id] = { ...input.collections.courses.c };
    input.collections.course_selections['u_' + id] = { ...input.collections.course_selections.u_c, courseId: id };
    input.versions['courses/' + id] = input.versions['courses/c'];
  }
  assert(planMigration(input).issues.some(i => i.code === 'CREDIT_LIMIT_CONFLICT'));
});
test('privileged roles require explicit verification and missing updateTimes fail closed', () => {
  const input = fixture(); input.collections.users.admin = { role: 'admin' };
  assert(planMigration(input).issues.some(i => i.code === 'PRIVILEGED_ROLE_REVIEW'));
  assert.equal(planMigration(input, { verifiedPrivilegedUids: ['admin'] }).structurallyReady, true);
  delete input.versions['courses/c'];
  assert(planMigration(input).issues.some(i => i.code === 'MISSING_VERSION'));
});
test('historical cancelled records and unknown collections are retained', () => {
  const input = fixture(); input.collections.course_selections.old = { studentUid: 'u', courseId: 'removed', status: 'dropped' };
  // Noncanonical history still needs review, but the planner never deletes it.
  const plan = planMigration(input);
  assert.equal(plan.deletes.length, 0);
  assert(!plan.changes.some(c => c.path === 'course_selections/old'));
});
test('Firestore special values preserve precision and data types', () => {
  assert.deepEqual(decodeValue({ integerValue: '9007199254740993' }), { __type: 'integer', value: '9007199254740993' });
  assert.deepEqual(decodeValue({ timestampValue: '2026-11-10T00:00:00.123456789Z' }), { __type: 'timestamp', value: '2026-11-10T00:00:00.123456789Z' });
  assert.deepEqual(decodeValue({ arrayValue: { values: [{ booleanValue: true }, { bytesValue: 'AA==' }] } }), [true, { __type: 'bytes', value: 'AA==' }]);
});
test('read-only backup follows pagination and nested/missing parents without any write endpoint', async () => {
  const prefix = 'projects/demo-migration-test/databases/(default)/documents';
  const calls = [];
  const result = await readOnlyBackup({ projectId: 'demo-migration-test', request: async (path, method, body) => {
    calls.push({ path, method });
    if (path.endsWith(':listCollectionIds')) {
      assert.equal(method, 'POST');
      if (path === prefix + ':listCollectionIds') return body.pageToken ? { collectionIds: ['empty'] } : { collectionIds: ['users'], nextPageToken: 'next' };
      if (path === prefix + '/users/missing:listCollectionIds') return { collectionIds: ['messages'] };
      return {};
    }
    assert.equal(method, 'GET');
    if (path.startsWith(prefix + '/users?')) return { documents: [{ name: prefix + '/users/u', fields: { role: { stringValue: 'student' } }, updateTime: '2026-11-10T00:00:00Z' }, { name: prefix + '/users/missing' }] };
    if (path.includes('/messages?')) return { documents: [{ name: prefix + '/users/missing/messages/m', fields: { text: { stringValue: 'retain' } }, updateTime: '2026-11-10T00:00:00Z' }] };
    return {};
  } });
  assert.equal(result.summary.documents, 2);
  assert.deepEqual(result.raw.missingParents, ['users/missing']);
  assert.equal(result.snapshot.collections['users/missing/messages'].m.text, 'retain');
  assert.equal(result.raw.consistentSnapshot, false);
  assert(calls.every(c => c.method === 'GET' || c.path.endsWith(':listCollectionIds')));
});
test('read limits and malformed snapshots stop the operation', async () => {
  await assert.rejects(() => readOnlyBackup({ projectId: 'demo-limit', maxRequests: 0, request: async () => { throw Error('must not execute'); } }), /limit/);
  assert.throws(() => planMigration({ format: 'wrong' }), /Unsupported/);
});
