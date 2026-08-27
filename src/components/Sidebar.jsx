import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiHome, FiBook, FiCalendar, FiUser, FiLogOut, FiBell, FiList, FiFileText, FiX, FiMap, FiHelpCircle } from 'react-icons/fi';

export default function Sidebar({ onClose }) {
  const { logout, userData } = useAuth();
  
  const role = userData?.role || 'student';

  const allNavItems = [
    { path: '/', name: 'داشبورد', icon: <FiHome />, roles: ['student', 'admin', 'staff'] },
    { path: '/announcements', name: 'اخبار و اطلاعیه‌ها', icon: <FiBell />, roles: ['student', 'admin', 'staff'] },
    { path: '/curriculum', name: 'چارت دروس', icon: <FiMap />, roles: ['student', 'admin', 'staff'] },
    { path: '/courses', name: 'مدیریت دروس', icon: <FiBook />, roles: ['admin', 'staff'] },
    { path: '/courses', name: 'انتخاب واحد', icon: <FiBook />, roles: ['student'] },
    { path: '/schedule', name: 'برنامه هفتگی', icon: <FiList />, roles: ['student', 'admin', 'staff'] },
    { path: '/reservations', name: 'رزرو امکانات', icon: <FiCalendar />, roles: ['student', 'admin', 'staff'] },
    { path: '/requests', name: 'درخواست‌های آموزشی', icon: <FiFileText />, roles: ['student', 'admin', 'staff'] },
    { path: '/help', name: 'راهنما و سوالات متداول', icon: <FiHelpCircle />, roles: ['student', 'admin', 'staff'] },
    { path: '/profile', name: 'پروفایل و پشتیبانی', icon: <FiUser />, roles: ['student', 'admin', 'staff'] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(role));

  return (
    <aside className="w-72 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full shadow-lg dark:shadow-none relative transition-colors duration-300">
      <div className="p-6 h-20 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-blue-600 dark:text-blue-500 font-bold text-sm mb-0.5">سامانه جامع</span>
          <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">پورتال دانشگاه</h1>
        </div>
        <button 
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 lg:hidden rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="بستن منو"
        >
          <FiX className="text-xl" />
        </button>
      </div>
      
      <div className="px-4 py-6 flex-1 flex flex-col overflow-hidden">
         <div className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4 px-2">منوی اصلی</div>
         <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1 custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.path + item.name}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-bold ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm dark:shadow-none border border-blue-100 dark:border-blue-800'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`text-lg ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-400'}`}>
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
      
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 mt-auto">
        <button
          onClick={() => {
            if(onClose) onClose();
            logout();
          }}
          className="flex items-center justify-center gap-2 px-4 py-3 w-full rounded-xl text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-900/30 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800 transition-all text-sm font-bold shadow-sm dark:shadow-none"
        >
          <FiLogOut className="text-lg text-rose-500 dark:text-rose-400" />
          <span>خروج از حساب کاربری</span>
        </button>
      </div>
    </aside>
  );
}
