import { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { curriculumData } from '../data/curriculum';
import { FiBook, FiLock, FiCheckCircle, FiClock, FiArrowLeft, FiAlertCircle, FiChevronDown, FiPlus } from 'react-icons/fi';
import EmptyState from '../components/ui/EmptyState';
import { db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function Curriculum() {
  const { currentUser, userData } = useAuth();
  const defaultMajor = userData?.major || "مهندسی کامپیوتر";
  const [selectedMajor, setSelectedMajor] = useState(defaultMajor);
  const [myCourses, setMyCourses] = useState([]);
  const [highlightedCourse, setHighlightedCourse] = useState(null);

  // References for scrolling
  const courseRefs = useRef({});

  // Ensure selectedMajor is valid or default to the first one available
  useEffect(() => {
    if (!curriculumData.find(c => c.major === selectedMajor)) {
      if (curriculumData.length > 0) {
        setSelectedMajor(curriculumData[0].major);
      }
    }
  }, [selectedMajor]);

  useEffect(() => {
    const fetchMyCourses = async () => {
      if (!currentUser) return;
      try {
        const q = query(
          collection(db, 'course_selections'),
          where('studentUid', '==', currentUser.uid),
          where('status', '==', 'active')
        );
        const querySnapshot = await getDocs(q);
        const courses = querySnapshot.docs.map(doc => doc.data());
        setMyCourses(courses);
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };
    fetchMyCourses();
  }, [currentUser]);

  const curriculum = useMemo(() => {
    return curriculumData.find(c => c.major === selectedMajor);
  }, [selectedMajor]);

  const handleScrollToCourse = (code) => {
    let el = courseRefs.current['desktop-' + code];
    if (el && el.offsetParent === null) {
      el = courseRefs.current['mobile-' + code];
    }

    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedCourse(code);
      setTimeout(() => {
        setHighlightedCourse(null);
      }, 3000);
    } else {
      toast.error('درس مورد نظر در چارت فعلی یافت نشد.');
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'پایه': return 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400';
      case 'اصلی': return 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400';
      case 'عمومی': return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-400';
      default: return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400';
    }
  };

  if (!curriculum && curriculumData.length === 0) {
    return (
      <div className="max-w-7xl mx-auto pb-10">
        <EmptyState 
          icon={<FiBook className="text-4xl" />}
          message="هیچ چارت تحصیلی در سامانه یافت نشد." 
        />
      </div>
    );
  }

  const renderCourseCard = (course, isMobile = false) => {
    const isTaken = myCourses.some(c => c.code === course.code);
    
    // Simple status determination based on current active courses
    // Since we don't have historical completion, we'll just indicate "در حال اخذ" or "قابل اخذ"
    const statusText = isTaken ? 'در حال اخذ' : 'قابل اخذ';
    const statusClasses = isTaken 
      ? 'border-blue-500 ring-2 ring-blue-500/50 bg-blue-50/30 dark:bg-blue-900/10' 
      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800';

    const highlightClasses = highlightedCourse === course.code 
      ? 'ring-4 ring-amber-400/70 border-amber-400 dark:ring-amber-500/70' 
      : '';

    return (
      <div 
        key={course.code}
        ref={el => courseRefs.current[(isMobile ? 'mobile-' : 'desktop-') + course.code] = el}
        className={`p-5 rounded-2xl border transition-all duration-500 shadow-sm flex flex-col ${statusClasses} ${highlightClasses} ${isMobile ? '' : 'w-full max-w-sm'}`}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex flex-col gap-1 pr-2">
            <h3 className="font-bold text-slate-900 dark:text-slate-50 text-lg leading-tight">{course.title}</h3>
            {isTaken && (
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <FiCheckCircle /> در حال اخذ
              </span>
            )}
          </div>
          <span className={`text-sm font-bold px-2.5 py-1 rounded-md border shrink-0 ${getCategoryColor(course.category)}`}>
            {course.category}
          </span>
        </div>
        
        <div className="flex items-center gap-4 text-sm font-mono text-slate-500 dark:text-slate-400 mb-4">
          <span>کد: {course.code}</span>
          <span>واحد: {course.credits}</span>
        </div>
        
        <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-700/50 space-y-2">
          {/* Prerequisites */}
          {course.prerequisites && course.prerequisites.length > 0 ? (
            <div className="flex items-start gap-1.5 text-sm text-slate-600 dark:text-slate-400">
              <FiArrowLeft className="shrink-0 mt-0.5 text-amber-500" />
              <div className="leading-relaxed">
                <span className="font-bold">پیشنیاز: </span>
                {course.prerequisites.map((p, i) => {
                  const preReqCourse = curriculum.semesters.flatMap(s => s.courses).find(c => c.code === p);
                  const name = preReqCourse ? preReqCourse.title : p;
                  return (
                    <span key={p}>
                      <button 
                        onClick={() => handleScrollToCourse(p)}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium mx-1 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                      >
                        {name}
                      </button>
                      {i < course.prerequisites.length - 1 ? '، ' : ''}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Corequisites */}
          {course.corequisites && course.corequisites.length > 0 ? (
            <div className="flex items-start gap-1.5 text-sm text-slate-600 dark:text-slate-400">
              <FiPlus className="shrink-0 mt-0.5 text-purple-500" />
              <div className="leading-relaxed">
                <span className="font-bold">همنیاز: </span>
                {course.corequisites.map((c, i) => {
                  const coReqCourse = curriculum.semesters.flatMap(s => s.courses).find(cItem => cItem.code === c);
                  const name = coReqCourse ? coReqCourse.title : c;
                  return (
                    <span key={c}>
                      <button 
                        onClick={() => handleScrollToCourse(c)}
                        className="text-purple-600 dark:text-purple-400 hover:underline font-medium mx-1 focus:outline-none focus:ring-1 focus:ring-purple-500 rounded"
                      >
                        {name}
                      </button>
                      {i < course.corequisites.length - 1 ? '، ' : ''}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}

          {(!course.prerequisites || course.prerequisites.length === 0) && (!course.corequisites || course.corequisites.length === 0) && (
            <span className="text-sm text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
              <FiCheckCircle className="text-emerald-500" /> بدون پیشنیاز / همنیاز
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="border-b border-slate-200 dark:border-slate-700 pb-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="text-blue-600 font-bold text-sm mb-2 block">چارت تحصیلی</span>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-50 leading-tight">نقشه راه تحصیلی</h1>
        </div>
        
        <div className="flex flex-col gap-2 min-w-[240px]">
          <label htmlFor="major-select" className="text-sm font-bold text-slate-700 dark:text-slate-300">
            رشته تحصیلی:
          </label>
          <div className="relative">
            <select
              id="major-select"
              value={selectedMajor}
              onChange={(e) => setSelectedMajor(e.target.value)}
              className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-50 text-sm rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500/50 shadow-sm"
            >
              {curriculumData.map(c => (
                <option key={c.major} value={c.major}>{c.major}</option>
              ))}
            </select>
            <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {!curriculum ? (
        <EmptyState 
          icon={<FiBook className="text-4xl" />}
          message="اطلاعاتی برای این رشته یافت نشد." 
        />
      ) : (
        <>
          {/* Desktop view */}
          <div className="space-y-12 relative before:absolute before:inset-y-0 before:right-[50%] before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700 hidden lg:block">
            {curriculum.semesters.map((semester) => (
              <div key={semester.semester} className="relative z-10 flex flex-col items-center">
                <div className="bg-white dark:bg-slate-800 border-2 border-blue-500 dark:border-blue-600 text-blue-600 dark:text-blue-400 px-6 py-2 rounded-full font-bold shadow-sm mb-6 flex items-center gap-2">
                  <FiClock /> {semester.title}
                </div>
                
                <div className="grid grid-cols-2 gap-8 w-full">
                  {semester.courses.map((course, idx) => (
                    <div key={course.code} className={`${idx % 2 === 0 ? 'col-start-1 mr-auto' : 'col-start-2 ml-auto'} w-full max-w-sm`}>
                      {renderCourseCard(course, false)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile view */}
          <div className="lg:hidden space-y-8">
            {curriculum.semesters.map((semester) => (
              <div key={semester.semester} className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-0.5 flex-1 bg-slate-200 dark:bg-slate-700"></div>
                  <div className="bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2">
                    <FiClock /> {semester.title}
                  </div>
                  <div className="h-0.5 flex-1 bg-slate-200 dark:bg-slate-700"></div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {semester.courses.map((course) => renderCourseCard(course, true))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
