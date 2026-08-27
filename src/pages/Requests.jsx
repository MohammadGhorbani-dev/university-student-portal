import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { getStudentRequests, getAllRequests, createRequest, updateRequestStatus } from '../services/firestore';
import { withRetry, handleFirebaseError } from '../utils/errorHandler';
import { formatSafely } from '../utils/dateUtils';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { FiFileText, FiClock, FiCheck, FiX, FiInfo } from 'react-icons/fi';

export default function Requests() {
  const { userData, currentUser } = useAuth();
  const isAdminOrStaff = userData?.role === 'admin' || userData?.role === 'staff';
  
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const loadRequests = async () => {
    try {
      setLoading(true);
      if (isAdminOrStaff) {
        const data = await withRetry(getAllRequests);
        setRequests(data);
      } else {
        const data = await withRetry(() => getStudentRequests(currentUser.uid));
        setRequests(data);
      }
    } catch (error) {
      toast.error(handleFirebaseError(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadRequests();
    }
  }, [currentUser, isAdminOrStaff]);

  const onSubmit = async (data) => {
    try {
      const payload = {
        title: data.title,
        category: data.category,
        description: data.description,
        studentUid: currentUser.uid,
        studentName: `${userData.firstName} ${userData.lastName}`,
        studentId: userData.studentId || '-'
      };
      
      await createRequest(payload);
      toast.success('درخواست با موفقیت ثبت شد');
      setShowForm(false);
      reset();
      loadRequests();
    } catch (error) {
      toast.error(handleFirebaseError(error));
    }
  };

  const handleCloseModal = () => {
    setSelectedRequest(null);
    setEditStatus('');
    setAdminResponse('');
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;
    
    try {
      setIsSaving(true);
      await updateRequestStatus(selectedRequest.id, editStatus, adminResponse);
      toast.success('تغییرات با موفقیت ذخیره شد');
      loadRequests();
      handleCloseModal();
    } catch (error) {
      toast.error(handleFirebaseError(error));
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'در انتظار بررسی': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'در حال بررسی': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'تأیید شده': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'رد شده': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-zinc-500/10 text-slate-600 dark:text-slate-400 border-zinc-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 border-slate-200 dark:border-slate-700 pb-6 gap-4">
        <div>
          <span className="text-amber-600 font-mono text-sm tracking-[0.3em] uppercase mb-2 block">امور اداری</span>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-slate-50  leading-none">درخواست‌ها</h1>
        </div>
        {!isAdminOrStaff && !selectedRequest && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-3 bg-amber-500 text-white rounded-lg font-bold text-sm hover:bg-amber-600 transition-colors"
          >
            {showForm ? 'انصراف' : 'ثبت درخواست جدید'}
          </button>
        )}
      </div>

      {showForm && !isAdminOrStaff && (
        <Card className="border-amber-200">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase  mb-2">عنوان درخواست</label>
                <input
                  type="text"
                  {...register('title', { required: 'الزامی است' })}
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:border-[#FFBD2E] text-sm"
                />
                {errors.title && <span className="text-red-500 dark:text-red-400 text-sm">{errors.title.message}</span>}
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase  mb-2">نوع درخواست</label>
                <select
                  {...register('category', { required: 'الزامی است' })}
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:border-[#FFBD2E] text-sm"
                >
                  <option value="">انتخاب کنید...</option>
                  <optgroup label="آموزشی">
                    <option value="درخواست مرخصی تحصیلی">درخواست مرخصی تحصیلی</option>
                    <option value="درخواست حذف ترم">درخواست حذف ترم</option>
                    <option value="درخواست گواهی اشتغال به تحصیل">درخواست گواهی اشتغال به تحصیل</option>
                    <option value="درخواست بررسی وضعیت تحصیلی">درخواست بررسی وضعیت تحصیلی</option>
                  </optgroup>
                  <optgroup label="مالی">
                    <option value="درخواست تقسیط شهریه">درخواست تقسیط شهریه</option>
                    <option value="درخواست بررسی امور مالی">درخواست بررسی امور مالی</option>
                    <option value="درخواست بازگشت وجه">درخواست بازگشت وجه</option>
                  </optgroup>
                  <optgroup label="سایر">
                    <option value="اصلاح اطلاعات دانشجویی">اصلاح اطلاعات دانشجویی</option>
                    <option value="سایر درخواستها">سایر درخواستها</option>
                  </optgroup>
                </select>
                {errors.category && <span className="text-red-500 dark:text-red-400 text-sm">{errors.category.message}</span>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase  mb-2">توضیحات</label>
              <textarea
                {...register('description', { required: 'الزامی است' })}
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:border-[#FFBD2E] min-h-[120px] text-sm resize-y"
              ></textarea>
              {errors.description && <span className="text-red-500 dark:text-red-400 text-sm">{errors.description.message}</span>}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-amber-500 text-white rounded-lg font-bold text-sm disabled:opacity-50 hover:bg-amber-600 cursor-pointer"
              >
                {isSubmitting ? 'در حال ثبت...' : 'ثبت نهایی'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">در حال بارگذاری...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-500 dark:text-slate-400">درخواستی برای نمایش وجود ندارد.</div>
          ) : (
            requests.map(request => (
              <Card 
                key={request.id} 
                className="cursor-pointer hover:border-slate-300 transition-colors flex flex-col h-full"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedRequest(request);
                    setEditStatus(request.status || 'در انتظار بررسی');
                    setAdminResponse(request.adminResponse || '');
                  }
                }}
                onClick={() => {
                  setSelectedRequest(request);
                  setEditStatus(request.status || 'در انتظار بررسی');
                  setAdminResponse(request.adminResponse || '');
                }}
              >
                <div className="flex flex-wrap justify-between items-start gap-2 mb-4">
                  <span className="text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded max-w-full truncate">{request.category}</span>
                  <span className={`text-sm font-bold px-2 py-1 rounded border whitespace-nowrap ${getStatusColor(request.status)}`}>
                    {request.status}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 dark:text-slate-50 text-base sm:text-lg mb-2 line-clamp-2 leading-tight">{request.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4 flex-grow">{request.description}</p>
                <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
                  {isAdminOrStaff ? (
                    <span>{request.studentName}</span>
                  ) : (
                    <span className="flex items-center gap-1"><FiClock /> {formatSafely(request.createdAt)}</span>
                  )}
                  {isAdminOrStaff && <span>{formatSafely(request.createdAt)}</span>}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {selectedRequest && (
        <Modal
          isOpen={!!selectedRequest}
          onClose={handleCloseModal}
          title="جزئیات درخواست"
          maxWidth="max-w-3xl"
        >
          <div className="space-y-6">
            <div className="bg-slate-100 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
              
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50 mb-2 whitespace-normal break-words">{selectedRequest.title}</h3>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{selectedRequest.studentName}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">شماره دانشجویی: {selectedRequest.studentId}</p>
                </div>
                <div className="text-right sm:text-left w-full sm:w-auto">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{formatSafely(selectedRequest.createdAt)}</p>
                  <span className="inline-block text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg whitespace-normal break-words text-right">{selectedRequest.category}</span>
                </div>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedRequest.description}</p>
            </div>

            {!isAdminOrStaff ? (
              <div className="space-y-6">
                
                <div className="bg-slate-100 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                   <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase ">وضعیت درخواست:</span>
                   <span className={`inline-flex items-center justify-center px-4 py-2 rounded-lg border font-bold text-sm text-center w-full sm:w-auto ${getStatusColor(selectedRequest.status)}`}>
                    {selectedRequest.status}
                  </span>
                </div>
                
                {selectedRequest.adminResponse && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-5 rounded-xl border border-amber-200 dark:border-amber-900/50">
                    <h4 className="text-amber-600 dark:text-amber-500 font-bold text-sm mb-2 flex items-center gap-2">
                      <FiInfo />
                      پاسخ کارشناس
                    </h4>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {selectedRequest.adminResponse}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleAdminSubmit} className="bg-slate-100 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-2">وضعیت درخواست</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className={`w-full text-sm font-bold px-4 py-3 rounded-lg border outline-none ${getStatusColor(editStatus)}`}
                    >
                      <option value="در انتظار بررسی" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50">در انتظار بررسی</option>
                      <option value="در حال بررسی" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50">در حال بررسی</option>
                      <option value="تأیید شده" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50">تأیید شده</option>
                      <option value="رد شده" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50">رد شده</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-2">پاسخ کارشناس</label>
                  <textarea
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    placeholder="پاسخ خود را بنویسید..."
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 text-sm min-h-[100px] max-h-[220px] resize-y"
                  ></textarea>
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <button 
                    type="button" 
                    onClick={handleCloseModal}
                    className="px-6 py-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-blue-50 text-slate-900 dark:text-slate-50 rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-sm transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSaving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
