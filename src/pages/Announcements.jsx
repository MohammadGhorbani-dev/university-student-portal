import { handleFirebaseError, withRetry } from '../utils/errorHandler';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../services/firestore';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';
import { FiInfo, FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';

export default function Announcements() {
  const { userData } = useAuth();
  const isAdminOrStaff = userData?.role === 'admin' || userData?.role === 'staff';

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null, title: '', message: '' });
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm();

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await withRetry(getAnnouncements);
      setAnnouncements(data);
    } catch (err) {
      setError(handleFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const onSubmit = async (data) => {
    try {
      if (editingAnnouncement) {
        await updateAnnouncement(editingAnnouncement.id, data);
        toast.success('اطلاعیه با موفقیت ویرایش شد');
      } else {
        await createAnnouncement(data);
        toast.success('اطلاعیه جدید با موفقیت ثبت شد');
      }
      setShowAddForm(false);
      setEditingAnnouncement(null);
      reset();
      fetchAnnouncements();
    } catch (error) {
      toast.error(handleFirebaseError(error));
    }
  };

  const handleEditClick = (item, e) => {
    e.stopPropagation();
    setEditingAnnouncement(item);
    setValue('title', item.title);
    setValue('content', item.content);
    setShowAddForm(true);
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: 'حذف اطلاعیه',
      message: 'آیا از حذف این اطلاعیه اطمینان دارید؟',
      action: async () => {
        try {
          await deleteAnnouncement(id);
          toast.success('اطلاعیه با موفقیت حذف شد');
          fetchAnnouncements();
        } catch (error) {
          toast.error(handleFirebaseError(error));
        }
      }
    });
  };

  const handleCardClick = (item) => {
    setSelectedAnnouncement(item);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-slate-200 dark:border-slate-700 pb-6 gap-4">
        <div>
          <span className="text-blue-600 font-mono text-sm tracking-[0.3em] uppercase mb-2 block">اخبار</span>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-slate-50  leading-none">اطلاعیه‌های دانشگاه</h1>
        </div>
        {isAdminOrStaff && (
          <button
            onClick={() => {
              setEditingAnnouncement(null);
              reset();
              setShowAddForm(true);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
          >
            <FiPlus />
            افزودن اطلاعیه
          </button>
        )}
      </div>

      {isAdminOrStaff && showAddForm && (
        <Card className="border-blue-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">
              {editingAnnouncement ? 'ویرایش اطلاعیه' : 'ایجاد اطلاعیه جدید'}
            </h3>
            <button onClick={() => setShowAddForm(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-50">
              <FiX className="text-xl" />
            </button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase  mb-2">عنوان اطلاعیه</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:border-blue-500 focus:ring-blue-500 text-sm"
                {...register('title', { required: 'عنوان الزامی است' })}
              />
              {errors.title && <span className="text-red-500 dark:text-red-400 text-sm">{errors.title.message}</span>}
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase  mb-2">متن اطلاعیه</label>
              <textarea
                rows="5"
                className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:border-blue-500 focus:ring-blue-500 text-sm resize-none"
                {...register('content', { required: 'متن اطلاعیه الزامی است' })}
              ></textarea>
              {errors.content && <span className="text-red-500 dark:text-red-400 text-sm">{errors.content.message}</span>}
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'در حال ثبت...' : 'ذخیره اطلاعیه'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchAnnouncements} />
      ) : announcements.length === 0 ? (
        <EmptyState message="هیچ اطلاعیه‌ای وجود ندارد" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {announcements.map((item) => (
            <Card hoverable 
              key={item.id} 
              className="hover:border-blue-200 transition-colors cursor-pointer flex flex-col h-full"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCardClick(item);
                }
              }}
              onClick={() => handleCardClick(item)}
            >
              <div className="flex gap-4 items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                  <FiInfo className="text-xl" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 leading-tight line-clamp-2">{item.title}</h3>
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed line-clamp-3 mb-4 flex-1">
                {item.content}
              </p>
              
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-200 dark:border-slate-700">
                {item.createdAt ? (
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-mono ">
                    {new Date(item.createdAt).toLocaleDateString('fa-IR')}
                  </p>
                ) : <span />}
                
                {isAdminOrStaff && (
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => handleEditClick(item, e)}
                      className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-50 hover:bg-blue-50 rounded transition-colors"
                    >
                      <FiEdit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* News Details Modal */}      
      <Modal
        isOpen={!!selectedAnnouncement}
        onClose={() => setSelectedAnnouncement(null)}
        title="جزئیات اطلاعیه"
        maxWidth="max-w-2xl"
        closeClassName="md:hidden text-red-500 hover:text-red-700 bg-red-50 dark:bg-red-900/20 p-2 rounded-xl transition-colors"
      >
        {selectedAnnouncement && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-50 leading-tight flex-1 whitespace-normal break-words">
                {selectedAnnouncement.title}
              </h1>
              {selectedAnnouncement.createdAt && (
                <p className="text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg whitespace-nowrap text-right shrink-0">
                  {new Date(selectedAnnouncement.createdAt).toLocaleDateString('fa-IR')}
                </p>
              )}
            </div>
            <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap break-words">
                {selectedAnnouncement.content}
              </p>
            </div>
            <div className="hidden md:flex justify-end pt-4">
              <button 
                onClick={() => setSelectedAnnouncement(null)}
                className="px-6 py-2.5 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-50 font-bold rounded-lg text-sm transition-colors"
              >
                بستن
              </button>
            </div>
          </div>
        )}
      </Modal>

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
