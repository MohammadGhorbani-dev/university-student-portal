export const curriculumData = [
  {
    major: "مهندسی کامپیوتر",
    semesters: [
      {
        semester: 1,
        title: "ترم اول",
        courses: [
          { code: "1001", title: "ریاضی ۱", credits: 3, category: "پایه", prerequisites: [], corequisites: [] },
          { code: "1002", title: "مبانی برنامه‌سازی", credits: 3, category: "اصلی", prerequisites: [], corequisites: [] },
          { code: "1003", title: "فیزیک ۱", credits: 3, category: "پایه", prerequisites: [], corequisites: [] },
          { code: "1004", title: "زبان انگلیسی عمومی", credits: 3, category: "عمومی", prerequisites: [], corequisites: [] },
          { code: "1005", title: "فارسی عمومی", credits: 3, category: "عمومی", prerequisites: [], corequisites: [] }
        ]
      },
      {
        semester: 2,
        title: "ترم دوم",
        courses: [
          { code: "2001", title: "ریاضی ۲", credits: 3, category: "پایه", prerequisites: ["1001"], corequisites: [] },
          { code: "2002", title: "برنامه‌سازی پیشرفته", credits: 3, category: "اصلی", prerequisites: ["1002"], corequisites: [] },
          { code: "2003", title: "فیزیک ۲", credits: 3, category: "پایه", prerequisites: ["1003"], corequisites: [] },
          { code: "2004", title: "مدارهای منطقی", credits: 3, category: "اصلی", prerequisites: ["1002", "1003"], corequisites: [] },
          { code: "2005", title: "آزمایشگاه برنامه‌سازی", credits: 1, category: "اصلی", prerequisites: [], corequisites: ["2002"] }
        ]
      },
      {
        semester: 3,
        title: "ترم سوم",
        courses: [
          { code: "3001", title: "ساختمان داده", credits: 3, category: "اصلی", prerequisites: ["2002"], corequisites: [] },
          { code: "3002", title: "معماری کامپیوتر", credits: 3, category: "اصلی", prerequisites: ["2004"], corequisites: [] },
          { code: "3003", title: "ریاضیات گسسته", credits: 3, category: "پایه", prerequisites: ["1002"], corequisites: [] },
          { code: "3004", title: "آمار و احتمالات", credits: 3, category: "پایه", prerequisites: ["2001"], corequisites: [] },
          { code: "3005", title: "اندیشه اسلامی ۱", credits: 2, category: "عمومی", prerequisites: [], corequisites: [] }
        ]
      },
      {
        semester: 4,
        title: "ترم چهارم",
        courses: [
          { code: "4001", title: "طراحی الگوریتم", credits: 3, category: "اصلی", prerequisites: ["3001"], corequisites: [] },
          { code: "4002", title: "سیستم‌های عامل", credits: 3, category: "اصلی", prerequisites: ["3001", "3002"], corequisites: [] },
          { code: "4003", title: "شبکه‌های کامپیوتری", credits: 3, category: "اصلی", prerequisites: ["3002"], corequisites: [] },
          { code: "4004", title: "پایگاه داده‌ها", credits: 3, category: "اصلی", prerequisites: ["3001", "3003"], corequisites: [] },
          { code: "4005", title: "نظریه زبان‌ها و ماشین‌ها", credits: 3, category: "اصلی", prerequisites: ["3003"], corequisites: [] }
        ]
      }
    ]
  },
  {
    major: "علوم کامپیوتر",
    semesters: [
      {
        semester: 1,
        title: "ترم اول",
        courses: [
          { code: "CS1001", title: "ریاضی ۱", credits: 3, category: "پایه", prerequisites: [], corequisites: [] },
          { code: "CS1002", title: "مبانی کامپیوتر و برنامه‌سازی", credits: 3, category: "اصلی", prerequisites: [], corequisites: [] },
          { code: "CS1003", title: "مبانی منطق", credits: 3, category: "پایه", prerequisites: [], corequisites: [] },
          { code: "CS1004", title: "زبان عمومی", credits: 3, category: "عمومی", prerequisites: [], corequisites: [] }
        ]
      },
      {
        semester: 2,
        title: "ترم دوم",
        courses: [
          { code: "CS2001", title: "ریاضی ۲", credits: 3, category: "پایه", prerequisites: ["CS1001"], corequisites: [] },
          { code: "CS2002", title: "برنامه‌سازی پیشرفته", credits: 3, category: "اصلی", prerequisites: ["CS1002"], corequisites: [] },
          { code: "CS2003", title: "مبانی ترکیبیات", credits: 3, category: "پایه", prerequisites: ["CS1003"], corequisites: [] },
          { code: "CS2004", title: "آزمایشگاه برنامه‌سازی", credits: 1, category: "اصلی", prerequisites: [], corequisites: ["CS2002"] }
        ]
      }
    ]
  },
  {
    major: "مهندسی برق",
    semesters: [
      {
        semester: 1,
        title: "ترم اول",
        courses: [
          { code: "EE1001", title: "ریاضی عمومی ۱", credits: 3, category: "پایه", prerequisites: [], corequisites: [] },
          { code: "EE1002", title: "فیزیک ۱", credits: 3, category: "پایه", prerequisites: [], corequisites: [] },
          { code: "EE1003", title: "مبانی برنامه‌سازی", credits: 3, category: "پایه", prerequisites: [], corequisites: [] },
          { code: "EE1004", title: "زبان انگلیسی", credits: 3, category: "عمومی", prerequisites: [], corequisites: [] }
        ]
      },
      {
        semester: 2,
        title: "ترم دوم",
        courses: [
          { code: "EE2001", title: "ریاضی عمومی ۲", credits: 3, category: "پایه", prerequisites: ["EE1001"], corequisites: [] },
          { code: "EE2002", title: "فیزیک ۲", credits: 3, category: "پایه", prerequisites: ["EE1002"], corequisites: [] },
          { code: "EE2003", title: "مدارهای الکتریکی ۱", credits: 3, category: "اصلی", prerequisites: ["EE1002"], corequisites: ["EE2001"] },
          { code: "EE2004", title: "معادلات دیفرانسیل", credits: 3, category: "پایه", prerequisites: ["EE1001"], corequisites: [] }
        ]
      }
    ]
  }
];
