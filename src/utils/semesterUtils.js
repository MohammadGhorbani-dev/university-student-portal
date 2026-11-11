// Semester Configuration and Helpers
const semesters = {
  'fall_2025': { id: 'fall_2025', title: 'پاییز ۱۴۰۴', startDate: '2025-09-23', endDate: '2026-02-19' },
  'spring_2026': { id: 'spring_2026', title: 'بهار ۱۴۰۵', startDate: '2026-02-20', endDate: '2026-07-22' },
  'fall_2026': { id: 'fall_2026', title: 'پاییز ۱۴۰۵', startDate: '2026-09-23', endDate: '2027-02-19' },
  'spring_2027': { id: 'spring_2027', title: 'بهار ۱۴۰۶', startDate: '2027-02-20', endDate: '2027-07-22' },
};

export const getSemesterTitle = (semesterId) => {
  if (semesterId === 'unknown_semester') return 'ترم نامشخص';
  return semesters[semesterId]?.title || semesterId;
};

export const getSemesterEnd = (semesterId) => semesters[semesterId]?.endDate;

export const getCurrentSemester = (now = new Date()) => {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return Object.values(semesters).find(term => date >= term.startDate && date <= term.endDate)?.id ?? null;
};

export const isSemesterPast = (semesterId) => {
  const semester = semesters[semesterId];
  if (!semester || !semester.endDate) return false;
  
  const now = new Date();
  const endDate = new Date(`${semester.endDate}T23:59:59.999+03:30`);
  
  return now > endDate;
};


