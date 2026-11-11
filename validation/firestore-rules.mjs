import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore, doc, setDoc, updateDoc, getDoc, terminate } from 'firebase/firestore';

const projectId = 'demo-portal-audit';
const host = 'http://127.0.0.1:8187';
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8187') throw Error('Local emulator required');
const apps = [];
function database(uid, extra = {}) {
  const app = initializeApp({ projectId, apiKey: 'fake-key', appId: 'fake-app' }, uid);
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8187, { mockUserToken: { sub: uid, ...extra } });
  apps.push({ app, db });
  return db;
}
function fields(value) {
  return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,
    typeof v === 'number' ? { integerValue: String(v) } : { stringValue: v },
  ]));
}
async function seed(path, value) {
  const response = await fetch(`${host}/v1/projects/${projectId}/databases/(default)/documents/${path}`, {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: fields(value) }),
  });
  assert(response.ok, await response.text());
}
const results = [];
async function check(name, operation, expectedAllowed = false) {
  try { await operation(); results.push({ name, allowed: true, expectedAllowed }); }
  catch (error) {
    if (error.code !== 'permission-denied') throw error;
    results.push({ name, allowed: false, expectedAllowed, code: error.code });
  }
}
try {
  await seed('users/student-a', { role: 'student', studentNumber: 'TEST-A', gpa: 0 });
  await seed('users/student-b', { role: 'student', studentNumber: 'TEST-B', gpa: 0 });
  await seed('courses/course-a', { enrolledCount: 1, capacity: 1, credits: 3, semester: 'fall_2026' });
  await seed('reservation_slots/slot-a', { reservedCount: 1, capacity: 1, status: 'active' });
  const student = database('student-a');
  const other = database('student-b');
  const privileged = database('unverified-admin', { email: 'admin@uni.ac.ir', email_verified: false });
  await check('unverified email may create admin role', async () => {
    await setDoc(doc(privileged, 'users/unverified-admin'), { role: 'admin' });
    await setDoc(doc(privileged, 'announcements/proof'), { title: 'Synthetic admin access proof' });
  });
  await check('student may increment course counter beyond capacity without selection', () =>
    updateDoc(doc(student, 'courses/course-a'), { enrolledCount: 2 }));
  await check('student may decrement reservation counter without own reservation', () =>
    updateDoc(doc(student, 'reservation_slots/slot-a'), { reservedCount: 0 }));
  await check('student may create a selection referencing a nonexistent course', () =>
    setDoc(doc(student, 'course_selections/arbitrary-selection'), {
      studentUid: 'student-a', courseId: 'does-not-exist', credits: -500, status: 'active',
    }));
  await check('student may create a request already marked approved', () =>
    setDoc(doc(student, 'requests/arbitrary-request'), {
      studentUid: 'student-a', status: 'تایید شده', adminResponse: 'Synthetic forged response',
    }));
  await check('student may change the stored studentNumber field', () =>
    updateDoc(doc(student, 'users/student-a'), { studentNumber: 'CHANGED-A' }));
  await check('student cannot read another student profile', () =>
    getDoc(doc(student, 'users/student-b')));
  await check('student cannot directly change their role', () =>
    updateDoc(doc(student, 'users/student-a'), { role: 'admin' }));
  await check('student may submit a ticket message labelled as staff', async () => {
    await seed('support_tickets/ticket-a', { studentUid: 'student-a', status: 'باز' });
    await setDoc(doc(student, 'support_tickets/ticket-a/messages/msg-a'), {
      senderUid: 'student-a', senderRole: 'staff', senderName: 'Synthetic staff', text: 'Synthetic message',
    });
  });
  await seed('course_selections/student-a_course-a', { studentUid: 'student-a', courseId: 'course-a', status: 'active' });
  await check('student may drop an active selection', () =>
    updateDoc(doc(student, 'course_selections/student-a_course-a'), { status: 'dropped' }), true);
  await check('student may re-register their dropped selection', () =>
    setDoc(doc(student, 'course_selections/student-a_course-a'), {
      studentUid: 'student-a', courseId: 'course-a', status: 'active',
    }), true);
  await seed('student_reservations/student-a_slot-a', { studentUid: 'student-a', slotId: 'slot-a', status: 'active' });
  await check('student may cancel an active reservation', () =>
    updateDoc(doc(student, 'student_reservations/student-a_slot-a'), { status: 'cancelled' }), true);
  await check('student may rebook their cancelled reservation', () =>
    setDoc(doc(student, 'student_reservations/student-a_slot-a'), {
      studentUid: 'student-a', slotId: 'slot-a', status: 'active',
    }), true);
  await check('another student cannot read the first student selection', () =>
    getDoc(doc(other, 'course_selections/student-a_course-a')));
  console.log(JSON.stringify(results, null, 2));
  await writeFile('validation/rules-results.json', JSON.stringify(results, null, 2));
  const failed = results.filter(result => result.allowed !== result.expectedAllowed);
  console.log(`${results.length - failed.length}/${results.length} security and lifecycle expectations passed.`);
  if (failed.length) process.exitCode = 1;
} finally {
  await Promise.all(apps.map(async ({ app, db }) => { await terminate(db); await deleteApp(app); }));
}
