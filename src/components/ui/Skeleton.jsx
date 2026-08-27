export default function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-slate-100 dark:bg-slate-800/50 rounded-2xl ${className}`}></div>
  );
}
