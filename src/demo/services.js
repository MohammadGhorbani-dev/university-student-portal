import { snapshot, change, uidFor } from './store.js';
import { isSemesterPast } from '../utils/semesterUtils.js';

const rows = (s, name) => Object.values(s[name]).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
function current(s) {
  if (!s.role) throw new Error('ابتدا نقش نمایشی را انتخاب کنید.');
  return { uid: uidFor(s.role), ...s.users[uidFor(s.role)] };
}
function staff(s) { if (!['admin', 'staff'].includes(current(s).role)) throw new Error('این عملیات برای مسئول آموزش است.'); }
function own(s, uid) { const u = current(s); if (u.uid !== uid && !['admin', 'staff'].includes(u.role)) throw new Error('دسترسی به سوابق دیگری مجاز نیست.'); }
const read = operation => Promise.resolve(operation(snapshot()));
const write = operation => { let result; change(s => { result = operation(s); }); return Promise.resolve(result); };
function record(s, name, id) { const item = s[name][id]; if (!item) throw new Error('رکورد یافت نشد.'); return item; }
const newId = () => crypto.randomUUID();
const all = name => read(s => { current(s); return structuredClone(rows(s, name)); });
const personal = (name, uid, active = false) => read(s => {
  own(s, uid); return structuredClone(rows(s, name).filter(r => r.studentUid === uid && (!active || r.status === 'active')));
});
const administrative = name => read(s => { staff(s); return structuredClone(rows(s, name)); });

export const getAnnouncements = () => all('announcements');
export const getCourses = () => all('courses');
export const getReservationSlots = () => all('slots');
export const getStudentCourses = uid => personal('selections', uid, true);
export const getStudentReservations = uid => personal('reservations', uid);
export const getStudentRequests = uid => personal('requests', uid);
export const getStudentTickets = uid => personal('tickets', uid);
export const getAllCourseSelections = () => administrative('selections');
export const getAllStudentReservations = () => administrative('reservations');
export const getAllRequests = () => administrative('requests');
export const getAllTickets = () => administrative('tickets');

function create(name, data) { return write(s => { staff(s); const id = newId(); s[name][id] = { ...data, id, createdAt: Date.now() }; return id; }); }
export const createAnnouncement = data => create('announcements', data);
export const updateAnnouncement = (id, data) => write(s => { staff(s); Object.assign(record(s, 'announcements', id), data); });
export const deleteAnnouncement = id => write(s => { staff(s); delete s.announcements[id]; });
function capacity(data, count, course = false) {
  if (!Number.isInteger(data.capacity) || data.capacity < 1 || data.capacity < count || (course && (!Number.isInteger(data.credits) || data.credits < 1 || data.credits > 6))) throw new Error('ظرفیت یا تعداد واحد معتبر نیست.');
}
export const createCourse = data => { capacity(data, 0, true); return create('courses', { ...data, enrolledCount: 0 }); };
export const createReservationSlot = data => { capacity(data, 0); return create('slots', { ...data, reservedCount: 0 }); };
function updateParent(name, id, data, counter, fields) {
  return write(s => {
    staff(s); const item = record(s, name, id); const next = { ...item, ...data };
    capacity(next, item[counter], name === 'courses');
    if (item[counter] > 0 && fields.some(f => f in data && data[f] !== item[f])) throw new Error('برای مورد دارای ثبت فعال، اطلاعات اصلی قابل تغییر نیست.');
    Object.assign(item, data, { [counter]: item[counter] });
  });
}
export const updateCourse = (id, data) => updateParent('courses', id, data, 'enrolledCount', ['credits', 'semester', 'title', 'code', 'professor', 'day', 'startTime', 'endTime', 'department']);
export const updateReservationSlot = (id, data) => updateParent('slots', id, data, 'reservedCount', ['title', 'category', 'date', 'time']);
const removeParent = (name, id, counter) => write(s => { staff(s); if (record(s, name, id)[counter] !== 0) throw new Error('این مورد ثبت فعال دارد و قابل حذف نیست.'); delete s[name][id]; });
export const deleteCourse = id => removeParent('courses', id, 'enrolledCount');
export const deleteReservationSlot = id => removeParent('slots', id, 'reservedCount');

