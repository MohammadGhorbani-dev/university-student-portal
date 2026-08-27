const messages = [
  "موفقیت نتیجه تلاش‌های کوچک و مداوم است.",
  "هر روز فرصتی جدید برای یادگیری و پیشرفت است.",
  "پشتکار و اراده، کلید فتح قله‌های دانش است.",
  "آینده از آن کسانی است که به زیبایی رویاهایشان ایمان دارند.",
  "هیچ وقت برای شروع دوباره و ساختن آینده‌ای بهتر دیر نیست.",
  "دانش، نوری است که مسیر تاریک جهل را روشن می‌کند.",
  "تلاش امروز شما، سرمایه فردای شماست.",
  "در مسیر یادگیری، هر شکستی یک درس ارزشمند است."
];

export const getWeeklyMessage = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  const week = Math.floor(diff / oneWeek);
  
  return messages[week % messages.length];
};
