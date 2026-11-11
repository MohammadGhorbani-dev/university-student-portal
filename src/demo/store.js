import { getCurrentSemester } from '../utils/semesterUtils.js';

const key = 'university-portal-synthetic-demo-v1';
export const roles = { student: 'دانشجو', staff: 'کارمند آموزش', admin: 'مدیر' };
export const uidFor = role => 'demo-' + role;
export const demoPassword = 'DemoPortal24!';
export const demoEmailFor = role => role + '@example.test';

export function seedDemo(now = Date.now()) {
  const semester = getCurrentSemester(new Date(now)) ?? 'fall_2026';
  const tomorrow = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now + 86400000));
  const users = Object.fromEntries(Object.keys(roles).map(role => [uidFor(role), {
    role, firstName: role === 'student' ? 'سارا' : 'همکار', lastName: 'نمایشی',
    studentId: role === 'student' ? 'DEMO-1001' : '-', nationalCode: 'نمونه',
    email: demoEmailFor(role), phone: '', address: '', avatar: '',
    major: 'مهندسی کامپیوتر', faculty: 'مهندسی', entryYear: '۱۴۰۳',
    advisor: 'استاد نمونه', gpa: 17.5, creditsPassed: 32, enrollmentVersion: 1,
  }]));
  users['demo-student-other'] = { ...users['demo-student'], firstName: 'دانشجوی', lastName: 'دیگر', studentId: 'DEMO-1002', email: 'other@example.test' };
  const courses = Object.fromEntries(['ساختمان داده‌ها', 'پایگاه داده', 'شبکه‌های کامپیوتری', 'ریاضی عمومی', 'کارگاه برنامه‌نویسی'].map((title, i) => ['course-' + i, {
    id: 'course-' + i, title, code: 'DEMO-' + (101 + i), professor: 'استاد نمونه',
    credits: i === 4 ? 2 : 3, capacity: i === 3 ? 1 : 20, enrolledCount: i === 0 || i === 3 ? 1 : 0,
    semester, department: 'engineering', day: i % 2 ? 'دوشنبه' : 'شنبه',
    startTime: i % 2 ? '10:00' : '08:00', endTime: i % 2 ? '12:00' : '10:00', createdAt: now - i * 1000,
  }]));
  const selections = { 'demo-student_course-0': { ...courses['course-0'], id: 'demo-student_course-0', courseId: 'course-0', studentUid: 'demo-student', status: 'active', createdAt: now } };
  selections['demo-student-other_course-3'] = { ...courses['course-3'], id: 'demo-student-other_course-3', courseId: 'course-3', studentUid: 'demo-student-other', status: 'active', createdAt: now };
  const slots = { 'slot-0': { id: 'slot-0', title: 'اتاق مطالعهٔ گروهی', category: 'study_room', date: tomorrow, time: '14:00', capacity: 10, reservedCount: 0, status: 'active', createdAt: now } };
  return { version: 1, generation: 0, activeUid: null, users, courses, selections, slots,
    announcements: { welcome: { id: 'welcome', title: 'به دانشگاه نمایشی خوش آمدید', content: 'همهٔ نام‌ها و اطلاعات این نسخه ساختگی‌اند. انتخاب واحد، رزرو و درخواست‌ها را امتحان کنید.', createdAt: now } },
    requests: { example: { id: 'example', title: 'گواهی اشتغال به تحصیل', category: 'آموزشی', description: 'درخواست نمونه برای بررسی گردش‌کار مسئول آموزش.', studentUid: 'demo-student', studentName: 'سارا نمایشی', studentId: 'DEMO-1001', status: 'در انتظار بررسی', createdAt: now } },
    tickets: { example: { id: 'example', subject: 'راهنمای انتخاب واحد', category: 'آموزشی', message: 'این تیکت نمونه برای نمایش پاسخ پشتیبانی است.', studentUid: 'demo-student', userId: 'demo-student', studentName: 'سارا نمایشی', studentId: 'DEMO-1001', status: 'باز', createdAt: now } }, reservations: {}, messages: {},
  };
}

let state;
try {
  const stored = typeof sessionStorage === 'undefined' ? null : JSON.parse(sessionStorage.getItem(key));
  state = stored?.version === 1 && stored.users && stored.courses && stored.selections && stored.slots && stored.reservations && stored.requests && stored.tickets && stored.announcements && stored.messages ? stored : seedDemo();
} catch { state = seedDemo(); }
if (!Object.hasOwn(state, 'activeUid')) {
  state.activeUid = Object.hasOwn(roles, state.role) ? uidFor(state.role) : null;
  delete state.role;
}
const listeners = new Set();
export const snapshot = () => state;
export const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
export function change(operation) {
  const next = structuredClone(state);
  operation(next);
  state = next;
  try { if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, JSON.stringify(state)); } catch { /* In-memory demo still works. */ }
  for (const listener of listeners) listener();
}
export function selectRole(role) {
  if (role !== null && !Object.hasOwn(roles, role)) throw new Error('نقش نمایشی نامعتبر است.');
  change(s => { s.activeUid = role === null ? null : uidFor(role); });
}

function loginEmail(uid, profile) {
  if (uid === uidFor(profile.role)) return demoEmailFor(profile.role);
  return profile.demoLoginEmail;
}

export async function loginDemo(email, password) {
  const address = email.trim().toLowerCase();
  const match = Object.entries(state.users).find(([uid, profile]) => loginEmail(uid, profile) === address);
  if (password !== demoPassword || !match) throw new Error('ایمیل یا رمز نمونه درست نیست.');
  change(s => { s.activeUid = match[0]; });
}

export function sampleRegistration() {
  const profiles = Object.entries(state.users);
  let number = 1003;
  while (profiles.some(([uid, profile]) => profile.studentId === 'DEMO-' + number || loginEmail(uid, profile) === `student-${number}@example.test`)) {
    number++;
  }
  return {
    firstName: 'آرمان',
    lastName: 'نمونه',
    studentId: 'DEMO-' + number,
    email: `student-${number}@example.test`,
    password: demoPassword,
    confirmPassword: demoPassword,
  };
}

export async function registerDemo(email, password, data) {
  const address = email.trim().toLowerCase();
  if (!/^[a-z0-9._%+-]+@example\.test$/.test(address) || password !== demoPassword) {
    throw new Error('برای ثبت‌نام نمایشی از ایمیل example.test و رمز نمونه استفاده کنید.');
  }
  if (!/^DEMO-\d+$/.test(data.studentId)) throw new Error('شمارهٔ دانشجویی نمونه باید با DEMO- شروع شود و پس از آن عدد بیاید.');
  if (!data.firstName || !data.lastName) throw new Error('نام و نام خانوادگی نمونه را وارد کنید.');
  const profiles = Object.entries(state.users);
  if (profiles.some(([uid, profile]) => loginEmail(uid, profile) === address || profile.studentId === data.studentId)) {
    throw new Error('ایمیل یا شمارهٔ دانشجویی نمونه قبلاً ثبت شده است.');
  }
  const uid = 'demo-registration-' + crypto.randomUUID();
  change(s => {
    s.users[uid] = {
      ...data,
      nationalCode: '',
      email: address,
      demoLoginEmail: address,
      role: 'student',
      enrollmentVersion: 1,
    };
    s.activeUid = uid;
  });
}

export const resetDemo = () => change(s => {
  const seed = seedDemo();
  const activeUid = Object.hasOwn(seed.users, s.activeUid) ? s.activeUid : null;
  Object.assign(s, seed, { activeUid, generation: (s.generation ?? 0) + 1 });
});
