import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAnnouncements, getStudentCourses, getStudentReservations, getAdminStats, getStudentRequests, getAllRequests } from '../services/firestore';
import { 
  FiBookOpen, FiClock, FiStar, FiCalendar, FiArrowLeft, FiMapPin, 
  FiUsers, FiFileText, FiAlertTriangle, FiBell, FiMessageCircle
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { formatSafely } from '../utils/dateUtils';
import Skeleton from '../components/ui/Skeleton';
import { withRetry } from '../utils/errorHandler';
import { getWeeklyMessage } from '../utils/weeklyMessage';

export default function Dashboard() {
  const { userData, currentUser } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loadingNews, setLoadingNews] = useState(true);
  
  const [myCourses, setMyCourses] = useState([]);
  const [myReservations, setMyReservations] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [recentRequests, setRecentRequests] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const loadNews = async () => {
      try {
        const data = await withRetry(getAnnouncements);
        // Just take the top 3 for the dashboard
        setAnnouncements(data.slice(0, 3));
      } catch (error) {
        console.error("Failed to load news", error);
      } finally {
        setLoadingNews(false);
      }
    };
    loadNews();
  }, []);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!currentUser) return;
      try {
        setLoadingData(true);
        if (userData?.role === 'admin' || userData?.role === 'staff') {
           const [stats, reqs] = await Promise.all([
              withRetry(getAdminStats),
              withRetry(getAllRequests)
            ]);
            setAdminStats(stats);
            setRecentRequests(reqs.slice(0, 3));
        } else {
           const [courses, res, reqs] = await Promise.all([
              withRetry(() => getStudentCourses(currentUser.uid)),
              withRetry(() => getStudentReservations(currentUser.uid)),
              withRetry(() => getStudentRequests(currentUser.uid))
            ]);
            setRecentRequests(reqs.slice(0, 3));
           setMyCourses(courses);
           setMyReservations(res);
        }
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoadingData(false);
      }
    };
    loadDashboardData();
  }, [currentUser, userData]);

  const currentCredits = myCourses.reduce((sum, c) => sum + (c.credits || 0), 0);
  
  // Try to match today's date format (YYYY-MM-DD from input type="date")
  const todayIso = new Date().toISOString().split('T')[0];
  const todaysReservationsCount = myReservations.filter(r => r.date === todayIso && r.status === 'active').length;

  let stats = [];
  if (userData?.role === 'admin') {
    stats = [
      { label: 'کل دانشجویان', value: loadingData ? '-' : adminStats?.studentsCount || 0, icon: <FiUsers />, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30', border: 'border-blue-100 dark:border-blue-900/50' },
      { label: 'تعداد کل دروس', value: loadingData ? '-' : adminStats?.coursesCount || 0, icon: <FiBookOpen />, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-100 dark:border-emerald-900/50' },
      { label: 'درخواست‌های جدید', value: loadingData ? '-' : adminStats?.pendingRequestsCount || 0, icon: <FiFileText />, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', border: 'border-amber-100 dark:border-amber-900/50' },
      { label: 'تیکت‌های باز', value: loadingData ? '-' : adminStats?.openTicketsCount || 0, icon: <FiAlertTriangle />, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/30', border: 'border-rose-100 dark:border-rose-900/50' },
    ];
  } else if (userData?.role === 'staff') {
    stats = [
      { label: 'تعداد کل دروس', value: loadingData ? '-' : adminStats?.coursesCount || 0, icon: <FiBookOpen />, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-100 dark:border-emerald-900/50' },
      { label: 'درخواست‌های در انتظار', value: loadingData ? '-' : adminStats?.pendingRequestsCount || 0, icon: <FiFileText />, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', border: 'border-amber-100 dark:border-amber-900/50' },
      { label: 'ظرفیت رزرو امروز', value: loadingData ? '-' : adminStats?.reservationsCount || 0, icon: <FiCalendar />, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/30', border: 'border-indigo-100 dark:border-indigo-900/50' },
      { label: 'تیکت‌های آموزشی باز', value: loadingData ? '-' : adminStats?.openTicketsCount || 0, icon: <FiAlertTriangle />, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/30', border: 'border-rose-100 dark:border-rose-900/50' },
    ];
  } else {
    stats = [
      { label: 'معدل کل', value: userData?.gpa ?? '-', icon: <FiStar />, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', border: 'border-amber-100 dark:border-amber-900/50' },
      { label: 'واحدهای گذرانده', value: userData?.passedCredits ?? userData?.creditsPassed ?? '-', icon: <FiBookOpen />, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-100 dark:border-emerald-900/50' },
      { label: 'واحدهای ترم جاری', value: loadingData ? '-' : currentCredits, icon: <FiClock />, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30', border: 'border-blue-100 dark:border-blue-900/50' },
      { label: 'رزروهای امروز', value: loadingData ? '-' : todaysReservationsCount, icon: <FiCalendar />, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/30', border: 'border-rose-100 dark:border-rose-900/50' },
    ];
  }

  const todayFaDay = new Date().toLocaleDateString('fa-IR', { weekday: 'long' });
  const todayCourses = myCourses.filter(c => c.day === todayFaDay);

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto pb-10">
      <div className="border-b border-slate-200 dark:border-slate-700 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-blue-600 dark:text-blue-400 font-bold text-sm  mb-2 block">نمای کلی سامانه</span>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-slate-50  leading-none">داشبورد کاربری</h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
          <span className="font-bold text-slate-700 dark:text-slate-300">{userData?.firstName || 'کاربر'}  خوش آمدید </span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-slate-800 p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${stat.bg} ${stat.color} border ${stat.border} shrink-0`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase  mb-1">{stat.label}</p>
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-50">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 dark:border-slate-700/50">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <FiBell className="text-blue-600 dark:text-blue-400" />
              آخرین اخبار دانشگاه
            </h2>
            <Link to="/announcements" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 transition-colors bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg hover:bg-blue-100 cursor-pointer">
              مشاهده همه <FiArrowLeft />
            </Link>
          </div>
          
          <div className="space-y-4 flex-1">
            {loadingNews ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
              </div>
            ) : announcements.length > 0 ? (
              announcements.map((item) => (
                <Link to="/announcements" key={item.id} className="group flex gap-4 pb-4 border-b border-slate-100 dark:border-slate-700/50 last:border-0 last:pb-0 hover:bg-slate-50 dark:hover:bg-slate-800 p-3 -mx-3 rounded-xl transition-colors cursor-pointer">
                  <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-900/50 rounded-xl shrink-0 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <FiBookOpen size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-slate-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                      {item.title}
                    </h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                      {item.content}
                    </p>
                    <p className="text-sm text-slate-400 mt-2 font-medium">
                      {new Date(item.createdAt).toLocaleDateString('fa-IR')}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3 py-8">
                <FiBookOpen className="text-4xl opacity-20" />
                <p className="text-sm font-medium">در حال حاضر اطلاعیهای برای نمایش وجود ندارد.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 dark:border-slate-700/50">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <FiCalendar className="text-amber-500" />
              برنامه امروز ({todayFaDay})
            </h2>
            <Link to="/schedule" className="text-sm font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 flex items-center gap-1 transition-colors bg-amber-50 dark:bg-amber-900/30 px-3 py-1.5 rounded-lg hover:bg-amber-100 cursor-pointer">
              برنامه کامل <FiArrowLeft />
            </Link>
          </div>
          
          <div className="space-y-3 flex-1">
            {loadingData ? (
              <div className="space-y-3">
                {[1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
              </div>
            ) : userData?.role === 'admin' || userData?.role === 'staff' ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3 py-8 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700/50 border-dashed">
                <FiUsers className="text-4xl opacity-20" />
                <p className="text-sm font-medium text-center px-4">نمایش برنامه کلاسی مختص دانشجویان است.</p>
              </div>
            ) : todayCourses.length > 0 ? (
              todayCourses.map((course) => (
                <div key={course.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800 shadow-sm dark:shadow-none relative overflow-hidden group hover:border-amber-200 transition-colors">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-400 group-hover:bg-amber-50 dark:bg-amber-900/300 transition-colors"></div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-50 truncate">{course.title}</h4>
                  <div className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <FiClock className="text-amber-500" />
                    <span>{course.startTime ? `${course.startTime} تا ${course.endTime}` : course.time || 'زمان نامشخص'}</span>
                  </div>
                  <div className="mt-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <FiMapPin className="text-slate-400" />
                    <span className="truncate">
                      {course.department === 'engineering' ? 'فنی و مهندسی' :
                        course.department === 'science' ? 'علوم پایه' :
                       course.department === 'humanities' ? 'علوم انسانی' :
                        course.department === 'art' ? 'هنر و معماری' : course.time || 'زمان نامشخص'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3 py-8 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700/50 border-dashed">
                <FiStar className="text-4xl opacity-20" />
                <p className="text-sm font-medium">امروز کلاسی برای شما ثبت نشده است.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-l from-blue-600 to-blue-500 dark:from-slate-800 dark:to-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-none  border-transparent dark:border-slate-700 text-white flex items-center gap-6 mt-8 relative overflow-hidden group">
        <div className="absolute right-0 top-0 h-full w-2 bg-amber-400"></div>
        <div className="w-16 h-16 bg-white/20 dark:bg-slate-700 rounded-full flex items-center justify-center text-3xl shrink-0 backdrop-blur-sm group-hover:scale-110 transition-transform duration-500">
          <FiMessageCircle />
        </div>
        <div>
          <h3 className="text-sm font-bold text-blue-100 dark:text-slate-400 mb-2">پیام هفته</h3>
          <p className="text-lg md:text-xl font-bold leading-relaxed">
            {getWeeklyMessage()}
          </p>
        </div>
      </div>
    </div>
  );
}
