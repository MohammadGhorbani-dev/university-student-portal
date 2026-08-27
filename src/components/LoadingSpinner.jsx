import { FiLoader } from 'react-icons/fi';

export default function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#61DAFB]/5 via-[#080808] to-[#080808]"></div>
      <div className="flex flex-col items-center z-10">
        <FiLoader className="text-4xl text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-mono text-sm uppercase  animate-pulse">در حال بارگذاری...</p>
      </div>
    </div>
  );
}
