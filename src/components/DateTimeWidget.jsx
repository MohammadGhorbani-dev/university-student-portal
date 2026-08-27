import { useState, useEffect } from 'react';
import { FiClock, FiCalendar } from 'react-icons/fi';

export default function DateTimeWidget() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = time.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  const dateString = time.toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="flex items-center gap-4 text-sm font-bold text-slate-500 dark:text-slate-400">
      <div className="flex items-center gap-1.5">
        <FiCalendar className="text-blue-500" />
        <span>{dateString}</span>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-700 pr-4">
        <FiClock className="text-amber-500" />
        <span className="mt-0.5">{timeString}</span>
      </div>
    </div>
  );
}
