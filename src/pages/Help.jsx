import { useState } from 'react';
import { FiChevronDown, FiHelpCircle } from 'react-icons/fi';

const faqData = [
  {
    category: 'انتخاب واحد',
    questions: [
      { 
        q: 'چگونه یک درس را انتخاب کنم؟', 
        a: 'برای انتخاب درس، به بخش «انتخاب واحد» مراجعه کنید. پس از یافتن درس مورد نظر در لیست دروس ارائه شده، در صورتی که شرایط لازم را داشته باشید و ظرفیت درس تکمیل نشده باشد، روی دکمه «اخذ درس» کلیک کنید.' 
      },
      { 
        q: 'حداکثر چند واحد می‌توانم انتخاب کنم؟', 
        a: 'بر اساس قوانین سامانه، سقف مجاز انتخاب واحد در حال حاضر حداکثر ۲۰ واحد در هر ترم می‌باشد.' 
      },
      { 
        q: 'چگونه یک درس انتخاب‌شده را حذف کنم؟', 
        a: 'به تب «دروس اخذ شده» در بخش انتخاب واحد بروید. روی دکمه «حذف درس» برای درس مورد نظر کلیک کنید. توجه داشته باشید که این امکان تنها برای دروس ترم جاری (معتبر) فعال است.' 
      },
      { 
        q: 'چرا امکان انتخاب یک درس را ندارم؟', 
        a: 'عدم امکان انتخاب درس معمولاً به یکی از دلایل زیر است:\n- ظرفیت درس تکمیل شده باشد.\n- درس ترم معتبر نداشته باشد.\n- قبلاً درس انتخاب شده باشد.\n- مجموع واحدهای انتخابی با انتخاب این درس از سقف ۲۰ واحد عبور کند.\n- کاربر مجوز لازم را نداشته باشد.' 
      }
    ]
  },
  {
    category: 'برنامه هفتگی',
    questions: [
      { 
        q: 'برنامه هفتگی را از کجا ببینم؟', 
        a: 'از منوی سمت راست روی «برنامه هفتگی» کلیک کنید. برنامه دروسی که اخذ کرده‌اید به صورت جدولی تفکیک شده بر اساس روزهای هفته نمایش داده می‌شود.' 
      },
      { 
        q: 'اگر درسی انتخاب نکرده باشم چه چیزی نمایش داده می‌شود؟', 
        a: 'در صورتی که هیچ درسی اخذ نکرده باشید، جدول برنامه هفتگی خالی خواهد بود و پیامی مبنی بر عدم ثبت کلاس برای شما نمایش داده می‌شود.' 
      }
    ]
  },
  {
    category: 'رزرو امکانات',
    questions: [
      { 
        q: 'چگونه یک امکان را رزرو کنم؟', 
        a: 'به بخش «رزرو امکانات» بروید. از لیست امکانات موجود در تب مرتبط، زمان و امکان مورد نظر را پیدا کرده و روی دکمه رزرو کلیک کنید.' 
      },
      { 
        q: 'چگونه رزرو خود را لغو کنم؟', 
        a: 'در همان بخش رزرو امکانات، به تب رزروهای فعال (رزروهای من) بروید. در آنجا می‌توانید با استفاده از گزینه لغو، رزرو خود را کنسل کنید.' 
      },
      { 
        q: 'چرا امکان رزرو برای من فعال نیست؟', 
        a: 'ممکن است ظرفیت آن امکان تکمیل شده باشد، زمان آن گذشته باشد، و یا از قبل آن امکان را در همان بازه زمانی رزرو کرده باشید.' 
      }
    ]
  },
  {
    category: 'درخواست‌ها',
    questions: [
      { 
        q: 'چگونه درخواست جدید ثبت کنم؟', 
        a: 'به بخش «درخواست‌های آموزشی» بروید. روی دکمه ثبت درخواست کلیک کرده، فرم مربوطه را پر کنید و درخواست خود را ارسال نمایید.' 
      },
      { 
        q: 'وضعیت درخواست خود را از کجا ببینم؟', 
        a: 'تمامی درخواست‌های ثبت شده شما در همان بخش «درخواست‌های آموزشی» لیست می‌شوند و وضعیت بررسی آن‌ها قابل مشاهده است.' 
      },
      { 
        q: 'آیا می‌توانم بعد از ثبت، درخواست را ویرایش کنم؟', 
        a: 'خیر. در حال حاضر امکان ویرایش درخواست پس از ثبت توسط دانشجو وجود ندارد.' 
      }
    ]
  },
  {
    category: 'اطلاعیه‌ها',
    questions: [
      { 
        q: 'اطلاعیه‌های دانشگاه را از کجا ببینم؟', 
        a: 'شما می‌توانید اطلاعیه‌ها را در داشبورد خود (صفحه اصلی) یا به صورت کامل در بخش «اخبار و اطلاعیه‌ها» مشاهده کنید.' 
      },
      { 
        q: 'چگونه متن کامل یک اطلاعیه را مشاهده کنم؟', 
        a: 'با کلیک روی کارت هر اطلاعیه، متن کامل و جزئیات آن در یک پنجره به شما نمایش داده می‌شود.' 
      }
    ]
  },
  {
    category: 'حساب کاربری',
    questions: [
      { 
        q: 'چگونه اطلاعات پروفایل خود را تغییر دهم؟', 
        a: 'از منوی کناری به بخش «پروفایل و پشتیبانی» بروید. در آنجا می‌توانید اطلاعات شخصی خود را ویرایش کنید.' 
      },
      { 
        q: 'چگونه رمز عبور خود را تغییر دهم؟', 
        a: 'در بخش «پروفایل و پشتیبانی»، گزینه‌ای با عنوان بازیابی رمز عبور وجود دارد که ایمیل تغییر رمز را برای شما ارسال می‌کند.' 
      },
      { 
        q: 'اگر رمز عبور را فراموش کنم چه کنم؟', 
        a: 'در صفحه ورود به سامانه، روی گزینه بازیابی رمز عبور کلیک کنید. با وارد کردن ایمیل خود، لینک تغییر رمز عبور برای شما ارسال می‌شود.' 
      }
    ]
  },
  {
    category: 'ورود و نقش‌های کاربری',
    questions: [
      { 
        q: 'اگر نتوانم وارد حساب شوم چه کنم؟', 
        a: 'ابتدا مطمئن شوید که ایمیل و رمز عبور را به درستی وارد می‌کنید. در صورت نیاز، از ویژگی بازیابی رمز عبور استفاده کنید یا با پشتیبانی سامانه تماس بگیرید.' 
      },
      { 
        q: 'تفاوت حساب دانشجو، کارمند و مدیر چیست؟', 
        a: 'دانشجویان به امکاناتی نظیر انتخاب واحد، مشاهده برنامه و ثبت درخواست دسترسی دارند. کارمندان می‌توانند درخواست‌ها را بررسی و امکانات را مدیریت کنند. مدیران سطح دسترسی کاملی به تمام بخش‌های سامانه دارند.' 
      }
    ]
  }
];

const AccordionItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl mb-3 overflow-hidden bg-white dark:bg-slate-900 shadow-sm dark:shadow-none transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between p-4 md:p-5 text-right cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors focus:outline-none"
      >
        <span className="font-bold text-sm md:text-base text-slate-900 dark:text-slate-50 pl-4">{question}</span>
        <FiChevronDown 
          className={`text-slate-500 dark:text-slate-400 text-xl shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      <div 
        className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="p-4 md:p-5 pt-0 text-sm leading-relaxed text-slate-600 dark:text-slate-400 whitespace-pre-line">
          {answer}
        </div>
      </div>
    </div>
  );
};

export default function Help() {
  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="mb-8 md:mb-12">
        <span className="text-blue-600 font-mono text-sm tracking-[0.3em] uppercase mb-2 block">راهنما</span>
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-slate-50 leading-none mb-4 flex items-center gap-3">
          <FiHelpCircle className="text-blue-600 dark:text-blue-500" />
          راهنما و سوالات متداول
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm md:text-base">
          در این بخش می‌توانید پاسخ پرسش‌های متداول درباره استفاده از پورتال دانشجویی را مشاهده کنید.
        </p>
      </div>

      <div className="space-y-10">
        {faqData.map((categoryGroup, index) => (
          <section key={index} className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
              {categoryGroup.category}
            </h2>
            <div className="flex flex-col gap-1">
              {categoryGroup.questions.map((item, idx) => (
                <AccordionItem key={idx} question={item.q} answer={item.a} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
