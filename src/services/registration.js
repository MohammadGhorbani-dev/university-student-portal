import { doc, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getSemesterEnd } from '../utils/semesterUtils.js';

const requireId = (value) => {
  if (typeof value !== 'string' || !value || value.includes('/')) throw new Error('شناسه نامعتبر است.');
  return value;
};

export function courseDeadline(semester) {
  const end = getSemesterEnd(semester);
  if (!end) throw new Error('ترم تحصیلی معتبر نیست.');
  return Timestamp.fromDate(new Date(`${end}T23:59:59.999+03:30`));
}

export function slotDeadline(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throw new Error('تاریخ یا ساعت رزرو معتبر نیست.');
  }
  const value = new Date(`${date}T${time}:00+03:30`);
  if (!Number.isFinite(value.getTime())) throw new Error('تاریخ یا ساعت رزرو معتبر نیست.');
  return Timestamp.fromDate(value);
}

// The same implementation is used by the application and emulator integration tests.
// UID is supplied by Auth, never by a form; rules independently enforce ownership.
export function createRegistrationService(db, currentUid) {
  function owner(uid) {
    if (!currentUid() || uid !== currentUid()) throw new Error('شما دسترسی لازم برای این عملیات را ندارید.');
    return requireId(uid);
  }

  async function registerCourse(courseId, studentUid) {
    const uid = owner(studentUid);
    requireId(courseId);
    return runTransaction(db, async (tx) => {
      const profile = await tx.get(doc(db, 'users', uid));
      if (profile.data()?.role !== 'student') throw new Error('انتخاب واحد فقط برای دانشجو مجاز است.');
      if (profile.data()?.enrollmentVersion !== 1) {
        throw new Error('سوابق انتخاب واحد حساب شما باید توسط مسئول دانشگاه همگام‌سازی شود.');
      }
      const courseRef = doc(db, 'courses', courseId);
      const courseSnap = await tx.get(courseRef);
      if (!courseSnap.exists()) throw new Error('درس مورد نظر یافت نشد.');
      const course = courseSnap.data();
      const selectionRef = doc(db, 'course_selections', `${uid}_${courseId}`);
      const termRef = doc(db, 'enrollment_terms', `${uid}_${course.semester}`);
      const selection = await tx.get(selectionRef);
      const term = await tx.get(termRef);
      // A retry or duplicate click must not increment either counter twice.
      if (selection.data()?.status === 'active') return;
      if (!course.registrationEndsAt || course.registrationEndsAt.toMillis() <= Date.now()) {
        throw new Error('مهلت انتخاب این درس پایان یافته یا هنوز تنظیم نشده است.');
      }
      if (course.enrolledCount >= course.capacity) throw new Error('ظرفیت این درس تکمیل شده است.');
      const total = (term.data()?.totalCredits ?? 0) + course.credits;
      if (!Number.isInteger(course.credits) || course.credits < 1 || total > 20) {
        throw new Error('مجموع واحدهای انتخابی شما نمی‌تواند بیشتر از ۲۰ واحد باشد.');
      }
      tx.set(selectionRef, {
        courseId, studentUid: uid, title: course.title, code: course.code,
        credits: course.credits, professor: course.professor,
        day: course.day ?? null, startTime: course.startTime ?? null,
        endTime: course.endTime ?? null, department: course.department ?? null,
        semester: course.semester, status: 'active', createdAt: serverTimestamp(),
      });
      tx.update(courseRef, { enrolledCount: course.enrolledCount + 1 });
      tx.set(termRef, {
        studentUid: uid, semester: course.semester, totalCredits: total,
        lastCourseId: courseId, updatedAt: serverTimestamp(),
      });
    });
  }

  async function dropCourse(selectionId, suppliedCourseId) {
    const uid = owner(currentUid());
    requireId(selectionId);
    return runTransaction(db, async (tx) => {
      const selectionRef = doc(db, 'course_selections', selectionId);
      const selectionSnap = await tx.get(selectionRef);
      if (!selectionSnap.exists()) throw new Error('انتخاب واحد یافت نشد.');
      const selection = selectionSnap.data();
      if (selection.studentUid !== uid || suppliedCourseId !== selection.courseId ||
          selectionId !== `${uid}_${selection.courseId}`) throw new Error('شناسه انتخاب واحد نامعتبر است.');
      if (selection.status === 'dropped') return;
      const courseRef = doc(db, 'courses', selection.courseId);
      const termRef = doc(db, 'enrollment_terms', `${uid}_${selection.semester}`);
      const course = await tx.get(courseRef);
      const term = await tx.get(termRef);
      if (!course.exists() || !term.exists()) throw new Error('سوابق انتخاب واحد نیاز به همگام‌سازی مسئول دانشگاه دارد.');
      if (!course.data().registrationEndsAt || course.data().registrationEndsAt.toMillis() <= Date.now()) {
        throw new Error('امکان حذف درس از ترم‌های گذشته وجود ندارد.');
      }
      const total = term.data().totalCredits - selection.credits;
      if (total < 0 || course.data().enrolledCount < 1) throw new Error('سوابق انتخاب واحد ناسازگار است.');
      tx.update(selectionRef, { status: 'dropped' });
      tx.update(courseRef, { enrolledCount: course.data().enrolledCount - 1 });
      tx.set(termRef, {
        studentUid: uid, semester: selection.semester, totalCredits: total,
        lastCourseId: selection.courseId, updatedAt: serverTimestamp(),
      });
    });
  }

  async function reserveSlot(slotId, studentUid) {
    const uid = owner(studentUid);
    requireId(slotId);
    return runTransaction(db, async (tx) => {
      const slotRef = doc(db, 'reservation_slots', slotId);
      const reservationRef = doc(db, 'student_reservations', `${uid}_${slotId}`);
      const slotSnap = await tx.get(slotRef);
      const reservation = await tx.get(reservationRef);
      if (!slotSnap.exists()) throw new Error('امکان رزرو یافت نشد.');
      if (reservation.data()?.status === 'active') return;
      const slot = slotSnap.data();
      if (slot.status !== 'active' || !slot.bookingEndsAt || slot.bookingEndsAt.toMillis() <= Date.now()) {
        throw new Error('این امکان رزرو غیرفعال است یا مهلت آن پایان یافته است.');
      }
      if (slot.reservedCount >= slot.capacity) throw new Error('ظرفیت این رزرو تکمیل شده است.');
      tx.set(reservationRef, {
        slotId, studentUid: uid, title: slot.title, category: slot.category,
        date: slot.date, time: slot.time, status: 'active', createdAt: serverTimestamp(),
      });
      tx.update(slotRef, { reservedCount: slot.reservedCount + 1 });
    });
  }

  async function cancelStudentReservation(reservationId, suppliedSlotId) {
    const uid = owner(currentUid());
    requireId(reservationId);
    return runTransaction(db, async (tx) => {
      const ref = doc(db, 'student_reservations', reservationId);
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('رزرو یافت نشد.');
      const reservation = snap.data();
      if (reservation.studentUid !== uid || suppliedSlotId !== reservation.slotId ||
          reservationId !== `${uid}_${reservation.slotId}`) throw new Error('شناسه رزرو نامعتبر است.');
      if (reservation.status === 'cancelled') return;
      const slotRef = doc(db, 'reservation_slots', reservation.slotId);
      const slot = await tx.get(slotRef);
      if (!slot.exists() || slot.data().reservedCount < 1) throw new Error('سوابق رزرو ناسازگار است.');
      tx.update(ref, { status: 'cancelled' });
      tx.update(slotRef, { reservedCount: slot.data().reservedCount - 1 });
    });
  }

  return { registerCourse, dropCourse, reserveSlot, cancelStudentReservation };
}
