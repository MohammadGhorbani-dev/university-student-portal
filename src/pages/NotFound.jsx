import { Link } from 'react-router-dom';
import { FiHome } from 'react-icons/fi';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6 relative overflow-hidden" dir="rtl">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#61DAFB]/5 via-[#080808] to-[#080808]"></div>
      <div className="text-center relative z-10 space-y-6 max-w-md">
        <h1 className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-600 ">۴۰۴</h1>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-50 ">صفحه مورد نظر یافت نشد</h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base leading-relaxed">
          متاسفانه صفحه‌ای که به دنبال آن هستید وجود ندارد یا آدرس آن تغییر کرده است.
        </p>
        <div className="pt-4">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 text-white rounded-lg font-bold text-sm hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            <FiHome />
            بازگشت به داشبورد
          </Link>
        </div>
      </div>
    </div>
  );
}
