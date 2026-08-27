import { handleFirebaseError, withRetry } from '../utils/errorHandler';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { FiSearch, FiFilter, FiPlus, FiEdit2, FiTrash2, FiUsers, FiClock, FiX } from 'react-icons/fi';
import { isSemesterPast, getSemesterTitle } from '../utils/semesterUtils';
import Card from '../components/ui/Card';
import ConfirmModal from '../components/ui/ConfirmModal';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getStudentCourses,
  getAllCourseSelections,
  registerCourse,
  dropCourse
} from '../services/firestore';

export default function Courses() {
  const { userData, currentUser } = useAuth();
  const isAdminOrStaff = userData?.role === 'admin' || userData?.role === 'staff';
  
  const getSemesterCredits = (semesterId) => {
    if (!semesterId) return 0;
    return myCourses
      .filter(c => c.semester === semesterId)
      .reduce((sum, c) => sum + (c.credits || 0), 0);
  };
  
    const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({});
  const showConfirm = (title, message, onConfirm) => {
    setModalConfig({ title, message, onConfirm });
    setModalOpen(true);
  };

  const [activeTab, setActiveTab] = useState(isAdminOrStaff ? 'manage' : 'available');
  const [courses, setCourses] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [allSelections, setAllSelections] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [semesterFilter, setSemesterFilter] = useState('all');
  
  // Admin form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const coursesData = await withRetry(getCourses);
      setCourses(coursesData);
      
      if (isAdminOrStaff) {
        const historyData = await withRetry(getAllCourseSelections);
        setAllSelections(historyData);
      } else {
        const myCoursesData = await withRetry(() => getStudentCourses(currentUser.uid));
        setMyCourses(myCoursesData);
      }
    } catch (error) {
      toast.error(handleFirebaseError(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, isAdminOrStaff]);

  // --- Admin Handlers ---
  const onSubmitCourse = async (data) => {
    try {
      const payload = {
        title: data.title,
        code: data.code,
        credits: parseInt(data.credits),
        capacity: parseInt(data.capacity),
        professor: data.professor,
        department: data.department,
        semester: data.semester,
        day: data.day,
        startTime: data.startTime,
        endTime: data.endTime
      };

      if (editingCourse) {
        await updateCourse(editingCourse.id, payload);
        toast.success('درس با موفقیت ویرایش شد');
      } else {
        await createCourse(payload);
        toast.success('درس جدید با موفقیت ایجاد شد');
      }
      setShowAddForm(false);
      setEditingCourse(null);
      reset();
      loadData();
    } catch (error) {
      toast.error(handleFirebaseError(error));
    }
  };

  const handleEditClick = (course) => {
    setEditingCourse(course);
    setValue('title', course.title);
    setValue('code', course.code);
    setValue('credits', course.credits);
    setValue('capacity', course.capacity);
    setValue('professor', course.professor);
    setValue('department', course.department);
    setValue('semester', course.semester);
    setValue('day', course.day || '');
    setValue('startTime', course.startTime || '');
    setValue('endTime', course.endTime || '');
    setShowAddForm(true);
  };

  const handleDeleteCourse = async (id) => {
    showConfirm('حذف درس', 'آیا از حذف این درس اطمینان دارید؟', async () => {
      try {
        await deleteCourse(id);
        toast.success('درس با موفقیت حذف شد');
        loadData();
      } catch (error) {
        toast.error(handleFirebaseError(error));
      }
    });
  };

  // --- Student Handlers ---
  const handleRegisterCourse = async (course) => {
    showConfirm("اخذ درس", "آیا از اخذ این درس اطمینان دارید؟", async () => {
      try {
        await registerCourse(course.id, currentUser.uid, course);
        toast.success('درس با موفقیت اخذ شد');
        loadData();
      } catch (error) {
        toast.error(handleFirebaseError(error));
      }
    });
  };

  const handleDropCourse = async (selection) => {
    showConfirm("حذف درس", "آیا از حذف این درس اطمینان دارید؟", async () => {
      try {
        await dropCourse(selection.id, selection.courseId, selection.semester);
        toast.success('درس با موفقیت حذف شد');
        loadData();
      } catch (error) {
        toast.error(handleFirebaseError(error));
      }
    });
  };

  // --- Filter & Search ---
  const filterCourses = (list) => {
    const searchLower = searchQuery.toLowerCase();
    return list.filter(item => {
      const matchDept = departmentFilter === 'all' || item.department === departmentFilter;
      const matchSemester = semesterFilter === 'all' || item.semester === semesterFilter;
      const matchSearch = (item.title || '').toLowerCase().includes(searchLower) || (item.code || '').toLowerCase().includes(searchLower);
      return matchDept && matchSemester && matchSearch;
    });
  };

  
  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <ConfirmModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={modalConfig.onConfirm}
      />
      <div className="border-b-2 border-slate-200 dark:border-slate-700 pb-6">
        <span className="text-emerald-600 font-mono text-sm tracking-[0.3em] uppercase mb-2 block">انتخاب واحد</span>
        <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-slate-50  leading-none">انتخاب واحد</h1>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700">
        {isAdminOrStaff ? (
          <>
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'manage' ? 'border-[#27C93F] text-emerald-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-50'}`}
            >
              مدیریت دروس
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'history' ? 'border-[#27C93F] text-emerald-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-50'}`}
            >
              همه انتخاب واحدها
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('available')}
              className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'available' ? 'border-[#27C93F] text-emerald-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-50'}`}
            >
              دروس ارائه شده
            </button>
            <button
              onClick={() => setActiveTab('my_courses')}
              className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'my_courses' ? 'border-[#27C93F] text-emerald-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-50'}`}
            >
              دروس اخذ شده (انتخاب واحد)
            </button>
          </>
        )}
      </div>

      {/* Filters */}
      {(activeTab === 'manage' || activeTab === 'available') && (
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex flex-1 items-center gap-2 w-full">
            <FiSearch className="text-slate-500 dark:text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="جستجوی نام یا کد درس..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-0 text-sm w-full md:w-64"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <FiFilter className="text-slate-500 dark:text-slate-400 shrink-0" />
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#27C93F]"
              >
                <option value="all">همه دانشکده‌ها</option>
                <option value="engineering">فنی و مهندسی</option>
                <option value="science">علوم پایه</option>
                <option value="humanities">علوم انسانی</option>
                <option value="art">هنر و معماری</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                className="bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#27C93F]"
              >
                <option value="all">همه ترم‌ها</option>
                <option value="fall_2026">پاییز ۱۴۰۵</option>
                <option value="spring_2027">بهار ۱۴۰۶</option>
              </select>
            </div>
            {isAdminOrStaff && activeTab === 'manage' && (
              <button
                onClick={() => {
                  setEditingCourse(null);
                  reset({ department: 'engineering', semester: 'fall_2026', credits: 3, capacity: 40 });
                  setShowAddForm(true);
                }}
                className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-600 transition-colors whitespace-nowrap"
              >
                <FiPlus />
                افزودن درس جدید
              </button>
            )}
          </div>
        </div>
      )}

      {/* Admin Form */}
      {isAdminOrStaff && showAddForm && activeTab === 'manage' && (
        <Card className="border-emerald-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">
              {editingCourse ? 'ویرایش درس' : 'ایجاد درس جدید'}
            </h3>
            <button onClick={() => setShowAddForm(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-50">
              <FiX className="text-xl" />
            </button>
          </div>
          <form onSubmit={handleSubmit(onSubmitCourse)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase  mb-2">عنوان درس</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:border-[#27C93F] text-sm"
                  {...register('title', { required: 'الزامی است' })}
                />
                {errors.title && <span className="text-red-500 dark:text-red-400 text-sm">{errors.title.message}</span>}
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase  mb-2">کد درس</label>
                <input
                  type="text"
                  dir="ltr"
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:border-[#27C93F] text-sm font-mono text-right md:text-left"
                  {...register('code', { required: 'الزامی است' })}
                />
                {errors.code && <span className="text-red-500 dark:text-red-400 text-sm">{errors.code.message}</span>}
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase  mb-2">استاد</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:border-[#27C93F] text-sm"
                  {...register('professor', { required: 'الزامی است' })}
                />
                {errors.professor && <span className="text-red-500 dark:text-red-400 text-sm">{errors.professor.message}</span>}
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase  mb-2">تعداد واحد</label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:border-[#27C93F] text-sm"
                  {...register('credits', { required: 'الزامی است', min: 1, max: 6 })}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase  mb-2">ظرفیت</label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:border-[#27C93F] text-sm"
                  {...register('capacity', { required: 'الزامی است', min: 1 })}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase  mb-2">دانشکده</label>
                <select
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:border-[#27C93F] text-sm"
                  {...register('department', { required: 'الزامی است' })}
                >
                  <option value="engineering">فنی و مهندسی</option>
                  <option value="science">علوم پایه</option>
                  <option value="humanities">علوم انسانی</option>
                  <option value="art">هنر و معماری</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase  mb-2">ترم تحصیلی</label>
                <select
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:border-[#27C93F] text-sm"
                  {...register('semester', { required: 'الزامی است' })}
                >
                  <option value="fall_2026">پاییز ۱۴۰۵</option>
                  <option value="spring_2027">بهار ۱۴۰۶</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase  mb-2">روز برگزاری</label>
                <select
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:border-[#27C93F] text-sm"
                  {...register('day', { required: 'الزامی است' })}
                >
                  <option value="">انتخاب کنید...</option>
                  <option value="شنبه">شنبه</option>
                  <option value="یکشنبه">یکشنبه</option>
                  <option value="دوشنبه">دوشنبه</option>
                  <option value="سه‌شنبه">سه‌شنبه</option>
                  <option value="چهارشنبه">چهارشنبه</option>
                  <option value="پنج‌شنبه">پنج‌شنبه</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase  mb-2">شروع کلاس</label>
                <input
                  type="time"
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:border-[#27C93F] text-sm font-mono"
                  {...register('startTime', { required: 'الزامی است' })}
                  dir="ltr"
                />
                {errors.startTime && <span className="text-red-500 dark:text-red-400 text-sm">{errors.startTime.message}</span>}
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase  mb-2">پایان کلاس</label>
                <input
                  type="time"
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:border-[#27C93F] text-sm font-mono"
                  {...register('endTime', { 
                    required: 'الزامی است',
                    validate: (value, formValues) => {
                      if (!formValues.startTime) return true;
                      return value > formValues.startTime || 'پایان کلاس باید بعد از شروع کلاس باشد';
                    }
                  })}
                  dir="ltr"
                />
                {errors.endTime && <span className="text-red-500 dark:text-red-400 text-sm">{errors.endTime.message}</span>}
              </div>
            </div>
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg font-bold text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'در حال ثبت...' : 'ذخیره'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Grid Content */}
      {(activeTab === 'manage' || activeTab === 'available') && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filterCourses(courses).length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400">
              درسی یافت نشد.
            </div>
          ) : (
            filterCourses(courses).map((course) => {
              const isFull = course.enrolledCount >= course.capacity;
              const isAlreadyRegistered = myCourses.some(mc => mc.courseId === course.id);
              const semCredits = course.semester ? getSemesterCredits(course.semester) : 0;
              const isInvalidSemester = !course.semester;
              const wouldExceedLimit = course.semester ? (semCredits + (course.credits || 0) > 20) : false;
              
              return (
                <Card key={course.id} className="flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-mono  uppercase px-2 py-1 rounded border bg-emerald-50 text-emerald-600 border-emerald-200">
                          {course.code}
                        </span>
                        <span className="text-sm font-mono  uppercase px-2 py-1 rounded border bg-slate-200 text-slate-600 dark:text-slate-400 border-zinc-700">
                          {course.credits} واحد
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">{course.title}</h3>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-6 flex-1">
                    <div className="flex justify-between text-sm border-b border-slate-200 dark:border-slate-700 pb-2">
                      <span className="text-slate-500 dark:text-slate-400">استاد:</span>
                      <span className="text-slate-700 dark:text-slate-300">{course.professor}</span>
                    </div>
                    <div className="flex justify-between text-sm border-b border-slate-200 dark:border-slate-700 pb-2">
                      <span className="text-slate-500 dark:text-slate-400">زمان کلاس:</span>
                      <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        {course.day ? `${course.day} (${course.startTime ? `${course.startTime} تا ${course.endTime}` : course.time || 'زمان نامشخص'})` : 'زمان نامشخص'}
                        <FiClock className="text-slate-500 dark:text-slate-400 text-sm" />
                      </span>
                    </div>
                    <div className="flex justify-between text-sm border-b border-slate-200 dark:border-slate-700 pb-2">
                      <span className="text-slate-500 dark:text-slate-400">دانشکده:</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {course.department === 'engineering' ? 'فنی و مهندسی' : 
                         course.department === 'science' ? 'علوم پایه' :
                         course.department === 'humanities' ? 'علوم انسانی' : 'هنر و معماری'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm pb-1">
                      <span className="text-slate-500 dark:text-slate-400">ظرفیت:</span>
                      <span className={`font-mono ${isFull ? 'text-red-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                        {course.enrolledCount} / {course.capacity}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                    {isAdminOrStaff ? (
                      <>
                        <button
                          onClick={() => handleEditClick(course)}
                          className="flex-1 py-2 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-50 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-sm font-bold flex items-center justify-center gap-2"
                        >
                          <FiEdit2 /> ویرایش
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(course.id)}
                          className="px-3 py-2 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-colors"
                        >
                          <FiTrash2 />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleRegisterCourse(course)}
                        disabled={isInvalidSemester || isFull || isAlreadyRegistered || wouldExceedLimit}
                        className="w-full py-2.5 bg-emerald-500 text-white rounded-lg font-bold text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isInvalidSemester ? 'ترم نامشخص' : isAlreadyRegistered ? 'اخذ شده' : isFull ? 'ظرفیت تکمیل' : wouldExceedLimit ? 'سقف مجاز' : 'اخذ درس'}
                      </button>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Student My Courses */}
      {!isAdminOrStaff && activeTab === 'my_courses' && (
        <div className="space-y-6">
          
          {Object.entries(
            myCourses.reduce((acc, course) => {
              const sem = course.semester || 'unknown_semester';
              if (!acc[sem]) acc[sem] = [];
              acc[sem].push(course);
              return acc;
            }, {})
          ).map(([semesterId, semCourses]) => {
            const semCredits = semCourses.reduce((sum, item) => sum + (item.credits || 0), 0);
            const isLimitReached = semCredits >= 20;
            return (
              <div key={semesterId} className="mb-10">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">{getSemesterTitle(semesterId)}</h2>
                  <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs font-bold">
                    {semCredits} / 20 واحد
                  </span>
                  {isLimitReached && (
                    <span className="px-3 py-1 bg-rose-100 text-rose-600 rounded-full text-xs font-bold">
                      سقف مجاز انتخاب واحد تکمیل است.
                    </span>
                  )}
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right text-slate-700 dark:text-slate-300">
                      <thead className="text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/40 uppercase font-mono border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-6 py-4">کد درس</th>
                          <th className="px-6 py-4">نام درس</th>
                          <th className="px-6 py-4">استاد</th>
                          <th className="px-6 py-4">تعداد واحد</th>
                          <th className="px-6 py-4 text-left">عملیات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {semCourses.map((course) => (
                          <tr key={course.id} className="hover:bg-slate-800 dark:bg-slate-800/[0.02] transition-colors">
                            <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-400">{course.code}</td>
                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-50">{course.title}</td>
                            <td className="px-6 py-4">{course.professor}</td>
                            <td className="px-6 py-4 font-mono font-bold text-emerald-600">{course.credits}</td>
                            <td className="px-6 py-4 text-left">
                              {!isSemesterPast(course.semester) ? (
                                <button
                                  onClick={() => handleDropCourse(course)}
                                  className="text-sm font-bold text-rose-500 hover:text-rose-600 transition-colors bg-rose-50 dark:bg-rose-500/10 px-3 py-1.5 rounded-lg whitespace-nowrap"
                                >
                                  حذف درس
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg whitespace-nowrap">ترم پایان یافته</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })}
          
          {myCourses.length === 0 && (
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center text-slate-500 dark:text-slate-400">
              شما تاکنون درسی اخذ نکردهاید.
            </div>
          )}

        </div>
      )}

      {/* Admin All Course Selections History */}
      {isAdminOrStaff && activeTab === 'history' && (
        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right text-slate-700 dark:text-slate-300">
              <thead className="text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/40 uppercase font-mono  border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4">نام درس</th>
                  <th className="px-6 py-4">کد درس</th>
                  <th className="px-6 py-4">دانشجو (UID)</th>
                  <th className="px-6 py-4">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {allSelections.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      هیچ سابقه‌ای یافت نشد.
                    </td>
                  </tr>
                ) : (
                  allSelections.map((sel) => (
                    <tr key={sel.id} className="hover:bg-slate-800 dark:bg-slate-800/[0.02] transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-50">{sel.title}</td>
                      <td className="px-6 py-4 font-mono">{sel.code}</td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-500 dark:text-slate-400">
                        {sel.studentUid.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-bold px-2 py-1 rounded ${sel.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          {sel.status === 'active' ? 'اخذ شده' : 'حذف شده'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
