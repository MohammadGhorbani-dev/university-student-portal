import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Link, useNavigate } from 'react-router-dom';
import { FiBell, FiUser, FiMenu, FiMoon, FiSun, FiInfo, FiCheck } from 'react-icons/fi';
import DateTimeWidget from './DateTimeWidget';
import { getAnnouncements } from '../services/firestore';

export default function Navbar({ onMenuClick }) {
  const { userData } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [announcements, setAnnouncements] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const data = await getAnnouncements();
        // Take top 3 for dropdown
        const recent = data.slice(0, 3);
        setAnnouncements(recent);
        
        // Calculate unread
        const seenIds = JSON.parse(localStorage.getItem('seenAnnouncements') || '[]');
        const unread = recent.filter(a => !seenIds.includes(a.id)).length;
        setUnreadCount(unread);
      } catch (error) {
        console.error("Failed to load notifications", error);
      }
    };
    fetchNews();
  }, []);

  // Handle clicking outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const handleToggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
    if (!isDropdownOpen && unreadCount > 0) {
      // Mark as read when opening
      const seenIds = JSON.parse(localStorage.getItem('seenAnnouncements') || '[]');
      const newSeenIds = [...new Set([...seenIds, ...announcements.map(a => a.id)])];
      localStorage.setItem('seenAnnouncements', JSON.stringify(newSeenIds));
      setUnreadCount(0);
    }
  };

  const handleAnnouncementClick = (id) => {
    setIsDropdownOpen(false);
    navigate('/announcements');
  };

  return (
    <header className="h-20 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 z-30 relative transition-colors duration-300">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="p-2 -mr-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 lg:hidden rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Open menu"
        >
          <FiMenu className="text-2xl" />
        </button>
        <div className="hidden md:block">
          <DateTimeWidget />
        </div>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-4">
        <button 
          onClick={toggleTheme}
          className="p-2.5 text-slate-400 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          title={theme === 'dark' ? 'حالت روز' : 'حالت شب'}
          aria-label={theme === 'dark' ? 'حالت روز' : 'حالت شب'}
        >
          {theme === 'dark' ? <FiSun className="text-xl" /> : <FiMoon className="text-xl" />}
        </button>

        <div className="relative" ref={dropdownRef}>
          <button 
             onClick={handleToggleDropdown}
             className="relative p-2.5 text-slate-400 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none cursor-pointer"
             aria-label="اعلان‌ها"
          >
            <FiBell className="text-xl" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 border-2 border-white dark:border-slate-950"></span>
              </span>
            )}
          </button>
          
          {/* Dropdown Popover */}
          <div 
            className={`fixed top-20 left-4 right-4 sm:absolute sm:top-auto sm:left-0 sm:right-auto sm:mt-2 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl dark:shadow-black/40 border border-slate-200 dark:border-slate-800 overflow-hidden transition-all origin-top sm:origin-top-left z-50 ${
              isDropdownOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'
            }`}
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">اعلان‌ها</h3>
              {unreadCount > 0 && (
                <span className="text-sm font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                  {unreadCount} جدید
                </span>
              )}
            </div>
            
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
              {announcements.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  اعلانی برای نمایش وجود ندارد.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {announcements.map(announcement => (
                    <button 
                      key={announcement.id}
                      onClick={() => handleAnnouncementClick(announcement.id)}
                      className="w-full text-right p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-3 group focus:outline-none"
                    >
                      <div className="shrink-0 h-6 mt-1 text-blue-500 bg-blue-50 dark:bg-blue-900/20 p-1.5 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                        <FiInfo className="text-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{announcement.title}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{announcement.content}</p>
                        <p className="text-sm font-medium text-slate-400 dark:text-slate-400 mt-2">
                          {new Date(announcement.createdAt).toLocaleDateString('fa-IR')}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <Link 
                to="/announcements" 
                onClick={() => setIsDropdownOpen(false)}
                className="block text-center text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                مشاهده همه اطلاعیه‌ها
              </Link>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 pr-2 sm:pr-4 border-r border-slate-200 dark:border-slate-800">
          <div className="w-11 h-11 rounded-full bg-blue-50 dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-slate-700 shadow-sm transition-colors">
            <FiUser className="text-xl" />
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {userData?.firstName} {userData?.lastName}
            </p>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              {userData?.role === 'admin' ? 'مدیر سیستم' : userData?.role === 'staff' ? 'کارمند آموزش' : 'دانشجو'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
