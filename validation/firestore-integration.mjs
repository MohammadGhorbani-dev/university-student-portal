import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore, doc, setDoc, updateDoc, getDoc, deleteDoc, terminate, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore';
import { createRegistrationService } from '../src/services/registration.js';
import { normalizeProfile } from '../src/utils/profile.js';
import { getCurrentSemester, isSemesterPast } from '../src/utils/semesterUtils.js';

const projectId = 'demo-portal-audit';
const host = 'http://127.0.0.1:8187';
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8187') throw Error('Local emulator required');
const apps = [];
function database(uid, extra = {}) {
  const app = initializeApp({ projectId, apiKey: 'fake-key', appId: 'fake-app' }, uid + '-' + apps.length);
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8187, { mockUserToken: { sub: uid, email: uid + '@example.test', ...extra } });
  apps.push({ app, db });
  return db;
}
function value(v) {
  if (v?.toDate) return { timestampValue: v.toDate().toISOString() };
  if (v === null) return { nullValue: null };
  if (typeof v === 'number') return { integerValue: String(v) };
  if (typeof v === 'boolean') return { booleanValue: v };
  return { stringValue: v };
}
async function seed(path, data) {
  const response = await fetch(host + '/v1/projects/' + projectId + '/databases/(default)/documents/' + path, {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k,v]) => [k,value(v)])) }),
  });
  assert(response.ok, await response.text());
}
const results = [];
async function check(name, operation) {
  try { await operation(); results.push({ name, passed: true }); }
  catch (error) { results.push({ name, passed: false, error: error.message }); console.error(name, error.message); }
}
async function denied(operation) {
  await assert.rejects(operation, error => error.code === 'permission-denied');
}
const tomorrow = Timestamp.fromMillis(Date.now() + 86400000);
const yesterday = Timestamp.fromMillis(Date.now() - 86400000);
const studentData = (uid) => ({
  role: 'student', enrollmentVersion: 1, firstName: 'Test', lastName: uid,
  studentId: 'TEST-' + uid, nationalCode: '', email: uid + '@example.test',
  phone: '', address: '', avatar: '', faculty: '', major: '', entryYear: '',
  semester: '', advisor: '', status: '', gpa: 0, creditsPassed: 0, createdAt: serverTimestamp(),
});
const courseData = (extra = {}) => ({
  title: 'Synthetic course', code: 'T1', professor: 'Synthetic teacher',
  day: null, startTime: null, endTime: null, department: null,
  enrolledCount: 0, capacity: 2, credits: 3, semester: 'test-term', registrationEndsAt: tomorrow, ...extra,
});
const slotData = (extra = {}) => ({
  title: 'Synthetic slot', category: 'Synthetic category', date: '2099-01-01', time: '10:00',
  status: 'active', capacity: 1, reservedCount: 0, bookingEndsAt: tomorrow, ...extra,
});
const selectionData = (uid, courseId, course) => ({
  courseId, studentUid: uid, title: course.title, code: course.code, credits: course.credits,
  professor: course.professor, day: course.day, startTime: course.startTime,
  endTime: course.endTime, department: course.department, semester: course.semester,
  status: 'active', createdAt: serverTimestamp(),
});
try {
  const student = database('student-a'), other = database('student-b'), staff = database('staff-a');
  await seed('users/student-a', { ...studentData('student-a'), createdAt: tomorrow });
  await seed('users/student-b', { ...studentData('student-b'), createdAt: tomorrow });
  await seed('users/staff-a', { ...studentData('staff-a'), role: 'staff', createdAt: tomorrow });
  const service = createRegistrationService(student, () => 'student-a');
  const otherService = createRegistrationService(other, () => 'student-b');
  await check('normal public student signup succeeds', async () => {
    const db = database('new-student');
    await setDoc(doc(db, 'users/new-student'), studentData('new-student'));
  });
  for (const role of ['admin', 'staff']) await check('public signup cannot assign ' + role, async () => {
    const uid = 'forged-' + role, db = database(uid, { email: role + '@uni.ac.ir', email_verified: false });
    await denied(() => setDoc(doc(db, 'users', uid), { ...studentData(uid), email: role + '@uni.ac.ir', role }));
  });
  await check('public signup cannot forge academic results or migration state', async () => {
    for (const override of [{ gpa: 20 }, { creditsPassed: 100 }, { enrollmentVersion: 2 }, { studentNumber: 'forged' }]) {
      const db = database('forged-academic');
      await denied(() => setDoc(doc(db, 'users/forged-academic'), { ...studentData('forged-academic'), ...override }));
    }
  });
  await check('contact update succeeds while every academic alias and role stays protected', async () => {
    await updateDoc(doc(student, 'users/student-a'), { phone: '09120000000' });
    for (const field of ['role', 'studentId', 'studentNumber', 'nationalCode', 'nationalId', 'gpa', 'passedCredits', 'creditsPassed', 'enrollmentVersion']) {
      await denied(() => updateDoc(doc(student, 'users/student-a'), { [field]: field === 'role' ? 'admin' : 5 }));
    }
    await denied(() => deleteDoc(doc(student, 'users/student-a')));
    await denied(() => updateDoc(doc(staff, 'users/student-a'), { role: 'admin' }));
  });
  await check('profile and selection ownership enforced', async () => {
    await denied(() => getDoc(doc(other, 'users/student-a')));
    await seed('course_selections/private-proof', { studentUid: 'student-a', status: 'active' });
    await denied(() => getDoc(doc(other, 'course_selections/private-proof')));
  });

  await seed('courses/course-a', courseData());
  await check('standalone course counter and selection writes rejected', async () => {
    await denied(() => updateDoc(doc(student, 'courses/course-a'), { enrolledCount: 1 }));
    await denied(() => setDoc(doc(student, 'course_selections/student-a_course-a'), selectionData('student-a', 'course-a', courseData())));
    await denied(() => setDoc(doc(student, 'course_selections/arbitrary'), { studentUid: 'student-a', courseId: 'missing', status: 'active' }));
  });
  await check('course register/drop/re-register is atomic and duplicate calls are idempotent', async () => {
    await service.registerCourse('course-a', 'student-a', { credits: -500 });
    await service.registerCourse('course-a', 'student-a');
    assert.equal((await getDoc(doc(student, 'courses/course-a'))).data().enrolledCount, 1);
    assert.equal((await getDoc(doc(student, 'enrollment_terms/student-a_test-term'))).data().totalCredits, 3);
    await service.dropCourse('student-a_course-a', 'course-a');
    await service.dropCourse('student-a_course-a', 'course-a');
    assert.equal((await getDoc(doc(student, 'courses/course-a'))).data().enrolledCount, 0);
    assert.equal((await getDoc(doc(student, 'enrollment_terms/student-a_test-term'))).data().totalCredits, 0);
    await service.registerCourse('course-a', 'student-a');
    assert.equal((await getDoc(doc(student, 'courses/course-a'))).data().enrolledCount, 1);
  });
  await check('active enrollment cannot be dropped without both counters', async () => {
    await denied(() => updateDoc(doc(student, 'course_selections/student-a_course-a'), { status: 'dropped' }));
  });
  await check('active course metadata, counter and deletion protected for staff', async () => {
    await denied(() => updateDoc(doc(staff, 'courses/course-a'), { credits: 6 }));
    await denied(() => updateDoc(doc(staff, 'courses/course-a'), { semester: 'different' }));
    await denied(() => updateDoc(doc(staff, 'courses/course-a'), { enrolledCount: 0 }));
    await denied(() => deleteDoc(doc(staff, 'courses/course-a')));
    await updateDoc(doc(staff, 'courses/course-a'), { capacity: 3 });
  });
  await check('wrong parent ID cannot decrement another course', async () => {
    await assert.rejects(() => service.dropCourse('student-a_course-a', 'other-course'));
    assert.equal((await getDoc(doc(student, 'courses/course-a'))).data().enrolledCount, 1);
  });
  await check('term credit ledger cannot be reset or deleted independently', async () => {
    await denied(() => updateDoc(doc(student, 'enrollment_terms/student-a_test-term'), { totalCredits: 0 }));
    await denied(() => deleteDoc(doc(student, 'enrollment_terms/student-a_test-term')));
  });
  await check('concurrent enrollment never exceeds the last course seat', async () => {
    await seed('courses/last-seat', courseData({ capacity: 1, semester: 'seat-term' }));
    const attempts = await Promise.allSettled([
      service.registerCourse('last-seat', 'student-a'), otherService.registerCourse('last-seat', 'student-b'),
    ]);
    assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal((await getDoc(doc(student, 'courses/last-seat'))).data().enrolledCount, 1);
  });
  await check('concurrent enrollment of different courses cannot exceed 20 credits', async () => {
    for (let i = 0; i < 3; i++) {
      await seed('courses/limit-' + i, courseData({ credits: 6, semester: 'limit-term' }));
      await service.registerCourse('limit-' + i, 'student-a');
    }
    for (const id of ['limit-a', 'limit-b']) await seed('courses/' + id, courseData({ credits: 2, semester: 'limit-term' }));
    const attempts = await Promise.allSettled([service.registerCourse('limit-a', 'student-a'), service.registerCourse('limit-b', 'student-a')]);
    assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 1);
    const counts = await Promise.all(['limit-a', 'limit-b'].map(id => getDoc(doc(student, 'courses', id))));
    assert.equal(counts.reduce((n, snap) => n + snap.data().enrolledCount, 0), 1);
    assert.equal((await getDoc(doc(student, 'enrollment_terms/student-a_limit-term'))).data().totalCredits, 20);
  });
  await check('direct atomic write cannot forge course credits or undercount a multi-course batch', async () => {
    for (const id of ['batch-a', 'batch-b']) await seed('courses/' + id, courseData({ credits: 6, semester: 'batch-term' }));
    const batch = writeBatch(student);
    for (const id of ['batch-a', 'batch-b']) {
      batch.set(doc(student, 'course_selections', 'student-a_' + id), selectionData('student-a', id, courseData({ credits: 6, semester: 'batch-term' })));
      batch.update(doc(student, 'courses', id), { enrolledCount: 1 });
    }
    batch.set(doc(student, 'enrollment_terms/student-a_batch-term'), {
      studentUid: 'student-a', semester: 'batch-term', totalCredits: 6, lastCourseId: 'batch-b', updatedAt: serverTimestamp(),
    });
    await denied(() => batch.commit());
    const forged = writeBatch(student);
    forged.set(doc(student, 'course_selections/student-a_batch-a'), selectionData('student-a', 'batch-a', courseData({ credits: 1, semester: 'batch-term' })));
    forged.update(doc(student, 'courses/batch-a'), { enrolledCount: 1 });
    forged.set(doc(student, 'enrollment_terms/student-a_batch-term'), { studentUid: 'student-a', semester: 'batch-term', totalCredits: 1, lastCourseId: 'batch-a', updatedAt: serverTimestamp() });
    await denied(() => forged.commit());
  });
  await check('expired course and un-migrated legacy enrollment fail closed', async () => {
    await seed('courses/expired', courseData({ registrationEndsAt: yesterday }));
    await assert.rejects(() => service.registerCourse('expired', 'student-a'), /مهلت/);
    const db = database('legacy-student'), legacy = createRegistrationService(db, () => 'legacy-student');
    await seed('users/legacy-student', { role: 'student', studentNumber: 'OLD' });
    await assert.rejects(() => legacy.registerCourse('course-a', 'legacy-student'), /همگام/);
    await denied(() => updateDoc(doc(db, 'users/legacy-student'), { enrollmentVersion: 1 }));
  });

  await check('direct atomic enrollment cannot bypass the deadline, capacity or credit limit', async () => {
    const cases = [
      ['direct-expired', courseData({ semester: 'direct-expired', registrationEndsAt: yesterday }), 3],
      ['direct-full', courseData({ semester: 'direct-full', capacity: 1, enrolledCount: 1 }), 3],
      ['direct-overlimit', courseData({ semester: 'limit-term', credits: 1 }), 21],
    ];
    for (const [id, course, total] of cases) {
      await seed('courses/' + id, course);
      const batch = writeBatch(student);
      batch.set(doc(student, 'course_selections', 'student-a_' + id), selectionData('student-a', id, course));
      batch.update(doc(student, 'courses', id), { enrolledCount: course.enrolledCount + 1 });
      batch.set(doc(student, 'enrollment_terms', 'student-a_' + course.semester), {
        studentUid: 'student-a', semester: course.semester, totalCredits: total,
        lastCourseId: id, updatedAt: serverTimestamp(),
      });
      await denied(() => batch.commit());
    }
  });

  await seed('reservation_slots/slot-a', slotData({ capacity: 2 }));
  await check('standalone reservation counter and forged reservation rejected', async () => {
    await denied(() => updateDoc(doc(student, 'reservation_slots/slot-a'), { reservedCount: 1 }));
    await denied(() => setDoc(doc(student, 'student_reservations/student-a_slot-a'), { studentUid: 'student-a', slotId: 'slot-a', status: 'active' }));
  });
  await check('reservation book/cancel/rebook is atomic and duplicate calls idempotent', async () => {
    await service.reserveSlot('slot-a', 'student-a');
    await service.reserveSlot('slot-a', 'student-a');
    assert.equal((await getDoc(doc(student, 'reservation_slots/slot-a'))).data().reservedCount, 1);
    await service.cancelStudentReservation('student-a_slot-a', 'slot-a');
    await service.cancelStudentReservation('student-a_slot-a', 'slot-a');
    assert.equal((await getDoc(doc(student, 'reservation_slots/slot-a'))).data().reservedCount, 0);
    await service.reserveSlot('slot-a', 'student-a');
    assert.equal((await getDoc(doc(student, 'reservation_slots/slot-a'))).data().reservedCount, 1);
  });
  await check('reservation cancellation without counter or wrong parent rejected', async () => {
    await denied(() => updateDoc(doc(student, 'student_reservations/student-a_slot-a'), { status: 'cancelled' }));
    await assert.rejects(() => service.cancelStudentReservation('student-a_slot-a', 'different'));
    await denied(() => deleteDoc(doc(staff, 'reservation_slots/slot-a')));
    await denied(() => updateDoc(doc(staff, 'reservation_slots/slot-a'), { date: '2099-02-02' }));
  });
  await check('concurrent reservations never exceed slot capacity', async () => {
    await seed('reservation_slots/last-slot', slotData());
    const attempts = await Promise.allSettled([service.reserveSlot('last-slot', 'student-a'), otherService.reserveSlot('last-slot', 'student-b')]);
    assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal((await getDoc(doc(student, 'reservation_slots/last-slot'))).data().reservedCount, 1);
  });
  await check('expired and inactive slots cannot be booked', async () => {
    await seed('reservation_slots/expired', slotData({ bookingEndsAt: yesterday }));
    await seed('reservation_slots/inactive', slotData({ status: 'inactive' }));
    await assert.rejects(() => service.reserveSlot('expired', 'student-a'), /مهلت/);
    await assert.rejects(() => service.reserveSlot('inactive', 'student-a'), /غیرفعال/);
    for (const id of ['expired', 'inactive']) {
      const slot = slotData({ status: id === 'inactive' ? 'inactive' : 'active', bookingEndsAt: id === 'expired' ? yesterday : tomorrow });
      const batch = writeBatch(student);
      batch.set(doc(student, 'student_reservations', 'student-a_' + id), {
        slotId: id, studentUid: 'student-a', title: slot.title, category: slot.category,
        date: slot.date, time: slot.time, status: 'active', createdAt: serverTimestamp(),
      });
      batch.update(doc(student, 'reservation_slots', id), { reservedCount: 1 });
      await denied(() => batch.commit());
    }
  });

  const submission = { title: 'Synthetic title', category: 'Synthetic category', description: 'Synthetic description', studentUid: 'student-a', studentName: 'Test student-a', studentId: 'TEST-student-a', createdAt: serverTimestamp() };
  await check('student request starts pending; forged status, response and identity rejected', async () => {
    await setDoc(doc(student, 'requests/valid'), { ...submission, status: 'در انتظار بررسی' });
    for (const override of [{ status: 'تایید شده' }, { adminResponse: 'forged' }, { studentUid: 'student-b' }, { studentName: 'forged' }, { studentId: 'forged' }]) {
      await denied(() => setDoc(doc(student, 'requests/forged'), { ...submission, status: 'در انتظار بررسی', ...override }));
    }
    await denied(() => updateDoc(doc(student, 'requests/valid'), { status: 'تایید شده' }));
    await updateDoc(doc(staff, 'requests/valid'), { status: 'تأیید شده', adminResponse: 'Synthetic reply' });
    await denied(() => updateDoc(doc(staff, 'requests/valid'), { studentUid: 'staff-a' }));
  });
  await check('support messages use authenticated name and role and respect closed tickets', async () => {
    const ticket = { subject: submission.title, category: submission.category, message: submission.description, studentUid: 'student-a', userId: 'student-a', studentName: submission.studentName, studentId: submission.studentId, createdAt: serverTimestamp(), status: 'باز' };
    await setDoc(doc(student, 'support_tickets/valid'), ticket);
    const message = { senderUid: 'student-a', senderName: 'Test student-a', senderRole: 'student', message: 'Synthetic message', createdAt: serverTimestamp() };
    await setDoc(doc(student, 'support_tickets/valid/messages/valid'), message);
    for (const override of [{ senderRole: 'staff' }, { senderName: 'forged' }, { senderUid: 'staff-a' }]) {
      await denied(() => setDoc(doc(student, 'support_tickets/valid/messages/forged'), { ...message, ...override }));
    }
    await setDoc(doc(staff, 'support_tickets/valid/messages/reply'), { ...message, senderUid: 'staff-a', senderName: 'Test staff-a', senderRole: 'staff' });
    await denied(() => getDoc(doc(other, 'support_tickets/valid/messages/valid')));
    await updateDoc(doc(staff, 'support_tickets/valid'), { status: 'بسته شده' });
    await denied(() => setDoc(doc(student, 'support_tickets/valid/messages/closed'), message));
    await denied(() => setDoc(doc(student, 'support_tickets/forged'), { ...ticket, status: 'بسته شده' }));
  });
  await check('legacy profile aliases and Tehran semester boundaries display consistently', async () => {
    assert.equal(normalizeProfile({ studentNumber: 'OLD', nationalId: 'TEST' }).studentId, 'OLD');
    assert.equal(normalizeProfile({ nationalId: 'TEST' }).nationalCode, 'TEST');
    assert.equal(getCurrentSemester(new Date('2026-11-11T00:00:00Z')), 'fall_2026');
    assert.equal(getCurrentSemester(new Date('2027-02-19T22:00:00Z')), 'spring_2027');
    assert.equal(getCurrentSemester(new Date('2026-08-01T00:00:00Z')), null);
    assert.equal(isSemesterPast('fall_2025'), true);
  });
  console.log(JSON.stringify(results, null, 2));
  await writeFile('validation/rules-results.json', JSON.stringify(results, null, 2));
  const failures = results.filter(result => !result.passed);
  console.log((results.length - failures.length) + '/' + results.length + ' security and integration checks passed.');
  if (failures.length) process.exitCode = 1;
} finally {
  await Promise.all(apps.map(async ({ app, db }) => { await terminate(db); await deleteApp(app); }));
}
