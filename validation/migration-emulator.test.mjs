import test from 'node:test';
import assert from 'node:assert/strict';
import { readOnlyBackup } from '../scripts/read-only-backup.mjs';
import { planMigration } from '../scripts/migration-plan.mjs';
import { applyMigration, firestoreRequest } from '../scripts/apply-migration.mjs';

const projectId = 'demo-portal-audit';
const host = 'http://127.0.0.1:8187';
const base = 'projects/' + projectId + '/databases/(default)/documents';
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8187') throw new Error('Local emulator required.');
const request = firestoreRequest(host, 'owner');
const decisions = { legacyJalaliSlotIds: ['room'] };
const inventory = async () => (await readOnlyBackup({ projectId, request })).snapshot;
const patch = (path, fields, query = '') => request(base + '/' + path + query, 'PATCH', { fields });
const s = stringValue => ({ stringValue });
const n = value => ({ integerValue: String(value) });

async function setup() {
  const cleared = await fetch(host + '/emulator/v1/projects/' + projectId + '/databases/(default)/documents', { method: 'DELETE' });
  assert(cleared.ok);
  await patch('users/student', { role: s('student'), studentNumber: s('OLD-1'), nationalId: s('0001'), custom: s('keep') });
  await patch('courses/course', { credits: n(3), capacity: n(10), enrolledCount: n(7), semester: s('fall_2026'), title: s('Synthetic course') });
  await patch('course_selections/student_course', { studentUid: s('student'), courseId: s('course'), credits: n(3), semester: s('fall_2026'), status: s('active') });
  await patch('reservation_slots/room', { capacity: n(4), reservedCount: n(3), status: s('active'), date: s('1402-08-01'), time: s('10:00-12:00') });
  await patch('student_reservations/student_room', { studentUid: s('student'), slotId: s('room'), status: s('active') });
  await patch('support_tickets/example', { status: s('باز') });
  await patch('support_tickets/example/messages/first', { message: s('Preserve this message') });
  const snapshot = await inventory();
  const plan = planMigration(snapshot, decisions);
  assert.equal(plan.structurallyReady, true);
  return { snapshot, plan, decisions };
}

test('one commit preserves legacy records and creates the enrollment ledger', async () => {
  const input = await setup();
  const result = await applyMigration({ ...input, request });
  assert.equal(result.writes, 4);
  assert.equal(result.verified, true);
  const after = await inventory();
  assert.equal(after.collections.users.student.custom, 'keep');
  assert.equal(after.collections.users.student.studentNumber, 'OLD-1');
  assert.equal(after.collections.users.student.studentId, 'OLD-1');
  assert.equal(after.collections.users.student.enrollmentVersion, 1);
  assert.equal(after.collections.courses.course.enrolledCount, 1);
  assert.equal(after.collections.reservation_slots.room.date, '1402-08-01');
  assert.equal(after.collections.reservation_slots.room.time, '10:00-12:00');
  assert.equal(after.collections.reservation_slots.room.bookingEndsAt.value, '2023-10-23T06:30:00Z');
  assert.equal(after.collections.enrollment_terms.student_fall_2026.totalCredits, 3);
  assert.equal(after.collections.enrollment_terms.student_fall_2026.updatedAt.__type, 'timestamp');
  assert.deepEqual(after.collections['support_tickets/example/messages'], input.snapshot.collections['support_tickets/example/messages']);
  const repeat = await applyMigration({ snapshot: after, plan: planMigration(after, decisions), decisions, request });
  assert.deepEqual(repeat, { applied: false, writes: 0, verified: true });
});

test('an inventory change aborts before sending a commit', async () => {
  const input = await setup();
  await patch('announcements/new', { title: s('Added after backup') });
  let commitAttempted = false;
  await assert.rejects(() => applyMigration({ ...input, request: (path, method, body) => {
    if (path.endsWith(':commit')) commitAttempted = true;
    return request(path, method, body);
  } }), /database changed since the backup/);
  assert.equal(commitAttempted, false);
});

test('a stale updateTime after the preflight rejects the entire commit', async () => {
  const input = await setup();
  await assert.rejects(() => applyMigration({ ...input, request: async (path, method, body) => {
    if (path.endsWith(':commit')) {
      await patch('courses/course', { title: s('Changed just before commit') }, '?updateMask.fieldPaths=title');
    }
    return request(path, method, body);
  } }), /Commit did not return success/);
  const after = await inventory();
  assert.equal(after.collections.courses.course.title, 'Changed just before commit');
  assert.equal(after.collections.courses.course.enrolledCount, 7);
  assert.equal(after.collections.users.student.enrollmentVersion, undefined);
  assert.equal(after.collections.reservation_slots.room.bookingEndsAt, undefined);
  assert.equal(after.collections.enrollment_terms, undefined);
});

test('a ledger created after preflight prevents all other writes', async () => {
  const input = await setup();
  await assert.rejects(() => applyMigration({ ...input, request: async (path, method, body) => {
    if (path.endsWith(':commit')) {
      await patch('enrollment_terms/student_fall_2026', { totalCredits: n(99) });
    }
    return request(path, method, body);
  } }), /Commit did not return success/);
  const after = await inventory();
  assert.equal(after.collections.enrollment_terms.student_fall_2026.totalCredits, 99);
  assert.equal(after.collections.users.student.enrollmentVersion, undefined);
  assert.equal(after.collections.courses.course.enrolledCount, 7);
});

test('a tampered patch is rejected before any network request', async () => {
  const input = await setup();
  input.plan.changes.find(change => change.path === 'users/student').patch.role = 'admin';
  await assert.rejects(() => applyMigration({ ...input, request: () => assert.fail('No network request expected') }), /reviewed plan does not match/);
});
