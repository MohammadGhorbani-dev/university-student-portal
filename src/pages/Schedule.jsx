import { handleFirebaseError, withRetry } from '../utils/errorHandler';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCourses, getStudentCourses } from '../services/firestore';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import { FiClock, FiMapPin } from 'react-icons/fi';

export default function Schedule() {
  const { userData, currentUser } = useAuth();
  const isAdminOrStaff = userData?.role === 'admin' || userData?.role === 'staff';

  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSchedule = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      let data = [];
      if (isAdminOrStaff) {
        data = await withRetry(getCourses);
      } else {
        data = await withRetry(() => getStudentCourses(currentUser.uid));
      }
      
      const scheduledCourses = data.filter(c => c.day && (c.time || c.startTime));
      setSchedule(scheduledCourses);
    } catch (err) {
      setError(handleFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [currentUser, isAdminOrStaff]);

  const daysOfWeek = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه'];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="border-b-2 border-slate-200 dark:border-slate-700 pb-6">
        <span className="text-amber-600 font-mono text-sm tracking-[0.3em] uppercase mb-2 block">برنامه زمانی</span>
        <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-slate-50  leading-none">برنامه هفتگی</h1>
        {isAdminOrStaff && (
          <p className="mt-4 text-slate-600 dark:text-slate-400">شما در حال مشاهده برنامه تمامی دروس ارائهشده هستید.</p>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchSchedule} />
      ) : schedule.length === 0 ? (
        <EmptyState message="برنامه کلاسی برای نمایش وجود ندارد" />
      ) : (
        <div className="space-y-8">
          {daysOfWeek.map(day => {
            const dayCourses = schedule.filter(c => c.day === day);
            if (dayCourses.length === 0) return null;
            
            return (
              <div key={day} className="space-y-4">
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-50 border-r-4 border-[#FFBD2E] pr-3">{day}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dayCourses.map(course => (
                    <Card key={course.id} className="relative overflow-hidden hover:border-slate-200 dark:border-slate-700 transition-colors !p-5">
                      <div className="absolute top-0 right-0 w-1 h-full bg-amber-500"></div>
                      <h4 className="font-bold text-lg text-slate-900 dark:text-slate-50 mb-3">{course.title}</h4>
                      <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400 font-mono">
                        <div className="flex items-center gap-2">
                          <FiClock className="text-amber-600" />
                          <span>{course.startTime ? `${course.startTime} - ${course.endTime}` : course.time || 'زمان نامشخص'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FiMapPin className="text-slate-500 dark:text-slate-400" />
                          <span>{course.department === 'engineering' ? 'فنی و مهندسی' : 
                                course.department === 'science' ? 'علوم پایه' :
                                course.department === 'humanities' ? 'علوم انسانی' : 
                                course.department === 'art' ? 'هنر و معماری' : 'نامشخص'}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
