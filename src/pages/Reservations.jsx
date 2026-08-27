import { handleFirebaseError, withRetry } from '../utils/errorHandler';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { FiCalendar, FiClock, FiUsers, FiPlus, FiTrash2, FiEdit2, FiCheck, FiX, FiSearch, FiFilter } from 'react-icons/fi';
import Card from '../components/ui/Card';
import Modal from "../components/ui/Modal";
import ConfirmModal from '../components/ui/ConfirmModal';
import {
  getReservationSlots,
  createReservationSlot,
  updateReservationSlot,
  deleteReservationSlot,
  getStudentReservations,
  getAllStudentReservations,
  reserveSlot,
  cancelStudentReservation
} from '../services/firestore';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Reservations() {
  const { userData, currentUser } = useAuth();
  const isAdminOrStaff = userData?.role === 'admin' || userData?.role === 'staff';
  
  const [activeTab, setActiveTab] = useState(isAdminOrStaff ? 'manage' : 'available');
  const [slots, setSlots] = useState([]);
  const [myReservations, setMyReservations] = useState([]);
  const [allReservations, setAllReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Admin form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null, title: '', message: '' });
  const [editingSlot, setEditingSlot] = useState(null);

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const slotsData = await withRetry(getReservationSlots);
      setSlots(slotsData);
      
      if (isAdminOrStaff) {
        const historyData = await withRetry(getAllStudentReservations);
        setAllReservations(historyData);
      } else {
        const myResData = await withRetry(() => getStudentReservations(currentUser.uid));
        setMyReservations(myResData);
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
  const onSubmitSlot = async (data) => {
    try {
      const payload = {
        title: data.title,
        category: data.category,
        date: data.date,
        time: data.time,
        capacity: parseInt(data.capacity),
        status: data.status || 'active'
      };

      if (editingSlot) {
        await updateReservationSlot(editingSlot.id, payload);
        toast.success('رزرو با موفقیت ویرایش شد');
      } else {
        await createReservationSlot(payload);
        toast.success('رزرو جدید با موفقیت ایجاد شد');
      }
      setShowAddForm(false);
      setEditingSlot(null);
      reset();
      loadData();
    } catch (error) {
      toast.error(handleFirebaseError(error));
    }
  };

  const handleEditClick = (slot) => {
    setEditingSlot(slot);
    setValue('title', slot.title);
    setValue('category', slot.category);
    setValue('date', slot.date);
    setValue('time', slot.time);
    setValue('capacity', slot.capacity);
    setValue('status', slot.status);
    setShowAddForm(true);
  };

  const handleDeleteSlot = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'حذف رزرو',
      message: 'آیا از حذف این مورد اطمینان دارید؟',
      action: async () => {
        try {
          await deleteReservationSlot(id);
          toast.success('رزرو حذف شد');
          loadData();
        } catch (error) {
          toast.error(handleFirebaseError(error));
        }
      }
    });
  };

  const toggleSlotStatus = async (slot) => {
    try {
      const newStatus = slot.status === 'active' ? 'inactive' : 'active';
      await updateReservationSlot(slot.id, { status: newStatus });
      toast.success('وضعیت تغییر یافت');
      loadData();
    } catch (error) {
      toast.error(handleFirebaseError(error));
    }
  };

  // --- Student Handlers ---
  const handleReserve = (slot) => {
    setConfirmModal({
      isOpen: true,
      title: 'تأیید رزرو',
      message: `آیا مایل به رزرو "${slot.title}" هستید؟`,
      action: async () => {
        try {
          await reserveSlot(slot.id, currentUser.uid, slot);
          toast.success('با موفقیت رزرو شد');
          loadData();
        } catch (error) {
          toast.error(handleFirebaseError(error));
        }
      }
    });
  };

  const handleCancelReservation = (reservation) => {
    setConfirmModal({
      isOpen: true,
      title: 'لغو رزرو',
      message: 'آیا از لغو این رزرو اطمینان دارید؟',
      action: async () => {
        try {
          await cancelStudentReservation(reservation.id, reservation.slotId);
          toast.success('رزرو لغو شد');
          loadData();
        } catch (error) {
          toast.error(handleFirebaseError(error));
        }
      }
    });
  };

  // --- Filter & Search ---
  const filterSlots = (list) => {
    const searchLower = searchQuery.toLowerCase();
    return list.filter(item => {
      const matchCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchSearch = (item.title || '').toLowerCase().includes(searchLower) || (item.date || '').includes(searchLower);
      return matchCategory && matchSearch;
    });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="border-b-2 border-slate-200 dark:border-slate-700 pb-6">
        <span className="text-indigo-600 font-mono text-sm tracking-[0.3em] uppercase mb-2 block">سیستم رزرواسیون</span>
        <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-slate-50  leading-none">سامانه رزرو</h1>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700">
        {isAdminOrStaff ? (
          <>
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'manage' ? 'border-[#9D72FF] text-indigo-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50'}`}
            >
              مدیریت رزروها
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'history' ? 'border-[#9D72FF] text-indigo-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50'}`}
            >
              تاریخچه کل رزروها
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('available')}
              className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'available' ? 'border-[#9D72FF] text-indigo-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50'}`}
            >
              رزروهای موجود
            </button>
            <button
              onClick={() => setActiveTab('my_reservations')}
              className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'my_reservations' ? 'border-[#9D72FF] text-indigo-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50'}`}
            >
              رزروهای من
            </button>
          </>
        )}
      </div>

      {/* Filters */}
      {(activeTab === 'manage' || activeTab === 'available') && (
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <FiSearch className="text-slate-500 dark:text-slate-400" />
            <input
              type="text"
              placeholder="جستجو..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-0 text-sm w-full sm:w-64"
            />
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <FiFilter className="text-slate-500 dark:text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#9D72FF]"
              >
                <option value="all">همه دسته‌بندی‌ها</option>
                <option value="study_room">اتاق مطالعه</option>
                <option value="cafeteria">سلف سرویس</option>
              </select>
            </div>
            {isAdminOrStaff && activeTab === 'manage' && (
              <button
                onClick={() => {
                  setEditingSlot(null);
                  reset({ status: 'active' });
                  setShowAddForm(true);
                }}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors whitespace-nowrap"
              >
                <FiPlus />
                افزودن مورد جدید
              </button>
            )}
          </div>
        </div>
      )}

      {/* Admin Form Modal */}
      <Modal
        isOpen={isAdminOrStaff && showAddForm && activeTab === 'manage'}
        onClose={() => setShowAddForm(false)}
        title={editingSlot ? 'ویرایش رزرو' : 'ایجاد رزرو جدید'}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSubmit(onSubmitSlot)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">عنوان</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:border-[#9D72FF] text-sm"
                {...register('title', { required: 'الزامی است' })}
              />
              {errors.title && <span className="text-red-500 dark:text-red-400 text-sm">{errors.title.message}</span>}
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">دسته‌بندی</label>
              <select
                className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:border-[#9D72FF] text-sm"
                {...register('category', { required: 'الزامی است' })}
              >
                <option value="study_room">اتاق مطالعه</option>
                <option value="cafeteria">سلف سرویس</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">تاریخ</label>
              <input
                type="date"
                className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:border-[#9D72FF] text-sm [color-scheme:dark]"
                {...register('date', { required: 'الزامی است' })}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">زمان</label>
              <input
                type="time"
                className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:border-[#9D72FF] text-sm [color-scheme:dark]"
                {...register('time', { required: 'الزامی است' })}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">ظرفیت کل</label>
              <input
                type="number"
                min="1"
                className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:border-[#9D72FF] text-sm"
                {...register('capacity', { required: 'الزامی است', min: 1 })}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">وضعیت</label>
              <select
                className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:border-[#9D72FF] text-sm"
                {...register('status')}
              >
                <option value="active">فعال</option>
                <option value="inactive">غیرفعال</option>
              </select>
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'در حال ثبت...' : 'ذخیره'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Grid Content */}
      {(activeTab === 'manage' || activeTab === 'available') && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filterSlots(slots).length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400">
              موردی یافت نشد.
            </div>
          ) : (
            filterSlots(slots).map((slot) => {
              const isFull = slot.reservedCount >= slot.capacity;
              const isActive = slot.status === 'active';
              
              // Only active slots shown to students
              if (!isAdminOrStaff && (!isActive || isFull)) return null;

              return (
                <Card key={slot.id} className="flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className={`text-sm font-mono  uppercase px-2 py-1 rounded border mb-2 inline-block
                        ${slot.category === 'study_room' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}
                      >
                        {slot.category === 'study_room' ? 'اتاق مطالعه' : 'سلف سرویس'}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">{slot.title}</h3>
                    </div>
                    {isAdminOrStaff && (
                      <span className={`text-sm font-bold px-2 py-1 rounded ${isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {isActive ? 'فعال' : 'غیرفعال'}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-3 mb-6 flex-1">
                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                      <FiCalendar className="text-indigo-600" />
                      <span>{slot.date}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                      <FiClock className="text-indigo-600" />
                      <span>{slot.time}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                      <FiUsers className="text-indigo-600" />
                      <span>ظرفیت: {slot.reservedCount} / {slot.capacity}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                    {isAdminOrStaff ? (
                      <>
                        <button
                          onClick={() => handleEditClick(slot)}
                          className="flex-1 py-2 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-50 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-sm font-bold flex items-center justify-center gap-2"
                        >
                          <FiEdit2 /> ویرایش
                        </button>
                        <button
                          onClick={() => toggleSlotStatus(slot)}
                          className="flex-1 py-2 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-50 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-sm font-bold flex items-center justify-center gap-2"
                        >
                          <FiCheck /> تغییر وضعیت
                        </button>
                        <button
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="px-3 py-2 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-colors"
                        >
                          <FiTrash2 />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleReserve(slot)}
                        className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors"
                      >
                        رزرو این مورد
                      </button>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Student My Reservations */}
      {!isAdminOrStaff && activeTab === 'my_reservations' && (
        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right text-slate-700 dark:text-slate-300">
              <thead className="text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/40 uppercase font-mono  border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4">عنوان</th>
                  <th className="px-6 py-4">دسته‌بندی</th>
                  <th className="px-6 py-4">تاریخ و زمان</th>
                  <th className="px-6 py-4">وضعیت</th>
                  <th className="px-6 py-4 text-left">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {myReservations.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      شما تاکنون رزروی ثبت نکردهاید.
                    </td>
                  </tr>
                ) : (
                  myReservations.map((res) => (
                    <tr key={res.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-50">{res.title}</td>
                      <td className="px-6 py-4">
                        {res.category === 'study_room' ? 'اتاق مطالعه' : 'سلف سرویس'}
                      </td>
                      <td className="px-6 py-4 font-mono">{res.date} - {res.time}</td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-bold px-2 py-1 rounded ${res.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          {res.status === 'active' ? 'فعال' : 'لغو شده'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-left">
                        {res.status === 'active' && (
                          <button
                            onClick={() => handleCancelReservation(res)}
                            className="text-sm font-bold text-red-400 hover:text-red-300 transition-colors"
                          >
                            لغو رزرو
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin All Reservations History */}
      {isAdminOrStaff && activeTab === 'history' && (
        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right text-slate-700 dark:text-slate-300">
              <thead className="text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/40 uppercase font-mono  border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4">عنوان رزرو</th>
                  <th className="px-6 py-4">دسته‌بندی</th>
                  <th className="px-6 py-4">تاریخ و زمان</th>
                  <th className="px-6 py-4">کاربر (UID)</th>
                  <th className="px-6 py-4">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {allReservations.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      هیچ سابقه‌ای یافت نشد.
                    </td>
                  </tr>
                ) : (
                  allReservations.map((res) => (
                    <tr key={res.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-50">{res.title}</td>
                      <td className="px-6 py-4">
                        {res.category === 'study_room' ? 'اتاق مطالعه' : 'سلف سرویس'}
                      </td>
                      <td className="px-6 py-4 font-mono">{res.date} - {res.time}</td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-500 dark:text-slate-400">
                        {res.studentUid.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-bold px-2 py-1 rounded ${res.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          {res.status === 'active' ? 'فعال' : 'لغو شده'}
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

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.action || (() => {})}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </div>
  );
}
