import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { getSemesterEnd } from '../src/utils/semesterUtils.js';
import * as jalaali from 'jalaali-js';

// Offline only: this module has no Firebase client, credentials, network or write API.
export function planMigration(snapshot, { verifiedPrivilegedUids = [], legacyJalaliSlotIds = [] } = {}) {
  if (snapshot.format !== 'portal-snapshot-v1' || !snapshot.projectId || !snapshot.collections) throw new Error('Unsupported snapshot format');
  const collections = snapshot.collections;
  const users = collections.users ?? {}, courses = collections.courses ?? {};
  const selections = collections.course_selections ?? {}, slots = collections.reservation_slots ?? {};
  const reservations = collections.student_reservations ?? {}, terms = collections.enrollment_terms ?? {};
  const issues = [], changes = [], totals = new Map(), courseCounts = {}, slotCounts = {};
  const issue = (code, path, message) => issues.push({ severity: 'blocking', code, path, message });
  const integer = n => Number.isSafeInteger(n);
  const time = iso => ({ __type: 'timestamp', value: iso });
  const canonical = (uid, parent) => uid + '_' + parent;
  function patch(collection, id, values, reason) {
    const path = collection + '/' + id;
    const before = collections[collection]?.[id] ?? null;
    const effective = Object.fromEntries(Object.entries(values).filter(([key, value]) => JSON.stringify(before?.[key]) !== JSON.stringify(value)));
    if (!Object.keys(effective).length) return;
    const version = snapshot.versions?.[path];
    if (before !== null && !version) issue('MISSING_VERSION', path, 'Document updateTime is needed before planning a conditional migration.');
    const existing = changes.find(change => change.path === path);
    if (existing) { Object.assign(existing.patch, effective); if (!existing.reason.includes(reason)) existing.reason += ' ' + reason; }
    else changes.push({ path, operation: before === null ? 'create-if-absent' : 'patch-if-unchanged', expectedUpdateTime: version ?? null, patch: effective, reason });
  }
  for (const [uid, profile] of Object.entries(users)) {
    const path = 'users/' + uid;
    if (!['student', 'staff', 'admin'].includes(profile.role)) issue('INVALID_ROLE', path, 'Owner must verify the role.');
    if (['staff', 'admin'].includes(profile.role) && !verifiedPrivilegedUids.includes(uid)) issue('PRIVILEGED_ROLE_REVIEW', path, 'Privileged identity must be verified by the owner, never inferred from an email string.');
    for (const [field, alias] of [['studentId', 'studentNumber'], ['nationalCode', 'nationalId']]) {
      if (profile[field] && profile[alias] && profile[field] !== profile[alias]) issue('IDENTITY_CONFLICT', path, field + ' conflicts with ' + alias + '; no identity is overwritten.');
      else if (profile[field] == null && profile[alias] != null) {
        if (typeof profile[alias] !== 'string') issue('IDENTITY_TYPE', path, alias + ' requires manual review to avoid losing leading zeros.');
        else patch('users', uid, { [field]: profile[alias] }, 'Copy legacy identity alias; retain original field.');
      }
    }
  }
  for (const [id, selection] of Object.entries(selections)) {
    const path = 'course_selections/' + id, course = courses[selection.courseId];
    if (!['active', 'dropped'].includes(selection.status)) { issue('INVALID_SELECTION_STATUS', path, 'Unknown status.'); continue; }
    if (id !== canonical(selection.studentUid, selection.courseId)) issue('NONCANONICAL_SELECTION_ID', path, 'Keep the record and review how to reconcile its identity.');
    if (!users[selection.studentUid]) issue('MISSING_STUDENT', path, 'Selection has no corresponding profile.');
    if (selection.status !== 'active') continue; // Preserve historical snapshots, even when a parent was removed.
    if (users[selection.studentUid]?.role !== 'student') issue('NONSTUDENT_SELECTION', path, 'Active selection belongs to a nonstudent profile.');
    if (!course) { issue('MISSING_COURSE', path, 'Active selection has no parent; do not discard it.'); continue; }
    if (!integer(selection.credits) || selection.credits !== course.credits || selection.semester !== course.semester) issue('COURSE_SNAPSHOT_CONFLICT', path, 'Credits/semester require an owner decision; do not silently replace history.');
    courseCounts[selection.courseId] = (courseCounts[selection.courseId] ?? 0) + 1;
    const key = canonical(selection.studentUid, course.semester);
    const term = totals.get(key) ?? { studentUid: selection.studentUid, semester: course.semester, totalCredits: 0, lastCourseId: selection.courseId };
    term.totalCredits += course.credits;
    totals.set(key, term);
  }
  for (const [id, reservation] of Object.entries(reservations)) {
    const path = 'student_reservations/' + id;
    if (!['active', 'cancelled'].includes(reservation.status)) { issue('INVALID_RESERVATION_STATUS', path, 'Unknown status.'); continue; }
    if (id !== canonical(reservation.studentUid, reservation.slotId)) issue('NONCANONICAL_RESERVATION_ID', path, 'Keep the record and review how to reconcile its identity.');
    if (!users[reservation.studentUid]) issue('MISSING_STUDENT', path, 'Reservation has no corresponding profile.');
    if (reservation.status !== 'active') continue;
    if (users[reservation.studentUid]?.role !== 'student') issue('NONSTUDENT_RESERVATION', path, 'Active reservation belongs to a nonstudent profile.');
    if (!slots[reservation.slotId]) { issue('MISSING_SLOT', path, 'Active reservation has no parent; do not discard it.'); continue; }
    slotCounts[reservation.slotId] = (slotCounts[reservation.slotId] ?? 0) + 1;
  }
  for (const [id, course] of Object.entries(courses)) {
    const path = 'courses/' + id, count = courseCounts[id] ?? 0;
    if (!integer(course.credits) || course.credits < 1 || course.credits > 6) issue('INVALID_CREDITS', path, 'Course credits must be reviewed.');
    if (!integer(course.capacity) || course.capacity < 1 || course.capacity < count) issue('CAPACITY_CONFLICT', path, 'Capacity cannot be silently expanded or active selections removed.');
    const end = getSemesterEnd(course.semester);
    if (!end) issue('UNKNOWN_SEMESTER', path, 'An authoritative deadline is required for the unknown semester.');
    patch('courses', id, { enrolledCount: count, ...(end && course.registrationEndsAt == null ? { registrationEndsAt: time(new Date(end + 'T23:59:59.999+03:30').toISOString()) } : {}) }, 'Reconcile count from active selections; fill only an absent deadline.');
    if (course.registrationEndsAt != null && (course.registrationEndsAt.__type !== 'timestamp' || !Number.isFinite(Date.parse(course.registrationEndsAt.value)))) issue('INVALID_DEADLINE', path, 'Existing deadline is not silently replaced.');
  }
  for (const [id, slot] of Object.entries(slots)) {
    const path = 'reservation_slots/' + id, count = slotCounts[id] ?? 0;
    if (!integer(slot.capacity) || slot.capacity < 1 || slot.capacity < count) issue('CAPACITY_CONFLICT', path, 'Capacity is below active reservations or invalid.');
    let date = slot.date, start = slot.time;
    if (legacyJalaliSlotIds.includes(id)) {
      const parts = typeof date === 'string' ? date.split('-').map(Number) : [];
      const interval = typeof start === 'string' ? /^(\d{2}:\d{2})(?:-(\d{2}:\d{2}))?$/.exec(start) : null;
      if (parts.length === 3 && jalaali.isValidJalaaliDate(...parts) && interval && (!interval[2] || (interval[2] > interval[1] && /^([01]\d|2[0-3]):[0-5]\d$/.test(interval[2])))) {
        const { gy, gm, gd } = jalaali.toGregorian(...parts);
        date = gy + '-' + String(gm).padStart(2, '0') + '-' + String(gd).padStart(2, '0');
        start = interval[1];
      } else { date = null; start = null; }
    } else if (typeof date === 'string' && Number(date.slice(0, 4)) < 1900) {
      issue('CALENDAR_REVIEW', path, 'A historical date below Gregorian year 1900 needs an explicit calendar decision.');
    }
    const wallTime = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && typeof start === 'string' && /^\d{2}:\d{2}$/.test(start) ? date + 'T' + start : null;
    const calendarCheck = wallTime ? new Date(wallTime + ':00Z') : null;
    const iso = calendarCheck && Number.isFinite(calendarCheck.getTime()) && calendarCheck.toISOString().slice(0, 16) === wallTime ? new Date(wallTime + ':00+03:30') : null;
    if (!iso || !Number.isFinite(iso.getTime())) issue('INVALID_SLOT_DATE', path, 'Date/time need review.');
    if (!['active', 'inactive'].includes(slot.status)) issue('INVALID_SLOT_STATUS', path, 'Unknown slot status.');
    patch('reservation_slots', id, { reservedCount: count, ...(iso && Number.isFinite(iso.getTime()) && slot.bookingEndsAt == null ? { bookingEndsAt: time(iso.toISOString()) } : {}) }, 'Reconcile active reservations and fill only an absent deadline.');
    if (slot.bookingEndsAt != null && (slot.bookingEndsAt.__type !== 'timestamp' || !Number.isFinite(Date.parse(slot.bookingEndsAt.value)))) issue('INVALID_DEADLINE', path, 'Existing deadline is not silently replaced.');
  }
  for (const [id, term] of Object.entries(terms)) {
    if (typeof term.studentUid !== 'string' || typeof term.semester !== 'string' || !term.semester || id !== canonical(term.studentUid, term.semester) || users[term.studentUid]?.role !== 'student') issue('INVALID_TERM_OWNER', 'enrollment_terms/' + id, 'Existing ledger identity requires review.');
    if (!totals.has(id)) totals.set(id, { studentUid: term.studentUid, semester: term.semester, totalCredits: 0, lastCourseId: term.lastCourseId ?? '' });
  }
  for (const [id, term] of totals) {
    if (!integer(term.totalCredits) || term.totalCredits < 0 || term.totalCredits > 20) issue('CREDIT_LIMIT_CONFLICT', 'enrollment_terms/' + id, 'Do not drop courses automatically to reduce a total.');
    patch('enrollment_terms', id, term, 'Rebuild the ledger from authoritative reconciled active selections; preserve other fields.');
  }
  // A marker is proposed only after the complete inventory passes all structural checks.
  if (!issues.length) for (const [uid, profile] of Object.entries(users)) if (profile.role === 'student') patch('users', uid, { enrollmentVersion: 1 }, 'Enable enrollment only after complete history reconciliation.');
  return {
    format: 'portal-migration-plan-v1', projectId: snapshot.projectId,
    sourceHash: createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'),
    structurallyReady: issues.length === 0, applyImplemented: false,
    requiresMaintenanceAndOwnerApproval: true, deletes: [], issues, changes,
    counts: { profiles: Object.keys(users).length, courses: Object.keys(courses).length, selections: Object.keys(selections).length, reservations: Object.keys(reservations).length },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [input, output, decisions] = process.argv.slice(2);
  if (!input || !output) throw new Error('Usage: node scripts/migration-plan.mjs INPUT.json OUTPUT.json');
  const options = decisions ? JSON.parse(await readFile(decisions, 'utf8')) : {};
  const plan = planMigration(JSON.parse(await readFile(input, 'utf8')), options);
  await writeFile(output, JSON.stringify(plan, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ structurallyReady: plan.structurallyReady, blockingIssues: plan.issues.length, proposedChanges: plan.changes.length, deletes: 0, applied: false }));
}
