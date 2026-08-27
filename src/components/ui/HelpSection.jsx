import { FiHelpCircle, FiMail, FiPhone } from 'react-icons/fi';
import { SUPPORT_EMAIL, SUPPORT_PHONE } from '../../config/support';

export default function HelpSection() {
  return (
    <div className="w-full bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center relative z-10">
      <div className="flex items-center justify-center gap-2 text-slate-900 dark:text-slate-50 font-bold mb-2">
        <FiHelpCircle className="text-blue-500 text-lg" />
        <h3 className="text-base">نیاز به راهنمایی دارید؟</h3>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
        اگر در ورود یا ثبت‌نام مشکل دارید، با پشتیبانی سامانه تماس بگیرید.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm font-medium">
        <a href={`mailto:${SUPPORT_EMAIL}`} className="flex-1 w-full flex items-center justify-center gap-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/50 group">
          <FiMail className="text-blue-500 group-hover:scale-110 transition-transform" />
          <span dir="ltr">{SUPPORT_EMAIL}</span>
        </a>
        <a href={`tel:${SUPPORT_PHONE.replace(/-/g, '')}`} className="flex-1 w-full flex items-center justify-center gap-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-green-200 dark:hover:border-green-900/50 group">
          <FiPhone className="text-green-500 group-hover:scale-110 transition-transform" />
          <span dir="ltr">{SUPPORT_PHONE}</span>
        </a>
      </div>
    </div>
  );
}