export const registerCourse = (id, uid) => write(s => {
  const user = current(s); if (user.role !== 'student' || user.uid !== uid) throw new Error('فقط دانشجو می‌تواند درس انتخاب کند.');
  const course = record(s, 'courses', id), selectionId = uid + '_' + id;
  if (s.selections[selectionId]?.status === 'active') return;
  if (!course.semester || isSemesterPast(course.semester)) throw new Error('مهلت انتخاب این درس پایان یافته است.');
  if (course.enrolledCount >= course.capacity) throw new Error('ظرفیت این درس تکمیل شده است.');
  const total = rows(s, 'selections').filter(r => r.studentUid === uid && r.semester === course.semester && r.status === 'active').reduce((sum, r) => sum + r.credits, 0);
  if (total + course.credits > 20) throw new Error('مجموع واحدها نمی‌تواند بیشتر از ۲۰ باشد.');
  s.selections[selectionId] = { ...course, id: selectionId, courseId: id, studentUid: uid, status: 'active', createdAt: Date.now() };
  course.enrolledCount++;
});
export const dropCourse = (id, courseId) => write(s => {
  const selection = record(s, 'selections', id); if (selection.studentUid !== current(s).uid || selection.courseId !== courseId) throw new Error('انتخاب واحد متعلق به نقش فعلی نیست.');
  if (selection.status === 'dropped') return;
  if (isSemesterPast(selection.semester)) throw new Error('امکان حذف درس ترم گذشته وجود ندارد.');
  const course = record(s, 'courses', courseId); if (course.enrolledCount < 1) throw new Error('شمارنده ناسازگار است.');
  selection.status = 'dropped'; course.enrolledCount--;
});
export const reserveSlot = (id, uid) => write(s => {
  const user = current(s); if (user.role !== 'student' || uid !== user.uid) throw new Error('رزرو فقط برای دانشجو مجاز است.');
  const slot = record(s, 'slots', id), reservationId = uid + '_' + id;
  if (s.reservations[reservationId]?.status === 'active') return;
  if (slot.status !== 'active' || new Date(slot.date + 'T' + slot.time + ':00+03:30').getTime() <= Date.now()) throw new Error('مهلت رزرو پایان یافته یا امکان غیرفعال است.');
  if (slot.reservedCount >= slot.capacity) throw new Error('ظرفیت تکمیل شده است.');
  s.reservations[reservationId] = { ...slot, id: reservationId, slotId: id, studentUid: uid, status: 'active', createdAt: Date.now() }; slot.reservedCount++;
});
export const cancelStudentReservation = (id, slotId) => write(s => {
  const reservation = record(s, 'reservations', id); if (reservation.studentUid !== current(s).uid || reservation.slotId !== slotId) throw new Error('رزرو متعلق به نقش فعلی نیست.');
  if (reservation.status === 'cancelled') return;
  const slot = record(s, 'slots', slotId); if (slot.reservedCount < 1) throw new Error('شمارنده ناسازگار است.');
  reservation.status = 'cancelled'; slot.reservedCount--;
});
export const updateUserProfile = (uid, data) => write(s => {
  own(s, uid); const profile = record(s, 'users', uid);
  for (const field of ['email', 'phone', 'address', 'avatar']) if (field in data) profile[field] = data[field];
});
const submit = (name, data, status) => write(s => {
  const user = current(s); if (user.role !== 'student') throw new Error('ثبت درخواست برای دانشجو است.');
  const id = newId(); s[name][id] = { ...data, id, status, studentUid: user.uid, studentName: user.firstName + ' ' + user.lastName, studentId: user.studentId, createdAt: Date.now() }; return id;
});
export const createRequest = data => submit('requests', data, 'در انتظار بررسی');
export const createTicket = data => submit('tickets', data, 'باز');
export const updateRequestStatus = (id, status, response) => write(s => {
  staff(s); if (!['در انتظار بررسی', 'در حال بررسی', 'تأیید شده', 'رد شده'].includes(status)) throw new Error('وضعیت نامعتبر است.');
  Object.assign(record(s, 'requests', id), { status, ...(response === undefined ? {} : { adminResponse: response }) });
});
export const updateTicketStatus = (id, status) => write(s => {
  staff(s); if (!['باز', 'در حال بررسی', 'بسته شده'].includes(status)) throw new Error('وضعیت نامعتبر است.');
  record(s, 'tickets', id).status = status;
});
export const getTicketMessages = id => read(s => {
  own(s, record(s, 'tickets', id).studentUid); return structuredClone(Object.values(s.messages[id] ?? {}).sort((a, b) => a.createdAt - b.createdAt));
});
export const addTicketMessage = (id, data) => write(s => {
  const ticket = record(s, 'tickets', id); own(s, ticket.studentUid);
  if (ticket.status === 'بسته شده') throw new Error('تیکت بسته است.');
  if (!data.message?.trim()) throw new Error('متن پیام لازم است.');
  const user = current(s), messageId = newId(); s.messages[id] ??= {};
  s.messages[id][messageId] = { id: messageId, message: data.message, senderUid: user.uid, senderName: user.firstName + ' ' + user.lastName, senderRole: user.role, createdAt: Date.now() };
});
export const getAdminStats = () => read(s => {
  staff(s); return {
    studentsCount: Object.values(s.users).filter(u => u.role === 'student').length,
    coursesCount: rows(s, 'courses').length, announcementsCount: rows(s, 'announcements').length,
    pendingRequestsCount: rows(s, 'requests').filter(r => r.status === 'در انتظار بررسی').length,
    openTicketsCount: rows(s, 'tickets').filter(r => r.status === 'باز').length,
    activeReservationsCount: rows(s, 'slots').filter(r => r.status === 'active').length,
  };
});
