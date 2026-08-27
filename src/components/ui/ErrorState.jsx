import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

export default function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-rose-100 dark:border-rose-900/30 shadow-sm min-h-[300px]">
      <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center text-rose-400 dark:text-rose-500 mb-6 border border-rose-100 dark:border-rose-900/30">
        <FiAlertTriangle className="text-4xl" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">خطا در دریافت اطلاعات</h3>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-sm mb-8 leading-relaxed">
        {message || 'متاسفانه در ارتباط با سرور مشکلی پیش آمده است. لطفا دوباره تلاش کنید.'}
      </p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="flex items-center gap-2 px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-sm transition-all cursor-pointer"
        >
          <FiRefreshCw />
          <span>تلاش مجدد</span>
        </button>
      )}
    </div>
  );
}
