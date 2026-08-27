export default function Card({ children, className = '', hoverable = false, ...props }) {
  const hoverClass = hoverable 
    ? 'hover:shadow-xl hover:shadow-blue-900/5 dark:hover:shadow-black/40 hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 cursor-pointer' 
    : 'transition-all duration-300';
    
  return (
    <div 
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-sm dark:shadow-black/20 p-4 sm:p-6 ${hoverClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
